import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAttachmentBody, canReleaseAttachment, deliverBitrixAttachment } from './crm-attachment.ts';

const FIELD = 'UF_CRM_SITE_FILES';
const PDF = Buffer.from('%PDF-1.7\nwebsite request attachment\n');
const MAX_BYTES = 10 * 1024 * 1024;
type Params = Record<string, unknown>;
type Reply = { result: unknown; http: number; error?: string };
type Call = (method: string, params: Params) => Promise<Reply>;
const ok = (result: unknown): Reply => ({ result, http: 200 });
const metadata = [{ FIELD_NAME: FIELD, USER_TYPE_ID: 'file', MULTIPLE: 'Y' }];

async function* bytes(...chunks: Uint8Array[]) {
  for (const chunk of chunks) yield chunk;
}

function options(call: Call, extra: Partial<Parameters<typeof deliverBitrixAttachment>[0]> = {}) {
  return {
    siteLeadId: 42,
    existingLeadId: null,
    fields: { TITLE: 'Website request', PHONE: [{ VALUE: '+70000000000', VALUE_TYPE: 'WORK' }] },
    fileField: FIELD,
    loadAttachment: async () => ({ name: 'КП.pdf', data: PDF }),
    call,
    persistLeadId: async (_id: number) => {},
    ...extra,
  };
}

test('S3 body: bounded stream preserves bytes, accepts exact size limit', async () => {
  assert.deepEqual(await readAttachmentBody(bytes(PDF.subarray(0, 6), PDF.subarray(6)), PDF.length), PDF);
  const boundary = Buffer.alloc(MAX_BYTES, 1);
  assert.equal((await readAttachmentBody(bytes(boundary), MAX_BYTES)).length, MAX_BYTES);
});

test('S3 body: missing, malformed, empty and truncated bodies fail', async () => {
  for (const malformed of [undefined, null, {}, 'not an S3 stream']) {
    await assert.rejects(() => readAttachmentBody(malformed));
  }
  await assert.rejects(() => readAttachmentBody(bytes()));
  await assert.rejects(() => readAttachmentBody(bytes(PDF), PDF.length + 1));
});

test('S3 body: advertised oversize is rejected before consuming content', async () => {
  let reads = 0;
  async function* stream() {
    reads++;
    yield PDF;
  }
  await assert.rejects(() => readAttachmentBody(stream(), MAX_BYTES + 1));
  assert.equal(reads, 0);
});

test('S3 body: actual oversize stops and closes iterator without consuming the rest', async () => {
  let reads = 0;
  let closed = false;
  async function* stream() {
    try {
      reads++;
      yield Buffer.alloc(MAX_BYTES);
      reads++;
      yield Buffer.from([1]);
      reads++;
      yield Buffer.alloc(MAX_BYTES);
    } finally {
      closed = true;
    }
  }
  await assert.rejects(() => readAttachmentBody(stream()));
  assert.equal(reads, 2);
  assert.equal(closed, true);
});

test('attachment retention requires BOTH requested channels to succeed', () => {
  assert.equal(canReleaseAttachment('sent', 'sent'), true);
  assert.equal(canReleaseAttachment('sent', 'skipped'), true);
  for (const [mail, crm] of [['sent', 'failed'], ['failed', 'sent'], ['pending', 'sent'], ['failed', 'skipped'], ['sent', 'pending']]) {
    assert.equal(canReleaseAttachment(mail, crm), false, `${mail}/${crm}`);
  }
});

test('CRM creation includes safe filename and exact base64 bytes atomically with lead fields', async () => {
  const calls: { method: string; params: Params }[] = [];
  const events: string[] = [];
  const call: Call = async (method, params) => {
    calls.push({ method, params });
    events.push(method);
    if (method === 'crm.lead.userfield.list') return ok(metadata);
    if (method === 'crm.lead.list') return ok([]);
    if (method === 'crm.lead.add') return ok(501);
    if (method === 'crm.lead.get') return ok({ ID: '501', [FIELD]: [{ id: 701 }] });
    throw new Error(`Unexpected CRM method: ${method}`);
  };
  const result = await deliverBitrixAttachment(options(call, {
    loadAttachment: async () => ({ name: '../../КП<unsafe>.pdf', data: PDF }),
    persistLeadId: async id => { events.push(`persist:${id}`); },
  }));
  assert.equal(result.leadId, 501);
  const add = calls.find(c => c.method === 'crm.lead.add')!;
  const fields = add.params.fields as Params;
  assert.equal(fields.TITLE, 'Website request');
  assert.deepEqual(fields.PHONE, [{ VALUE: '+70000000000', VALUE_TYPE: 'WORK' }]);
  assert.deepEqual(fields[FIELD], [{ fileData: ['КП_unsafe_.pdf', PDF.toString('base64')] }]);
  assert.equal(fields.ORIGINATOR_ID, 'uralinduktor-site-form');
  assert.equal(fields.ORIGIN_ID, '42');
  const lookup = calls.find(c => c.method === 'crm.lead.list')!;
  assert.deepEqual(lookup.params.filter, { '=ORIGINATOR_ID': 'uralinduktor-site-form', '=ORIGIN_ID': '42' });
  assert.ok(events.indexOf('persist:501') < events.indexOf('crm.lead.get'), 'ID must be durable before verification');
});

