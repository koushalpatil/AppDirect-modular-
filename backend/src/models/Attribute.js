const mongoose = require('mongoose');

const attributeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Attribute name is required'],
    trim: true,
    unique: true,
  },
  description: { type: String, trim: true },
  displayOnHomepage: { type: Boolean, default: false },
  requiredInProductEditor: { type: Boolean, default: false },
  showForFiltering: { type: Boolean, default: false },
  options: [{ type: String, trim: true }],
  linkedProductsCount: { type: Number, default: 0 },
  similarity: {
    useInSimilarity: { type: Boolean, default: false },
    weight: { type: Number, default: 1, min: 0, max: 10 },
    matchType: {
      type: String,
      enum: ['exact', 'overlap', 'partial'],
      default: 'exact',
    },
  },
}, { timestamps: true });

module.exports = mongoose.model('Attribute', attributeSchema);
