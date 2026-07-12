import { describe, expect, it } from 'vitest';
import {
  ASSET_TRANSITIONS,
  canTransition,
} from '../../src/constants/asset-lifecycle';
import { ASSET_STATUS } from '../../src/constants/status';
import { formatAssetTag, isAssetTag } from '../../src/utils/asset-tag';

describe('asset lifecycle state machine', () => {
  it('exports transitions for every asset status', () => {
    for (const status of Object.values(ASSET_STATUS)) {
      expect(ASSET_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('treats DISPOSED as terminal', () => {
    expect(ASSET_TRANSITIONS[ASSET_STATUS.DISPOSED]).toEqual([]);
    expect(canTransition(ASSET_STATUS.DISPOSED, ASSET_STATUS.AVAILABLE)).toBe(false);
  });

  it('allows AVAILABLE → ALLOCATED', () => {
    expect(canTransition(ASSET_STATUS.AVAILABLE, ASSET_STATUS.ALLOCATED)).toBe(true);
  });

  it('rejects ALLOCATED → DISPOSED', () => {
    expect(canTransition(ASSET_STATUS.ALLOCATED, ASSET_STATUS.DISPOSED)).toBe(false);
  });

  it('allows RETIRED → DISPOSED', () => {
    expect(canTransition(ASSET_STATUS.RETIRED, ASSET_STATUS.DISPOSED)).toBe(true);
  });

  it('rejects self-transitions', () => {
    expect(canTransition(ASSET_STATUS.AVAILABLE, ASSET_STATUS.AVAILABLE)).toBe(false);
  });
});

describe('asset tag helper', () => {
  it('formats numeric sequence to AF-XXXX', () => {
    expect(formatAssetTag(1)).toBe('AF-0001');
    expect(formatAssetTag(42)).toBe('AF-0042');
    expect(formatAssetTag(1234)).toBe('AF-1234');
    expect(formatAssetTag(12345)).toBe('AF-12345');
  });

  it('recognizes valid tags', () => {
    expect(isAssetTag('AF-0001')).toBe(true);
    expect(isAssetTag('AF-9999')).toBe(true);
    expect(isAssetTag('AF-12345')).toBe(true);
  });

  it('rejects invalid tags', () => {
    expect(isAssetTag('AF-001')).toBe(false);
    expect(isAssetTag('AF001')).toBe(false);
    expect(isAssetTag('XX-0001')).toBe(false);
  });
});