test('missing/incorrect file configuration fails before create and before reading private bytes', async () => {
  for (const result of [[], [{ FIELD_NAME: FIELD, USER_TYPE_ID: 'string', MULTIPLE: 'Y' }], [{ FIELD_NAME: FIELD, USER_TYPE_ID: 'file', MULTIPLE: 'N' }]]) {
    const calls: string[] = [];
    let loads = 0;
    await assert.rejects(() => deliverBitrixAttachment(options(async method => {
      calls.push(method);
      if (method === 'crm.lead.userfield.list') return ok(result);
      throw new Error('must not create or read a lead');
    }, { loadAttachment: async () => { loads++; return { name: 'КП.pdf', data: PDF }; } })));
    assert.deepEqual(calls, ['crm.lead.userfield.list']);
    assert.equal(loads, 0);
  }
  for (const fileField of ['', 'TITLE', 'UF_CRM_SITE_FILES[0]']) {
    let calls = 0;
    await assert.rejects(() => deliverBitrixAttachment(options(async () => { calls++; return ok(metadata); }, { fileField })));
    assert.equal(calls, 0);
  }
});

test('HTTP/API metadata failure cannot fall through into CRM creation', async () => {
  for (const response of [{ result: null, http: 503 }, { result: null, http: 200, error: 'ACCESS_DENIED' }]) {
    const methods: string[] = [];
    await assert.rejects(() => deliverBitrixAttachment(options(async method => { methods.push(method); return response; })));
    assert.deepEqual(methods, ['crm.lead.userfield.list']);
  }
});

test('new lead with a silently ignored file is NOT success; created ID is retained', async () => {
  const persisted: number[] = [];
  await assert.rejects(() => deliverBitrixAttachment(options(async method => {
    if (method === 'crm.lead.userfield.list') return ok(metadata);
    if (method === 'crm.lead.list') return ok([]);
    if (method === 'crm.lead.add') return ok('501');
    if (method === 'crm.lead.get') return ok({ ID: '501', [FIELD]: [] });
    throw new Error(`Unexpected CRM method: ${method}`);
  }, { persistLeadId: async id => { persisted.push(id); } })));
  assert.deepEqual(persisted, [501]);
});

test('retry missing CRM attachment repairs the existing lead instead of adding a duplicate', async () => {
  const methods: string[] = [];
  let getCalls = 0;
  let updateFields: unknown;
  const result = await deliverBitrixAttachment(options(async (method, params) => {
    methods.push(method);
    if (method === 'crm.lead.userfield.list') return ok(metadata);
    if (method === 'crm.lead.get') return ok({ ID: '501', [FIELD]: ++getCalls === 1 ? [] : [{ ID: '702' }] });
    if (method === 'crm.lead.update') { updateFields = params.fields; return ok(true); }
    throw new Error(`Unexpected CRM method: ${method}`);
  }, { existingLeadId: 501 }));
  assert.equal(result.leadId, 501);
  assert.equal(methods.includes('crm.lead.add'), false);
  assert.equal(methods.filter(m => m === 'crm.lead.update').length, 1);
  assert.deepEqual(updateFields, { [FIELD]: [{ fileData: ['КП.pdf', PDF.toString('base64')] }] });
  assert.equal(getCalls, 2, 'update result alone is not proof of a stored file');
});

test('verified stored file IDs make retries idempotent without loading or uploading bytes again', async () => {
  for (const stored of [[701], ['701'], [{ id: 701 }], [{ ID: '701' }]]) {
    const methods: string[] = [];
    let loads = 0;
    const result = await deliverBitrixAttachment(options(async method => {
      methods.push(method);
      if (method === 'crm.lead.userfield.list') return ok(metadata);
      if (method === 'crm.lead.get') return ok({ ID: '501', [FIELD]: stored });
      throw new Error(`Unexpected CRM method: ${method}`);
    }, { existingLeadId: 501, loadAttachment: async () => { loads++; throw new Error('must not reload'); } }));
    assert.equal(result.leadId, 501);
    assert.equal(loads, 0);
    assert.equal(methods.some(m => m === 'crm.lead.add' || m === 'crm.lead.update'), false);
  }
});

