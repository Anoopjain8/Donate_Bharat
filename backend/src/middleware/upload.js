const multer = require('multer');
const ApiError = require('../utils/ApiError');
const storage = require('../services/storage');

/**
 * Multer in-memory storage. Validation happens in-memory so bad files are
 * never written to disk/object storage. Max file size is configurable.
 */
const createUploader = ({ fieldName, maxFiles = 1, maxSizeMB = 10, kind = 'all' }) => {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxSizeMB * 1024 * 1024, files: maxFiles },
    fileFilter: (_req, file, cb) => {
      if (!storage.isAllowedMime(file.mimetype, kind)) {
        return cb(new ApiError(400, `File type "${file.mimetype}" is not allowed. Use PDF or image files.`));
      }
      cb(null, true);
    },
  });

  const handle = (req, res, next) => {
    upload.array(fieldName, maxFiles)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, `File too large. Maximum ${maxSizeMB}MB per file.`));
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return next(new ApiError(400, `Too many files. Maximum ${maxFiles} files.`));
        }
        return next(new ApiError(400, `Upload error: ${err.message}`));
      }
      if (err) return next(err);
      return next();
    });
  };

  return handle;
};

module.exports = { createUploader };
