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
  const [categoryProductsMap, setCategoryProductsMap] = useState({});

  // Derive these fresh from searchParams on every render
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'relevance';
  const selectedProductIds = (searchParams.get('productIds') || '')
    .split(',')
    .filter(Boolean);

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
  const categoryFacet = facets.find((f) => (f.name || '').toLowerCase() === 'category');
  const categoryAttrId = categoryFacet?._id?.toString();
  const selectedCategories = categoryAttrId ? (activeFilters[categoryAttrId] || []) : [];

  // ── Data fetching ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    // Re-read everything from searchParams here to avoid stale closure
    const currentSearch = searchParams.get('search') || '';
    const currentPage = parseInt(searchParams.get('page') || '1');
    const currentSort = searchParams.get('sort') || 'relevance';
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
        productAPI.getFacets({ search: currentSearch, filters: filtersParam, productIds: currentProductIds }),
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

  useEffect(() => {
    if (!categoryAttrId || selectedCategories.length === 0) {
      setCategoryProductsMap({});
      return;
    }

    const loadCategoryProducts = async () => {
      try {
        const entries = await Promise.all(
          selectedCategories.map(async (category) => {
            const res = await productAPI.getByAttribute({
              attributeId: categoryAttrId,
              value: category,
              limit: 200,
            });
            return [category, res.data.products || []];
          })
        );
        setCategoryProductsMap(Object.fromEntries(entries));
      } catch {
        setCategoryProductsMap({});
      }
    };

    loadCategoryProducts();
  }, [categoryAttrId, selectedCategories.join('|')]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const currentIds = (params.get('productIds') || '').split(',').filter(Boolean);

    if (currentIds.length === 0) return;

    if (selectedCategories.length === 0) {
      params.delete('productIds');
      setSearchParams(params);
      return;
    }

    const allowedIds = new Set(
      selectedCategories.flatMap((category) =>
        (categoryProductsMap[category] || []).map((p) => p._id)
      )
    );

    if (allowedIds.size === 0) return;

    const pruned = currentIds.filter((id) => allowedIds.has(id));
    if (pruned.length !== currentIds.length) {
      if (pruned.length > 0) {
        params.set('productIds', pruned.join(','));
      } else {
        params.delete('productIds');
      }
      params.set('page', '1');
      setSearchParams(params);
    }
  }, [searchParams, selectedCategories.join('|'), categoryProductsMap, setSearchParams]);

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

  const removeFilterChip = (attrId, value) => {
    if (attrId === 'productId') {
      const params = new URLSearchParams(searchParams);
      const current = (params.get('productIds') || '').split(',').filter(Boolean);
      const updated = current.filter((id) => id !== value);
      if (updated.length > 0) {
        params.set('productIds', updated.join(','));
      } else {
        params.delete('productIds');
      }
      params.set('page', '1');
      setSearchParams(params);
      return;
    }

    const params = new URLSearchParams(searchParams);
    const current = params.get(attrId)?.split(',').filter(Boolean) || [];
    const updated = current.filter((v) => v !== value);
    if (updated.length === 0) {
      params.delete(attrId);
    } else {
      params.set(attrId, updated.join(','));
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearAllFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (sort && sort !== 'relevance') params.set('sort', sort);
    setSearchParams(params);
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams);
    if (val === 'relevance') {
      params.delete('sort');
    } else {
      params.set('sort', val);
    }
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

  const toggleProductFilter = (productId) => {
    const params = new URLSearchParams(searchParams);
    const current = (params.get('productIds') || '').split(',').filter(Boolean);

    if (current.includes(productId)) {
      const updated = current.filter((id) => id !== productId);
      if (updated.length > 0) {
        params.set('productIds', updated.join(','));
      } else {
        params.delete('productIds');
      }
    } else {
      params.set('productIds', [...current, productId].join(','));
    }

    params.set('page', '1');
    setSearchParams(params);
  };

  // ── Active filter chips ────────────────────────────────────────────────────
  // Build chip list from facets (so we have human-readable names)
  const activeChips = [];
  for (const facet of facets) {
    const selected = activeFilters[facet._id] || [];
    for (const val of selected) {
      activeChips.push({ attrId: facet._id, attrName: facet.name, value: val });
    }
  }
  // Also add chips for URL params that don't yet have a facet loaded (e.g. direct link)
  for (const [attrId, vals] of Object.entries(activeFilters)) {
    for (const val of vals) {
      if (!activeChips.find((c) => c.attrId === attrId && c.value === val)) {
        activeChips.push({ attrId, attrName: attrId, value: val });
      }
    }
  }

  for (const category of selectedCategories) {
    const list = categoryProductsMap[category] || [];
    for (const product of list) {
      if (selectedProductIds.includes(product._id)) {
        activeChips.push({
          attrId: 'productId',
          attrName: 'Product',
          value: product._id,
          label: product.name,
        });
      }
    }
  }

  const primaryCategoryChip = activeChips.find((c) => c.attrName === 'Category') || activeChips[0];
  const breadcrumbText = search
    ? `Search: "${search}"`
    : primaryCategoryChip
    ? primaryCategoryChip.value
    : 'All Products';

  const pageTitle = search
    ? `Results for "${search}"`
    : primaryCategoryChip
    ? primaryCategoryChip.value
    : 'All Products';

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
                  {activeChips.length}
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
                <option value="relevance">Relevance</option>
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
                      {activeChips.length}
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
                const isCategoryFacet = (facet.name || '').toLowerCase() === 'category';
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

                                {isCategoryFacet && isSelected && (
                                  <div style={{ marginLeft: '26px', marginTop: '2px', marginBottom: '6px' }}>
                                    {(categoryProductsMap[opt] || []).length > 0 ? (
                                      (categoryProductsMap[opt] || []).map((product) => {
                                        const checked = selectedProductIds.includes(product._id);
                                        return (
                                          <label
                                            key={product._id}
                                            className="ap-filter-option"
                                            style={{ padding: '2px 0', cursor: 'pointer' }}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={() => toggleProductFilter(product._id)}
                                              style={{
                                                width: '14px',
                                                height: '14px',
                                                borderRadius: '4px',
                                                accentColor: '#111827',
                                                cursor: 'pointer',
                                              }}
                                            />
                                            <span
                                              style={{
                                                fontSize: '13px',
                                                color: checked ? '#111827' : '#4b5563',
                                                fontWeight: checked ? '600' : '400',
                                              }}
                                            >
                                              {product.name}
                                            </span>
                                          </label>
                                        );
                                      })
                                    ) : (
                                      <span style={{ fontSize: 12, color: '#9ca3af', padding: '2px 0', display: 'block' }}>
                                        No products in this category
                                      </span>
                                    )}
                                  </div>
                                )}
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
                  <div className="ap-pagination">
                    <button
                      className="ap-page-btn"
                      disabled={pagination.page <= 1}
                      onClick={() => goToPage(pagination.page - 1)}
                    >
                      ← Previous
                    </button>
                    {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                      const start = Math.max(
                        1,
                        Math.min(pagination.page - 3, pagination.pages - 6)
                      );
                      const p = start + i;
                      if (p > pagination.pages) return null;
                      return (
                        <button
                          key={p}
                          className={`ap-page-btn ${p === pagination.page ? 'active' : ''}`}
                          onClick={() => goToPage(p)}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      className="ap-page-btn"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => goToPage(pagination.page + 1)}
                    >
                      Next →
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
