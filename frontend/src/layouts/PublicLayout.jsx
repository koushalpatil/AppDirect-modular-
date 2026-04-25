import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { catalogAPI, productAPI, configAPI } from '../services/api';
import { ChevronDown, Search, LogOut, Menu, X } from 'lucide-react';
import dblogo from '../assets/dblogo.png';
import './PublicLayout.css';

const companyLinks = [
  { label: 'Our Story', url: 'https://darwinbox.com/about-us/our-story/' },
  { label: 'Customers', url: 'https://explore.darwinbox.com/resources/customer-success-stories' },
  { label: 'Partners', url: 'https://explore.darwinbox.com/darwinbox-partners' },
  { label: 'Newsroom', url: 'https://newsroom.darwinbox.com/' },
  { label: 'Careers', url: 'https://dbx.darwinbox.in/ms/candidatev2/main/careers/allJobs' },
];

const resourcesLinks = [
  { label: 'Blog', url: 'https://blog.darwinbox.com/' },
  { label: 'Case Studies', url: 'https://explore.darwinbox.com/resources/customer-success-stories' },
  { label: 'Industry Reports', url: 'https://explore.darwinbox.com/resources/think-tank#industry-reports' },
  { label: 'E-Books', url: 'https://explore.darwinbox.com/resources/think-tank#ebooks' },
  { label: 'Events', url: 'https://explore.darwinbox.com/resources/events' },
  { label: 'Product Tours', url: 'https://explore.darwinbox.com/resources/think-tank#productTours' },
  { label: 'HR Glossary', url: 'https://explore.darwinbox.com/hr-glossary' },
];

const partnerLink = { label: 'Become a Partner', url: 'https://explore.darwinbox.com/darwinbox-partners' };

