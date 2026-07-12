import type { Prisma } from '@prisma/client';
import { ASSET_TAG } from '../constants/asset-lifecycle';

/** Format a numeric sequence value into an `AF-XXXX` tag. */
export function formatAssetTag(seq: number): string {
  const padded = String(seq).padStart(ASSET_TAG.DIGITS, '0');
  return `${ASSET_TAG.PREFIX}${ASSET_TAG.SEPARATOR}${padded}`;
}

/** True when the string looks like a valid `AF-XXXX` tag. */
export function isAssetTag(value: string): boolean {
  const pattern = new RegExp(
    `^${ASSET_TAG.PREFIX}${ASSET_TAG.SEPARATOR}\\d{${ASSET_TAG.DIGITS},}$`,
  );
  return pattern.test(value);
}

let initialized = false;

/**
 * Reserve the next asset tag inside an active Prisma transaction.
 *
 * Uses a dedicated Postgres sequence so concurrent inserts cannot collide.
 * On first use in a process the sequence is created (idempotently) and
 * synced with the highest existing tag so already-seeded rows keep their
 * identity.
 */
export async function nextAssetTag(tx: Prisma.TransactionClient): Promise<string> {
  if (!initialized) {
    await tx.$executeRawUnsafe('CREATE SEQUENCE IF NOT EXISTS asset_tag_seq');
    // Bump the sequence to max(existing) if we're behind. `setval` accepts a
    // "is_called" third arg so the next nextval() returns setval+1.
    await tx.$executeRawUnsafe(`
      SELECT setval(
        'asset_tag_seq',
        GREATEST(
          COALESCE((SELECT last_value FROM asset_tag_seq), 1),
          COALESCE(
            (SELECT MAX(CAST(SUBSTRING(asset_tag FROM ${ASSET_TAG.PREFIX.length + ASSET_TAG.SEPARATOR.length + 1}) AS INTEGER))
               FROM assets
              WHERE asset_tag LIKE '${ASSET_TAG.PREFIX}${ASSET_TAG.SEPARATOR}%'),
            0
          )
        ),
        true
      )
    `);
    initialized = true;
  }
  const rows = await tx.$queryRawUnsafe<Array<{ nextval: bigint }>>(
    "SELECT nextval('asset_tag_seq') AS nextval",
  );
  const seqValue = rows[0]?.nextval;
  if (seqValue === undefined) {
    throw new Error('Failed to acquire next asset tag from sequence');
  }
  return formatAssetTag(Number(seqValue));
}

/** Reset the in-process init flag. Exposed for tests only. */
export function __resetTagInit(): void {
  initialized = false;
}
