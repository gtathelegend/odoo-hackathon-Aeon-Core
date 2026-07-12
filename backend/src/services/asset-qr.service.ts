import { prisma } from '../config/database';
import { assetsRepository } from '../repositories/assets.repository';
import { generateAssetQr } from './qr.service';
import { NotFoundError } from '../utils/errors';
import { ASSET_ACTIONS } from '../constants/asset-lifecycle';

interface Actor {
  id: string;
}

export const assetQrService = {
  async ensureForAsset(assetId: string, actor: Actor) {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) throw new NotFoundError('Asset not found');

    // If a QR already exists, reuse it.
    if (asset.qrCode) return asset.qrCode;

    const generated = await generateAssetQr({
      assetId: asset.id,
      assetTag: asset.assetTag,
    });

    return prisma.$transaction(async (tx) => {
      const qr = await tx.qRCode.create({
        data: {
          assetId,
          code: generated.code,
          imageUrl: generated.imageUrl,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
      await tx.assetHistory.create({
        data: {
          assetId,
          action: ASSET_ACTIONS.QR_GENERATED,
          note: generated.code,
          performedBy: actor.id,
        },
      });
      return qr;
    });
  },

  async regenerate(assetId: string, actor: Actor) {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) throw new NotFoundError('Asset not found');

    const generated = await generateAssetQr({
      assetId: asset.id,
      assetTag: asset.assetTag,
    });

    return prisma.$transaction(async (tx) => {
      const qr = await tx.qRCode.upsert({
        where: { assetId },
        create: {
          assetId,
          code: generated.code,
          imageUrl: generated.imageUrl,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
        update: {
          code: generated.code,
          imageUrl: generated.imageUrl,
          updatedBy: actor.id,
          scanCount: 0,
        },
      });
      await tx.assetHistory.create({
        data: {
          assetId,
          action: ASSET_ACTIONS.QR_GENERATED,
          note: `${generated.code} (regenerated)`,
          performedBy: actor.id,
        },
      });
      return qr;
    });
  },
};
