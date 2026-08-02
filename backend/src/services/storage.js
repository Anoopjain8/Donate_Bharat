const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const env = require('../config/env');

const ALLOWED = {
  images: ['image/jpeg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'],
  all: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
};

const extByMime = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

const ensureLocalDir = (() => {
  let cached;
  return async () => {
    if (cached) return cached;
    const dir = path.resolve(process.cwd(), env.localUploadDir);
    await fs.mkdir(dir, { recursive: true });
    cached = dir;
    return dir;
  };
})();

let s3 = null;
const getS3 = () => {
  if (s3) return s3;
  s3 = new S3Client({
    region: env.aws.region,
    endpoint: env.aws.endpoint,
    credentials:
      env.aws.accessKeyId && env.aws.secretAccessKey
        ? {
            accessKeyId: env.aws.accessKeyId,
            secretAccessKey: env.aws.secretAccessKey,
          }
        : undefined,
  });
  return s3;
};

const isS3 = () => env.storageDriver === 's3';

function makeKey(folder, mime) {
  const ext = extByMime[mime] || 'bin';
  const id = crypto.randomBytes(16).toString('hex');
  return `${folder}/${Date.now()}-${id}.${ext}`;
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 80) || 'file';
}

/**
 * Validates a mime type against the allowed set.
 * @param {string} mime
 * @param {'all'|'images'|'pdf'} kind
 */
function isAllowedMime(mime, kind = 'all') {
  return ALLOWED[kind] ? ALLOWED[kind].includes(mime) : ALLOWED.all.includes(mime);
}

/**
 * Upload a buffer to the configured driver.
 * @returns {Promise<{key:string, name:string, mime:string, size:number}>}
 */
async function upload({ buffer, originalName, mime, folder = 'files', kind = 'all' }) {
  if (!isAllowedMime(mime, kind)) {
    const err = new Error(`File type ${mime} is not allowed`);
    err.code = 'INVALID_FILE_TYPE';
    throw err;
  }
  const key = makeKey(folder, mime);
  const name = sanitizeName(originalName || path.basename(key));

  if (isS3()) {
    await getS3().send(
      new PutObjectCommand({
        Bucket: env.aws.bucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
      })
    );
  } else {
    const dir = await ensureLocalDir();
    const target = path.join(dir, key.replace(/\//g, path.sep));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer);
  }

  return { key, name, mime, size: buffer.length };
}

/**
 * Return a browser-usable (signed) URL for a stored object.
 */
async function getFileUrl(key, options = {}) {
  const { download = false } = options;
  if (isS3()) {
    const cmd = new GetObjectCommand({
      Bucket: env.aws.bucket,
      Key: key,
      ResponseContentDisposition: download ? 'attachment' : 'inline',
    });
    return getSignedUrl(getS3(), cmd, { expiresIn: env.signedUrlTtl });
  }
  // Local driver: files are proxied through an authenticated endpoint.
  const disposition = download ? 'attachment' : 'inline';
  return `/api/files/${encodeURIComponent(key)}?disposition=${disposition}`;
}

async function exists(key) {
  if (isS3()) {
    try {
      await getS3().send(
        new HeadObjectCommand({ Bucket: env.aws.bucket, Key: key })
      );
      return true;
    } catch {
      return false;
    }
  }
  const dir = await ensureLocalDir();
  try {
    await fs.access(path.join(dir, key.replace(/\//g, path.sep)));
    return true;
  } catch {
    return false;
  }
}

async function remove(key) {
  if (!key) return;
  if (isS3()) {
    await getS3().send(
      new DeleteObjectCommand({ Bucket: env.aws.bucket, Key: key })
    );
  } else {
    const dir = await ensureLocalDir();
    const file = path.join(dir, key.replace(/\//g, path.sep));
    try {
      await fs.unlink(file);
    } catch {
      /* file already gone */
    }
  }
}

async function getStream(key) {
  if (isS3()) {
    const res = await getS3().send(
      new GetObjectCommand({ Bucket: env.aws.bucket, Key: key })
    );
    return { stream: res.Body, mime: res.ContentType };
  }
  const dir = await ensureLocalDir();
  const file = path.join(dir, key.replace(/\//g, path.sep));
  const mimeByExt = Object.entries(extByMime).reduce((acc, [m, e]) => {
    acc[e] = m;
    return acc;
  }, {});
  const mime = mimeByExt[path.extname(file).slice(1).toLowerCase()] || 'application/octet-stream';
  return { stream: fs.createReadStream(file), mime };
}

module.exports = {
  upload,
  getFileUrl,
  exists,
  remove,
  getStream,
  isAllowedMime,
  extByMime,
};
