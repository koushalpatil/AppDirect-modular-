import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { configAPI } from '../../services/api';
import { Search } from 'lucide-react';
import './Public.css';

const ProductCard = ({ product }) => (
  <Link to={`/products/${product._id}`} className="pub-product-card grid">
    <div className="pub-card-logo-wrap">
      {product.logo ? (
        <img src={product.logo} alt={product.name} />
      ) : (
        <div className="pub-card-logo-placeholder">{product.name?.[0]}</div>
      )}
    </div>
    <div className="pub-card-content">
      <h3 className="pub-card-name">{product.name}</h3>
      <p className="pub-card-developer">by {product.developerName || 'Unknown'}</p>
      <p className="pub-card-tagline">{product.tagline}</p>
      <div className="pub-card-tags" style={{ display: 'flex', gap: 4, marginTop: 'auto', paddingTop: 8 }}>
        {(product.tags || []).slice(0, 2).map(tag => (
          <span key={tag} className="pub-card-tag" style={{ fontSize: 10, background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>{tag}</span>
        ))}
      </div>
    </div>
  </Link>
);

export default function MyApps() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMyApps();
  }, []);

  const loadMyApps = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await configAPI.getUserApps();
      setProducts(res.data.products || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load your apps.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="pub-loader"><div className="pub-spinner" /></div>;

  return (
    <div className="pub-section">
      <div style={{ padding: '40px 0 32px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#111827', marginBottom: 8, letterSpacing: '-0.5px' }}>My Apps</h1>
        <p style={{ color: '#6b7280', fontSize: 16 }}>Products you have interacted with</p>
      </div>

      {error ? (
        <div style={{ padding: '60px 24px', background: '#fff', border: '1px solid #fee2e2', borderRadius: 16, color: '#dc2626', textAlign: 'center', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.05)' }}>
          <div style={{ background: '#fef2f2', width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
             <Search size={24} color="#dc2626" />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Unable to load apps</h3>
          <p style={{ color: '#991b1b', opacity: 0.8, marginBottom: 20 }}>{error}</p>
          <button onClick={loadMyApps} className="pd-contact-btn" style={{ padding: '8px 24px' }}>Try Again</button>
        </div>
      ) : products.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 24, paddingBottom: 48 }}>
          {products.map(product => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        !loading && (
          <div style={{ padding: '100px 24px', textAlign: 'center', background: '#fff', borderRadius: 16, border: '1px dashed #e5e7eb' }}>
            <div style={{ background: '#f8f9fa', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Search size={32} color="#9ca3af" />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8 }}>No apps found</h3>
            <p style={{ color: '#6b7280', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>
              You haven't contacted any products yet. Once you submit a contact form, the product will appear here.
            </p>
            <Link to="/products" className="pd-contact-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Explore Marketplace
            </Link>
          </div>
        )
      )}
    </div>
  );
}
