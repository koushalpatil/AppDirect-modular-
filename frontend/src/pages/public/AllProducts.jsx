import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { productAPI } from '../../services/api';
import { ChevronDown, ChevronUp, Home, LayoutList, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import './Public.css';

// Keys that are NOT filters (URL-level metadata params)
const NON_FILTER_KEYS = new Set(['search', 'page', 'sort', 'productIds']);

export default function AllProducts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [facets, setFacets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [collapsedFilters, setCollapsedFilters] = useState({});
  const [viewMode, setViewMode] = useState('list');
  const [hideFilters, setHideFilters] = useState(false);

  // Derive these fresh from searchParams on every render
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'newest';

  /** Parse attribute filters from URL — excludes meta keys */
  const getActiveFilters = useCallback(() => {
    const filters = {};
    for (const [key, value] of searchParams.entries()) {
      if (!NON_FILTER_KEYS.has(key)) {
        const vals = value.split(',').filter(Boolean);
        if (vals.length > 0) filters[key] = vals;
      }
    }
    return filters;
  }, [searchParams]);

  const activeFilters = getActiveFilters();
  const hasActiveFilters = Object.keys(activeFilters).length > 0;
  const activeFilterCount = Object.values(activeFilters).reduce((acc, vals) => acc + vals.length, 0);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    // Re-read everything from searchParams here to avoid stale closure
    const currentSearch = searchParams.get('search') || '';
    const currentPage = parseInt(searchParams.get('page') || '1');
    const currentSort = searchParams.get('sort') || 'newest';
    const currentProductIds = searchParams.get('productIds') || undefined;
    const filters = {};
    for (const [key, value] of searchParams.entries()) {
      if (!NON_FILTER_KEYS.has(key)) {
        const vals = value.split(',').filter(Boolean);
        if (vals.length > 0) filters[key] = vals;
      }
    }
    const filtersParam = Object.keys(filters).length > 0 ? JSON.stringify(filters) : undefined;

    try {
      const [prodRes, facetRes] = await Promise.all([
        productAPI.search({
          search: currentSearch,
          filters: filtersParam,
          productIds: currentProductIds,
          page: currentPage,
          limit: 24,
          sort: currentSort,
        }),
        productAPI.getFacets(),
      ]);
      setProducts(prodRes.data.products || []);
      setPagination(prodRes.data.pagination || { total: 0, page: 1, pages: 1 });
      setFacets(facetRes.data.facets || []);
    } catch (err) {
      console.error('Failed to load products', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Filter actions ─────────────────────────────────────────────────────────
  const toggleFilterValue = (attrId, value) => {
    const params = new URLSearchParams(searchParams);
    const current = params.get(attrId)?.split(',').filter(Boolean) || [];

    if (current.includes(value)) {
      const updated = current.filter((v) => v !== value);
      if (updated.length === 0) {
        params.delete(attrId);
      } else {
        params.set(attrId, updated.join(','));
      }
    } else {
      params.set(attrId, [...current, value].join(','));
    }

    params.set('page', '1');
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    setSearchParams(params);
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams);
    params.set('sort', val);
    params.set('page', '1');
    setSearchParams(params);
  };

  const goToPage = (p) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', p.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleCollapse = (attrId) => {
    setCollapsedFilters((prev) => ({ ...prev, [attrId]: !prev[attrId] }));
  };

  const breadcrumbText = search
    ? `Search: "${search}"`
    : 'All Products';

  const pageTitle = search
    ? `Results for "${search}"`
    : 'All Products';

  const buildPageItems = (current, total) => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, 5, 'ellipsis', total];
    if (current >= total - 2) return [1, 'ellipsis', total - 4, total - 3, total - 2, total - 1, total];
    return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', total];
  };

  return (
    <div
      className="all-products-wrapper"
      style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '24px 0' }}
    >
      <div className="pub-section">
        {/* Breadcrumb */}
        <div
          className="pd-breadcrumb"
          style={{
            padding: '0 0 16px 0',
            fontSize: '13px',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
            <Home size={14} />
          </Link>
          <span>/</span>
          <span style={{ color: '#0183FF', fontWeight: '500' }}>{breadcrumbText}</span>
        </div>

        {/* Top Header Row */}
        <div
          className="ap-master-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111827', margin: 0 }}>
              {pageTitle}
            </h1>
            <span
              className="ap-results-count"
              style={{ fontSize: '14px', color: '#6b7280', display: 'block', marginTop: '4px' }}
            >
              {loading ? 'Loading…' : `${pagination.total} Result${pagination.total !== 1 ? 's' : ''}`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Hide/Show Filters */}
            <button
              className="btn btn-secondary"
              style={{
                background: '#fff',
                fontSize: '13px',
                fontWeight: '600',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={() => setHideFilters(!hideFilters)}
            >
              <SlidersHorizontal size={14} />
              {hideFilters ? 'Show Filters' : 'Hide Filters'}
              {hasActiveFilters && (
                <span
                  style={{
                    background: '#0183FF',
                    color: '#fff',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '1px 7px',
                    marginLeft: '2px',
                  }}
                >
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Sort */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '6px 12px',
              }}
            >
              <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500', whiteSpace: 'nowrap' }}>
                Sort By
              </span>
              <select
                value={sort}
                onChange={handleSortChange}
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#111827',
                  cursor: 'pointer',
                }}
              >
                <option value="newest">Newest</option>
                <option value="alphabetical">A – Z</option>
              </select>
            </div>

            {/* View Mode */}
            <div
              style={{
                display: 'flex',
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                overflow: 'hidden',
              }}
            >
              <button
                onClick={() => setViewMode('list')}
                title="List view"
                style={{
                  background: viewMode === 'list' ? '#111827' : 'transparent',
                  color: viewMode === 'list' ? '#fff' : '#6b7280',
                  border: 'none',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LayoutList size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                title="Grid view"
                style={{
                  background: viewMode === 'grid' ? '#111827' : 'transparent',
                  color: viewMode === 'grid' ? '#fff' : '#6b7280',
                  border: 'none',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        <div
          className="all-products-page"
          style={{ padding: 0, gap: '24px', alignItems: 'flex-start' }}
        >
          {/* ── Filter Sidebar ────────────────────────────────────── */}
          {!hideFilters && (
            <aside
              className="ap-sidebar"
              style={{
                background: '#fff',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                position: 'sticky',
                top: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}
              >
                <h3 className="ap-sidebar-title" style={{ margin: 0, fontSize: '15px' }}>
                  Filters
                  {hasActiveFilters && (
                    <span
                      style={{
                        marginLeft: '8px',
                        background: '#e0edff',
                        color: '#0183FF',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '1px 8px',
                      }}
                    >
                      {activeFilterCount}
                    </span>
                  )}
                </h3>
                {hasActiveFilters && (
                  <button
                    className="ap-clear-all"
                    style={{ padding: 0 }}
                    onClick={clearAllFilters}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {loading && facets.length === 0 && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
                  <div className="pub-spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                </div>
              )}

              {facets.map((facet) => {
                const selectedVals = activeFilters[facet._id] || [];
                return (
                  <div
                    key={facet._id}
                    className="ap-filter-group"
                    style={{ marginBottom: '4px', paddingBottom: '12px', borderBottom: '1px solid #f3f4f6' }}
                  >
                    <div
                      className="ap-filter-header"
                      onClick={() => toggleCollapse(facet._id)}
                      style={{ userSelect: 'none' }}
                    >
                      <span className="ap-filter-name" style={{ fontSize: '14px' }}>
                        {facet.name}
                        {selectedVals.length > 0 && (
                          <span
                            style={{
                              marginLeft: '6px',
                              background: '#0183FF',
                              color: '#fff',
                              borderRadius: '999px',
                              fontSize: '10px',
                              fontWeight: '700',
                              padding: '1px 6px',
                            }}
                          >
                            {selectedVals.length}
                          </span>
                        )}
                      </span>
                      {collapsedFilters[facet._id] ? (
                        <ChevronDown size={14} color="#9ca3af" />
                      ) : (
                        <ChevronUp size={14} color="#9ca3af" />
                      )}
                    </div>

                    {!collapsedFilters[facet._id] && (
                      <div className="ap-filter-options" style={{ marginTop: '10px' }}>
                        {facet.options.length > 0 ? (
                          facet.options.map((opt) => {
                            const isSelected = selectedVals.includes(opt);
                            return (
                              <div key={opt}>
                                <label
                                  className="ap-filter-option"
                                  style={{ padding: '3px 0', cursor: 'pointer' }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleFilterValue(facet._id, opt)}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '4px',
                                      accentColor: '#0183FF',
                                      cursor: 'pointer',
                                    }}
                                  />
                                  <span
                                    style={{
                                      fontSize: '13px',
                                      color: isSelected ? '#0183FF' : '#374151',
                                      fontWeight: isSelected ? '600' : '400',
                                    }}
                                  >
                                    {opt}
                                  </span>
                                </label>
                              </div>
                            );
                          })
                        ) : (
                          <span style={{ fontSize: 12, color: '#9ca3af', padding: '4px 0' }}>
                            No options available
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {facets.length === 0 && !loading && (
                <p style={{ fontSize: 13, color: '#9ca3af' }}>No filters available</p>
              )}
            </aside>
          )}

          {/* ── Products Content ──────────────────────────────────── */}
          <div className="ap-content">
            {loading ? (
              <div className="pub-loader">
                <div className="pub-spinner" />
              </div>
            ) : products.length > 0 ? (
              <>
                <div className={`ap-products-container ${viewMode}`}>
                  {products.map((product) => (
                    <Link
                      key={product._id}
                      to={`/products/${product._id}`}
                      className={`pub-product-card ${viewMode}`}
                    >
                      <div className="pub-card-logo-wrap">
                        {product.logo ? (
                          <img src={product.logo} alt={product.name} />
                        ) : (
                          <div className="pub-card-logo-placeholder">
                            {product.name?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="pub-card-content">
                        <div className="pub-card-name">{product.name}</div>
                        {product.tagline && (
                          <div className="pub-card-tagline">{product.tagline}</div>
                        )}
                        {viewMode === 'list' && product.overview?.[0]?.description && (
                          <div className="pub-card-overview">
                            {product.overview[0].description.replace(/<[^>]+>/g, '').substring(0, 200)}
                            {product.overview[0].description.length > 200 ? '…' : ''}
                          </div>
                        )}
                        {product.developerName && (
                          <div className="pub-card-developer">
                            Sold by {product.developerName}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="ap-pagination" style={{ gap: '14px' }}>
                    <button
                      className="ap-page-btn"
                      disabled={pagination.page <= 1}
                      onClick={() => goToPage(pagination.page - 1)}
                      aria-label="Previous page"
                    >
                      &lsaquo;
                    </button>

                    {buildPageItems(pagination.page, pagination.pages).map((item, idx) => {
                      if (item === 'ellipsis') {
                        return (
                          <button key={`ellipsis-${idx}`} className="ap-page-btn" disabled>
                            ...
                          </button>
                        );
                      }
                      return (
                        <button
                          key={item}
                          className={`ap-page-btn ${item === pagination.page ? 'active' : ''}`}
                          onClick={() => goToPage(item)}
                        >
                          {item}
                        </button>
                      );
                    })}

                    <button
                      className="ap-page-btn"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => goToPage(pagination.page + 1)}
                      aria-label="Next page"
                    >
                      &rsaquo;
                    </button>

                    <button
                      className="ap-page-btn"
                      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                      style={{ marginLeft: '8px', background: '#111827', color: '#fff', borderColor: '#111827' }}
                    >
                      Back to top
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="ap-empty">
                <h3>No products found</h3>
                <p>
                  {hasActiveFilters || search
                    ? 'Try adjusting or clearing your filters'
                    : 'No products are published yet'}
                </p>
                {(hasActiveFilters || search) && (
                  <button
                    onClick={clearAllFilters}
                    style={{
                      marginTop: '16px',
                      padding: '10px 24px',
                      background: '#0183FF',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
