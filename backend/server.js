const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const { sendResponse } = require('./src/common/utils/apiResponse');
const { errorHandler, notFoundHandler } = require('./src/common/middlewares/errorHandler');

const app = express();

// Connect to MongoDB
connectDB();

// Security & parsing middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files locally
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/products', require('./src/routes/product.routes'));
app.use('/api/catalog', require('./src/routes/catalog.routes'));
app.use('/api/config', require('./src/routes/config.routes'));
app.use('/api/upload', require('./src/routes/upload.routes'));

// Health check
app.get('/api/health', (req, res) => {
  return sendResponse(res, {
    success: true,
    message: 'Service is healthy.',
    data: { status: 'ok', timestamp: new Date().toISOString() },
  });
});

// 404 + global error handlers
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`🚀 Server running on port ${env.port}`);
});

module.exports = app;
