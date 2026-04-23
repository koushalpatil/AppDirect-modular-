import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit3, Trash2, Package } from 'lucide-react';
import './Admin.css';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => { 
    loadProducts(); 
  }, [statusFilter]);

  // Debounced search for live table updates
  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(search);
    }, 400); // Slightly longer debounce for full table refresh
    return () => clearTimeout(timer);
  }, [search]);

  const loadProducts = async (currentSearch = search) => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (currentSearch.trim()) params.search = currentSearch.trim();
      const res = await productAPI.getAll(params);
      setProducts(res.data.products || []);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadProducts();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await productAPI.delete(id);
      toast.success('Product deleted');
      loadProducts();
    } catch (err) {
      toast.error('Failed to delete product');
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage your marketplace products</p>
        </div>
        <Link to="/admin/products/new" className="btn btn-primary">
          <Plus size={16} /> New Product
        </Link>
      </div>

      <div style={{ marginBottom: '1.5rem', maxWidth: 600 }}>
        <form onSubmit={handleSearchSubmit} className="search-bar" style={{ marginBottom: 0 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search products by name, tagline, or developer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">
            <Search size={16} />
          </button>
        </form>
      </div>

      <div className="filter-row">
        {['', 'published', 'draft'].map(s => (
          <button
            key={s}
            className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loader"><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <Package size={64} />
          <h3>No products yet</h3>
          <p>Create your first product to get started</p>
          <Link to="/admin/products/new" className="btn btn-primary mt-lg">
            <Plus size={16} /> Create Product
          </Link>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Created By</th>
                <th>Updated At</th>
                <th>Updated By</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => {
                const createdByName = product.createdBy?.firstName 
                  ? `${product.createdBy.firstName} ${product.createdBy.lastName}` 
                  : 'System';
                
                const updatedByName = product.updatedBy?.firstName 
                  ? `${product.updatedBy.firstName} ${product.updatedBy.lastName}` 
                  : createdByName; // Fallback to createdBy if never updated OR system if both missing

                return (
                  <tr key={product._id} className="table-row-hover" onClick={() => navigate(`/admin/products/${product._id}/edit`)}>
                    <td>
                      <div className="table-product-cell">
                        {product.logo ? (
                          <img src={product.logo} alt={product.name} className="table-product-logo" />
                        ) : (
                          <div className="product-logo-placeholder-sm">{product.name[0]}</div>
                        )}
                        <div>
                          <div className="table-product-name">{product.name}</div>
                          {product.tagline && <div className="table-product-tagline">{product.tagline}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${product.status === 'published' ? 'badge-success' : 'badge-warning'}`}>
                        {product.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-date-cell">
                        <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                        <small>{new Date(product.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                      </div>
                    </td>
                    <td>
                      <div className="table-user-cell">
                        <div className="table-user-avatar">{createdByName[0]}</div>
                        {createdByName}
                      </div>
                    </td>
                    <td>
                      <div className="table-date-cell">
                        <span>{new Date(product.updatedAt).toLocaleDateString()}</span>
                        <small>{new Date(product.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                      </div>
                    </td>
                    <td>
                      <div className="table-user-cell">
                        <div className="table-user-avatar">{updatedByName[0]}</div>
                        {updatedByName}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" onClick={e => e.stopPropagation()}>
                        <button className="btn btn-icon btn-ghost" onClick={() => navigate(`/admin/products/${product._id}/edit`)} title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button className="btn btn-icon btn-ghost" onClick={() => handleDelete(product._id, product.name)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
