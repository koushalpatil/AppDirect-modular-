import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productAPI, catalogAPI, uploadAPI, configAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Check, Plus, Trash2, Upload, Image, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import './Admin.css';
import {
  validateLogoFile,
  validateScreenshotFile,
  validateResourceFile,
  validateTag,
  validateProductForm,
  LIMITS,
  LOGO_MAX_SIZE_MB,
  SCREENSHOT_MAX_PER_SECTION,
  RESOURCE_MAX_SIZE_MB,
} from '../../utils/productValidation';
import ContactFieldEditor from '../../components/admin/ContactFieldEditor';

const STEPS = ['Define Product', 'Define Tabs', 'Define Attributes', 'Configure Contact Us Form'];

function CharCount({ value, max, warn = 0.85 }) {
  const len = (value || '').length;
  const ratio = len / max;
  const color = ratio >= 1 ? '#ef4444' : ratio >= warn ? '#f59e0b' : '#9ca3af';
  return (
    <span style={{ fontSize: 11, color, float: 'right', marginTop: 2 }}>
      {len}/{max}
    </span>
  );
}

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#ef4444', fontSize: 12 }}>
      <AlertCircle size={12} /> {msg}
    </div>
  );
}

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [attributes, setAttributes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingScreenshots, setUploadingScreenshots] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [collapsedTabs, setCollapsedTabs] = useState({});
  const [collapsedFeatures, setCollapsedFeatures] = useState({});

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    developerName: '',
    logo: '',
    tags: [],
    overview: [],
    features: [],
    customTabs: [],
    attributes: [],
    resources: [],
    useCustomContactForm: false,
    contactFields: [],
    status: 'draft',
  });

  useEffect(() => { loadProduct(); loadAttributes(); }, [id]);

  const loadProduct = async () => {
    try {
      const res = await productAPI.getOne(id);
      const p = res.data.product;
      setForm({
        name: p.name || '',
        tagline: p.tagline || '',
        developerName: p.developerName || '',
        logo: p.logo || '',
        tags: p.tags || [],
        overview: p.overview?.length
          ? p.overview
          : [{ title: '', description: '', screenshots: [] }],
        features: p.features?.length
          ? p.features
          : [{ title: '', description: '', screenshots: [] }],
        customTabs: p.customTabs || [],
        attributes: (p.attributes || []).map(a => ({
          attributeId: a.attributeId?._id || a.attributeId,
          attributeName: a.attributeId?.name || a.attributeName,
          values: a.values || [],
        })),
        resources: p.resources || [],
        useCustomContactForm: p.useCustomContactForm || false,
        contactFields: p.contactFields || [],
        status: p.status || 'draft',
      });
    } catch {
      toast.error('Failed to load product');
      navigate('/admin/products');
    } finally {
      setLoading(false);
    }
  };

  const loadAttributes = async () => {
    try {
      const res = await catalogAPI.getAll();
      setAttributes(res.data.attributes || []);
    } catch {}
  };

  const loadLogs = async () => {
    try {
      const res = await productAPI.getLogs(id);
      setLogs(res.data.logs || []);
      setShowLogs(true);
    } catch {
      toast.error('Failed to load edit logs');
    }
  };

  const update = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    setFieldErrors(prev => ({ ...prev, [field]: null }));
  };
  const setFieldError = (field, msg) =>
    setFieldErrors(prev => ({ ...prev, [field]: msg }));

  // ── Real-time inline field validation (called on blur) ─────────────────────
  const validateField = (field, value) => {
    const v = typeof value === 'string' ? value.trim() : value;
    switch (field) {
      case 'name':
        if (!v) return setFieldError('name', 'Product name is required');
        if (v.length < LIMITS.name.min) return setFieldError('name', `Name must be at least ${LIMITS.name.min} characters`);
        if (v.length > LIMITS.name.max) return setFieldError('name', `Name must be under ${LIMITS.name.max} characters`);
        return setFieldError('name', null);
      case 'tagline':
        if (v && v.length > LIMITS.tagline.max) return setFieldError('tagline', `Tagline must be under ${LIMITS.tagline.max} characters`);
        return setFieldError('tagline', null);
      case 'developerName':
        if (v && v.length > LIMITS.developerName.max) return setFieldError('developerName', `Developer name must be under ${LIMITS.developerName.max} characters`);
        return setFieldError('developerName', null);
      default:
        return setFieldError(field, null);
    }
  };

  // ── Tag management ──────────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim();
    const result = validateTag(t, form.tags);
    if (!result.ok) { toast.error(result.error); return; }
    update('tags', [...form.tags, t]);
    setTagInput('');
  };
  const removeTag = (tag) => update('tags', form.tags.filter(t => t !== tag));

  // ── Repeater helpers ────────────────────────────────────────────────────────
  const addRepeaterItem = (field) =>
    update(field, [...form[field], { title: '', description: '', screenshots: [] }]);
  const removeRepeaterItem = (field, idx) =>
    update(field, form[field].filter((_, i) => i !== idx));
  const updateRepeater = (field, idx, key, val) => {
    const items = [...form[field]];
    items[idx] = { ...items[idx], [key]: val };
    update(field, items);
  };

  // ── Attribute management ────────────────────────────────────────────────────
  const toggleAttribute = (attr) => {
    const existing = form.attributes.find(a => a.attributeId === attr._id);
    if (existing) {
      update('attributes', form.attributes.filter(a => a.attributeId !== attr._id));
    } else {
      update('attributes', [
        ...form.attributes,
        { attributeId: attr._id, attributeName: attr.name, values: [] },
      ]);
    }
  };
  const setAttributeValues = (attrId, values) => {
    update('attributes', form.attributes.map(a =>
      a.attributeId === attrId ? { ...a, values } : a
    ));
  };

  // ── Logo upload ─────────────────────────────────────────────────────────────
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const result = await validateLogoFile(file);
    if (!result.ok) {
      toast.error(result.error);
      setFieldError('logo', result.error);
      return;
    }
    setFieldError('logo', null);
    setUploadingLogo(true);
    try {
      const res = await uploadAPI.single(file);
      update('logo', res.data.url);
      toast.success('Logo uploaded successfully');
    } catch {
      toast.error('Logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Screenshot upload ───────────────────────────────────────────────────────
  const handleMultipleFileUpload = async (field, idx, e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const currentCount = form[field][idx].screenshots.length;
    if (currentCount >= SCREENSHOT_MAX_PER_SECTION) {
      toast.error(`Maximum ${SCREENSHOT_MAX_PER_SECTION} screenshots per section.`);
      return;
    }
    const available = SCREENSHOT_MAX_PER_SECTION - currentCount;
    const toUpload = files.slice(0, available);
    if (files.length > available) {
      toast(`Only ${available} more screenshot(s) can be added.`, { icon: '⚠️' });
    }

    for (const file of toUpload) {
      const check = validateScreenshotFile(file);
      if (!check.ok) { toast.error(`${file.name}: ${check.error}`); return; }
    }

    const key = `${field}-${idx}`;
    setUploadingScreenshots(prev => ({ ...prev, [key]: true }));
    try {
      const res = await uploadAPI.multiple(toUpload);
      const urls = res.data.files.map(f => f.url);
      const items = [...form[field]];
      items[idx] = { ...items[idx], screenshots: [...items[idx].screenshots, ...urls] };
      update(field, items);
      toast.success(`${urls.length} screenshot(s) uploaded`);
    } catch {
      toast.error('Screenshot upload failed.');
    } finally {
      setUploadingScreenshots(prev => ({ ...prev, [key]: false }));
    }
  };

  // ── Custom tab screenshot upload ─────────────────────────────────────────
  const handleCustomTabScreenshots = async (tabIdx, elIdx, e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const currentCount = form.customTabs[tabIdx].elements[elIdx].screenshots.length;
    if (currentCount >= SCREENSHOT_MAX_PER_SECTION) {
      toast.error(`Maximum ${SCREENSHOT_MAX_PER_SECTION} screenshots per element.`);
      return;
    }
    const available = SCREENSHOT_MAX_PER_SECTION - currentCount;
    const toUpload = files.slice(0, available);
    if (files.length > available) {
      toast(`Only ${available} more screenshot(s) can be added.`, { icon: '⚠️' });
    }

    for (const file of toUpload) {
      const check = validateScreenshotFile(file);
      if (!check.ok) { toast.error(`${file.name}: ${check.error}`); return; }
    }

    const key = `custom-${tabIdx}-${elIdx}`;
    setUploadingScreenshots(prev => ({ ...prev, [key]: true }));
    try {
      const res = await uploadAPI.multiple(toUpload);
      const urls = res.data.files.map(f => f.url);
      const tabs = [...form.customTabs];
      const els = [...tabs[tabIdx].elements];
      els[elIdx] = { ...els[elIdx], screenshots: [...els[elIdx].screenshots, ...urls] };
      tabs[tabIdx] = { ...tabs[tabIdx], elements: els };
      update('customTabs', tabs);
      toast.success(`${urls.length} screenshot(s) uploaded`);
    } catch {
      toast.error('Screenshot upload failed.');
    } finally {
      setUploadingScreenshots(prev => ({ ...prev, [key]: false }));
    }
  };

  const removeCustomTabScreenshot = (tabIdx, elIdx, ssIdx) => {
    const tabs = [...form.customTabs];
    const els = [...tabs[tabIdx].elements];
    els[elIdx] = {
      ...els[elIdx],
      screenshots: els[elIdx].screenshots.filter((_, i) => i !== ssIdx),
    };
    tabs[tabIdx] = { ...tabs[tabIdx], elements: els };
    update('customTabs', tabs);
  };

  // ── Custom tab management ──────────────────────────────────────────────────
  const addCustomTab = () => {
    if (form.customTabs.length >= LIMITS.maxCustomTabs) {
      toast.error(`Maximum ${LIMITS.maxCustomTabs} custom tabs allowed.`);
      return;
    }
    update('customTabs', [...form.customTabs, { tabName: '', elements: [{ title: '', description: '', screenshots: [] }] }]);
  };

  const removeCustomTab = (tabIdx) => {
    update('customTabs', form.customTabs.filter((_, i) => i !== tabIdx));
  };

  const updateCustomTabName = (tabIdx, name) => {
    const tabs = [...form.customTabs];
    tabs[tabIdx] = { ...tabs[tabIdx], tabName: name };
    update('customTabs', tabs);
  };

  const addCustomTabElement = (tabIdx) => {
    const tab = form.customTabs[tabIdx];
    if (tab.elements.length >= LIMITS.maxCustomTabElements) {
      toast.error(`Maximum ${LIMITS.maxCustomTabElements} elements per tab.`);
      return;
    }
    const tabs = [...form.customTabs];
    tabs[tabIdx] = { ...tabs[tabIdx], elements: [...tabs[tabIdx].elements, { title: '', description: '', screenshots: [] }] };
    update('customTabs', tabs);
  };

  const removeCustomTabElement = (tabIdx, elIdx) => {
    const tabs = [...form.customTabs];
    tabs[tabIdx] = {
      ...tabs[tabIdx],
      elements: tabs[tabIdx].elements.filter((_, i) => i !== elIdx),
    };
    update('customTabs', tabs);
  };

  const updateCustomTabElement = (tabIdx, elIdx, key, val) => {
    const tabs = [...form.customTabs];
    const els = [...tabs[tabIdx].elements];
    els[elIdx] = { ...els[elIdx], [key]: val };
    tabs[tabIdx] = { ...tabs[tabIdx], elements: els };
    update('customTabs', tabs);
  };

  const toggleTabCollapse = (tabIdx) => {
    setCollapsedTabs(prev => ({ ...prev, [tabIdx]: !prev[tabIdx] }));
  };

  // ── Resource upload ─────────────────────────────────────────────────────────
  const handleResourceUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const check = validateResourceFile(file);
    if (!check.ok) { toast.error(check.error); return; }

    const key = 'resource-upload';
    setUploadingScreenshots(prev => ({ ...prev, [key]: true }));
    try {
      const res = await uploadAPI.single(file);
      update('resources', [...form.resources, { name: file.name, url: res.data.url }]);
      toast.success('Resource file added');
    } catch {
      toast.error('Resource upload failed.');
    } finally {
      setUploadingScreenshots(prev => ({ ...prev, [key]: false }));
    }
  };

  const removeResource = (idx) =>
    update('resources', form.resources.filter((_, i) => i !== idx));
  const removeScreenshot = (field, itemIdx, ssIdx) => {
    const items = [...form[field]];
    items[itemIdx] = {
      ...items[itemIdx],
      screenshots: items[itemIdx].screenshots.filter((_, i) => i !== ssIdx),
    };
    update(field, items);
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async (status) => {
    // For drafts: only require product name
    // For publish: run full validation
    if (status === 'published') {
      const formErrors = validateProductForm(form);
      if (formErrors.length > 0) {
        formErrors.forEach(err => toast.error(err));
        return;
      }
    } else {
      const name = (form.name || '').trim();
      if (!name) {
        toast.error('Product name is required to save a draft');
        return;
      }
    }

    // Filter out empty sub-document items to prevent Mongoose required field errors
    const cleanOverview = (form.overview || []).filter(
      item => (item.title || '').trim() || (item.description || '').trim()
    );
    const cleanFeatures = (form.features || []).filter(
      item => (item.title || '').trim() || (item.description || '').trim()
    );
    const cleanCustomTabs = (form.customTabs || []).filter(
      tab => (tab.tabName || '').trim()
    ).map(tab => ({
      ...tab,
      elements: (tab.elements || []).filter(
        el => (el.title || '').trim() || (el.description || '').trim()
      ),
    }));

    const payload = {
      ...form,
      overview: cleanOverview,
      features: cleanFeatures,
      customTabs: cleanCustomTabs,
      status,
    };

    setSaving(true);
    try {
      await productAPI.update(id, payload);
      toast.success(status === 'published' ? 'Product published!' : 'Draft saved!');
      navigate('/admin/products');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  // ── Shared repeater renderer ────────────────────────────────────────────────
  const renderRepeaterSection = (field, label) => (
    <div className="wizard-section">
      <h3 className="wizard-section-title">{label}</h3>
      {(form[field] || []).map((item, idx) => (
        <div key={idx} className="repeater-item" style={{ paddingTop: field === 'features' ? 'var(--space-md)' : undefined }}>
          {field === 'features' ? (
            <>
              {/* Collapsible header for features */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsedFeatures[idx] ? 0 : 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <button
                    type="button"
                    className="btn btn-icon btn-ghost"
                    onClick={() => setCollapsedFeatures(prev => ({ ...prev, [idx]: !prev[idx] }))}
                    title={collapsedFeatures[idx] ? 'Expand' : 'Collapse'}
                  >
                    {collapsedFeatures[idx] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    Feature {idx + 1}{item.title ? `: ${item.title}` : ''}
                  </span>
                </div>
                {form[field].length > 1 && (
                  <button
                    className="btn btn-icon btn-ghost"
                    onClick={() => removeRepeaterItem(field, idx)}
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {!collapsedFeatures[idx] && (
                <>
                  <div className="form-group">
                    <label className="form-label">
                      Title
                      <CharCount value={item.title} max={100} />
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      maxLength={100}
                      value={item.title}
                      onChange={(e) => updateRepeater(field, idx, 'title', e.target.value)}
                      placeholder={`${label} title`}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Description
                      <CharCount value={item.description} max={5000} warn={0.9} />
                    </label>
                    <textarea
                      className="form-textarea"
                      maxLength={5000}
                      value={item.description}
                      onChange={(e) => updateRepeater(field, idx, 'description', e.target.value)}
                      placeholder={`${label} description`}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      Screenshots
                      <span style={{ fontSize: 11, color: '#9ca3af', float: 'right' }}>
                        {item.screenshots.length}/{SCREENSHOT_MAX_PER_SECTION} · Max 5MB · JPEG/PNG/WebP/GIF
                      </span>
                    </label>
                    <div className="screenshots-grid">
                      {item.screenshots.map((ss, ssIdx) => (
                        <div key={ssIdx} style={{ position: 'relative' }}>
                          <img src={ss} alt="" className="screenshot-thumb" />
                          <button
                            className="sliding-image-remove"
                            onClick={() => removeScreenshot(field, idx, ssIdx)}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      {item.screenshots.length < SCREENSHOT_MAX_PER_SECTION && (
                        uploadingScreenshots[`${field}-${idx}`] ? (
                          <div className="screenshot-upload-btn" style={{ cursor: 'default' }}>
                            <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                          </div>
                        ) : (
                          <label className="screenshot-upload-btn">
                            <Image size={16} />
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              multiple
                              onChange={(e) => handleMultipleFileUpload(field, idx, e)}
                              style={{ display: 'none' }}
                            />
                          </label>
                        )
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              {/* Non-collapsible: overview */}
              <div className="form-group">
                <label className="form-label">
                  Title
                  <CharCount value={item.title} max={100} />
                </label>
                <input
                  type="text"
                  className="form-input"
                  maxLength={100}
                  value={item.title}
                  onChange={(e) => updateRepeater(field, idx, 'title', e.target.value)}
                  placeholder={`${label} title`}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Description
                  <CharCount value={item.description} max={5000} warn={0.9} />
                </label>
                <textarea
                  className="form-textarea"
                  maxLength={5000}
                  value={item.description}
                  onChange={(e) => updateRepeater(field, idx, 'description', e.target.value)}
                  placeholder={`${label} description`}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Screenshots
                  <span style={{ fontSize: 11, color: '#9ca3af', float: 'right' }}>
                    {item.screenshots.length}/{SCREENSHOT_MAX_PER_SECTION} · Max 5MB · JPEG/PNG/WebP/GIF
                  </span>
                </label>
                <div className="screenshots-grid">
                  {item.screenshots.map((ss, ssIdx) => (
                    <div key={ssIdx} style={{ position: 'relative' }}>
                      <img src={ss} alt="" className="screenshot-thumb" />
                      <button
                        className="sliding-image-remove"
                        onClick={() => removeScreenshot(field, idx, ssIdx)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                  {item.screenshots.length < SCREENSHOT_MAX_PER_SECTION && (
                    uploadingScreenshots[`${field}-${idx}`] ? (
                      <div className="screenshot-upload-btn" style={{ cursor: 'default' }}>
                        <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                      </div>
                    ) : (
                      <label className="screenshot-upload-btn">
                        <Image size={16} />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          multiple
                          onChange={(e) => handleMultipleFileUpload(field, idx, e)}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      ))}
      {field === 'features' && (
        <button type="button" className="repeater-add" onClick={() => addRepeaterItem(field)}>
          <Plus size={16} /> Add Feature
        </button>
      )}
    </div>
  );

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Edit Product</h1>
          <p>{form.name}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadLogs}>
            <Clock size={16} /> Edit Logs
          </button>
        </div>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((label, i) => (
          <div
            key={i}
            className={`step ${i === step ? 'active' : ''} ${i < step ? 'completed' : ''}`}
            onClick={() => setStep(i)}
            style={{ cursor: 'pointer' }}
          >
            <div className="step-number">{i < step ? <Check size={14} /> : i + 1}</div>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Navigation Controls (Top) */}
      <div className="wizard-controls">
        <button
          className="btn btn-secondary btn-sm"
          disabled={step === 0}
          onClick={() => setStep(s => s - 1)}
          style={{ minWidth: '100px' }}
        >
          ← Previous
        </button>
        <div className="flex gap-sm">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          
          {step === STEPS.length - 1 ? (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleSave('published')}
              disabled={saving}
              style={{ minWidth: '100px' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setStep(s => s + 1)}
              style={{ minWidth: '100px' }}
            >
              Next Step →
            </button>
          )}
        </div>
      </div>

      {/* ── Step 1: Define Product ─────────────────────────────────────────── */}
      {step === 0 && (
        <div className="wizard-content card card-body">
          <div className="wizard-section">
            <h3 className="wizard-section-title">Define Your Product</h3>

            {/* Product Name */}
            <div className="form-group">
              <label className="form-label">
                Product Name <span className="required">*</span>
                <CharCount value={form.name} max={LIMITS.name.max} />
              </label>
              <input
                type="text"
                className={`form-input ${fieldErrors.name ? 'form-input-error' : ''}`}
                maxLength={LIMITS.name.max}
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                onBlur={(e) => validateField('name', e.target.value)}
                autoFocus
              />
              <FieldError msg={fieldErrors.name} />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Required · 2–{LIMITS.name.max} characters
              </div>
            </div>

            {/* Tagline */}
            <div className="form-group">
              <label className="form-label">
                Tagline
                <CharCount value={form.tagline} max={LIMITS.tagline.max} />
              </label>
              <input
                type="text"
                className={`form-input ${fieldErrors.tagline ? 'form-input-error' : ''}`}
                maxLength={LIMITS.tagline.max}
                value={form.tagline}
                onChange={(e) => update('tagline', e.target.value)}
                onBlur={(e) => validateField('tagline', e.target.value)}
                placeholder="Short product description"
              />
              <FieldError msg={fieldErrors.tagline} />
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Optional · Max {LIMITS.tagline.max} characters
              </div>
            </div>

            {/* Product Logo */}
            <div className="form-group">
              <label className="form-label">Product Logo</label>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                Accepted: JPEG, PNG, WebP, SVG · Max size: {LOGO_MAX_SIZE_MB}MB · Min 50×50px · Max 4096×4096px
              </div>
              <div className="image-upload-area">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
                {uploadingLogo ? (
                  <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>
                    <div className="spinner mb-sm" style={{ margin: '0 auto 8px' }} />
                    <p>Uploading &amp; validating…</p>
                  </div>
                ) : form.logo ? (
                  <div style={{ padding: 12, textAlign: 'center' }}>
                    <img
                      src={form.logo}
                      alt="Logo"
                      className="image-preview"
                      style={{ maxHeight: 100, maxWidth: 200, objectFit: 'contain', borderRadius: 8 }}
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Click to replace</div>
                  </div>
                ) : (
                  <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>
                    <Upload size={24} />
                    <p>Upload logo</p>
                  </div>
                )}
              </div>
              <FieldError msg={fieldErrors.logo} />
            </div>

            {/* Developer Name */}
            <div className="form-group">
              <label className="form-label">
                Developer Name
                <CharCount value={form.developerName} max={LIMITS.developerName.max} />
              </label>
              <input
                type="text"
                className={`form-input ${fieldErrors.developerName ? 'form-input-error' : ''}`}
                maxLength={LIMITS.developerName.max}
                value={form.developerName}
                onChange={(e) => update('developerName', e.target.value)}
                onBlur={(e) => validateField('developerName', e.target.value)}
                placeholder="Developer or company name"
              />
              <FieldError msg={fieldErrors.developerName} />
            </div>

            {/* Tags */}
            <div className="form-group">
              <label className="form-label">
                Tags
                <span style={{ fontSize: 11, color: '#9ca3af', float: 'right' }}>
                  {form.tags.length}/{LIMITS.maxTags} tags · Max {LIMITS.tag.max} chars each
                </span>
              </label>
              {form.tags.length < LIMITS.maxTags && (
                <div className="option-input-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add a tag"
                    maxLength={LIMITS.tag.max}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <button type="button" className="btn btn-secondary" onClick={addTag}>Add</button>
                </div>
              )}
              <div className="flex gap-sm flex-wrap mt-sm">
                {form.tags.map(tag => (
                  <span key={tag} className="tag">
                    {tag}
                    <span className="tag-remove" onClick={() => removeTag(tag)}>&times;</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Define Tabs ────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="wizard-content card card-body">
          {/* Overview (hardcoded) */}
          {renderRepeaterSection('overview', 'Overview')}

          {/* Features (hardcoded) */}
          {renderRepeaterSection('features', 'Features')}

          {/* Resources (hardcoded) */}
          <div className="wizard-section">
            <h3 className="wizard-section-title">Resources</h3>
            <p className="text-muted" style={{ fontSize: 12, marginBottom: 16 }}>
              Upload PDF, Word, Excel, CSV or TXT documentation · Max {RESOURCE_MAX_SIZE_MB}MB per file
            </p>
            {form.resources.map((resItem, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  marginBottom: '8px',
                }}
              >
                <span style={{ flex: 1, fontSize: '14px' }}>{resItem.name}</span>
                <a href={resItem.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#0183FF' }}>
                  Preview
                </a>
                <button
                  type="button"
                  className="btn btn-icon btn-ghost repeater-remove"
                  onClick={() => removeResource(idx)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div style={{ marginTop: '16px' }}>
              {uploadingScreenshots['resource-upload'] ? (
                <div className="spinner mb-sm" />
              ) : (
                <label
                  className="btn btn-secondary"
                  style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Upload size={16} /> Add Resource File
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.csv,.xls,.xlsx,.txt"
                    onChange={handleResourceUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Custom Tabs */}
          <div className="wizard-section">
            <h3 className="wizard-section-title">
              Custom Tabs
              <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af', marginLeft: 8 }}>
                {form.customTabs.length}/{LIMITS.maxCustomTabs} tabs
              </span>
            </h3>
            <p className="text-muted" style={{ fontSize: 12, marginBottom: 16 }}>
              Add custom tabs with a name and elements. Each element can have a title, description, and slidable images.
            </p>

            {form.customTabs.map((tab, tabIdx) => (
              <div key={tabIdx} className="repeater-item" style={{ marginBottom: 16 }}>
                {/* Tab header with collapse toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsedTabs[tabIdx] ? 0 : 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost"
                      onClick={() => toggleTabCollapse(tabIdx)}
                      title={collapsedTabs[tabIdx] ? 'Expand' : 'Collapse'}
                    >
                      {collapsedTabs[tabIdx] ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                    </button>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>
                      Tab {tabIdx + 1}{tab.tabName ? `: ${tab.tabName}` : ''}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      ({tab.elements.length}/{LIMITS.maxCustomTabElements} elements)
                    </span>
                  </div>
                  <button
                    className="btn btn-icon btn-ghost repeater-remove"
                    onClick={() => removeCustomTab(tabIdx)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {!collapsedTabs[tabIdx] && (
                  <>
                    {/* Tab Name */}
                    <div className="form-group">
                      <label className="form-label">
                        Tab Name <span className="required">*</span>
                        <CharCount value={tab.tabName} max={LIMITS.customTabName.max} />
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter tab name (2–50 characters)"
                        maxLength={LIMITS.customTabName.max}
                        value={tab.tabName}
                        onChange={(e) => updateCustomTabName(tabIdx, e.target.value)}
                      />
                    </div>

                    {/* Elements */}
                    {tab.elements.map((el, elIdx) => (
                      <div key={elIdx} style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontWeight: 500, fontSize: 13, color: '#6b7280' }}>Element {elIdx + 1}</span>
                          <button
                            className="btn btn-icon btn-ghost"
                            onClick={() => removeCustomTabElement(tabIdx, elIdx)}
                            style={{ color: '#ef4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            Title
                            <CharCount value={el.title} max={LIMITS.customTabElementTitle.max} />
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            maxLength={LIMITS.customTabElementTitle.max}
                            value={el.title}
                            onChange={(e) => updateCustomTabElement(tabIdx, elIdx, 'title', e.target.value)}
                            placeholder="Element title"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            Description
                            <CharCount value={el.description} max={LIMITS.customTabElementDescription.max} warn={0.9} />
                          </label>
                          <textarea
                            className="form-textarea"
                            maxLength={LIMITS.customTabElementDescription.max}
                            value={el.description}
                            onChange={(e) => updateCustomTabElement(tabIdx, elIdx, 'description', e.target.value)}
                            placeholder="Element description"
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            Images
                            <span style={{ fontSize: 11, color: '#9ca3af', float: 'right' }}>
                              {el.screenshots.length}/{SCREENSHOT_MAX_PER_SECTION} · Max 5MB each · JPEG/PNG/WebP/GIF
                            </span>
                          </label>
                          <div className="screenshots-grid">
                            {el.screenshots.map((ss, ssIdx) => (
                              <div key={ssIdx} style={{ position: 'relative' }}>
                                <img src={ss} alt="" className="screenshot-thumb" />
                                <button
                                  className="sliding-image-remove"
                                  onClick={() => removeCustomTabScreenshot(tabIdx, elIdx, ssIdx)}
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                            {el.screenshots.length < SCREENSHOT_MAX_PER_SECTION && (
                              uploadingScreenshots[`custom-${tabIdx}-${elIdx}`] ? (
                                <div className="screenshot-upload-btn" style={{ cursor: 'default' }}>
                                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                                </div>
                              ) : (
                                <label className="screenshot-upload-btn" title="Add images">
                                  <Image size={16} />
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    multiple
                                    onChange={(e) => handleCustomTabScreenshots(tabIdx, elIdx, e)}
                                    style={{ display: 'none' }}
                                  />
                                </label>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button type="button" className="repeater-add" onClick={() => addCustomTabElement(tabIdx)}>
                      <Plus size={16} /> Add Element
                    </button>
                  </>
                )}
              </div>
            ))}

            {form.customTabs.length < LIMITS.maxCustomTabs && (
              <button type="button" className="repeater-add" onClick={addCustomTab}>
                <Plus size={16} /> Add Custom Tab
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Step 3: Define Attributes ──────────────────────────────────────── */}
      {step === 2 && (
        <div className="wizard-content card card-body">
          <div className="wizard-section">
            <h3 className="wizard-section-title">Attributes</h3>
            {attributes.map(attr => {
              const formAttr = form.attributes.find(a => a.attributeId === attr._id);
              return (
                <div key={attr._id} className="repeater-item">
                  <div className="flex items-center justify-between mb-md">
                    <div>
                      <span style={{ fontWeight: 600 }}>{attr.name}</span>
                      {attr.requiredInProductEditor && <span className="required">*</span>}
                    </div>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={!!formAttr}
                        onChange={() => toggleAttribute(attr)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  {formAttr && attr.options.length > 0 && (
                    <div className="flex gap-sm flex-wrap">
                      {attr.options.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          className={`product-select-chip ${formAttr.values.includes(opt) ? 'selected' : ''}`}
                          onClick={() => {
                            const vals = formAttr.values.includes(opt)
                              ? formAttr.values.filter(v => v !== opt)
                              : [...formAttr.values, opt];
                            setAttributeValues(attr._id, vals);
                          }}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step 4: Configure Contact Us Form ──────────────────────────────── */}
      {step === 3 && (
        <div className="wizard-content card card-body">
          <div className="wizard-section">
            <h3 className="wizard-section-title">Contact Us Form</h3>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 24, paddingLeft: 4 }}>
              Decide whether to use the default marketplace contact form or create a custom one for this product.
            </p>

            <div className="repeater-item no-padding" style={{ marginBottom: 32, backgroundColor: '#f8fafc' }}>
              <div className="flex items-center justify-between">
                <div>
                  <span style={{ fontWeight: 600, fontSize: 15, color: '#1e293b' }}>Custom Contact Form</span>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {form.useCustomContactForm 
                      ? "Custom form is enabled. You can add, edit, or remove fields below."
                      : "Default admin configuration is being used for this product."}
                  </p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.useCustomContactForm}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      
                      if (!checked) {
                        // Turning OFF — just update the toggle, keep fields intact for potential re-enable
                        update('useCustomContactForm', false);
                        return;
                      }

                      // Turning ON — fetch global defaults if no custom fields yet
                      if (form.contactFields.length === 0) {
                        try {
                          const res = await configAPI.getContact();
                          const globalFields = (res.data.config?.contactFields || []).map((f) => {
                            // Deep-clone and strip MongoDB metadata to prevent duplication
                            const { _id, __v, _doc, ...clean } = f._doc || f;
                            return {
                              ...clean,
                              isDefault: true,
                              options: (clean.options || []).map(({ _id: _oid, ...opt }) => opt),
                              validations: clean.validations
                                ? (({ _id: _vid, ...rest }) => rest)(clean.validations)
                                : {},
                            };
                          });
                          // Batch both updates into a single setForm call
                          setForm((prev) => ({
                            ...prev,
                            useCustomContactForm: true,
                            contactFields: globalFields,
                          }));
                          setFieldErrors((prev) => ({ ...prev, useCustomContactForm: null, contactFields: null }));
                          return;
                        } catch (err) {
                          console.error("Failed to fetch global contact fields", err);
                          toast.error("Failed to load default fields. You can still add them manually.");
                        }
                      }
                      update('useCustomContactForm', true);
                    }}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            {form.useCustomContactForm && (
              <div className="fade-in">
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 24 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Form Fields</h4>
                  <ContactFieldEditor
                    fields={form.contactFields}
                    setFields={(val) => {
                      const next = typeof val === 'function' ? val(form.contactFields) : val;
                      update('contactFields', next);
                    }}
                  />
                </div>
              </div>
            )}
            
            {!form.useCustomContactForm && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f1f5f9', borderRadius: 8, color: '#64748b' }}>
                <p style={{ fontSize: 14 }}>Using the default system contact form.</p>
                <small>Enable the toggle above to customize fields specifically for this product.</small>
              </div>
            )}
          </div>
        </div>
      )}



      {/* Edit Logs Modal */}
      {showLogs && (
        <div className="modal-overlay" onClick={() => setShowLogs(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Logs</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowLogs(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {logs.length === 0 ? (
                <p className="text-muted">No edit logs yet.</p>
              ) : (
                <div className="edit-log-list">
                  {logs.map(log => (
                    <div key={log._id} className="edit-log-item">
                      <div className="edit-log-avatar">{log.editedBy?.firstName?.[0] || '?'}</div>
                      <div className="edit-log-content">
                        <div className="edit-log-name">
                          {log.editedBy?.firstName} {log.editedBy?.lastName}
                        </div>
                        <div className="edit-log-action">
                          <span className={`badge ${log.action === 'published' ? 'badge-success' : log.action === 'deleted' ? 'badge-danger' : 'badge-primary'}`}>
                            {log.action}
                          </span>
                          {log.changes && Object.keys(log.changes).length > 0 && (
                            <span style={{ marginLeft: 8, fontSize: '11px' }}>
                              Changed: {Object.keys(log.changes).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="edit-log-time">{new Date(log.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
