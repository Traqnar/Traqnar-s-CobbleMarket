import { describe, expect, it } from 'vitest';
import syncBridge from './mc-sync-bridge.js';

const { BRIDGE_ACTION, buildSyncBridgePayload } = syncBridge;

describe('buildSyncBridgePayload', () => {
  it('builds payload with shared executeAt and keeps explicit requestId', () => {
    const payload = buildSyncBridgePayload({
      partySlotId: 3,
      leadDelayMs: 1200,
      requestId: 'req-123',
      nowMs: 1700000000000,
    });

    expect(payload).toEqual({
      action: BRIDGE_ACTION,
      requestId: 'req-123',
      executeAtEpochMs: 1700000001200,
      partySlotId: 3,
    });
  });

  it('generates requestId when missing', () => {
    const payload = buildSyncBridgePayload({
      partySlotId: 0,
      leadDelayMs: 500,
      nowMs: 1700000000000,
    });

    expect(payload.action).toBe(BRIDGE_ACTION);
    expect(payload.executeAtEpochMs).toBe(1700000000500);
    expect(payload.partySlotId).toBe(0);
    expect(typeof payload.requestId).toBe('string');
    expect(payload.requestId.length).toBeGreaterThan(10);
  });
});
