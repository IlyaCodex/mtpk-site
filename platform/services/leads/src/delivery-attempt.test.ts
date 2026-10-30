import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAttachmentDeliveryGate, deliverChannels } from './delivery-attempt.ts';

const NOW = new Date('2026-10-30T08:00:00Z');
type State = { id: number; mailStatus: string; b24Status: string; attachmentKey: string | null; [key: string]: unknown };
const fresh = (): State => ({ id: 42, mailStatus: 'pending', b24Status: 'pending', attachmentKey: 'leads/42/КП.pdf' });

test('attachment gate runs queued deliveries one at a time in FIFO order and preserves results', { timeout: 2_000 }, async () => {
  const gate = createAttachmentDeliveryGate();
  const events: string[] = [];
  let active = 0;
  let maximumActive = 0;
  let releaseFirst!: () => void;
  let announceFirst!: () => void;
  const firstStarted = new Promise<void>(resolve => { announceFirst = resolve; });
  const firstMayFinish = new Promise<void>(resolve => { releaseFirst = resolve; });
  const expected = [{ leadId: 1 }, { leadId: 2 }, { leadId: 3 }];
  const deliveries = expected.map((result, index) => gate(async () => {
    active++;
    maximumActive = Math.max(maximumActive, active);
    events.push(`start:${result.leadId}`);
    if (index === 0) {
      announceFirst();
      await firstMayFinish;
    } else {
      await Promise.resolve();
    }
    events.push(`end:${result.leadId}`);
    active--;
    return result;
  }));
  await firstStarted;
  assert.deepEqual(events, ['start:1'], 'queued files must not start reading while the first delivery owns the gate');
  releaseFirst();
  const results = await Promise.all(deliveries);
  assert.equal(maximumActive, 1);
  assert.equal(active, 0);
  assert.deepEqual(events, ['start:1', 'end:1', 'start:2', 'end:2', 'start:3', 'end:3']);
  results.forEach((result, index) => assert.equal(result, expected[index], 'the gate must return the original task result'));
});

test('a thrown attachment delivery releases the next queued tasks without losing the rejection', { timeout: 2_000 }, async () => {
  const gate = createAttachmentDeliveryGate();
  const failure = new Error('S3 attachment read failed');
  const events: number[] = [];
  let releaseFirst!: () => void;
  let announceFirst!: () => void;
  const firstStarted = new Promise<void>(resolve => { announceFirst = resolve; });
  const firstMayFail = new Promise<void>(resolve => { releaseFirst = resolve; });
  const first = gate(async () => {
    events.push(1);
    announceFirst();
    await firstMayFail;
    throw failure;
  });
  const second = gate(async () => { events.push(2); return 'second delivery'; });
  const third = gate(async () => { events.push(3); return 303; });
  const completed = Promise.allSettled([first, second, third]);
  await firstStarted;
  assert.deepEqual(events, [1]);
  releaseFirst();
  const results = await completed;
  assert.deepEqual(events, [1, 2, 3]);
  assert.equal(results[0].status, 'rejected');
  if (results[0].status === 'rejected') assert.equal(results[0].reason, failure);
  assert.deepEqual(results.slice(1), [
    { status: 'fulfilled', value: 'second delivery' },
    { status: 'fulfilled', value: 303 },
  ]);
  assert.equal(await gate(async () => 'later delivery'), 'later delivery', 'a failed task must not poison future calls');
});

