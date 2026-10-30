import { canReleaseAttachment } from './crm-attachment.ts';

/** Bound Buffer/base64/JSON memory without slowing requests that have no files. */
export function createAttachmentDeliveryGate(): <T>(task: () => Promise<T>) => Promise<T> {
  let tail: Promise<void> = Promise.resolve();
  return async <T>(task: () => Promise<T>): Promise<T> => {
    const previous = tail;
    let release!: () => void;
    tail = new Promise<void>(resolve => { release = resolve; });
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  };
}

interface DeliveryLead {
  id: number;
  mailStatus: string;
  b24Status: string;
  attachmentKey: string | null;
}

interface DeliveryDependencies {
  sendMail: () => Promise<void>;
  sendBitrix: () => Promise<Record<string, unknown>>;
  persist: (patch: Record<string, unknown>) => Promise<void>;
  deleteAttachment: (key: string) => Promise<void>;
  onCleanupError?: (error: unknown) => void;
  now?: () => Date;
}

/** Channel acknowledgements survive failure/retry of the other channel. */
export async function deliverChannels(
  lead: DeliveryLead,
  options: { bitrixEnabled: boolean; lastAttempt: boolean },
  deps: DeliveryDependencies,
): Promise<{ mail: 'sent' | 'failed'; b24: 'sent' | 'failed' | 'skipped'; errors: string[] }> {
  const now = deps.now ?? (() => new Date());
  const patch: Record<string, unknown> = {};
  const errors: string[] = [];
  let mail: 'sent' | 'failed' = lead.mailStatus === 'sent' ? 'sent' : 'failed';
  if (lead.mailStatus !== 'sent') {
    try {
      await deps.sendMail();
      await deps.persist({ mailStatus: 'sent', mailError: null, mailSentAt: now() });
      mail = 'sent';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Mail delivery failed';
      errors.push(`mail: ${message}`);
      Object.assign(patch, { mailStatus: 'failed', mailError: message.slice(0, 500) });
    }
  }

  let b24: 'sent' | 'failed' | 'skipped' = lead.b24Status === 'sent' ? 'sent' : options.bitrixEnabled ? 'failed' : 'skipped';
  if (!options.bitrixEnabled) {
    patch.b24Status = 'skipped';
  } else if (lead.b24Status !== 'sent') {
    try {
      const result = await deps.sendBitrix();
      await deps.persist({ ...result, b24Status: 'sent', b24Error: null });
      b24 = 'sent';
    } catch (err) {
      const message = err instanceof Error ? err.message : 'CRM delivery failed';
      errors.push(`b24: ${message}`);
      Object.assign(patch, { b24Status: 'failed', b24Error: message.slice(0, 500) });
    }
  }

  const delivered = canReleaseAttachment(mail, b24);
  patch.status = delivered ? 'delivered' : mail === 'sent' || b24 === 'sent' ? (options.lastAttempt ? 'partial' : 'received') : options.lastAttempt ? 'failed' : 'received';
  if (delivered) patch.deliveredAt = now();
  patch.updatedAt = now();
  await deps.persist(patch);

  if (delivered && lead.attachmentKey) {
    try {
      await deps.deleteAttachment(lead.attachmentKey);
      await deps.persist({ attachmentKey: null });
    } catch (err) {
      // Retry cleanup automatically while acknowledgements prevent channel resends.
      errors.push('attachment: cleanup failed');
      deps.onCleanupError?.(err);
    }
  }
  return { mail, b24, errors };
}
