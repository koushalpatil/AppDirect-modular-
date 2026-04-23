import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { configAPI } from '../../services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Public.css';

export default function HomePage() {
  const [homepage, setHomepage] = useState({ heroImage: '', slidingImages: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideInterval = useRef(null);

  useEffect(() => { loadHomepage(); }, []);

  useEffect(() => {
    if (homepage.slidingImages.length > 1) {
      slideInterval.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % homepage.slidingImages.length);
      }, 4000);
      return () => clearInterval(slideInterval.current);
    }
  }, [homepage.slidingImages]);

  const loadHomepage = async () => {
    try {
      const res = await configAPI.getPublicHomepage();
      setHomepage(res.data);
    } catch (err) {
      console.error('Failed to load homepage', err);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => setCurrentSlide(prev => (prev + 1) % homepage.slidingImages.length);
  const prevSlide = () => setCurrentSlide(prev => (prev - 1 + homepage.slidingImages.length) % homepage.slidingImages.length);

  if (loading) return <div className="pub-loader"><div className="pub-spinner" /></div>;

  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="pub-hero">
        {homepage.heroImage ? (
          <div className="pub-hero-img-wrap">
            <img src={homepage.heroImage} alt="Marketplace" className="pub-hero-img" />
          </div>
        ) : (
          <div className="pub-hero-placeholder">
            <div style={{ textAlign: 'center' }}>
              <h1>Discover the Best Business Applications</h1>
              <p>Find, compare, and integrate the top cloud solutions for your business</p>
            </div>
          </div>
        )}
      </section>

      {/* Sliding Images */}
      {homepage.slidingImages.length > 0 && (
        <section className="pub-slider-section">
          <div className="pub-slider-container">
            <div className="pub-slider-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
              {homepage.slidingImages.map((img, idx) => (
                <div key={idx} className="pub-slider-slide">
                  <img src={img} alt={`Slide ${idx + 1}`} />
                </div>
              ))}
            </div>
            {homepage.slidingImages.length > 1 && (
              <>
                <button className="pub-slider-btn pub-slider-prev" onClick={prevSlide}><ChevronLeft size={20} /></button>
                <button className="pub-slider-btn pub-slider-next" onClick={nextSlide}><ChevronRight size={20} /></button>
                <div className="pub-slider-dots">
                  {homepage.slidingImages.map((_, idx) => (
                    <button key={idx} className={`pub-slider-dot ${idx === currentSlide ? 'active' : ''}`} onClick={() => setCurrentSlide(idx)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Categories & Products */}
      <section className="pub-categories">
        <div className="pub-section">
          {homepage.categories.length > 0 ? (
            homepage.categories.map((cat, idx) => (
              <div key={idx} className="pub-cat-block">
                <h2 className="pub-cat-title">{cat.title || cat.categoryValue || cat.categoryName}</h2>
                {cat.products && cat.products.length > 0 ? (
                  <div className="pub-products-row">
                    {cat.products.map(product => (
                      <Link key={product._id} to={`/products/${product._id}`} className="pub-product-card grid">
                        <div className="pub-card-logo-wrap">
                          {product.logo ? (
                            <img src={product.logo} alt={product.name} />
                          ) : (
                            <div className="pub-card-logo-placeholder">{product.name?.[0]}</div>
                          )}
                        </div>
                        <div className="pub-card-content">
                          <div className="pub-card-name">{product.name}</div>
                          {product.developerName && <div className="pub-card-developer">{product.developerName}</div>}
                          {product.tagline && <div className="pub-card-tagline">{product.tagline}</div>}
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af', fontSize: 14, padding: '20px 0' }}>No products in this category yet</p>
                )}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0' }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>Welcome to AppDirect</h2>
              <p style={{ color: '#6b7280', fontSize: 16, marginTop: 8 }}>Browse our marketplace for the best business solutions</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
