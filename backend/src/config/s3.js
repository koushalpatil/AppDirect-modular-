const { S3Client } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const fs = require('fs');

// ── Allowed file types ───────────────────────────────────────────────────────

// Image MIME types allowed for logos and screenshots
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
const IMAGE_EXT = /\.(jpg|jpeg|png|webp|svg|gif)$/i;

// Document MIME types allowed for resources
const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];
const DOC_EXT = /\.(pdf|doc|docx|csv|xls|xlsx|txt)$/i;

/**
 * Multer fileFilter that accepts both images and documents.
 * Frontend enforces tighter per-type size/resolution limits.
 */
function combinedFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const isImage = IMAGE_TYPES.includes(file.mimetype) && IMAGE_EXT.test(ext);
  const isDoc = DOC_TYPES.includes(file.mimetype) && DOC_EXT.test(ext);

  if (isImage || isDoc) {
    cb(null, true);
  } else {
    cb(new Error(
      `Unsupported file type "${file.mimetype}". ` +
      'Allowed images: JPEG, PNG, WebP, SVG, GIF. ' +
      'Allowed documents: PDF, Word, Excel, CSV, TXT.'
    ));
  }
}

// ── Storage configuration ────────────────────────────────────────────────────

let upload;

// Check if AWS credentials are configured
const hasS3Config = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;

if (hasS3Config) {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  upload = multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.AWS_S3_BUCKET,
      metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
      },
      key: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `uploads/${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB backend max; frontend enforces tighter per-type limits
    fileFilter: combinedFileFilter,
  });
} else {
  // Fallback to local disk storage for development
  const uploadsDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB backend max
    fileFilter: combinedFileFilter,
  });
}

module.exports = upload;
