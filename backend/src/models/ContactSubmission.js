const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  source: { type: String, default: 'product_contact_form' },
  submittedAt: { type: Date, default: Date.now },
}, { timestamps: true });

contactSubmissionSchema.index({ productId: 1, createdAt: -1 });

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
