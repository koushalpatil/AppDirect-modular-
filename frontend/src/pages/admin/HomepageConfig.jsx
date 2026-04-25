import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { configAPI, catalogAPI, productAPI, uploadAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Image, ChevronDown, Pencil, Check, X } from 'lucide-react';
import './Admin.css';

export default function HomepageConfig() {
  const navigate = useNavigate();
  const [config, setConfig] = useState({ slidingImages: [], homepageCategories: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attributes, setAttributes] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [openProductDropdownIdx, setOpenProductDropdownIdx] = useState(null);
  const [editCategoryIdx, setEditCategoryIdx] = useState(null);
  const [editCategoryTitle, setEditCategoryTitle] = useState('');
  const dropdownWrapperRef = useRef(null);

  const [uploadingSlider, setUploadingSlider] = useState(false);

  // For add category form
  const [categoryTitle, setCategoryTitle] = useState('');

  useEffect(() => { loadAll(); }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownWrapperRef.current && !dropdownWrapperRef.current.contains(e.target)) {
        setOpenProductDropdownIdx(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadAll = async () => {
    try {
      const [configRes, catRes, prodRes] = await Promise.all([
        configAPI.getHomepage(),
        catalogAPI.getAll(),
        productAPI.getAll({ limit: 999, status: 'published' }),
      ]);
      setConfig({
        slidingImages: configRes.data.config?.slidingImages || [],
        homepageCategories: configRes.data.config?.homepageCategories || [],
      });
      setAttributes(catRes.data.attributes || []);
      setAllProducts(prodRes.data.products || []);
    } catch {
      toast.error('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  // Sliding images
  const handleSlidingUpload = async (e) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setUploadingSlider(true);
    try {
      const res = await uploadAPI.multiple(files);
      const urls = res.data.files.map(f => f.url);
      setConfig(prev => ({ ...prev, slidingImages: [...prev.slidingImages, ...urls] }));
      toast.success('Images uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingSlider(false); }
  };

  const removeSlidingImage = (idx) => {
    setConfig(prev => ({ ...prev, slidingImages: prev.slidingImages.filter((_, i) => i !== idx) }));
  };

  const addCategory = () => {
    if (!categoryTitle.trim()) return toast.error('Enter a category title');
    const existing = config.homepageCategories.find(c => c.title === categoryTitle.trim());
    if (existing) return toast.error('This category title is already added');

    setConfig(prev => ({
      ...prev,
      homepageCategories: [...prev.homepageCategories, {
        title: categoryTitle.trim(),
        products: [],
        order: prev.homepageCategories.length,
      }],
    }));
    setCategoryTitle('');
  };

  const removeCategory = (idx) => {
    setConfig(prev => ({ ...prev, homepageCategories: prev.homepageCategories.filter((_, i) => i !== idx) }));
  };

  const updateCategoryTitle = (idx, title) => {
    setConfig(prev => {
      const cats = [...prev.homepageCategories];
      cats[idx] = { ...cats[idx], title };
      return { ...prev, homepageCategories: cats };
    });
  };

  const getCategoryDisplayTitle = (cat) => cat.title || `${cat.categoryName || 'Section'}${cat.categoryValue ? `: ${cat.categoryValue}` : ''}`;

  const startEditCategoryTitle = (idx) => {
    const cat = config.homepageCategories[idx];
    setEditCategoryIdx(idx);
    setEditCategoryTitle(cat?.title || '');
  };

  const cancelEditCategoryTitle = () => {
    setEditCategoryIdx(null);
    setEditCategoryTitle('');
  };

  const saveEditCategoryTitle = (idx) => {
    const title = editCategoryTitle.trim();
    if (!title) {
      toast.error('Section title cannot be empty');
      return;
    }

    const duplicate = config.homepageCategories.some((c, i) => i !== idx && (c.title || '').trim().toLowerCase() === title.toLowerCase());
    if (duplicate) {
      toast.error('This section title is already used');
      return;
    }

    updateCategoryTitle(idx, title);
    setEditCategoryIdx(null);
    setEditCategoryTitle('');
  };

  const toggleProductInCategory = (catIdx, productId) => {
    setConfig(prev => {
      const cats = [...prev.homepageCategories];
      const cat = { ...cats[catIdx] };
      const prodIds = cat.products.map(p => typeof p === 'string' ? p : p._id);

      if (prodIds.includes(productId)) {
        cat.products = cat.products.filter(p => (typeof p === 'string' ? p : p._id) !== productId);
      } else {
        cat.products = [...cat.products, productId];
      }
      cats[catIdx] = cat;
      return { ...prev, homepageCategories: cats };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Normalize products to IDs
      const payload = {
        ...config,
        homepageCategories: config.homepageCategories.map(c => ({
          ...c,
          products: c.products.map(p => typeof p === 'string' ? p : p._id),
        })),
      };
      await configAPI.updateHomepage(payload);
      toast.success('Homepage configuration saved');
    } catch {
      toast.error('Failed to save configuration');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Homepage Configuration</h1>
          <p>Configure the marketplace homepage layout</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>← Back</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="homepage-section">
        <h3 className="wizard-section-title">Sliding Images</h3>
        <div className="sliding-images-list">
          {config.slidingImages.map((img, idx) => (
            <div key={idx} className="sliding-image-item">
              <img src={img} alt="" />
              <button className="sliding-image-remove" onClick={() => removeSlidingImage(idx)}>&times;</button>
            </div>
          ))}
          {uploadingSlider ? (
            <div className="screenshot-upload-btn" style={{ width: 120, height: 80, cursor: 'default' }}>
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            </div>
          ) : (
            <label className="screenshot-upload-btn" style={{ width: 120, height: 80 }}>
              <Image size={20} />
              <input type="file" accept="image/*" multiple onChange={handleSlidingUpload} style={{ display: 'none' }} />
            </label>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="homepage-section">
        <h3 className="wizard-section-title">Homepage Product Sections</h3>
        <p className="text-muted mb-md" style={{ fontSize: 13 }}>
          Create configurable section titles and choose which products should be shown on the homepage UI under each section.
        </p>

        <div className="flex gap-sm mb-lg flex-wrap items-center" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 280 }}>
            <label className="form-label">Configurable Section Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Trending Partners"
              value={categoryTitle}
              maxLength={100}
              onChange={(e) => setCategoryTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
            />
          </div>
          <button className="btn btn-secondary" onClick={addCategory} style={{ height: 42 }}>
            <Plus size={16} /> Add Section
          </button>
        </div>

        {config.homepageCategories.map((cat, catIdx) => (
          <div key={catIdx} className="category-config-card">
            <div className="category-config-header">
              <div style={{ flex: 1, minWidth: 240 }}>
                {editCategoryIdx === catIdx ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: 520 }}>
                    <input
                      type="text"
                      className="form-input"
                      value={editCategoryTitle}
                      maxLength={100}
                      placeholder="Section name (e.g., Trending Partners)"
                      onChange={(e) => setEditCategoryTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          saveEditCategoryTitle(catIdx);
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          cancelEditCategoryTitle();
                        }
                      }}
                      autoFocus
                    />
                    <button type="button" className="btn btn-icon btn-ghost" title="Save title" onClick={() => saveEditCategoryTitle(catIdx)}>
                      <Check size={14} />
                    </button>
                    <button type="button" className="btn btn-icon btn-ghost" title="Cancel edit" onClick={cancelEditCategoryTitle}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{getCategoryDisplayTitle(cat)}</span>
                    <button type="button" className="btn btn-icon btn-ghost" title="Edit title" onClick={() => startEditCategoryTitle(catIdx)}>
                      <Pencil size={14} />
                    </button>
                  </div>
                )}
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => removeCategory(catIdx)}><Trash2 size={14} /></button>
            </div>
            <p className="text-muted mb-md" style={{ fontSize: 12 }}>Select products to display under this section on the homepage:</p>
            <div className="form-group" style={{ marginBottom: 0 }} ref={openProductDropdownIdx === catIdx ? dropdownWrapperRef : null}>
              {(() => {
                const prodIds = cat.products.map(p => typeof p === 'string' ? p : p._id);
                const selectedNames = allProducts.filter((p) => prodIds.includes(p._id)).map((p) => p.name);
                return (
                  <>
                    <button
                      type="button"
                      className="form-select"
                      onClick={() => setOpenProductDropdownIdx((prev) => (prev === catIdx ? null : catIdx))}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ color: selectedNames.length ? '#0f172a' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedNames.length ? selectedNames.join(', ') : 'Select one or more products'}
                      </span>
                      <ChevronDown size={14} style={{ color: '#64748b', flex: '0 0 auto' }} />
                    </button>

                    {openProductDropdownIdx === catIdx && (
                      <div style={{
                        marginTop: 8,
                        border: '1px solid #dbe3ef',
                        borderRadius: 10,
                        background: '#fff',
                        maxHeight: 260,
                        overflowY: 'auto',
                        boxShadow: '0 14px 28px rgba(2, 6, 23, 0.08)',
                        padding: 6,
                      }}>
                        {allProducts.map((prod) => {
                          const isSelected = prodIds.includes(prod._id);
                          return (
                            <label
                              key={prod._id}
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
                                checked={isSelected}
                                onChange={() => toggleProductInCategory(catIdx, prod._id)}
                              />
                              <span style={{ color: '#334155', fontSize: 13 }}>{prod.name}</span>
                            </label>
                          );
                        })}
                        {allProducts.length === 0 && <p className="text-muted" style={{ fontSize: 12, margin: 8 }}>No published products available</p>}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

          </div>
        ))}

        {config.homepageCategories.length === 0 && (
          <div className="glass-card text-center" style={{ padding: 40 }}>
            <p className="text-muted">No homepage sections configured yet. Add sections above and select products to show on the homepage.</p>
          </div>
        )}
      </div>
    </div>
  );
}
