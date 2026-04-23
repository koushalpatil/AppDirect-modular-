const mongoose = require('mongoose');

const overviewSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  screenshots: [{ type: String }],
}, { _id: true });

const featureSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  screenshots: [{ type: String }],
}, { _id: true });

const customTabElementSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  screenshots: [{ type: String }],
}, { _id: true });

const customTabSchema = new mongoose.Schema({
  tabName: { type: String, required: true, trim: true, maxlength: 50 },
  elements: [customTabElementSchema],
}, { _id: true });

const productSchema = new mongoose.Schema({
  // Stage 1: Define Product
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: 200,
  },

  // Stage 2: Listing Information
  tagline: { type: String, trim: true, maxlength: 300 },
  developerName: { type: String, trim: true, maxlength: 100 },
  logo: { type: String },
  tags: [{ type: String, trim: true }],
  overview: [overviewSchema],
  features: [featureSchema],
  customTabs: [customTabSchema],

  // Stage 3: Product Information
  attributes: [{
    attributeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attribute' },
    attributeName: { type: String },
    values: [{ type: String }],
  }],
  supportDescription: { type: String },
  policies: { type: String },
  resources: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
  }],

  // Stage 4: Contact Form Configuration (per-product)
  useCustomContactForm: { type: Boolean, default: false },
  contactFields: [{
    fieldName: { type: String, required: true },
    label: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'textarea', 'email', 'number', 'select', 'radio', 'checkbox', 'date', 'file', 'tel'],
      default: 'text',
    },
    required: { type: Boolean, default: false },
    placeholder: { type: String },
    defaultValue: { type: mongoose.Schema.Types.Mixed },
    helpText: { type: String },
    options: [{
      label: { type: String, required: true, trim: true },
      value: { type: String, required: true, trim: true },
    }],
    validations: {
      minLength: { type: Number },
      maxLength: { type: Number },
      regex: { type: String },
      min: { type: Number },
      max: { type: Number },
      step: { type: Number },
      minDate: { type: String },
      maxDate: { type: String },
      customError: { type: String },
    },
    isDefault: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  }],

  // Metadata
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { timestamps: true });

productSchema.index({ name: 'text', tagline: 'text', tags: 'text' });
productSchema.index({ status: 1 });
productSchema.index({ 'attributes.attributeId': 1 });

module.exports = mongoose.model('Product', productSchema);