test('CRM attachment failure retains source and retry does not duplicate an already sent email', async () => {
  const state = fresh();
  const events: string[] = [];
  let mailCalls = 0;
  let crmCalls = 0;
  let failCrm = true;
  const deps = {
    sendMail: async () => { mailCalls++; events.push('mail'); },
    sendBitrix: async () => { crmCalls++; events.push('crm'); if (failCrm) throw new Error('file upload rejected'); return { b24LeadId: 501 }; },
    persist: async (patch: Record<string, unknown>) => { Object.assign(state, patch); events.push(patch.mailStatus === 'sent' ? 'persist-mail' : 'persist'); },
    deleteAttachment: async (_key: string) => { events.push('delete'); },
    now: () => NOW,
  };
  const first = await deliverChannels({ ...state }, { bitrixEnabled: true, lastAttempt: false }, deps);
  assert.equal(first.mail, 'sent');
  assert.equal(first.b24, 'failed');
  assert.equal(first.errors.length, 1);
  assert.ok(events.indexOf('persist-mail') < events.indexOf('crm'), 'mail acknowledgement must be durable before CRM work');
  assert.equal(state.mailStatus, 'sent');
  assert.equal(state.attachmentKey, 'leads/42/КП.pdf');
  assert.equal(events.includes('delete'), false);
  failCrm = false;
  const second = await deliverChannels({ ...state }, { bitrixEnabled: true, lastAttempt: false }, deps);
  assert.deepEqual(second, { mail: 'sent', b24: 'sent', errors: [] });
  assert.equal(mailCalls, 1);
  assert.equal(crmCalls, 2);
  assert.equal(state.b24LeadId, 501);
  assert.equal(state.status, 'delivered');
  assert.equal(state.attachmentKey, null);
  assert.equal(events.filter(e => e === 'delete').length, 1);
});

test('SMTP failure does not block CRM and retry sends only mail before releasing source', async () => {
  const state = fresh();
  let mailCalls = 0;
  let crmCalls = 0;
  let deletes = 0;
  const deps = {
    sendMail: async () => { if (++mailCalls === 1) throw new Error('SMTP unavailable'); },
    sendBitrix: async () => { crmCalls++; return { b24LeadId: 501 }; },
    persist: async (patch: Record<string, unknown>) => { Object.assign(state, patch); },
    deleteAttachment: async (_key: string) => { deletes++; },
    now: () => NOW,
  };
  const first = await deliverChannels({ ...state }, { bitrixEnabled: true, lastAttempt: false }, deps);
  assert.equal(first.mail, 'failed');
  assert.equal(first.b24, 'sent');
  assert.equal(state.b24Status, 'sent');
  assert.equal(state.attachmentKey, 'leads/42/КП.pdf');
  assert.equal(deletes, 0);
  const second = await deliverChannels({ ...state }, { bitrixEnabled: true, lastAttempt: false }, deps);
  assert.deepEqual(second, { mail: 'sent', b24: 'sent', errors: [] });
  assert.equal(mailCalls, 2);
  assert.equal(crmCalls, 1);
  assert.equal(deletes, 1);
  assert.equal(state.attachmentKey, null);
});

test('intentionally disabled CRM permits cleanup after mail without invoking CRM adapter', async () => {
  const state = fresh();
  const deleted: string[] = [];
  const result = await deliverChannels({ ...state }, { bitrixEnabled: false, lastAttempt: false }, {
    sendMail: async () => {},
    sendBitrix: async () => { throw new Error('disabled CRM must not be called'); },
    persist: async patch => { Object.assign(state, patch); },
    deleteAttachment: async key => { deleted.push(key); },
    now: () => NOW,
  });
  assert.deepEqual(result, { mail: 'sent', b24: 'skipped', errors: [] });
  assert.equal(state.b24Status, 'skipped');
  assert.deepEqual(deleted, ['leads/42/КП.pdf']);
  assert.equal(state.attachmentKey, null);
});

test('failed deletion keeps the source key and does not resend either delivered channel', async () => {
  const state: State = { ...fresh(), mailStatus: 'sent', b24Status: 'sent' };
  const cleanupErrors: unknown[] = [];
  let deletes = 0;
  const deps = {
    sendMail: async () => { throw new Error('must not resend mail'); },
    sendBitrix: async () => { throw new Error('must not recreate CRM lead'); },
    persist: async (patch: Record<string, unknown>) => { Object.assign(state, patch); },
    deleteAttachment: async (_key: string) => { if (++deletes === 1) throw new Error('S3 temporarily unavailable'); },
    onCleanupError: (err: unknown) => { cleanupErrors.push(err); },
    now: () => NOW,
  };
  assert.deepEqual(await deliverChannels({ ...state }, { bitrixEnabled: true, lastAttempt: false }, deps), { mail: 'sent', b24: 'sent', errors: ['attachment: cleanup failed'] });
  assert.equal(state.attachmentKey, 'leads/42/КП.pdf');
  assert.equal(cleanupErrors.length, 1);
  await deliverChannels({ ...state }, { bitrixEnabled: true, lastAttempt: false }, deps);
  assert.equal(deletes, 2);
  assert.equal(state.attachmentKey, null);
});

