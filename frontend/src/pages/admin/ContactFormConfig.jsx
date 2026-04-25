import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { configAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Copy, Trash2, Edit3, Eye, X } from 'lucide-react';
import ContactFieldEditor from '../../components/admin/ContactFieldEditor';

export default function ContactFormConfig() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState(null); // null = closed, {} = new, {_id:...} = editing
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateFields, setTemplateFields] = useState([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Clone source selector
  const [showCloneModal, setShowCloneModal] = useState(false);

  // Preview modal
  const [previewFields, setPreviewFields] = useState(null);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await configAPI.getContactTemplates();
      setTemplates(res.data.templates || []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // ── Template CRUD ───────────────────────────────────────────────────────
  const openNewTemplate = () => {
    setEditingTemplate({});
    setTemplateName('');
    setTemplateDesc('');
    setTemplateFields([]);
  };

  const openCloneNew = () => {
    setShowCloneModal(true);
  };

  const handleCloneAndEdit = async (sourceId) => {
    setShowCloneModal(false);
    try {
      const res = await configAPI.cloneContactTemplate(sourceId);
      const cloned = res.data.template;
      // Open the cloned template in the editor immediately
      setEditingTemplate(cloned);
      setTemplateName(cloned.name);
      setTemplateDesc(cloned.description || '');
      setTemplateFields(cloned.fields || []);
      loadTemplates();
      toast.success('Template cloned — editing copy now.');
    } catch {
      toast.error('Failed to clone template.');
    }
  };

  const openEditTemplate = async (tmpl) => {
    try {
      const res = await configAPI.getContactTemplate(tmpl._id);
      const t = res.data.template;
      setEditingTemplate(t);
      setTemplateName(t.name);
      setTemplateDesc(t.description || '');
      setTemplateFields(t.fields || []);
    } catch {
      toast.error('Failed to load template');
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Template name is required.');
      return;
    }
    setSavingTemplate(true);
    try {
      const payload = { name: templateName, description: templateDesc, fields: templateFields };
      if (editingTemplate._id) {
        await configAPI.updateContactTemplate(editingTemplate._id, payload);
        toast.success('Template updated.');
      } else {
        await configAPI.createContactTemplate(payload);
        toast.success('Template created.');
      }
      setEditingTemplate(null);
      loadTemplates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleQuickClone = async (id) => {
    try {
      await configAPI.cloneContactTemplate(id);
      toast.success('Template cloned.');
      loadTemplates();
    } catch {
      toast.error('Failed to clone template.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template? Products using it will lose their contact form.')) return;
    try {
      await configAPI.deleteContactTemplate(id);
      toast.success('Template deleted.');
      loadTemplates();
    } catch {
      toast.error('Failed to delete template.');
    }
  };

  // ── Preview ────────────────────────────────────────────────────────────
  const openPreview = (fields) => {
    setPreviewFields(fields);
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Contact Form Templates</h1>
          <p>Create and manage reusable contact form templates. Assign them to products during creation or editing.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
      </div>

      {/* ── Templates Section ────────────────────────────────────────────── */}
      <div className="card card-body">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Templates</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            {templates.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={openCloneNew}>
                <Copy size={14} /> Clone Existing
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={openNewTemplate}>
              <Plus size={14} /> Create New
            </button>
          </div>
        </div>
        <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
          Templates define the fields shown in the "Contact Us" form on product pages. Select a template during product creation.
        </p>

        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', background: '#f8fafc', borderRadius: 8 }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>No templates yet</p>
            <p style={{ margin: 0, fontSize: 13 }}>Create your first template to start capturing leads on product pages.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {templates.map(tmpl => (
              <div
                key={tmpl._id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 20,
                  background: '#fff',
                  transition: 'box-shadow 0.2s',
                }}
                className="hover-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{tmpl.name}</h4>
                    {tmpl.description && (
                      <p className="text-muted" style={{ fontSize: 12, marginTop: 4, marginBottom: 0 }}>{tmpl.description}</p>
                    )}
                  </div>
                </div>
                <div className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
                  {tmpl.fields?.length || 0} field(s)
                  {tmpl.updatedAt && <> · Updated {new Date(tmpl.updatedAt).toLocaleDateString()}</>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => openEditTemplate(tmpl)} title="Edit">
                    <Edit3 size={13} /> Edit
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleQuickClone(tmpl._id)} title="Clone">
                    <Copy size={13} /> Clone
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => openPreview(tmpl.fields)} title="Preview">
                    <Eye size={13} /> Preview
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#ef4444' }}
                    onClick={() => handleDelete(tmpl._id)}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Template Editor Modal ────────────────────────────────────────── */}
      {editingTemplate !== null && (
        <div className="modal-overlay" onClick={() => setEditingTemplate(null)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingTemplate._id ? 'Edit Template' : 'Create Template'}
              </h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setEditingTemplate(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="form-group">
                <label className="form-label">Template Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="form-input"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g. Enterprise Contact Form"
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input
                  type="text"
                  className="form-input"
                  value={templateDesc}
                  onChange={e => setTemplateDesc(e.target.value)}
                  placeholder="Brief description (optional)"
                  maxLength={500}
                />
              </div>
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 20, marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Form Fields</h4>
                </div>
                <ContactFieldEditor fields={templateFields} setFields={setTemplateFields} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingTemplate(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveTemplate} disabled={savingTemplate}>
                {savingTemplate ? 'Saving…' : editingTemplate._id ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Clone Source Selector Modal ───────────────────────────────────── */}
      {showCloneModal && (
        <div className="modal-overlay" onClick={() => setShowCloneModal(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Clone a Template</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowCloneModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
                Select a template to clone. A copy will be created and opened for editing.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {templates.map(tmpl => (
                  <button
                    key={tmpl._id}
                    className="btn btn-secondary"
                    style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '12px 16px' }}
                    onClick={() => handleCloneAndEdit(tmpl._id)}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{tmpl.name}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{tmpl.fields?.length || 0} field(s)</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preview Modal ────────────────────────────────────────────────── */}
      {previewFields !== null && (
        <div className="modal-overlay" onClick={() => setPreviewFields(null)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Form Preview</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setPreviewFields(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {(!previewFields || previewFields.length === 0) ? (
                <p className="text-muted" style={{ textAlign: 'center', padding: '30px 0' }}>
                  No fields configured.
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
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled>
                    Submit (Preview)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
