const upload = require('../config/s3');

exports.uploadSingle = (req, res) => {
  const uploadHandler = upload.single('file');

  uploadHandler(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message || 'File upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file provided.' });
    }

    // S3 returns location, local returns path
    const fileUrl = req.file.location || `/uploads/${req.file.filename}`;

    res.json({
      message: 'File uploaded successfully.',
      url: fileUrl,
      originalName: req.file.originalname,
    });
  });
};

exports.uploadMultiple = (req, res) => {
  const uploadHandler = upload.array('files', 10);

  uploadHandler(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: err.message || 'File upload failed.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files provided.' });
    }

    const files = req.files.map((file) => ({
      url: file.location || `/uploads/${file.filename}`,
      originalName: file.originalname,
    }));

    res.json({
      message: 'Files uploaded successfully.',
      files,
    });
  });
};
