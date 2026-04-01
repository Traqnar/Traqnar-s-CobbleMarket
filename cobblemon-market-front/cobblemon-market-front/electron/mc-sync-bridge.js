const { randomUUID } = require('crypto');

const BRIDGE_ACTION = 'sync_party_pc_tpaccept';
const DEFAULT_LEAD_DELAY_MS = 1200;
const DEFAULT_TIMEOUT_MS = 3500;
const DEFAULT_RETRIES = 1;
const BRIDGE_ENDPOINT_A = 'http://127.0.0.1:5149/api/bridge/sync-party-pc-and-tpaccept';
const BRIDGE_ENDPOINT_B = 'http://127.0.0.1:5150/api/bridge/sync-party-pc-and-tpaccept';

function buildSyncBridgePayload({ partySlotId, leadDelayMs = DEFAULT_LEAD_DELAY_MS, requestId, nowMs = Date.now() }) {
  const normalizedRequestId = typeof requestId === 'string' && requestId.trim() ? requestId.trim() : randomUUID();
  const normalizedLeadDelay = Number.isFinite(leadDelayMs) ? Math.max(0, Math.floor(leadDelayMs)) : DEFAULT_LEAD_DELAY_MS;

  return {
    action: BRIDGE_ACTION,
    requestId: normalizedRequestId,
    executeAtEpochMs: nowMs + normalizedLeadDelay,
    partySlotId,
  };
}

function readBodyAsJsonSafe(text) {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function postWithTimeoutAndRetry(url, payload, { timeoutMs = DEFAULT_TIMEOUT_MS, retries = DEFAULT_RETRIES } = {}) {
  let lastResult = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const text = await response.text();
      const latencyMs = Date.now() - startedAt;
      clearTimeout(timer);

      lastResult = {
        status: response.status,
        body: readBodyAsJsonSafe(text),
        latencyMs,
      };

      if (response.ok || attempt === retries) {
        return response.ok ? lastResult : { ...lastResult, error: `HTTP_${response.status}` };
      }
    } catch (error) {
      clearTimeout(timer);
      const latencyMs = Date.now() - startedAt;
      const isAbort = error && typeof error === 'object' && error.name === 'AbortError';
      lastResult = {
        status: null,
        body: null,
        latencyMs,
        error: isAbort ? 'TIMEOUT' : String(error?.message ?? error ?? 'unknown_error'),
      };

      if (attempt === retries) {
        return lastResult;
      }
    }
  }

  return lastResult ?? {
    status: null,
    body: null,
    latencyMs: 0,
    error: 'unknown_error',
  };
}

function isValidPartySlotId(value) {
  return Number.isInteger(value) && value >= 0 && value <= 5;
}

function isValidLeadDelay(value) {
  return Number.isInteger(value) && value >= 0 && value <= 60000;
}

async function syncTransferAndTpAccept({ partySlotId, leadDelayMs = DEFAULT_LEAD_DELAY_MS, requestId }, logger = console) {
  if (!isValidPartySlotId(partySlotId)) {
    return {
      ok: false,
      error: 'INVALID_PARTY_SLOT_ID',
      details: 'partySlotId must be an integer between 0 and 5.',
    };
  }

  const normalizedLeadDelay = Number.isFinite(leadDelayMs) ? Math.floor(leadDelayMs) : DEFAULT_LEAD_DELAY_MS;
  if (!isValidLeadDelay(normalizedLeadDelay)) {
    return {
      ok: false,
      error: 'INVALID_LEAD_DELAY_MS',
      details: 'leadDelayMs must be an integer between 0 and 60000.',
    };
  }

  const payload = buildSyncBridgePayload({
    partySlotId,
    leadDelayMs: normalizedLeadDelay,
    requestId,
  });

  logger.info?.('[mc-sync]', JSON.stringify({
    event: 'sync.requested',
    requestId: payload.requestId,
    partySlotId: payload.partySlotId,
    executeAtEpochMs: payload.executeAtEpochMs,
    leadDelayMs: normalizedLeadDelay,
  }));

  const [a, b] = await Promise.all([
    postWithTimeoutAndRetry(BRIDGE_ENDPOINT_A, payload),
    postWithTimeoutAndRetry(BRIDGE_ENDPOINT_B, payload),
  ]);

  const response = {
    ok: !a.error && !b.error && (a.status ?? 0) >= 200 && (a.status ?? 0) < 300 && (b.status ?? 0) >= 200 && (b.status ?? 0) < 300,
    requestId: payload.requestId,
    executeAtEpochMs: payload.executeAtEpochMs,
    a,
    b,
  };

  logger.info?.('[mc-sync]', JSON.stringify({
    event: 'sync.completed',
    requestId: response.requestId,
    executeAtEpochMs: response.executeAtEpochMs,
    ok: response.ok,
    a: { status: a.status, latencyMs: a.latencyMs, error: a.error ?? null },
    b: { status: b.status, latencyMs: b.latencyMs, error: b.error ?? null },
  }));

  return response;
}

module.exports = {
  BRIDGE_ACTION,
  DEFAULT_LEAD_DELAY_MS,
  buildSyncBridgePayload,
  syncTransferAndTpAccept,
};
