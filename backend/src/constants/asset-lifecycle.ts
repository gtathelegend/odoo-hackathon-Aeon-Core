import type { AssetStatus } from './status';
import { ASSET_STATUS } from './status';

/**
 * Asset lifecycle state machine.
 *
 * Maps each state to the set of states it can transition into. `DISPOSED` is
 * terminal — no outgoing edges. The graph mirrors the requirements spec
 * (Requirement 9) using the Prisma enum names as source of truth.
 */
export const ASSET_TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  [ASSET_STATUS.AVAILABLE]: [
    ASSET_STATUS.ALLOCATED,
    ASSET_STATUS.RESERVED,
    ASSET_STATUS.MAINTENANCE,
    ASSET_STATUS.LOST,
    ASSET_STATUS.RETIRED,
  ],
  [ASSET_STATUS.ALLOCATED]: [ASSET_STATUS.AVAILABLE, ASSET_STATUS.MAINTENANCE, ASSET_STATUS.LOST],
  [ASSET_STATUS.RESERVED]: [ASSET_STATUS.ALLOCATED, ASSET_STATUS.AVAILABLE],
  [ASSET_STATUS.MAINTENANCE]: [ASSET_STATUS.AVAILABLE, ASSET_STATUS.RETIRED],
  [ASSET_STATUS.LOST]: [ASSET_STATUS.AVAILABLE, ASSET_STATUS.DISPOSED],
  [ASSET_STATUS.RETIRED]: [ASSET_STATUS.DISPOSED],
  [ASSET_STATUS.DISPOSED]: [], // terminal
};

/** True when `to` is a valid successor state of `from`. */
export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  if (from === to) return false;
  return ASSET_TRANSITIONS[from]?.includes(to) ?? false;
}

/** All actions the asset service understands. */
export const ASSET_ACTIONS = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  ALLOCATED: 'ALLOCATED',
  RETURNED: 'RETURNED',
  RESERVED: 'RESERVED',
  MAINTENANCE: 'MAINTENANCE',
  MAINTENANCE_RESOLVED: 'MAINTENANCE_RESOLVED',
  LOST: 'LOST',
  RECOVERED: 'RECOVERED',
  RETIRED: 'RETIRED',
  DISPOSED: 'DISPOSED',
  TRANSFER_REQUESTED: 'TRANSFER_REQUESTED',
  TRANSFER_APPROVED: 'TRANSFER_APPROVED',
  TRANSFER_REJECTED: 'TRANSFER_REJECTED',
  TRANSFER_COMPLETED: 'TRANSFER_COMPLETED',
  ATTACHMENT_ADDED: 'ATTACHMENT_ADDED',
  ATTACHMENT_REMOVED: 'ATTACHMENT_REMOVED',
  QR_GENERATED: 'QR_GENERATED',
} as const;

export type AssetAction = (typeof ASSET_ACTIONS)[keyof typeof ASSET_ACTIONS];

/** Asset tag configuration. */
export const ASSET_TAG = {
  PREFIX: 'AF',
  SEPARATOR: '-',
  DIGITS: 4,
} as const;
