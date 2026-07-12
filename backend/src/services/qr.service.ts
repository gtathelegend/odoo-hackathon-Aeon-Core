import fs from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';
import { env } from '../config/env';
import { generateRandomHex } from '../utils/crypto';

const qrDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'qr');

async function ensureDir(): Promise<void> {
  await fs.mkdir(qrDir, { recursive: true });
}

export interface GeneratedQr {
  code: string;
  imagePath: string;
  imageUrl: string;
  payload: string;
}

/**
 * Generate a QR code PNG for the given asset. Returns the storage-relative
 * URL, absolute path, and the opaque `code` that appears on the label. The
 * label itself encodes a deep link back to the asset passport page.
 */
export async function generateAssetQr(input: {
  assetId: string;
  assetTag: string;
}): Promise<GeneratedQr> {
  await ensureDir();
  const opaque = generateRandomHex(12);
  const code = `${input.assetTag}-${opaque}`;
  const payload = JSON.stringify({
    type: 'assetflow.asset',
    id: input.assetId,
    tag: input.assetTag,
    code,
  });
  const fileName = `${input.assetId}.png`;
  const absolutePath = path.join(qrDir, fileName);
  await QRCode.toFile(absolutePath, payload, {
    errorCorrectionLevel: 'M',
    margin: 1,
    scale: 6,
  });
  return {
    code,
    imagePath: absolutePath,
    imageUrl: `/uploads/qr/${fileName}`,
    payload,
  };
}
