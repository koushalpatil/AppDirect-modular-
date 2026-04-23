import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { productAPI, catalogAPI } from '../../services/api';
import { Package, FolderTree, TrendingUp, FileText } from 'lucide-react';
import './Admin.css';

export default function Dashboard() {
  const [stats, setStats] = useState({ products: 0, published: 0, drafts: 0, attributes: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        productAPI.getAll({ limit: 1 }),
        catalogAPI.getAll(),
      ]);
      const total = prodRes.data.pagination?.total || 0;
      const allProds = await productAPI.getAll({ limit: 999 });
      const published = allProds.data.products?.filter(p => p.status === 'published').length || 0;
      setStats({
        products: total,
        published,
        drafts: total - published,
        attributes: catRes.data.attributes?.length || 0,
      });
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  const cards = [
    { label: 'Total Products', value: stats.products, icon: Package, color: '#6366f1', link: '/admin/products' },
    { label: 'Published', value: stats.published, icon: TrendingUp, color: '#10b981', link: '/admin/products' },
    { label: 'Drafts', value: stats.drafts, icon: FileText, color: '#f59e0b', link: '/admin/products' },
    { label: 'Attributes', value: stats.attributes, icon: FolderTree, color: '#06b6d4', link: '/admin/catalog' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your marketplace</p>
        </div>
        <Link to="/admin/products/new" className="btn btn-primary">
          <Package size={16} /> New Product
        </Link>
      </div>

      <div className="stats-grid">
        {cards.map(({ label, value, icon: Icon, color, link }) => (
          <Link to={link} key={label} className="stat-card card">
            <div className="stat-card-inner">
              <div className="stat-icon" style={{ background: `${color}20`, color }}>
                <Icon size={22} />
              </div>
              <div className="stat-info">
                <span className="stat-value">{value}</span>
                <span className="stat-label">{label}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="dashboard-section mt-xl">
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>Quick Actions</h2>
        <div className="quick-actions">
          <Link to="/admin/products/new" className="quick-action-card card">
            <Package size={20} />
            <span>Create Product</span>
          </Link>
          <Link to="/admin/catalog" className="quick-action-card card">
            <FolderTree size={20} />
            <span>Manage Catalog</span>
          </Link>
          <Link to="/admin/config/contact" className="quick-action-card card">
            <FileText size={20} />
            <span>Contact Form</span>
          </Link>
          <Link to="/admin/config/homepage" className="quick-action-card card">
            <TrendingUp size={20} />
            <span>Homepage Config</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
