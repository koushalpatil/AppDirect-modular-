import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productAPI, catalogAPI, uploadAPI, configAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Check, Plus, Trash2, Upload, Image, Clock, AlertCircle, ChevronDown, ChevronUp, Eye, X } from 'lucide-react';
import './Admin.css';
import {
  validateLogoFile,
  validateScreenshotFile,
  validateResourceFile,
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

function MultiSelectDropdownField({ label, options, values = [], onChange, placeholder = 'Select one or more' }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const toggleValue = (option) => {
    if (values.includes(option)) {
      onChange(values.filter((v) => v !== option));
      return;
    }
    onChange([...values, option]);
  };

  const summaryText = values.length > 0 ? values.join(', ') : placeholder;

  return (
    <div className="form-group" style={{ marginBottom: 0 }} ref={wrapperRef}>
      <label className="form-label">{label}</label>
      <button
        type="button"
        className="form-select"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span style={{ color: values.length ? '#0f172a' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {summaryText}
        </span>
        <ChevronDown size={14} style={{ color: '#64748b', flex: '0 0 auto' }} />
      </button>

      {open && (
        <div style={{
          marginTop: 8,
          border: '1px solid #dbe3ef',
          borderRadius: 10,
          background: '#fff',
          maxHeight: 220,
          overflowY: 'auto',
          boxShadow: '0 14px 28px rgba(2, 6, 23, 0.08)',
          padding: 6,
        }}>
          {options.map((option) => (
            <label
              key={option}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={values.includes(option)}
                onChange={() => toggleValue(option)}
              />
              <span style={{ color: '#334155', fontSize: 13 }}>{option}</span>
            </label>
          ))}
        </div>
      )}
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingScreenshots, setUploadingScreenshots] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [collapsedTabs, setCollapsedTabs] = useState({});
  const [collapsedFeatures, setCollapsedFeatures] = useState({});
  const [contactTemplates, setContactTemplates] = useState([]);

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    developerName: '',
    logo: '',
    overview: [],
    features: [],
    customTabs: [],
    attributes: [],
    resources: [],
    contactFormTemplate: null,
    status: 'draft',
  });

  const [previewTmplId, setPreviewTmplId] = useState(null);
  const [previewFields, setPreviewFields] = useState([]);

  useEffect(() => { loadProduct(); loadAttributes(); }, [id]);

  // Load templates when reaching step 3
  useEffect(() => {
    if (step === 3 && contactTemplates.length === 0) {
      configAPI.getContactTemplates()
        .then(res => setContactTemplates(res.data.templates || []))
        .catch(() => {});
    }
  }, [step]);

  const loadProduct = async () => {
    try {
      const res = await productAPI.getOne(id);
      const p = res.data.product;
      setForm({
        name: p.name || '',
        tagline: p.tagline || '',
        developerName: p.developerName || '',
        logo: p.logo || '',
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
        contactFormTemplate: p.contactFormTemplate?._id || p.contactFormTemplate || null,
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
        if (!v) return setFieldError('tagline', 'Tagline is required');
        if (v.length < LIMITS.tagline.min) return setFieldError('tagline', `Tagline must be at least ${LIMITS.tagline.min} characters`);
        if (v.length > LIMITS.tagline.max) return setFieldError('tagline', `Tagline must be under ${LIMITS.tagline.max} characters`);
        return setFieldError('tagline', null);
      case 'developerName':
        if (!v) return setFieldError('developerName', 'Developer name is required');
        if (v.length < LIMITS.developerName.min) return setFieldError('developerName', `Developer name must be at least ${LIMITS.developerName.min} characters`);
        if (v.length > LIMITS.developerName.max) return setFieldError('developerName', `Developer name must be under ${LIMITS.developerName.max} characters`);
        return setFieldError('developerName', null);
      default:
        return setFieldError(field, null);
    }
  };

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
  useEffect(() => {
    if (!attributes.length) return;
    const required = attributes.filter(a => a.requiredInProductEditor);
    if (!required.length) return;

    setForm(prev => {
      const existingIds = new Set((prev.attributes || []).map(a => String(a.attributeId)));
      const missingRequired = required.filter(a => !existingIds.has(String(a._id)));
      if (!missingRequired.length) return prev;
      return {
        ...prev,
        attributes: [
          ...(prev.attributes || []),
          ...missingRequired.map(a => ({ attributeId: a._id, attributeName: a.name, values: [] })),
        ],
      };
    });
  }, [attributes]);

  const setAttributeValues = (attr, values) => {
    const normalized = [...new Set((values || []).map(v => String(v).trim()).filter(Boolean))];
    const shouldKeep = attr.requiredInProductEditor || normalized.length > 0;

    setForm((prev) => {
      const next = [...(prev.attributes || [])];
      const idx = next.findIndex((a) => String(a.attributeId) === String(attr._id));

      if (idx >= 0) {
        if (shouldKeep) {
          next[idx] = { ...next[idx], attributeId: attr._id, attributeName: attr.name, values: normalized };
        } else {
          next.splice(idx, 1);
        }
      } else if (shouldKeep) {
        next.push({ attributeId: attr._id, attributeName: attr.name, values: normalized });
      }

      return { ...prev, attributes: next };
    });
  };

  const getAttributeValues = (attrId) => {
    const existing = (form.attributes || []).find((a) => String(a.attributeId) === String(attrId));
    return existing?.values || [];
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
  
  // ── Step validation ─────────────────────────────────────────────────────────
  const validateStep = (s = step) => {
    if (s === 0) {
      const name = form.name.trim();
      if (!name) { toast.error('Product name is required'); return false; }
      if (name.length < LIMITS.name.min) { toast.error(`Name must be at least ${LIMITS.name.min} characters`); return false; }
      if (name.length > LIMITS.name.max) { toast.error(`Name must be under ${LIMITS.name.max} characters`); return false; }
      const tagline = form.tagline.trim();
      if (!tagline) { toast.error('Tagline is required'); return false; }
      if (tagline.length < LIMITS.tagline.min) { toast.error(`Tagline must be at least ${LIMITS.tagline.min} characters`); return false; }
      if (tagline.length > LIMITS.tagline.max) { toast.error(`Tagline must be under ${LIMITS.tagline.max} characters`); return false; }
      const developerName = form.developerName.trim();
      if (!developerName) { toast.error('Developer name is required'); return false; }
      if (developerName.length < LIMITS.developerName.min) { toast.error(`Developer name must be at least ${LIMITS.developerName.min} characters`); return false; }
      if (developerName.length > LIMITS.developerName.max) { toast.error(`Developer name must be under ${LIMITS.developerName.max} characters`); return false; }
      if (!form.logo) { toast.error('Product logo is required'); return false; }
    }
    if (s === 1) {
      // Overview
      for (let i = 0; i < (form.overview || []).length; i++) {
        const item = form.overview[i];
        const t = (item.title || '').trim();
        const d = (item.description || '').trim();
        if (!t) { toast.error(`Overview #${i + 1} title is required`); return false; }
        if (!d) { toast.error(`Overview #${i + 1} description is required`); return false; }
        if (t.length < LIMITS.overviewTitle.min) { toast.error(`Overview #${i + 1} title must be at least ${LIMITS.overviewTitle.min} characters`); return false; }
        if (d.length < LIMITS.overviewDescription.min) { toast.error(`Overview #${i + 1} description must be at least ${LIMITS.overviewDescription.min} characters`); return false; }
      }
      // Features
      for (let i = 0; i < (form.features || []).length; i++) {
        const item = form.features[i];
        const t = (item.title || '').trim();
        const d = (item.description || '').trim();
        if (!t) { toast.error(`Feature #${i + 1} title is required`); return false; }
        if (!d) { toast.error(`Feature #${i + 1} description is required`); return false; }
        if (t.length < LIMITS.featureTitle.min) { toast.error(`Feature #${i + 1} title must be at least ${LIMITS.featureTitle.min} characters`); return false; }
        if (d.length < LIMITS.featureDescription.min) { toast.error(`Feature #${i + 1} description must be at least ${LIMITS.featureDescription.min} characters`); return false; }
      }
      // Validate custom tabs
      for (let i = 0; i < (form.customTabs || []).length; i++) {
        const tab = form.customTabs[i];
        const tn = (tab.tabName || '').trim();
        if (!tn) { toast.error(`Custom tab #${i + 1} name is required`); return false; }
        if (tn.length < LIMITS.customTabName.min) { toast.error(`Custom tab #${i + 1} name must be at least ${LIMITS.customTabName.min} characters`); return false; }
        for (let j = 0; j < (tab.elements || []).length; j++) {
          const el = tab.elements[j];
          const et = (el.title || '').trim();
          const ed = (el.description || '').trim();
          if (!et) { toast.error(`Custom tab #${i + 1} element #${j + 1} title is required`); return false; }
          if (!ed) { toast.error(`Custom tab #${i + 1} element #${j + 1} description is required`); return false; }
          if (et.length < LIMITS.customTabElementTitle.min) { toast.error(`Custom tab #${i + 1} element #${j + 1} title must be at least ${LIMITS.customTabElementTitle.min} characters`); return false; }
          if (ed.length < LIMITS.customTabElementDescription.min) { toast.error(`Custom tab #${i + 1} element #${j + 1} description must be at least ${LIMITS.customTabElementDescription.min} characters`); return false; }
        }
      }
    }
    if (s === 2) {
      const requiredAttrs = attributes.filter(a => a.requiredInProductEditor);
      for (const attr of requiredAttrs) {
        const formAttr = form.attributes.find(a => String(a.attributeId) === String(attr._id));
        if (!formAttr || formAttr.values.length === 0) {
          toast.error(`"${attr.name}" attribute is required`);
          return false;
        }
      }
    }
    return true;
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

  const handlePreviewTemplate = async (id) => {
    if (!id) return;
    try {
      const res = await configAPI.getContactTemplate(id);
      setPreviewFields(res.data.template.fields || []);
      setPreviewTmplId(id);
    } catch {
      toast.error('Failed to load template for preview');
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
                    Feature {idx + 1}
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
                      Title <span className="required">*</span>
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
                      Description <span className="required">*</span>
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
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>Optional</div>
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
                  Title <span className="required">*</span>
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
                  Description <span className="required">*</span>
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
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>Optional</div>
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
          <button className="btn btn-secondary" onClick={() => navigate('/admin/products')}>
            ← Back
          </button>
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
            onClick={() => {
              if (i < step) {
                setStep(i);
              } else if (i > step) {
                for (let s = step; s < i; s++) {
                  if (!validateStep(s)) return;
                }
                setStep(i);
              }
            }}
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
              {saving ? 'Publishing...' : 'Publish'}
            </button>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => validateStep() && setStep(s => s + 1)}
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
                Tagline <span className="required">*</span>
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
                Required · {LIMITS.tagline.min}–{LIMITS.tagline.max} characters
              </div>
            </div>

            {/* Product Logo */}
            <div className="form-group">
              <label className="form-label">Product Logo <span className="required">*</span></label>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                Accepted: JPEG, PNG, WebP, SVG · Max size: {LOGO_MAX_SIZE_MB}MB · Min 50×50px · Max 4096×4096px
              </div>
              <div className="image-upload-area" style={{ padding: '10px', maxWidth: 260 }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
                {uploadingLogo ? (
                  <div style={{ padding: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    <div className="spinner mb-sm" style={{ margin: '0 auto 6px', width: 20, height: 20, borderWidth: 2 }} />
                    <p style={{ fontSize: 12, margin: 0 }}>Uploading…</p>
                  </div>
                ) : form.logo ? (
                  <div style={{ padding: '8px', textAlign: 'center' }}>
                    <img
                      src={form.logo}
                      alt="Logo"
                      className="image-preview"
                      style={{ maxHeight: 64, maxWidth: 160, objectFit: 'contain', borderRadius: 6, margin: 0 }}
                    />
                    <div style={{ marginTop: 6, fontSize: 11, color: '#6b7280' }}>Click to replace</div>
                  </div>
                ) : (
                  <div style={{ padding: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    <Upload size={20} />
                    <p style={{ fontSize: 12, margin: '6px 0 0' }}>Upload logo</p>
                  </div>
                )}
              </div>
              <FieldError msg={fieldErrors.logo} />
            </div>

            {/* Developer Name */}
            <div className="form-group">
              <label className="form-label">
                Developer Name <span className="required">*</span>
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
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                Required · {LIMITS.developerName.min}–{LIMITS.developerName.max} characters
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  <span style={{ fontSize: 13, color: '#64748b' }}>Uploading...</span>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-ghost" 
                    style={{ color: '#ef4444', fontSize: 12 }}
                    onClick={() => {
                      setUploadingScreenshots(prev => ({ ...prev, 'resource-upload': false }));
                      toast.success('Upload cancelled');
                    }}
                  >
                    Cancel
                  </button>
                </div>
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
                            Title <span className="required">*</span>
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
                            Description <span className="required">*</span>
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
                          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>Optional</div>
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
            {attributes.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '14px' }}>
                No attributes configured. Go to Attribute Management to add attributes.
              </p>
            ) : (
              attributes.map((attr) => {
                const selectedValues = getAttributeValues(attr._id);
                return (
                  <div key={attr._id} className="repeater-item">
                    <div className="mb-md">
                      <span style={{ fontWeight: 600 }}>{attr.name}</span>
                      {attr.requiredInProductEditor && <span className="required" style={{ marginLeft: 4 }}>*</span>}
                      {attr.description && (
                        <p className="text-muted" style={{ fontSize: '12px', marginTop: 2 }}>
                          {attr.description}
                        </p>
                      )}
                    </div>

                    {attr.options.length > 0 ? (
                      <MultiSelectDropdownField
                        label={`Select ${attr.name} values`}
                        options={attr.options}
                        values={selectedValues}
                        onChange={(vals) => setAttributeValues(attr, vals)}
                        placeholder="Choose one or more"
                      />
                    ) : (
                      <p className="text-muted" style={{ fontSize: 12, marginBottom: 0 }}>
                        No predefined options for this attribute.
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="wizard-content card card-body">
          <div className="wizard-section">
            <h3 className="wizard-section-title">Contact Us Form</h3>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 24, paddingLeft: 4 }}>
              Select a contact form template for this product. These templates are managed in 
              <button 
                type="button" 
                className="btn-link" 
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary)', border: 'none', background: 'none', padding: '0 4px', cursor: 'pointer' }}
                onClick={() => navigate('/admin/config/contact')}
              >
                Contact Form Configuration
              </button>.
            </p>

            <div className="form-group">
              <label className="form-label">Assign Template</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <select
                  className="form-select"
                  style={{ flex: 1 }}
                  value={form.contactFormTemplate || ''}
                  onChange={(e) => update('contactFormTemplate', e.target.value || null)}
                >
                  <option value="">No contact form</option>
                  {contactTemplates.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.fields?.length || 0} fields)</option>
                  ))}
                </select>
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  disabled={!form.contactFormTemplate}
                  onClick={() => handlePreviewTemplate(form.contactFormTemplate)}
                >
                  <Eye size={16} /> Preview Fields
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 8 }}>
                {form.contactFormTemplate 
                  ? "This template's fields will be shown to users when they click 'Contact Us' on this product's page."
                  : "No contact form will be available for this product if no template is selected."}
              </div>
            </div>

            {!form.contactFormTemplate && (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 8, color: '#64748b', border: '1px dashed #e2e8f0', marginTop: 16 }}>
                <p style={{ fontSize: 14 }}>No template selected.</p>
                <small>Select a template from the dropdown above to enable the contact form.</small>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Template Preview Modal ────────────────────────────────────────── */}
      {previewTmplId && (
        <div className="modal-overlay" onClick={() => setPreviewTmplId(null)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Template Preview</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setPreviewTmplId(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {(!previewFields || previewFields.length === 0) ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '30px 0' }}>
                  No fields configured in this template.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {previewFields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((field, i) => (
                    <div key={field.fieldName || i} className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        {field.label}
                        {field.required && <span className="required">*</span>}
                      </label>
                      {field.helpText && (
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>{field.helpText}</div>
                      )}
                      {field.type === 'textarea' ? (
                        <textarea className="form-textarea" placeholder={field.placeholder} disabled rows={3} />
                      ) : field.type === 'select' ? (
                        <select className="form-select" disabled>
                          <option>{field.placeholder || `Select ${field.label}`}</option>
                          {(field.options || []).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : field.type === 'radio' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {(field.options || []).map(opt => (
                            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                              <input type="radio" name={field.fieldName} disabled /> {opt.label}
                            </label>
                          ))}
                        </div>
                      ) : field.type === 'checkbox' && field.options?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {field.options.map(opt => (
                            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                              <input type="checkbox" disabled /> {opt.label}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <input
                          type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'tel' ? 'tel' : 'text'}
                          className="form-input"
                          placeholder={field.placeholder}
                          disabled
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setPreviewTmplId(null)}>Close Preview</button>
            </div>
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
