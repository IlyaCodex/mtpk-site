import { ATTACH_MAX_BYTES, checkAttachment } from './attachment.ts';

export interface BitrixReply {
  result: unknown;
  http: number;
  error?: string;
}

export type BitrixCall = (method: string, params: Record<string, unknown>) => Promise<BitrixReply>;
export interface CrmAttachment { name: string; data: Buffer }

/** Do not trust a stored object's length: cap consumption as well as allocation. */
export async function readAttachmentBody(body: unknown, contentLength?: number): Promise<Buffer> {
  const stream = body as { [Symbol.asyncIterator]?: unknown; destroy?: () => void } | null;
  if (!stream || typeof stream[Symbol.asyncIterator] !== 'function') throw new Error('Attachment body is not readable');
  if (contentLength !== undefined && (!Number.isSafeInteger(contentLength) || contentLength < 1 || contentLength > ATTACH_MAX_BYTES)) {
    stream.destroy?.();
    throw new Error('Attachment size is outside the 10 MiB limit');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    if (!(chunk instanceof Uint8Array)) throw new Error('Invalid attachment stream chunk');
    size += chunk.byteLength;
    if (size > ATTACH_MAX_BYTES) throw new Error('Attachment exceeds 10 MiB');
    chunks.push(Buffer.from(chunk));
  }
  if (!size || (contentLength !== undefined && size !== contentLength)) throw new Error('Empty or truncated attachment');
  return Buffer.concat(chunks, size);
}

export function canReleaseAttachment(mail: string, b24: string): boolean {
  return mail === 'sent' && (b24 === 'sent' || b24 === 'skipped');
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function positiveId(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Only persisted file IDs prove storage; an echoed upload payload or URL does not. */
function fileState(value: unknown): 'empty' | 'stored' | 'unknown' {
  if (value === null || value === undefined || value === false || value === '' || (Array.isArray(value) && !value.length)) return 'empty';
  const files = Array.isArray(value) ? value : [value];
  if (files.every(file => positiveId(file) !== null || positiveId(record(file)?.id ?? record(file)?.ID) !== null)) return 'stored';
  return 'unknown';
}

async function callChecked(call: BitrixCall, method: string, params: Record<string, unknown>): Promise<BitrixReply> {
  const response = await call(method, params);
  if (response.http !== 200 || response.error || response.result === null || response.result === undefined) {
    // Never include API bodies, URLs or file bytes in errors persisted to the lead.
    throw new Error(`${method}: HTTP ${response.http}${response.error ? ' (API error)' : ''}`);
  }
  return response;
}

interface AttachmentDeliveryOptions {
  siteLeadId: number;
  existingLeadId: number | null;
  fields: Record<string, unknown>;
  fileField: string;
  loadAttachment: () => Promise<CrmAttachment>;
  call: BitrixCall;
  persistLeadId: (id: number) => Promise<void>;
}

/**
 * The first add includes the file atomically. Persist its ID before verification:
 * a failed readback must retry that lead, never create another one.
 */
export async function deliverBitrixAttachment(options: AttachmentDeliveryOptions): Promise<{ leadId: number; http: number }> {
  const { call, persistLeadId } = options;
  const field = options.fileField.trim();
  if (!/^UF_CRM_[A-Z0-9_]+$/.test(field)) throw new Error('Invalid B24_FILE_FIELD');
  const metadata = await callChecked(call, 'crm.lead.userfield.list', { filter: { FIELD_NAME: field } });
  const definition = Array.isArray(metadata.result) ? metadata.result.map(record).find(item => item?.FIELD_NAME === field) : null;
  if (definition?.USER_TYPE_ID !== 'file' || (definition.MULTIPLE !== 'Y' && definition.MULTIPLE !== true)) {
    throw new Error('B24_FILE_FIELD must be an existing multiple file field');
  }
  if (positiveId(options.siteLeadId) === null) throw new Error('Invalid site lead ID');
  const origin = { ORIGINATOR_ID: 'uralinduktor-site-form', ORIGIN_ID: String(options.siteLeadId) };
  let leadId = options.existingLeadId === null ? null : positiveId(options.existingLeadId);
  if (options.existingLeadId !== null && leadId === null) throw new Error('Invalid saved CRM lead ID');
  if (leadId === null) {
    // Recover a previous add whose response was lost, using the site's stable identity.
    const found = await callChecked(call, 'crm.lead.list', {
      filter: { '=ORIGINATOR_ID': origin.ORIGINATOR_ID, '=ORIGIN_ID': origin.ORIGIN_ID },
      select: ['ID'],
    });
    if (!Array.isArray(found.result) || found.result.length > 1) throw new Error('Ambiguous CRM lead identity');
    if (found.result.length === 1) {
      leadId = positiveId(record(found.result[0])?.ID);
      if (leadId === null) throw new Error('Invalid CRM lead lookup result');
    }
  }

  const readFile = async (id: number): Promise<'empty' | 'stored'> => {
    const response = await callChecked(call, 'crm.lead.get', { id });
    const lead = record(response.result);
    if (!lead || (lead.ID !== undefined && positiveId(lead.ID) !== id)) throw new Error('Invalid CRM lead readback');
    const state = fileState(lead[field]);
    if (state === 'unknown') throw new Error('Unrecognised CRM file readback; attachment not verified');
    return state;
  };
  const uploadValue = async () => {
    const file = await options.loadAttachment();
    const checked = checkAttachment(file.name, file.data, false);
    if (!checked.ok) throw new Error('Stored attachment failed file validation');
    return [{ fileData: [checked.name, file.data.toString('base64')] }];
  };

  if (leadId !== null) {
    await persistLeadId(leadId);
    if (await readFile(leadId) === 'stored') return { leadId, http: 200 };
    const value = await uploadValue();
    const updated = await callChecked(call, 'crm.lead.update', { id: leadId, fields: { [field]: value } });
    if (updated.result !== true || await readFile(leadId) !== 'stored') throw new Error('CRM attachment update was not stored');
    return { leadId, http: updated.http };
  }

  const value = await uploadValue();
  const created = await callChecked(call, 'crm.lead.add', { fields: { ...options.fields, ...origin, [field]: value } });
  leadId = positiveId(created.result);
  if (leadId === null) throw new Error('crm.lead.add did not return a valid lead ID');
  await persistLeadId(leadId);
  if (await readFile(leadId) !== 'stored') throw new Error('CRM lead created but attachment was not stored');
  return { leadId, http: created.http };
}
