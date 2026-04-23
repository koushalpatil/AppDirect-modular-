import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productAPI, configAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import './Public.css'; // Will use pub-modal CSS classes for styling

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TEL_RE = /^[+]?[\d\s().-]{7,20}$/;

const isEmpty = (value) => value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);

const getInitialValue = (field) => {
  if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') {
    if (field.type === 'checkbox') {
      return Array.isArray(field.defaultValue) ? field.defaultValue : [field.defaultValue];
    }
    return field.defaultValue;
  }
  if (field.type === 'checkbox') return [];
  return '';
};

const isPublicExcludedField = (field) => {
  return field?.type === 'file';
};

export default function ProductContact() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [fields, setFields] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [productRes, formRes] = await Promise.all([
        productAPI.getPublicOne(id),
        productAPI.getPublicContactForm(id),
      ]);

      const configuredFields = (formRes.data.fields || [])
        .filter((field) => !isPublicExcludedField(field))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const initialValues = {};
      configuredFields.forEach((field) => {
        initialValues[field.fieldName] = getInitialValue(field);
      });

      setProduct(productRes.data.product);
      setFields(configuredFields);
      setFormValues(initialValues);
    } catch {
      toast.error('Failed to load form');
      navigate('/products');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const validateField = (field, rawValue) => {
    const fieldLabel = field.label || field.fieldName;
    const validations = field.validations || {};

    if (field.required && isEmpty(rawValue)) {
      return validations.customError || `${fieldLabel} is required`;
    }
    if (!field.required && isEmpty(rawValue)) {
      return '';
    }

    if (field.type === 'checkbox') {
      const selected = Array.isArray(rawValue) ? rawValue : [rawValue];
      const allowed = new Set((field.options || []).map((o) => o.value));
      const invalid = selected.find((value) => !allowed.has(value));
      if (invalid) return validations.customError || `${fieldLabel} has invalid option selected`;
      return '';
    }

    if (field.type === 'number') {
      const num = Number(rawValue);
      if (!Number.isFinite(num)) return validations.customError || `${fieldLabel} must be a number`;
      if (validations.min !== undefined && num < validations.min) return validations.customError || `${fieldLabel} must be >= ${validations.min}`;
      if (validations.max !== undefined && num > validations.max) return validations.customError || `${fieldLabel} must be <= ${validations.max}`;
      return '';
    }

    if (field.type === 'select' || field.type === 'radio') {
      const allowed = new Set((field.options || []).map((o) => o.value));
      if (!allowed.has(String(rawValue))) return validations.customError || `${fieldLabel} has invalid selection`;
      return '';
    }

    if (field.type === 'date') {
      const dateVal = new Date(String(rawValue));
      if (Number.isNaN(dateVal.getTime())) return validations.customError || `${fieldLabel} must be a valid date`;
      if (validations.minDate && dateVal < new Date(validations.minDate)) return validations.customError || `${fieldLabel} should be on/after ${validations.minDate}`;
      if (validations.maxDate && dateVal > new Date(validations.maxDate)) return validations.customError || `${fieldLabel} should be on/before ${validations.maxDate}`;
      return '';
    }

    const value = String(rawValue).trim();

    if (field.type === 'email') {
      if (!EMAIL_RE.test(value)) return validations.customError || `${fieldLabel} must be a valid email address`;
    }

    if (field.type === 'tel') {
      if (!TEL_RE.test(value)) return validations.customError || `${fieldLabel} must be a valid phone number`;
    }

    if (field.type === 'url') {
      try {
        const u = new URL(value);
        if (u.protocol !== 'http:' && u.protocol !== 'https:') {
          return validations.customError || `${fieldLabel} must be a valid HTTP/HTTPS URL`;
        }
      } catch {
        return validations.customError || `${fieldLabel} must be a valid URL`;
      }
    }

    if (validations.minLength !== undefined && value.length < validations.minLength) {
      return validations.customError || `${fieldLabel} must be at least ${validations.minLength} characters`;
    }
    if (validations.maxLength !== undefined && value.length > validations.maxLength) {
      return validations.customError || `${fieldLabel} must be at most ${validations.maxLength} characters`;
    }
    if (validations.regex) {
      try {
        const re = new RegExp(validations.regex);
        if (!re.test(value)) return validations.customError || `${fieldLabel} format is invalid`;
      } catch {
        return `${fieldLabel} has invalid validation pattern`;
      }
    }
    return '';
  };

  const runValidation = () => {
    const nextErrors = {};
    fields.forEach((field) => {
      const error = validateField(field, formValues[field.fieldName]);
      if (error) nextErrors[field.fieldName] = error;
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const setFieldValue = (name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFieldValue(name, value);
  };

  const handleCheckboxChange = (fieldName, optionValue) => {
    setFormValues((prev) => {
      const current = Array.isArray(prev[fieldName]) ? prev[fieldName] : [];
      const next = current.includes(optionValue)
        ? current.filter((x) => x !== optionValue)
        : [...current, optionValue];
      return { ...prev, [fieldName]: next };
    });
    setErrors((prev) => ({ ...prev, [fieldName]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const valid = runValidation();
    if (!valid) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    setSubmitting(true);
    try {
      await configAPI.submitPublicContactForm({
        productId: id,
        values: formValues,
      });
      setIsSubmitted(true);
    } catch (err) {
      const backendErrors = err?.response?.data?.errors;
      if (backendErrors && typeof backendErrors === 'object') {
        setErrors(backendErrors);
      }
      toast.error(err?.response?.data?.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const value = formValues[field.fieldName];
    const fieldError = errors[field.fieldName];
    const validations = field.validations || {};

    const commonProps = {
      name: field.fieldName,
      value: value ?? '',
      onChange: handleChange,
      placeholder: field.placeholder || '',
      required: !!field.required,
      className: `pub-form-input ${errors[field.fieldName] ? 'pub-form-input-error' : ''}`,
    };

    return (
      <div
        key={field.fieldName}
        className="pub-form-group"
        style={{
          marginBottom: 0,
          gridColumn: ['textarea', 'checkbox', 'radio'].includes(field.type) ? '1 / -1' : 'auto',
        }}
      >
        <label className="pub-form-label">
          {field.label}
          {field.required && <span className="required">*</span>}
        </label>

        {field.type === 'textarea' && (
          <textarea
            {...commonProps}
            className={`pub-form-textarea ${errors[field.fieldName] ? 'pub-form-input-error' : ''}`}
            rows={5}
            minLength={validations.minLength}
            maxLength={validations.maxLength}
          />
        )}

        {(['text', 'email', 'number', 'date', 'tel', 'url'].includes(field.type)) && (
          <input
            {...commonProps}
            type={field.type === 'text' ? 'text' : field.type}
            min={field.type === 'number' ? validations.min : (field.type === 'date' ? validations.minDate : undefined)}
            max={field.type === 'number' ? validations.max : (field.type === 'date' ? validations.maxDate : undefined)}
            step={field.type === 'number' ? validations.step : undefined}
            minLength={['text', 'tel', 'url', 'email', 'textarea'].includes(field.type) ? validations.minLength : undefined}
            maxLength={['text', 'tel', 'url', 'email', 'textarea'].includes(field.type) ? validations.maxLength : undefined}
            pattern={validations.regex || undefined}
          />
        )}

        {(field.type === 'select') && (
          <select
            name={field.fieldName}
            className="pub-form-select"
            value={value ?? ''}
            onChange={handleChange}
            required={!!field.required}
          >
            <option value="" disabled hidden>Select</option>
            {(field.options || []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}

        {field.type === 'radio' && (
          <div className="pub-choice-list grid-cols">
            {(field.options || []).map((opt) => (
              <label key={opt.value} className="pub-choice-item">
                <input
                  type="radio"
                  name={field.fieldName}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={handleChange}
                />
                <span className="pub-radio-box" />
                <span className="pub-choice-label">{opt.label}</span>
              </label>
            ))}
          </div>
        )}

        {field.type === 'checkbox' && (
          <div className="pub-choice-list grid-cols">
            {(field.options || []).map((opt) => (
              <label key={opt.value} className="pub-choice-item">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(opt.value)}
                  onChange={() => handleCheckboxChange(field.fieldName, opt.value)}
                />
                <span className="pub-check-box" />
                <span className="pub-choice-label">{opt.label}</span>
              </label>
            ))}
          </div>
        )}
        {field.helpText && <small style={{ display: 'block', color: '#64748b', marginTop: 4 }}>{field.helpText}</small>}

        {fieldError && <small style={{ color: '#dc2626', display: 'block', marginTop: 4 }}>{fieldError}</small>}
      </div>
    );
  };

  if (loading) return <div className="pub-loader" style={{ minHeight: '60vh' }}><div className="pub-spinner" /></div>;
  if (!product) return null;

  return (
    <div className="pc-page-wrapper" style={{ padding: '40px 24px', background: '#f8fafc', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div className="pub-modal" style={{ maxWidth: '900px', position: 'relative', height: 'fit-content', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
        <div className="pub-modal-header" style={{ padding: '24px 32px' }}>
          <h3 style={{ fontSize: '24px' }}>{isSubmitted ? 'Information Submitted' : 'Submit your information'}</h3>
          <button className="pub-modal-close" onClick={() => navigate(`/products/${id}`)}>
            <X size={24} />
          </button>
        </div>
        
        {isSubmitted ? (
          <div style={{ padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', marginBottom: 24 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 12 }}>Thank you for reaching out!</h2>
            <p style={{ color: '#64748b', fontSize: 16, marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
              We have received your details. A representative will be in touch with you shortly.
            </p>
            <button 
              onClick={() => navigate(`/products/${id}`)}
              style={{ background: '#0183FF', color: '#fff', padding: '12px 32px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>
              Return to Product
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '32px' }} noValidate>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            {fields.map((field) => renderField(field))}
          </div>
          
          <button type="submit" disabled={submitting} style={{ background: '#0f172a', color: '#fff', padding: '10px 32px', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: submitting ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: submitting ? 0.7 : 1 }}>
            {submitting ? 'Submitting...' : 'Send'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
