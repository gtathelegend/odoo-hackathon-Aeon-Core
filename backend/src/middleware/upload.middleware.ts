import path from 'path';
import multer from 'multer';

const uploadDir = path.resolve(process.cwd(), 'uploads');

/**
 * Multer upload middleware placeholder using disk storage.
 * File-type/size rules and field mappings are defined in a later prompt.
 */
export const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  }),
});
