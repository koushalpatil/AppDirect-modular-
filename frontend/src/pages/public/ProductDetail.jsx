import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { productAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { getVideoEmbedSrc, getVideoPosterThumb, isDirectVideoUrl } from '../../utils/videoEmbed';
import './Public.css';

function buildMediaSlides(item) {
  const imgs = (item.screenshots || []).map((url) => ({ kind: 'image', url }));
  const vids = (item.videos || []).map((url) => ({ kind: 'video', url }));
  return [...imgs, ...vids];
}

const BlockMediaCarousel = ({ item, setLightbox }) => {
  const slides = useMemo(() => buildMediaSlides(item), [item]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [slides.length, item]);

  if (!slides.length) return null;

  const go = (delta) => {
    setIdx((prev) => (prev + delta + slides.length) % slides.length);
  };

  const openSlide = (slide) => {
    if (slide.kind === 'image') {
      setLightbox({ type: 'image', url: slide.url });
      return;
    }
    const embed = getVideoEmbedSrc(slide.url);
    if (embed) {
      setLightbox({ type: 'embed', src: embed, originalUrl: slide.url });
      return;
    }
    if (isDirectVideoUrl(slide.url)) {
      setLightbox({ type: 'direct', url: slide.url });
      return;
    }
    window.open(slide.url, '_blank', 'noopener,noreferrer');
  };

  if (slides.length === 1) {
    const s = slides[0];
    if (s.kind === 'image') {
      return (
        <div className="pd-block-media">
          <img src={s.url} alt="" onClick={() => openSlide(s)} />
        </div>
      );
    }
    const thumb = getVideoPosterThumb(s.url);
    return (
      <div className="pd-slide-video" onClick={() => openSlide(s)} role="presentation">
        {thumb ? (
          <img src={thumb} alt="" className="pd-video-thumb-bg" />
        ) : (
          <div className="pd-video-thumb-fallback" />
        )}
        <div className="pd-video-play-overlay" aria-hidden>
          <Play size={36} fill="currentColor" />
        </div>
      </div>
    );
  }

  const current = slides[idx];

  return (
    <div className="pd-block-media pd-block-media--carousel" style={{ position: 'relative' }}>
      {current.kind === 'image' ? (
        <img src={current.url} alt={`Media ${idx + 1}`} onClick={() => openSlide(current)} />
      ) : (
        <div className="pd-slide-video" onClick={() => openSlide(current)} role="presentation">
          {getVideoPosterThumb(current.url) ? (
            <img src={getVideoPosterThumb(current.url)} alt="" className="pd-video-thumb-bg" />
          ) : (
            <div className="pd-video-thumb-fallback" />
          )}
          <div className="pd-video-play-overlay" aria-hidden>
            <Play size={36} fill="currentColor" />
          </div>
        </div>
      )}
      <button
        type="button"
        className="pd-carousel-nav pd-carousel-nav--prev"
        aria-label="Previous"
        onClick={(e) => {
          e.stopPropagation();
          go(-1);
        }}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        className="pd-carousel-nav pd-carousel-nav--next"
        aria-label="Next"
        onClick={(e) => {
          e.stopPropagation();
          go(1);
        }}
      >
        <ChevronRight size={20} />
      </button>
      <div className="pd-carousel-dots">
        {slides.map((s, i) => (
          <button
            key={i}
            type="button"
            className={`pd-carousel-dot ${i === idx ? 'active' : ''} ${s.kind === 'video' ? 'video' : ''}`}
            aria-label={s.kind === 'video' ? `Video ${i + 1}` : `Image ${i + 1}`}
            onClick={(e) => {
              e.stopPropagation();
              setIdx(i);
            }}
          />
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
  const [lightbox, setLightbox] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    loadProduct();
    setActiveTab('overview');
  }, [id]);

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

  const displayAttrs = (product.attributes || []).filter(
    (a) => a.attributeId?.displayOnHomepage && a.values.length > 0
  );

  const renderBlocks = (items) => {
    if (!items || items.length === 0) {
      return <p style={{ color: '#9ca3af' }}>No information available.</p>;
    }
    return items.map((item, idx) => (
      <div key={idx} className={`pd-block ${idx % 2 !== 0 ? 'reverse' : ''}`}>
        <BlockMediaCarousel item={item} setLightbox={setLightbox} />
        <div className="pd-block-text">
          {item.title && <h3 className="pd-block-title">{item.title}</h3>}
          {item.description && <p className="pd-block-desc">{item.description}</p>}
        </div>
      </div>
    ));
  };

  return (
    <div className="pd-page">
      <div className="pd-breadcrumb">
        <Link to="/products">All Products</Link>
        <span>&rsaquo;</span>
        {product.name}
      </div>

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
        <button type="button" className="pd-contact-btn" onClick={openContactForm}>
          Contact Us
        </button>
      </div>

      <div className="pd-tabs">
        <button type="button" className={`pd-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button type="button" className={`pd-tab ${activeTab === 'features' ? 'active' : ''}`} onClick={() => setActiveTab('features')}>Features</button>
        {product.resources && product.resources.length > 0 && (
          <button type="button" className={`pd-tab ${activeTab === 'resources' ? 'active' : ''}`} onClick={() => setActiveTab('resources')}>Resources</button>
        )}
        {(product.customTabs || []).map((tab, idx) => (
          <button
            key={`custom-${idx}`}
            type="button"
            className={`pd-tab ${activeTab === `custom-${idx}` ? 'active' : ''}`}
            onClick={() => setActiveTab(`custom-${idx}`)}
          >
            {tab.tabName}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'overview' && renderBlocks(product.overview)}
        {activeTab === 'features' && renderBlocks(product.features)}
        {activeTab === 'resources' && (
          <div className="pd-block">
            <div className="pd-block-text" style={{ width: '100%' }}>
              <h3 className="pd-block-title">Product Resources</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                <div className="pd-resources-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '24px' }}>
                  {product.resources.map((res, i) => (
                    <div key={i} className="pd-resource-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', background: '#f0f9ff', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0183FF' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={res.name}>{res.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Document</div>
                        </div>
                      </div>
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pd-resource-download-btn"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          padding: '10px',
                          background: '#f8fafc',
                          color: '#0183FF',
                          borderRadius: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          textDecoration: 'none',
                          border: '1px solid #e2e8f0',
                          transition: 'background 0.2s',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Download
                      </a>
                    </div>
                  ))}
                </div>
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

      {displayAttrs.length > 0 && (
        <div className="pd-additional">
          <h3 className="pd-additional-title">Additional Information</h3>
          {displayAttrs.map((attr, idx) => (
            <div key={idx} className="pd-attr-group">
              <div className="pd-attr-name">{attr.attributeId?.name || attr.attributeName}</div>
              <div className="pd-attr-values">
                {attr.values.map((v) => (
                  <span key={v} className="pd-attr-value">{v}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {similarProducts.length > 0 && (
        <div className="pd-similar">
          <h3 className="pd-similar-title">Similar Products</h3>
          <div className="pd-similar-row">
            {similarProducts.map((p) => (
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

      {lightbox?.type === 'image' && (
        <div className="pub-lightbox" onClick={() => setLightbox(null)} role="presentation">
          <img src={lightbox.url} alt="" onClick={(e) => e.stopPropagation()} />
          <button type="button" className="pub-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close">
            <X size={20} />
          </button>
        </div>
      )}

      {lightbox?.type === 'embed' && (
        <div className="pub-lightbox pub-lightbox--video" onClick={() => setLightbox(null)} role="presentation">
          <div className="pub-lightbox-video-frame" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={lightbox.src}
              title="Product video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          {lightbox.originalUrl && (
            <a className="pub-lightbox-video-link" href={lightbox.originalUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
              Open on host site
            </a>
          )}
          <button type="button" className="pub-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close">
            <X size={20} />
          </button>
        </div>
      )}

      {lightbox?.type === 'direct' && (
        <div className="pub-lightbox pub-lightbox--video" onClick={() => setLightbox(null)} role="presentation">
          <div className="pub-lightbox-video-frame" onClick={(e) => e.stopPropagation()}>
            <video src={lightbox.url} controls playsInline className="pub-lightbox-native-video" />
          </div>
          <button type="button" className="pub-lightbox-close" onClick={() => setLightbox(null)} aria-label="Close">
            <X size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