// Inline SVG social media icons
const SocialIcon = ({ platform }) => {
  const icons = {
    facebook: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
    ),
    x: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
    ),
    instagram: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
    ),
  };
  return icons[platform] || null;
};

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [categoryAttrId, setCategoryAttrId] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const dropdownRef = useRef(null);
  const topMenuRef = useRef(null);
  const menuCloseTimeoutRef = useRef(null);
  const timeoutRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Footer state
  const [footerData, setFooterData] = useState(null);

  useEffect(() => {
    loadCategories();
    loadFooter();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
      if (topMenuRef.current && !topMenuRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadFooter = async () => {
    try {
      const res = await configAPI.getPublicFooter();
      setFooterData(res.data);
    } catch (err) {
      console.error('Failed to load footer', err);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await catalogAPI.getPublic();
      const attrs = res.data.attributes || [];
      // Use first attribute that has showForFiltering or fallback to 'Category'
      const catAttr = attrs.find(a => a.name === 'Category') || attrs[0];
      if (catAttr) {
        setCategories(catAttr.options || []);
        setCategoryAttrId(catAttr._id);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadAllProducts = async () => {
    try {
      const res = await productAPI.getPublished({ page: 1, limit: 12, sort: 'newest' });
      setAllProducts(res.data.products || []);
    } catch {
      setAllProducts([]);
    }
  };

  const handleCategoryHover = async (category) => {
    setHoveredCategory(category);
    if (!categoryAttrId) return;
    try {
      const res = await productAPI.getByAttribute({ attributeId: categoryAttrId, value: category });
      setCategoryProducts(res.data.products || []);
    } catch {
      setCategoryProducts([]);
    }
  };

  const handleViewAllHover = async () => {
    setHoveredCategory(null);
    if (allProducts.length === 0) {
      await loadAllProducts();
    }
  };

  const handleMegaEnter = () => {
    clearTimeout(timeoutRef.current);
    setMegaMenuOpen(true);
    if (allProducts.length === 0) {
      loadAllProducts();
    }
  };

  const handleMegaLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setMegaMenuOpen(false);
      setHoveredCategory(null);
      setCategoryProducts([]);
    }, 200);
  };

  const getCategoryFilterUrl = (category) => {
    if (!categoryAttrId || !category) return '/products';
    const params = new URLSearchParams();
    params.set(categoryAttrId, category);
    return `/products?${params.toString()}`;
  };

  const getCategoryProductFilterUrl = (category, productId) => {
    if (!categoryAttrId || !category) return '/products';
    const params = new URLSearchParams();
    params.set(categoryAttrId, category);
    if (productId) params.set('productIds', productId);
    return `/products?${params.toString()}`;
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (val.trim().length > 1) {
      setIsSearching(true);
      setShowSuggestions(true);
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await productAPI.search({ search: val, limit: 5 });
          setSuggestions(res.data.products || []);
        } catch (err) {
          console.error(err);
          setSuggestions([]);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    } else {
      navigate('/products');
    }
  };

  const hasFooterMain = footerData && (
    (footerData.footerSections?.length > 0) ||
    footerData.footerContent?.title ||
    footerData.footerContent?.description ||
    (footerData.socialMedia?.length > 0)
  );

  const hasBottomBar = footerData && (
    (footerData.bottomFooterLinks?.length > 0) ||
    footerData.bottomFooterCopyright
  );

  const openTopMenu = (label) => {
    if (menuCloseTimeoutRef.current) clearTimeout(menuCloseTimeoutRef.current);
    setOpenMenu(label);
  };

  const closeTopMenu = () => {
    if (menuCloseTimeoutRef.current) clearTimeout(menuCloseTimeoutRef.current);
    menuCloseTimeoutRef.current = setTimeout(() => setOpenMenu(null), 180);
  };

  const renderTopMenu = (label, links) => (
    <div
      className="pub-nav-dropdown pub-nav-dropdown-menu"
      onMouseEnter={() => openTopMenu(label)}
      onMouseLeave={closeTopMenu}
    >
      <button
        type="button"
        className="pub-nav-trigger pub-nav-trigger-button"
        onClick={() => setOpenMenu((current) => (current === label ? null : label))}
      >
        {label} <ChevronDown size={14} />
      </button>
      {openMenu === label && (
        <div className="pub-nav-menu-panel" onMouseEnter={() => openTopMenu(label)} onMouseLeave={closeTopMenu}>
          {links.map((item) => (
            <a key={item.label} href={item.url} className="pub-nav-menu-link" target="_blank" rel="noopener noreferrer">
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="pub-layout">
      {/* Top Blue Header */}
      <header className="pub-top-bar">
        <div className="pub-top-container">
          <Link to="/" className="pub-brand">
            <img src={dblogo} alt="Darwinbox" className="pub-header-logo" />
          </Link>
          <div className="pub-top-links" ref={topMenuRef}>
            {renderTopMenu('Company', companyLinks)}
            {renderTopMenu('Resources', resourcesLinks)}
            <a href={partnerLink.url} className="pub-top-link pub-top-external-link" target="_blank" rel="noopener noreferrer">
              {partnerLink.label}
            </a>
          </div>
          <div className="pub-top-actions">
            {user ? (
              <div className="pub-user-area">
                <span className="pub-username">{user.firstName}</span>
                {user.role === 'admin' && (
                  <Link to="/admin" className="pub-top-link">Admin Panel</Link>
                )}
                <button className="pub-top-btn" onClick={() => { logout(); navigate('/'); }}>
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              null
            )}
          </div>
        </div>
      </header>

      {/* Secondary Nav with All Products + Search */}
      <nav className="pub-nav-bar">
        <div className="pub-nav-container">
          <div className="pub-nav-left">
            <div
              className="pub-nav-dropdown"
              onMouseEnter={handleMegaEnter}
              onMouseLeave={handleMegaLeave}
            >
              <Link to="/products" className="pub-nav-trigger">
                All Products <ChevronDown size={14} />
              </Link>

              {megaMenuOpen && (
                <div className="pub-mega-menu">
                  {/* ... mega menu content ... */}
                  <div className="pub-mega-cats">
                    <Link
                      to="/products"
                      className="pub-mega-view-all"
                      onMouseEnter={handleViewAllHover}
                      onClick={() => setMegaMenuOpen(false)}
                    >
                      View All
                    </Link>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        className={`pub-mega-cat ${hoveredCategory === cat ? 'active' : ''}`}
                        onMouseEnter={() => handleCategoryHover(cat)}
                        onClick={() => {
                          navigate(getCategoryFilterUrl(cat));
                          setMegaMenuOpen(false);
                        }}
                      >
                        {cat} <span className="cat-arrow">&rsaquo;</span>
                      </button>
                    ))}
                    {categories.length === 0 && (
                      <p className="pub-mega-empty">No categories yet</p>
                    )}
                  </div>
                  <div className="pub-mega-products">
                    {hoveredCategory ? (
                      <>
                        {categoryAttrId && (
                           <Link 
                            to={getCategoryFilterUrl(hoveredCategory)} 
                              className="pub-mega-view-all-right" 
                              onClick={() => setMegaMenuOpen(false)}
                           >
                             View All
                           </Link>
                        )}
                        {categoryProducts.length > 0 ? (
                          <div className="pub-mega-grid">
                            {categoryProducts.map(p => (
                              <Link
                                key={p._id}
                                to={`/products/${p._id}`}
                                className="pub-mega-item"
                                onClick={() => setMegaMenuOpen(false)}
                              >
                                {p.logo && <img src={p.logo} alt={p.name} className="pub-mega-logo" />}
                                <div>
                                  <span className="pub-mega-name">{p.name}</span>
                                  {p.tagline && <span className="pub-mega-tagline">{p.tagline}</span>}
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="pub-mega-empty">No products in this category</p>
                        )}
                      </>
                    ) : (
                      <>
                        <Link to="/products" className="pub-mega-view-all-right" onClick={() => setMegaMenuOpen(false)}>
                          View All
                        </Link>
                        {allProducts.length > 0 ? (
                          <div className="pub-mega-grid">
                            {allProducts.map((p) => (
                              <Link
                                key={p._id}
                                to={`/products/${p._id}`}
                                className="pub-mega-item"
                                onClick={() => setMegaMenuOpen(false)}
                              >
                                {p.logo && <img src={p.logo} alt={p.name} className="pub-mega-logo" />}
                                <div>
                                  <span className="pub-mega-name">{p.name}</span>
                                  {p.tagline && <span className="pub-mega-tagline">{p.tagline}</span>}
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <p className="pub-mega-empty">No products available</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Link to={user ? '/my-apps' : '/login'} className="pub-nav-trigger">
              My Apps
            </Link>
          </div>

          <div className="pub-search-wrapper" ref={dropdownRef}>
            <form className="pub-search-form" onSubmit={handleSearch}>
              <input
                type="text"
                className="pub-search-input"
                placeholder="Search by product name, tagline, or developer"
                value={searchQuery}
                onChange={handleSearchChange}
                maxLength={100}
                onFocus={() => {
                  if (suggestions.length > 0 || isSearching) setShowSuggestions(true);
                }}
              />
              <button type="submit" className="pub-search-btn">
                <Search size={16} />
              </button>
            </form>

            {showSuggestions && (
              <div className="pub-search-suggestions">
                {isSearching ? (
                  <div className="pub-suggestion-status">Searching…</div>
                ) : suggestions.length > 0 ? (
                  suggestions.map(p => (
                    <Link
                      key={p._id}
                      to={`/products/${p._id}`}
                      className="pub-suggestion-item"
                      onClick={() => setShowSuggestions(false)}
                    >
                      {p.logo ? (
                        <img src={p.logo} alt={p.name} className="pub-suggestion-logo" />
                      ) : (
                        <div className="pub-suggestion-logo-placeholder">{p.name?.[0]}</div>
                      )}
                      <div className="pub-suggestion-details">
                        <div className="pub-suggestion-name">{p.name}</div>
                        {p.tagline && <div className="pub-suggestion-tagline">{p.tagline}</div>}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="pub-suggestion-status">No results found</div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="pub-main">
        <Outlet />
      </main>

      {/* ─── Dynamic Footer ─────────────────────────────────────── */}
      <footer className="pub-footer">
        {/* Main Footer Area: Sections + Content + Social */}
        {hasFooterMain && (
          <div className="pub-footer-main">
            <div className="pub-footer-main-container">
              {/* Link Sections */}
              <div className="pub-footer-sections">
                {footerData.footerSections?.map((section, i) => (
                  <div key={i} className="pub-footer-section">
                    <h4 className="pub-footer-section-title">{section.title}</h4>
                    <ul className="pub-footer-section-links">
                      {section.links?.map((link, j) => (
                        <li key={j}>
                          <a href={link.url} target="_blank" rel="noopener noreferrer">
                            {link.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Content / Disclaimer */}
              {(footerData.footerContent?.title || footerData.footerContent?.description) && (
                <div className="pub-footer-content">
                  {footerData.footerContent.title && (
                    <h4 className="pub-footer-section-title">{footerData.footerContent.title}</h4>
                  )}
                  {footerData.footerContent.description && (
                    <p className="pub-footer-content-text">{footerData.footerContent.description}</p>
                  )}

                  {/* Social Media Icons */}
                  {footerData.socialMedia?.length > 0 && (
                    <div className="pub-footer-social">
                      <span className="pub-footer-social-label">Follow Us</span>
                      <div className="pub-footer-social-icons">
                        {footerData.socialMedia.map((sm, i) => (
                          <a
                            key={i}
                            href={sm.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pub-footer-social-icon"
                            title={sm.platform}
                          >
                            <SocialIcon platform={sm.platform} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Footer Bar */}
        {hasBottomBar && (
          <div className="pub-footer-bottom">
            <div className="pub-footer-bottom-container">
              <div className="pub-footer-bottom-left">
                <img src={dblogo} alt="Darwinbox" className="pub-footer-logo" />
                {footerData.bottomFooterLinks?.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pub-footer-bottom-link"
                  >
                    {link.title}
                  </a>
                ))}
              </div>
              {footerData.bottomFooterCopyright && (
                <p className="pub-footer-copy">{footerData.bottomFooterCopyright}</p>
              )}
            </div>
          </div>
        )}

        {/* Fallback if no config */}
        {!hasFooterMain && !hasBottomBar && (
          <div className="pub-footer-bottom">
            <div className="pub-footer-bottom-container">
              <div className="pub-footer-bottom-left">
                <img src={dblogo} alt="Darwinbox" className="pub-footer-logo" />
              </div>
              <p className="pub-footer-copy">Copyright &copy;{new Date().getFullYear()}.Darwinbox Digital Solutions Pvt. Ltd. All Rights Reserved.</p>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}


