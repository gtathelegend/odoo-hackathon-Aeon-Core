import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env';

const uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
const tempDir = path.resolve(process.cwd(), env.UPLOAD_TEMP_DIR);

// Ensure the target directories exist at boot so multer never fails on write.
[uploadDir, tempDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

/**
 * Multer upload middleware. Uses disk storage inside `uploads/temp` so files
 * can be moved or forwarded to object storage by feature modules later.
 */
export const upload = multer({
  storage,
  limits: { fileSize: env.UPLOAD_MAX_SIZE },
});

export const UPLOAD_PATHS = {
  root: uploadDir,
  temp: tempDir,
};
