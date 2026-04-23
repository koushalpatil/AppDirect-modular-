import { useState, useEffect } from 'react';
import { configAPI, catalogAPI, productAPI, uploadAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Upload, Image, X } from 'lucide-react';
import './Admin.css';

export default function HomepageConfig() {
  const [config, setConfig] = useState({ heroImage: '', slidingImages: [], homepageCategories: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [attributes, setAttributes] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingSlider, setUploadingSlider] = useState(false);

  // For add category form
  const [categoryTitle, setCategoryTitle] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [configRes, catRes, prodRes] = await Promise.all([
        configAPI.getHomepage(),
        catalogAPI.getAll(),
        productAPI.getAll({ limit: 999, status: 'published' }),
      ]);
      setConfig({
        heroImage: configRes.data.config?.heroImage || '',
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

  // Hero image
  const handleHeroUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingHero(true);
    try {
      const res = await uploadAPI.single(file);
      setConfig(prev => ({ ...prev, heroImage: res.data.url }));
      toast.success('Hero image uploaded');
    } catch { toast.error('Upload failed'); }
    finally { setUploadingHero(false); }
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
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="homepage-section">
        <h3 className="wizard-section-title">Hero Image</h3>
        <div className="image-upload-area">
          <input type="file" accept="image/*" onChange={handleHeroUpload} disabled={uploadingHero} />
          {uploadingHero ? (
            <div style={{ padding: 30, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="spinner mb-sm" />
              <p className="text-muted">Uploading...</p>
            </div>
          ) : config.heroImage ? (
            <img src={config.heroImage} alt="Hero" className="image-preview" />
          ) : (
            <div style={{ padding: 30, color: 'var(--text-muted)' }}>
              <Upload size={28} style={{ margin: '0 auto 8px' }} /><p>Upload hero image</p>
            </div>
          )}
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
        <h3 className="wizard-section-title">Homepage Categories & Products</h3>
        <p className="text-muted mb-md" style={{ fontSize: 13 }}>Select categories to display on the homepage and choose which products appear under each.</p>

        <div className="flex gap-sm mb-lg flex-wrap items-center" style={{ alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 280 }}>
            <label className="form-label">Section Title</label>
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
            <Plus size={16} /> Add Category
          </button>
        </div>

        {config.homepageCategories.map((cat, catIdx) => (
          <div key={catIdx} className="category-config-card">
            <div className="category-config-header">
              <div>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{cat.title || `${cat.categoryName}: ${cat.categoryValue}`}</span>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={() => removeCategory(catIdx)}><Trash2 size={14} /></button>
            </div>
            <p className="text-muted mb-md" style={{ fontSize: 12 }}>Select products to display under this category:</p>
            <div className="category-products-list">
              {allProducts.map(prod => {
                const prodIds = cat.products.map(p => typeof p === 'string' ? p : p._id);
                const isSelected = prodIds.includes(prod._id);
                return (
                  <button key={prod._id} className={`product-select-chip ${isSelected ? 'selected' : ''}`} onClick={() => toggleProductInCategory(catIdx, prod._id)}>
                    {prod.name}
                  </button>
                );
              })}
              {allProducts.length === 0 && <p className="text-muted" style={{ fontSize: 12 }}>No published products available</p>}
            </div>
          </div>
        ))}

        {config.homepageCategories.length === 0 && (
          <div className="glass-card text-center" style={{ padding: 40 }}>
            <p className="text-muted">No categories configured yet. Add categories above to organize your homepage.</p>
          </div>
        )}
      </div>
    </div>
  );
}
