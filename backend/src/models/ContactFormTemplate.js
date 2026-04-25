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

const contactFormTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
  fields: [contactFieldSchema],
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('ContactFormTemplate', contactFormTemplateSchema);