test('echoed fileData, URL-only values, empty values and wrong returned lead ID do not prove storage', async () => {
  for (const stored of [undefined, null, [], [{}], [{ fileData: ['КП.pdf', 'base64'] }], [{ downloadUrl: '/file/701' }], [0], ['bad']]) {
    await assert.rejects(() => deliverBitrixAttachment(options(async method => {
      if (method === 'crm.lead.userfield.list') return ok(metadata);
      if (method === 'crm.lead.list') return ok([]);
      if (method === 'crm.lead.add') return ok(501);
      if (method === 'crm.lead.get') return ok({ ID: '501', [FIELD]: stored });
      throw new Error(`Unexpected CRM method: ${method}`);
    })));
  }
  await assert.rejects(() => deliverBitrixAttachment(options(async method => {
    if (method === 'crm.lead.userfield.list') return ok(metadata);
    if (method === 'crm.lead.get') return ok({ ID: '999', [FIELD]: [{ id: 701 }] });
    throw new Error(`Unexpected CRM method: ${method}`);
  }, { existingLeadId: 501 })));
});

test('verification network failure preserves created ID for the next attempt', async () => {
  const persisted: number[] = [];
  await assert.rejects(() => deliverBitrixAttachment(options(async method => {
    if (method === 'crm.lead.userfield.list') return ok(metadata);
    if (method === 'crm.lead.list') return ok([]);
    if (method === 'crm.lead.add') return ok(501);
    throw new Error('network timeout while reading CRM');
  }, { persistLeadId: async id => { persisted.push(id); } })));
  assert.deepEqual(persisted, [501]);
});

test('ambiguous add timeout is recovered by external site identity without a second CRM lead', async () => {
  let created = false;
  let adds = 0;
  const persisted: number[] = [];
  const call: Call = async method => {
    if (method === 'crm.lead.userfield.list') return ok(metadata);
    if (method === 'crm.lead.list') return ok(created ? [{ ID: '501' }] : []);
    if (method === 'crm.lead.add') { adds++; created = true; throw new Error('request timed out after server created lead'); }
    if (method === 'crm.lead.get') return ok({ ID: '501', [FIELD]: [{ id: 701 }] });
    throw new Error(`Unexpected CRM method: ${method}`);
  };
  await assert.rejects(() => deliverBitrixAttachment(options(call)));
  const result = await deliverBitrixAttachment(options(call, { persistLeadId: async id => { persisted.push(id); } }));
  assert.equal(result.leadId, 501);
  assert.equal(adds, 1);
  assert.deepEqual(persisted, [501]);
});

test('duplicate external identity or failed private source never creates another CRM lead', async () => {
  let adds = 0;
  await assert.rejects(() => deliverBitrixAttachment(options(async method => {
    if (method === 'crm.lead.userfield.list') return ok(metadata);
    if (method === 'crm.lead.list') return ok([{ ID: '501' }, { ID: '502' }]);
    if (method === 'crm.lead.add') adds++;
    throw new Error('unexpected create');
  })));
  assert.equal(adds, 0);
  await assert.rejects(() => deliverBitrixAttachment(options(async method => {
    if (method === 'crm.lead.userfield.list') return ok(metadata);
    if (method === 'crm.lead.list') return ok([]);
    if (method === 'crm.lead.add') adds++;
    throw new Error('unexpected create');
  }, { loadAttachment: async () => { throw new Error('private source unavailable'); } })));
  assert.equal(adds, 0);
});

test('invalid crm.lead.add response does not persist an ID or report delivery', async () => {
  for (const invalid of [null, false, 0, -1, 'not-an-id']) {
    const persisted: number[] = [];
    await assert.rejects(() => deliverBitrixAttachment(options(async method => {
      if (method === 'crm.lead.userfield.list') return ok(metadata);
      if (method === 'crm.lead.list') return ok([]);
      if (method === 'crm.lead.add') return ok(invalid);
      throw new Error('must not verify invalid ID');
    }, { persistLeadId: async id => { persisted.push(id); } })));
    assert.deepEqual(persisted, []);
  }
});

test('stored source is revalidated before CRM upload and failures do not create a lead', async () => {
  for (const file of [{ name: 'КП.pdf', data: Buffer.from('MZ executable') }, { name: 'payload.exe', data: PDF }, { name: 'КП.pdf', data: Buffer.alloc(0) }]) {
    let adds = 0;
    await assert.rejects(() => deliverBitrixAttachment(options(async method => {
      if (method === 'crm.lead.userfield.list') return ok(metadata);
      if (method === 'crm.lead.list') return ok([]);
      if (method === 'crm.lead.add') adds++;
      throw new Error('must not create a lead from an invalid source');
    }, { loadAttachment: async () => file })));
    assert.equal(adds, 0);
  }
});

test('API diagnostics do not expose response error bodies or private URLs', async () => {
  const privateError = 'private payload base64 and https://private.invalid/download?token=secret';
  await assert.rejects(() => deliverBitrixAttachment(options(async () => ({ result: null, http: 200, error: privateError }))), error => {
    assert.ok(error instanceof Error);
    assert.equal(error.message.includes(privateError), false);
    assert.equal(error.message.includes('token=secret'), false);
    return true;
  });
});
