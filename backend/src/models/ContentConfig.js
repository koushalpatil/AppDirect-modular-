const mongoose = require('mongoose');

const contactOptionSchema = new mongoose.Schema({
  label: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
}, { _id: false });

const contactValidationSchema = new mongoose.Schema({
  minLength: { type: Number },
  maxLength: { type: Number },
  regex: { type: String },
  min: { type: Number },
  max: { type: Number },
  step: { type: Number },
  minDate: { type: String },
  maxDate: { type: String },
  customError: { type: String },
}, { _id: false });

const contactFieldSchema = new mongoose.Schema({
  fieldName: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ['text', 'textarea', 'email', 'url', 'number', 'select', 'radio', 'checkbox', 'date', 'file', 'tel'],
    default: 'text',
  },
  required: { type: Boolean, default: false },
  placeholder: { type: String },
  defaultValue: { type: mongoose.Schema.Types.Mixed },
  helpText: { type: String },
  options: [contactOptionSchema],
  validations: { type: contactValidationSchema, default: () => ({}) },
  isDefault: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
}, { _id: true });

const homepageCategorySchema = new mongoose.Schema({
  categoryAttributeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attribute' },
  categoryName: { type: String },
  categoryValue: { type: String },
  title: { type: String },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  order: { type: Number, default: 0 },
}, { _id: true });

// ─── Footer Schemas ───
const footerLinkSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
}, { _id: false });

const footerSectionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  links: { type: [footerLinkSchema], default: [], validate: [v => v.length <= 7, 'Max 7 links per section'] },
}, { _id: true });

const footerContentSchema = new mongoose.Schema({
  title: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
}, { _id: false });

const socialMediaSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['facebook', 'x', 'instagram', 'linkedin', 'youtube'],
    required: true,
  },
  url: { type: String, required: true, trim: true },
}, { _id: false });

const bottomFooterLinkSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
}, { _id: false });

const contentConfigSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['contact_form', 'homepage', 'similarity_settings', 'footer'],
    required: true,
    unique: true,
  },

  // Contact form fields
  contactFields: [contactFieldSchema],

  // Homepage config
  heroImage: { type: String },
  slidingImages: [{ type: String }],
  homepageCategories: [homepageCategorySchema],

  // Similarity settings
  minSimilarityScore: { type: Number, default: 0.2, min: 0, max: 1 },
  maxResults: { type: Number, default: 5, min: 1, max: 20 },
  fallbackAttributeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attribute' },

  // Footer config
  footerSections: { type: [footerSectionSchema], default: [], validate: [v => v.length <= 2, 'Max 2 footer sections'] },
  footerContent: { type: footerContentSchema, default: () => ({}) },
  socialMedia: { type: [socialMediaSchema], default: [] },
  bottomFooterLinks: { type: [bottomFooterLinkSchema], default: [] },
  bottomFooterCopyright: { type: String, default: '', trim: true },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ContentConfig', contentConfigSchema);
