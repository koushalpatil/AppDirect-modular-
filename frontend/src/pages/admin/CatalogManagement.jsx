import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalogAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit3, Trash2, FolderTree, X } from 'lucide-react';
import './Admin.css';

const LIMITS = {
  name: { min: 2, max: 100 },
  description: { max: 500 },
  option: { max: 100 },
  maxOptions: 50,
};

// Character counter helper
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

// Inline validation message
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, color: '#ef4444', fontSize: 12 }}>
      <span style={{ fontSize: 14 }}>&bull;</span> {msg}
    </div>
  );
}

export default function CatalogManagement() {
  const navigate = useNavigate();
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editing, setEditing] = useState(null);
  const [optionInput, setOptionInput] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedOptionsByAttr, setExpandedOptionsByAttr] = useState({});

  const [form, setForm] = useState({
    name: '', description: '',
    displayOnHomepage: false,
    requiredInProductEditor: false,
    showForFiltering: false,
    options: [],
    similarity: { useInSimilarity: false, weight: 1, matchType: 'exact' },
  });

  useEffect(() => { loadAttributes(); }, []);

  const loadAttributes = async () => {
    try {
      const res = await catalogAPI.getAll();
      setAttributes(res.data.attributes || []);
    } catch {
      toast.error('Failed to load attributes');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '', description: '',
      displayOnHomepage: false,
      requiredInProductEditor: false,
      showForFiltering: false,
      options: [],
      similarity: { useInSimilarity: false, weight: 1, matchType: 'exact' },
    });
    setEditing(null);
    setShowAdvanced(false);
    setOptionInput('');
    setFieldErrors({});
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (attr) => {
    setForm({
      name: attr.name,
      description: attr.description || '',
      displayOnHomepage: attr.displayOnHomepage,
      requiredInProductEditor: attr.requiredInProductEditor,
      showForFiltering: attr.showForFiltering,
      options: attr.options || [],
      similarity: attr.similarity || { useInSimilarity: false, weight: 1, matchType: 'exact' },
    });
    setEditing(attr._id);
    setShowAdvanced(false);
    setModalOpen(true);
  };

  const addOption = () => {
    const o = optionInput.trim();
    if (!o) return;
    if (o.length > LIMITS.option.max) return toast.error(`Option too long (max ${LIMITS.option.max} chars)`);
    if (form.options.length >= LIMITS.maxOptions) return toast.error(`Maximum ${LIMITS.maxOptions} options allowed`);
    if (form.options.includes(o)) return toast.error('Option already exists');
    
    setForm(prev => ({ ...prev, options: [...prev.options, o] }));
    setOptionInput('');
  };

  const removeOption = (opt) => {
    setForm(prev => ({ ...prev, options: prev.options.filter(o => o !== opt) }));
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const errors = {};
    if (!name) errors.name = 'Attribute name is required';
    else if (name.length < LIMITS.name.min) errors.name = `Name must be at least ${LIMITS.name.min} characters`;
    else if (name.length > LIMITS.name.max) errors.name = `Name must be under ${LIMITS.name.max} characters`;

    if (form.description && form.description.length > LIMITS.description.max) {
      errors.description = `Description too long (max ${LIMITS.description.max} characters)`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      if (editing) {
        await catalogAPI.update(editing, form);
        toast.success('Attribute updated');
      } else {
        await catalogAPI.create(form);
        toast.success('Attribute created');
      }
      setModalOpen(false);
      resetForm();
      loadAttributes();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save';
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    try {
      await catalogAPI.delete(id);
      toast.success('Attribute deleted');
      loadAttributes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    if (target.required) {
      toast.error('Required attributes cannot be deleted because they are used in the product editor.');
      return;
    }
    await handleDelete(target.id);
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Attribute Management</h1>
          <p>Manage product attributes and options</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Attribute
          </button>
        </div>
      </div>

      {attributes.length === 0 ? (
        <div className="empty-state">
          <FolderTree size={64} />
          <h3>No attributes yet</h3>
          <p>Create attributes like Category, Geography, etc. to organize your products</p>
          <button className="btn btn-primary mt-lg" onClick={openCreate}>
            <Plus size={16} /> Add Attribute
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Options</th>
                <th>Homepage</th>
                <th>Required</th>
                <th>Filtering</th>
                <th>Linked Products</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attributes.map(attr => (
                <tr key={attr._id}>
                  <td>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{attr.name}</span>
                      {attr.description && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{attr.description}</p>}
                    </div>
                  </td>
                  <td>
                    <div className="flex gap-sm flex-wrap" style={{ maxWidth: 300 }}>
                      {(expandedOptionsByAttr[attr._id] ? (attr.options || []) : (attr.options || []).slice(0, 5)).map(o => (
                        <span key={o} className="tag">{o}</span>
                      ))}
                      {(attr.options || []).length > 5 && !expandedOptionsByAttr[attr._id] && (
                        <button
                          type="button"
                          className="tag"
                          onClick={() => setExpandedOptionsByAttr(prev => ({ ...prev, [attr._id]: true }))}
                          style={{ cursor: 'pointer', border: 'none' }}
                        >
                          +{attr.options.length - 5}
                        </button>
                      )}
                      {(attr.options || []).length > 5 && expandedOptionsByAttr[attr._id] && (
                        <button
                          type="button"
                          className="tag"
                          onClick={() => setExpandedOptionsByAttr(prev => ({ ...prev, [attr._id]: false }))}
                          style={{ cursor: 'pointer', border: 'none' }}
                        >
                          Show less
                        </button>
                      )}
                    </div>
                  </td>
                  <td><span className={`badge ${attr.displayOnHomepage ? 'badge-success' : 'badge-primary'}`}>{attr.displayOnHomepage ? 'Yes' : 'No'}</span></td>
                  <td><span className={`badge ${attr.requiredInProductEditor ? 'badge-warning' : 'badge-primary'}`}>{attr.requiredInProductEditor ? 'Yes' : 'No'}</span></td>
                  <td><span className={`badge ${attr.showForFiltering ? 'badge-success' : 'badge-primary'}`}>{attr.showForFiltering ? 'Yes' : 'No'}</span></td>
                  <td><span className="badge badge-primary">{attr.linkedProductsCount || 0}</span></td>
                  <td>
                    <div className="flex gap-xs">
                      <button className="btn btn-icon btn-ghost" onClick={() => openEdit(attr)} title="Edit"><Edit3 size={14} /></button>
                      <button className="btn btn-icon btn-ghost" onClick={() => setDeleteTarget({ id: attr._id, name: attr.name, required: attr.requiredInProductEditor, linked: attr.linkedProductsCount || 0 })} title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 24 }}>
          <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              {deleteTarget.required ? 'Required attribute cannot be deleted' : 'Delete attribute?'}
            </h3>
            <p style={{ color: '#64748b', lineHeight: 1.5, marginBottom: 20 }}>
              {deleteTarget.required
                ? `“${deleteTarget.name}” is required in the product editor, so it must stay available for products that depend on it.`
                : `This will permanently remove “${deleteTarget.name}”. ${deleteTarget.linked > 0 ? `It is currently used by ${deleteTarget.linked} product(s).` : 'No products are currently using it.'}`}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>{deleteTarget.required ? 'OK' : 'Cancel'}</button>
              {!deleteTarget.required && <button className="btn btn-primary" onClick={confirmDelete}>Delete</button>}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay right-panel-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal side-panel attribute-side-panel" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Edit Attribute' : 'Add Attribute'}</h3>
              <button className="btn btn-icon btn-ghost" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  Name <span className="required">*</span>
                  <CharCount value={form.name} max={LIMITS.name.max} />
                </label>
                <input 
                  type="text" 
                  className={`form-input ${fieldErrors.name ? 'form-input-error' : ''}`} 
                  placeholder="e.g. Geography, Platform" 
                  value={form.name} 
                  maxLength={LIMITS.name.max}
                  onChange={(e) => {
                    setForm(prev => ({ ...prev, name: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, name: null }));
                  }} 
                  autoFocus 
                />
                <FieldError msg={fieldErrors.name} />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Description
                  <CharCount value={form.description} max={LIMITS.description.max} />
                </label>
                <textarea 
                  className={`form-textarea ${fieldErrors.description ? 'form-input-error' : ''}`} 
                  placeholder="Describe this attribute" 
                  value={form.description} 
                  maxLength={LIMITS.description.max}
                  onChange={(e) => {
                    setForm(prev => ({ ...prev, description: e.target.value }));
                    setFieldErrors(prev => ({ ...prev, description: null }));
                  }} 
                  style={{ minHeight: 70 }} 
                />
                <FieldError msg={fieldErrors.description} />
              </div>

              <div className="form-group mt-md">
                <label className="form-label">Options</label>
                <div className="option-input-row">
                  <input type="text" className="form-input" placeholder="Add option value" value={optionInput} maxLength={LIMITS.option.max} onChange={(e) => setOptionInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())} />
                  <button type="button" className="btn btn-secondary" onClick={addOption}>Add</button>
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  Option character limit: {LIMITS.option.max}
                </div>
                <div className="flex gap-sm flex-wrap mt-sm">
                  {form.options.map(opt => (
                    <span key={opt} className="tag">{opt}<span className="tag-remove" onClick={() => removeOption(opt)}>&times;</span></span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdvanced(prev => !prev)}>
                  {showAdvanced ? 'Hide Advanced Settings' : 'Advanced Settings'}
                </button>
              </div>

              {showAdvanced && (
                <>
                  <div className="toggle-wrapper">
                    <span className="toggle-label">Show in Additional Settings</span>
                    <label className="toggle"><input type="checkbox" checked={form.displayOnHomepage} onChange={(e) => setForm(prev => ({ ...prev, displayOnHomepage: e.target.checked }))} /><span className="toggle-slider" /></label>
                  </div>
                  <div className="toggle-wrapper">
                    <span className="toggle-label">Make this field required in the product editor</span>
                    <label className="toggle"><input type="checkbox" checked={form.requiredInProductEditor} onChange={(e) => setForm(prev => ({ ...prev, requiredInProductEditor: e.target.checked }))} /><span className="toggle-slider" /></label>
                  </div>
                  <div className="toggle-wrapper">
                    <span className="toggle-label">Allow for filtering</span>
                    <label className="toggle"><input type="checkbox" checked={form.showForFiltering} onChange={(e) => setForm(prev => ({ ...prev, showForFiltering: e.target.checked }))} /><span className="toggle-slider" /></label>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