test('requests without attachments preserve channel delivery and never delete an object', async () => {
  const state: State = { ...fresh(), attachmentKey: null };
  let deletes = 0;
  const result = await deliverChannels({ ...state }, { bitrixEnabled: true, lastAttempt: false }, {
    sendMail: async () => {},
    sendBitrix: async () => ({ b24LeadId: 501, b24Http: 200 }),
    persist: async patch => { Object.assign(state, patch); },
    deleteAttachment: async () => { deletes++; },
    now: () => NOW,
  });
  assert.deepEqual(result, { mail: 'sent', b24: 'sent', errors: [] });
  assert.equal(state.status, 'delivered');
  assert.equal(state.b24LeadId, 501);
  assert.equal(deletes, 0);
});

test('last attempt records partial success and keeps attachment when CRM still fails', async () => {
  const state: State = { ...fresh(), mailStatus: 'sent' };
  const result = await deliverChannels({ ...state }, { bitrixEnabled: true, lastAttempt: true }, {
    sendMail: async () => { throw new Error('already sent'); },
    sendBitrix: async () => { throw new Error('CRM file verification failed'); },
    persist: async patch => { Object.assign(state, patch); },
    deleteAttachment: async () => { throw new Error('must retain attachment'); },
    now: () => NOW,
  });
  assert.equal(result.mail, 'sent');
  assert.equal(result.b24, 'failed');
  assert.equal(result.errors.length, 1);
  assert.equal(state.status, 'partial');
  assert.equal(state.attachmentKey, 'leads/42/КП.pdf');
});

test('last attempt records both failures without deleting the file', async () => {
  const state = fresh();
  let deletes = 0;
  const result = await deliverChannels({ ...state }, { bitrixEnabled: true, lastAttempt: true }, {
    sendMail: async () => { throw new Error('SMTP failed'); },
    sendBitrix: async () => { throw new Error('CRM failed'); },
    persist: async patch => { Object.assign(state, patch); },
    deleteAttachment: async () => { deletes++; },
    now: () => NOW,
  });
  assert.equal(result.errors.length, 2);
  assert.equal(state.status, 'failed');
  assert.equal(deletes, 0);
  assert.equal(state.attachmentKey, 'leads/42/КП.pdf');
});

test('production clock persists real delivery timestamps without an injected test clock', async () => {
  const state: State = { ...fresh(), attachmentKey: null };
  const startedAt = Date.now();
  await deliverChannels({ ...state }, { bitrixEnabled: true, lastAttempt: false }, {
    sendMail: async () => {},
    sendBitrix: async () => ({ b24LeadId: 501 }),
    persist: async patch => { Object.assign(state, patch); },
    deleteAttachment: async () => { throw new Error('no attachment'); },
  });
  for (const name of ['mailSentAt', 'deliveredAt', 'updatedAt']) {
    const timestamp = state[name];
    assert.ok(timestamp instanceof Date, `${name} must be a Date`);
    assert.ok(timestamp.getTime() >= startedAt && timestamp.getTime() <= Date.now());
  }
});

test('non-Error adapter failures keep delivery retryable and do not leak thrown objects', async () => {
  const state = fresh();
  const result = await deliverChannels({ ...state }, { bitrixEnabled: true, lastAttempt: false }, {
    sendMail: async () => { throw { body: 'private mail content' }; },
    sendBitrix: async () => { throw 'private CRM content'; },
    persist: async patch => { Object.assign(state, patch); },
    deleteAttachment: async () => { throw new Error('must retain attachment'); },
  });
  assert.deepEqual(result.errors, ['mail: Mail delivery failed', 'b24: CRM delivery failed']);
  assert.equal(state.status, 'received');
  assert.equal(state.attachmentKey, 'leads/42/КП.pdf');
});
