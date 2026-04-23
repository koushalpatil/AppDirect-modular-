import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import './Public.css';

const BlockMediaScreenshots = ({ screenshots, setActiveScreenshot }) => {
  const [idx, setIdx] = useState(0);
  if (!screenshots || screenshots.length === 0) return null;
  if (screenshots.length === 1) {
    return (
      <div className="pd-block-media">
        <img src={screenshots[0]} alt="Screenshot" onClick={() => setActiveScreenshot(screenshots[0])} />
      </div>
    );
  }
  return (
    <div className="pd-block-media" style={{ position: 'relative' }}>
      <img src={screenshots[idx]} alt={`Screenshot ${idx+1}`} onClick={() => setActiveScreenshot(screenshots[idx])} />
      <button 
        style={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); setIdx(prev => (prev - 1 + screenshots.length) % screenshots.length); }}><ChevronLeft size={20}/></button>
      <button 
        style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); setIdx(prev => (prev + 1) % screenshots.length); }}><ChevronRight size={20}/></button>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, position: 'absolute', bottom: 12, width: '100%' }}>
        {screenshots.map((_, i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === idx ? '#0183FF' : 'rgba(255,255,255,0.5)' }} />
        ))}
      </div>
    </div>
  );
};

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeScreenshot, setActiveScreenshot] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => { loadProduct(); setActiveTab('overview'); }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      const res = await productAPI.getPublicOne(id);
      setProduct(res.data.product);
      setSimilarProducts(res.data.similarProducts || []);
    } catch {
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const openContactForm = () => {
    navigate(`/products/${id}/add-lead`);
  };

  if (loading) return <div className="pub-loader" style={{ minHeight: '60vh' }}><div className="pub-spinner" /></div>;
  if (!product) return <div style={{ textAlign: 'center', padding: '100px 0' }}><h2>Product not found</h2></div>;

  // Separate displayable attributes (displayOnHomepage = true)
  const displayAttrs = (product.attributes || []).filter(
    a => a.attributeId?.displayOnHomepage && a.values.length > 0
  );

  // Render overview/feature items with alternating layout
  const renderBlocks = (items) => {
    if (!items || items.length === 0) {
      return <p style={{ color: '#9ca3af' }}>No information available.</p>;
    }
    return items.map((item, idx) => (
      <div key={idx} className={`pd-block ${idx % 2 !== 0 ? 'reverse' : ''}`}>
        <BlockMediaScreenshots screenshots={item.screenshots} setActiveScreenshot={setActiveScreenshot} />
        <div className="pd-block-text">
          {item.title && <h3 className="pd-block-title">{item.title}</h3>}
          {item.description && <p className="pd-block-desc">{item.description}</p>}
        </div>
      </div>
    ));
  };

  return (
    <div className="pd-page">
      {/* Breadcrumb */}
      <div className="pd-breadcrumb">
        <Link to="/products">All Products</Link>
        <span>&rsaquo;</span>
        {product.name}
      </div>

      {/* Header */}
      <div className="pd-header">
        <div className="pd-header-left">
          {product.logo ? (
            <img src={product.logo} alt={product.name} className="pd-logo" />
          ) : (
            <div className="pd-logo-placeholder">{product.name[0]}</div>
          )}
          <div>
            <h1 className="pd-title">{product.name}</h1>
            {product.tagline && <p className="pd-tagline">{product.tagline}</p>}
            {product.developerName && (
              <p className="pd-developer">Developer: <strong>{product.developerName}</strong></p>
            )}
          </div>
        </div>
        <button className="pd-contact-btn" onClick={openContactForm}>
          Contact Us
        </button>
      </div>

      {/* Tabs */}
      <div className="pd-tabs">
        <button className={`pd-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`pd-tab ${activeTab === 'features' ? 'active' : ''}`} onClick={() => setActiveTab('features')}>Features</button>
        {product.resources && product.resources.length > 0 && (
          <button className={`pd-tab ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>Resources</button>
        )}
        {(product.customTabs || []).map((tab, idx) => (
          <button
            key={`custom-${idx}`}
            className={`pd-tab ${activeTab === `custom-${idx}` ? 'active' : ''}`}
            onClick={() => setActiveTab(`custom-${idx}`)}
          >
            {tab.tabName}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderBlocks(product.overview)}
        {activeTab === 'features' && renderBlocks(product.features)}
        {activeTab === 'resources' && (
          <div className="pd-block">
            <div className="pd-block-text" style={{ width: '100%' }}>
              <h3 className="pd-block-title">Product Resources</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                {product.resources.map((res, i) => (
                  <a key={i} href={res.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', textDecoration: 'none', color: '#0f172a', fontWeight: '500' }}>
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0183FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                     {res.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
        {(product.customTabs || []).map((tab, idx) => (
          activeTab === `custom-${idx}` && (
            <div key={`custom-content-${idx}`}>
              {renderBlocks(tab.elements)}
            </div>
          )
        ))}
      </div>

      {/* Additional Information */}
      {displayAttrs.length > 0 && (
        <div className="pd-additional">
          <h3 className="pd-additional-title">Additional Information</h3>
          {displayAttrs.map((attr, idx) => (
            <div key={idx} className="pd-attr-group">
              <div className="pd-attr-name">{attr.attributeId?.name || attr.attributeName}</div>
              <div className="pd-attr-values">
                {attr.values.map(v => (
                  <span key={v} className="pd-attr-value">{v}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <div className="pd-similar">
          <h3 className="pd-similar-title">Similar Products</h3>
          <div className="pd-similar-row">
            {similarProducts.map(p => (
              <Link key={p._id} to={`/products/${p._id}`} className="pub-product-card grid">
                <div className="pub-card-logo-wrap">
                  {p.logo ? (
                    <img src={p.logo} alt={p.name} />
                  ) : (
                    <div className="pub-card-logo-placeholder">{p.name?.[0]}</div>
                  )}
                </div>
                <div className="pub-card-content">
                  <div className="pub-card-name">{p.name}</div>
                  {p.developerName && <div className="pub-card-developer">{p.developerName}</div>}
                  {p.tagline && <div className="pub-card-tagline">{p.tagline}</div>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Screenshot Lightbox */}
      {activeScreenshot && (
        <div className="pub-lightbox" onClick={() => setActiveScreenshot(null)}>
          <img src={activeScreenshot} alt="" onClick={e => e.stopPropagation()} />
          <button className="pub-lightbox-close" onClick={() => setActiveScreenshot(null)}><X size={20} /></button>
        </div>
      )}


    </div>
  );
}
