import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Package, FolderTree, FileText, Settings, LogOut, Home, ChevronRight, Zap, PanelBottom, Menu, X
} from 'lucide-react';
import dbLogo from '../assets/dblogo1.webp';
import './AdminLayout.css';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/products', icon: Package, label: 'Products' },
    { to: '/admin/catalog', icon: FolderTree, label: 'Catalog' },
    { to: '/admin/config/contact', icon: FileText, label: 'Contact Form' },
    { to: '/admin/config/homepage', icon: Settings, label: 'Homepage Config' },
    { to: '/admin/config/similarity', icon: Zap, label: 'Similarity Settings' },
    { to: '/admin/config/footer', icon: PanelBottom, label: 'Footer Config' },
  ];

  return (
    <div className="admin-layout">
      {/* Mobile hamburger */}
      <button className="mobile-toggle" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
        <Menu size={22} />
      </button>

      {/* Overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <NavLink to="/admin" className="sidebar-logo">
            <img src={dbLogo} alt="Logo" className="logo-img" />
          </NavLink>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              <ChevronRight size={14} className="nav-arrow" />
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <NavLink to="/" className="nav-item view-site">
            <Home size={18} />
            <span>View Site</span>
          </NavLink>
          <div className="sidebar-user">
            <div className="user-avatar">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.firstName} {user?.lastName}</span>
              <span className="user-role">{user?.role}</span>
            </div>
            <button className="btn-icon btn-ghost" onClick={handleLogout} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
