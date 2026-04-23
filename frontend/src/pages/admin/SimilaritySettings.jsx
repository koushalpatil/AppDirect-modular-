import { useState, useEffect } from 'react';
import { configAPI, catalogAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Save, Settings, ShieldAlert, Info, Zap, Layers, Target, HelpCircle } from 'lucide-react';
import './Admin.css';

export default function SimilaritySettings() {
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    minSimilarityScore: 0.2,
    maxResults: 5,
    fallbackAttributeId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [attrRes, configRes] = await Promise.all([
        catalogAPI.getAll(),
        configAPI.getSimilarity(),
      ]);
      setAttributes(attrRes.data.attributes || []);
      if (configRes.data.config) {
        setConfig({
          minSimilarityScore: configRes.data.config.minSimilarityScore || 0.2,
          maxResults: configRes.data.config.maxResults || 5,
          fallbackAttributeId: configRes.data.config.fallbackAttributeId || '',
        });
      }
    } catch (err) {
      toast.error('Failed to load similarity settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (config.minSimilarityScore < 0 || config.minSimilarityScore > 1) {
      return toast.error('Similarity score must be between 0 and 1');
    }
    if (config.maxResults < 1 || config.maxResults > 20) {
      return toast.error('Max results must be between 1 and 20');
    }

    setSaving(true);
    try {
      await configAPI.updateSimilarity(config);
      toast.success('Similarity settings saved successfully');
    } catch (err) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div className="fade-in similarity-settings-container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <style>{`
        @media (max-width: 768px) {
          .page-header { flex-direction: column; align-items: flex-start !important; gap: 16px; }
          .admin-grid { grid-template-columns: 1fr !important; }
          .engine-dashboard { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>
      <div className="page-header" style={{ marginBottom: '32px' }}>
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <Zap size={24} className="text-primary" />
            <h1 style={{ margin: 0 }}>Similarity Engine</h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
            Configure how product similarity is calculated and matched across the marketplace.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleSave} 
          disabled={saving}
          style={{ 
            padding: '10px 24px', 
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(var(--primary-rgb), 0.25)',
            transition: 'all 0.2s ease'
          }}
        >
          <Save size={18} /> {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* Global Controls Card */}
        <div className="card" style={{ 
          borderRadius: '16px', 
          border: '1px solid var(--border-color)',
          background: 'var(--bg-primary)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden',
          width: '100%'
        }}>
          <div className="card-header" style={{ 
            padding: '24px 32px', 
            borderBottom: '1px solid var(--border-color)',
            background: 'linear-gradient(to right, var(--bg-secondary), var(--bg-primary))'
          }}>
            <h3 className="card-title flex items-center gap-sm" style={{ margin: 0, fontSize: '20px' }}>
              <Settings size={22} className="text-primary" /> Global Algorithm Parameters
            </h3>
          </div>
          <div className="card-body" style={{ padding: '32px' }}>
            
            <div className="form-group mb-xl">
              <div className="flex justify-between items-center mb-md">
                <label className="form-label" style={{ marginBottom: 0, fontWeight: 600, fontSize: '16px' }}>
                  Minimum Similarity Threshold
                </label>
                <div style={{ 
                  background: 'var(--primary-light)', 
                  color: 'var(--primary-color)',
                  padding: '6px 16px',
                  borderRadius: '20px',
                  fontSize: '15px',
                  fontWeight: 700
                }}>
                  {(config.minSimilarityScore * 100).toFixed(0)}% Match
                </div>
              </div>
              <div style={{ position: 'relative', height: '40px', display: 'flex', alignItems: 'center' }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  style={{ 
                    width: '100%', 
                    cursor: 'pointer',
                    accentColor: 'var(--primary-color)',
                    height: '8px',
                    borderRadius: '4px'
                  }}
                  value={config.minSimilarityScore}
                  onChange={(e) => setConfig({ ...config, minSimilarityScore: parseFloat(e.target.value) })}
                />
              </div>
              <div className="flex justify-between mt-sm" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>Inclusive (0%)</span>
                <span>Highly Precise (100%)</span>
              </div>
              <p className="form-help mt-md" style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px' }}>
                <Info size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>Profiles with a cumulative score below this threshold will be excluded from the "Similar Products" block.</span>
              </p>
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '16px' }}>Maximum Results to Display</label>
              <div style={{ position: 'relative', maxWidth: '300px' }}>
                <Target size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="20"
                  style={{ paddingLeft: '40px', borderRadius: '10px', fontSize: '16px' }}
                  value={config.maxResults}
                  onChange={(e) => setConfig({ ...config, maxResults: parseInt(e.target.value) })}
                />
              </div>
              <p className="form-help mt-sm">Determines the capacity of the recommendation carousel on product detail pages.</p>
            </div>
          </div>
        </div>

        {/* Fallback Strategy Card */}
        <div className="card" style={{ 
          borderRadius: '16px', 
          border: '1px solid var(--border-color)',
          background: 'var(--bg-primary)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden',
          width: '100%'
        }}>
          <div className="card-header" style={{ 
            padding: '24px 32px', 
            borderBottom: '1px solid var(--border-color)',
            background: 'linear-gradient(to right, var(--bg-secondary), var(--bg-primary))'
          }}>
            <h3 className="card-title flex items-center gap-sm" style={{ margin: 0, fontSize: '20px' }}>
              <ShieldAlert size={22} className="text-warning" /> Fallback Mechanism
            </h3>
          </div>
          <div className="card-body" style={{ padding: '32px' }}>
            <div className="form-group mb-xl">
              <label className="form-label" style={{ fontWeight: 600, fontSize: '16px' }}>Fallback Attribute</label>
              <div style={{ position: 'relative', maxWidth: '400px' }}>
                <Layers size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <select
                  className="form-select"
                  style={{ paddingLeft: '40px', borderRadius: '10px', fontSize: '16px' }}
                  value={config.fallbackAttributeId}
                  onChange={(e) => setConfig({ ...config, fallbackAttributeId: e.target.value })}
                >
                  <option value="">No automatic fallback</option>
                  {attributes.map((attr) => (
                    <option key={attr._id} value={attr._id}>
                      {attr.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="form-help mt-sm">
                In scenarios where the primary similarity algorithm yields no results, the engine will attempt to serve products matching this chosen attribute.
              </p>
            </div>

            <div style={{ 
              background: 'rgba(var(--primary-rgb), 0.04)', 
              border: '1px dashed var(--primary-color)',
              borderRadius: '12px',
              padding: '24px'
            }}>
              <div className="flex gap-md">
                <HelpCircle size={24} style={{ color: 'var(--primary-color)', flexShrink: 0 }} />
                <div>
                  <p style={{ fontWeight: 6100, color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '16px' }}>
                    Understanding Global Matching
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.6', margin: 0 }}>
                    The engine calculates similarity scores by aggregating weights from all attributes that have "Use in Similarity" enabled in the 
                    <a href="/admin/catalog" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600, marginLeft: '4px' }}>
                      Catalog Management
                    </a> section.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
