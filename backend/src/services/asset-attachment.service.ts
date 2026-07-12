import fs from 'fs/promises';
import path from 'path';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { assetsRepository } from '../repositories/assets.repository';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors';
import { ASSET_ACTIONS } from '../constants/asset-lifecycle';
import { logger } from '../config/logger';

const MAX_ATTACHMENTS = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'application/pdf']);
const attachmentsDir = path.resolve(process.cwd(), env.UPLOAD_DIR, 'attachments');

async function ensureDir(): Promise<void> {
  await fs.mkdir(attachmentsDir, { recursive: true });
}

interface Actor {
  id: string;
}

export const assetAttachmentService = {
  async list(assetId: string) {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) throw new NotFoundError('Asset not found');
    return asset.attachments;
  },

  async add(assetId: string, file: Express.Multer.File, actor: Actor) {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) throw new NotFoundError('Asset not found');

    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new ValidationError('Only JPEG, PNG and PDF files are accepted', {
        mimetype: file.mimetype,
      });
    }
    if (file.size > MAX_BYTES) {
      throw new ValidationError('File exceeds the 10 MB maximum');
    }
    if (asset.attachments.length >= MAX_ATTACHMENTS) {
      throw new ConflictError(`Maximum of ${MAX_ATTACHMENTS} attachments per asset reached`);
    }

    await ensureDir();
    const ext = path.extname(file.originalname);
    const finalName = `${assetId}-${Date.now()}${ext}`;
    const finalPath = path.join(attachmentsDir, finalName);
    try {
      await fs.rename(file.path, finalPath);
    } catch (error) {
      // fs.rename fails across devices — fall back to copy + unlink.
      logger.warn('attachment rename failed, falling back to copy', { error });
      await fs.copyFile(file.path, finalPath);
      await fs.unlink(file.path).catch(() => undefined);
    }

    const created = await prisma.$transaction(async (tx) => {
      const attachment = await tx.assetAttachment.create({
        data: {
          assetId,
          fileName: file.originalname,
          fileUrl: `/uploads/attachments/${finalName}`,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedBy: actor.id,
          createdBy: actor.id,
          updatedBy: actor.id,
        },
      });
      await tx.assetHistory.create({
        data: {
          assetId,
          action: ASSET_ACTIONS.ATTACHMENT_ADDED,
          note: file.originalname,
          performedBy: actor.id,
        },
      });
      return attachment;
    });

    return created;
  },

  async remove(assetId: string, attachmentId: string, actor: Actor) {
    const asset = await assetsRepository.findById(assetId);
    if (!asset) throw new NotFoundError('Asset not found');

    const attachment = asset.attachments.find((a) => a.id === attachmentId);
    if (!attachment) throw new NotFoundError('Attachment not found');

    // Attempt to remove the physical file; ignore if already gone.
    const absolute = path.resolve(process.cwd(), '.' + attachment.fileUrl);
    await fs.unlink(absolute).catch(() => undefined);

    await prisma.$transaction(async (tx) => {
      await tx.assetAttachment.update({
        where: { id: attachmentId },
        data: { deletedAt: new Date(), isActive: false, updatedBy: actor.id },
      });
      await tx.assetHistory.create({
        data: {
          assetId,
          action: ASSET_ACTIONS.ATTACHMENT_REMOVED,
          note: attachment.fileName,
          performedBy: actor.id,
        },
      });
    });
  },
};
