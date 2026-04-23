const Product = require('../models/Product');
const Attribute = require('../models/Attribute');
const ProductEditLog = require('../models/ProductEditLog');

/**
 * Strip client-only metadata (_uid) from contact fields before persisting.
 * If useCustomContactForm is false, return an empty array.
 */
const sanitizeContactFields = (fields, useCustom) => {
  if (!useCustom) return [];
  if (!Array.isArray(fields)) return [];
  return fields.map(({ _uid, _doc, __v, ...field }) => ({
    ...field,
    options: (field.options || []).map(({ _id, ...opt }) => opt),
  }));
};

const LIMITS = {
  name: { min: 2, max: 100 },
  tagline: { max: 150 },
  developerName: { max: 100 },
  tag: { max: 30 },
  maxTags: 20,
  overviewTitle: { max: 100 },
  overviewDescription: { max: 5000 },
  featureTitle: { max: 100 },
  featureDescription: { max: 5000 },
  supportDescription: { max: 3000 },
  policies: { max: 5000 },
  maxCustomTabs: 5,
  customTabName: { min: 2, max: 50 },
  maxCustomTabElements: 10,
  customTabElementTitle: { max: 100 },
  customTabElementDescription: { max: 5000 },
};

const sanitizeString = (str, maxLen) => {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLen);
};

/**
 * Validate product payload. Returns array of error strings.
 * @param {Object} data - The request body
 * @param {string} targetStatus - 'draft' or 'published'
 */
const validateProductPayload = (data, targetStatus) => {
  const errors = [];
  const name = (data.name || '').trim();

  // Name is always required
  if (!name) {
    errors.push('Product name is required.');
  } else if (name.length < LIMITS.name.min) {
    errors.push(`Product name must be at least ${LIMITS.name.min} characters.`);
  } else if (name.length > LIMITS.name.max) {
    errors.push(`Product name must be under ${LIMITS.name.max} characters.`);
  }

  // For drafts, only the name is strictly required
  if (targetStatus === 'draft') return errors;

  // ── Publishing validation ──
  if (data.tagline && data.tagline.length > LIMITS.tagline.max) {
    errors.push(`Tagline must be under ${LIMITS.tagline.max} characters.`);
  }
  if (data.developerName && data.developerName.length > LIMITS.developerName.max) {
    errors.push(`Developer name must be under ${LIMITS.developerName.max} characters.`);
  }
  if (Array.isArray(data.tags)) {
    if (data.tags.length > LIMITS.maxTags) errors.push(`Maximum ${LIMITS.maxTags} tags allowed.`);
    data.tags.forEach((t, i) => {
      if (typeof t === 'string' && t.length > LIMITS.tag.max) {
        errors.push(`Tag #${i + 1} must be under ${LIMITS.tag.max} characters.`);
      }
    });
  }
  (data.overview || []).forEach((item, i) => {
    if (item.title && item.title.length > LIMITS.overviewTitle.max) errors.push(`Overview #${i + 1} title too long.`);
    if (item.description && item.description.length > LIMITS.overviewDescription.max) errors.push(`Overview #${i + 1} description too long.`);
  });
  (data.features || []).forEach((item, i) => {
    if (item.title && item.title.length > LIMITS.featureTitle.max) errors.push(`Feature #${i + 1} title too long.`);
    if (item.description && item.description.length > LIMITS.featureDescription.max) errors.push(`Feature #${i + 1} description too long.`);
  });
  if (data.supportDescription && data.supportDescription.length > LIMITS.supportDescription.max) {
    errors.push(`Support description must be under ${LIMITS.supportDescription.max} characters.`);
  }
  if (data.policies && data.policies.length > LIMITS.policies.max) {
    errors.push(`Policies must be under ${LIMITS.policies.max} characters.`);
  }
  const customTabs = data.customTabs || [];
  if (customTabs.length > LIMITS.maxCustomTabs) errors.push(`Maximum ${LIMITS.maxCustomTabs} custom tabs allowed.`);
  customTabs.forEach((tab, ti) => {
    const tn = (tab.tabName || '').trim();
    if (!tn) errors.push(`Custom tab #${ti + 1} name is required.`);
    else if (tn.length > LIMITS.customTabName.max) errors.push(`Custom tab #${ti + 1} name too long.`);
    const els = tab.elements || [];
    if (els.length > LIMITS.maxCustomTabElements) errors.push(`Custom tab "${tn}" has too many elements.`);
    els.forEach((el, ei) => {
      if (el.title && el.title.length > LIMITS.customTabElementTitle.max) errors.push(`Tab "${tn}" element #${ei + 1} title too long.`);
      if (el.description && el.description.length > LIMITS.customTabElementDescription.max) errors.push(`Tab "${tn}" element #${ei + 1} description too long.`);
    });
  });

  return errors;
};

// Create a new product (draft or published)
exports.createProduct = async (req, res) => {
  try {
    const {
      name, tagline, developerName, logo, tags,
      overview, features, customTabs, attributes,
      supportDescription, policies, resources,
      useCustomContactForm, contactFields, status,
    } = req.body;

    const targetStatus = status || 'draft';
    const validationErrors = validateProductPayload(req.body, targetStatus);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    const product = await Product.create({
      name: sanitizeString(name, LIMITS.name.max),
      tagline: sanitizeString(tagline, LIMITS.tagline.max),
      developerName: sanitizeString(developerName, LIMITS.developerName.max),
      logo,
      tags: (tags || []).map(t => sanitizeString(t, LIMITS.tag.max)).filter(Boolean),
      overview: overview || [],
      features: features || [],
      customTabs: customTabs || [],
      attributes: attributes || [],
      supportDescription: sanitizeString(supportDescription, LIMITS.supportDescription.max),
      policies: sanitizeString(policies, LIMITS.policies.max),
      resources: resources || [],
      useCustomContactForm: !!useCustomContactForm,
      contactFields: sanitizeContactFields(contactFields, useCustomContactForm),
      status: targetStatus,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    // Log creation
    await ProductEditLog.create({
      productId: product._id,
      editedBy: req.user._id,
      action: 'created',
      changes: { status: product.status },
    });

    res.status(201).json({ message: 'Product created successfully.', product });
  } catch (error) {
    console.error('Create product error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages[0], errors: messages });
    }
    res.status(500).json({ message: 'Failed to create product.' });
  }
};

// Get all products (with optional filters)
exports.getProducts = async (req, res) => {
  try {
    const { status, search, attributeId, attributeValue, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      const trimmedSearch = search.trim();
      filter.$or = [
        { name: { $regex: trimmedSearch, $options: 'i' } },
        { tagline: { $regex: trimmedSearch, $options: 'i' } },
        { tags: { $regex: trimmedSearch, $options: 'i' } },
        { developerName: { $regex: trimmedSearch, $options: 'i' } },
      ];
    }
    if (attributeId && attributeValue) {
      filter['attributes'] = {
        $elemMatch: {
          attributeId,
          values: attributeValue,
        },
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ message: 'Failed to retrieve products.' });
  }
};

// Get single product by ID
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('attributes.attributeId', 'name options');

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json({ product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ message: 'Failed to retrieve product.' });
  }
};

// Update a product
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // Validate the incoming payload
    const targetStatus = req.body.status || product.status;
    const mergedPayload = { ...product.toObject(), ...req.body };
    const validationErrors = validateProductPayload(mergedPayload, targetStatus);
    if (validationErrors.length > 0) {
      return res.status(400).json({ message: validationErrors[0], errors: validationErrors });
    }

    // Capture previous values for edit log
    const previousValues = {};
    const changes = {};
    const updateFields = [
      'name', 'tagline', 'developerName', 'logo', 'tags',
      'overview', 'features', 'customTabs', 'attributes',
      'supportDescription', 'policies', 'resources',
      'useCustomContactForm', 'contactFields', 'status',
    ];

    updateFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        previousValues[field] = product[field];
        let value = req.body[field];
        // Sanitize contactFields: strip _uid and clear when toggle is off
        if (field === 'contactFields') {
          value = sanitizeContactFields(value, req.body.useCustomContactForm ?? product.useCustomContactForm);
        }
        changes[field] = value;
        product[field] = value;
      }
    });

    product.updatedBy = req.user._id;
    await product.save();

    // Determine action type
    let action = 'updated';
    if (changes.status === 'published' && previousValues.status === 'draft') {
      action = 'published';
    } else if (changes.status === 'draft' && previousValues.status === 'published') {
      action = 'unpublished';
    }

    await ProductEditLog.create({
      productId: product._id,
      editedBy: req.user._id,
      action,
      changes,
      previousValues,
    });

    res.json({ message: 'Product updated successfully.', product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Failed to update product.' });
  }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    await ProductEditLog.create({
      productId: product._id,
      editedBy: req.user._id,
      action: 'deleted',
      previousValues: product.toObject(),
    });

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ message: 'Failed to delete product.' });
  }
};

// Get edit logs for a product
exports.getProductLogs = async (req, res) => {
  try {
    const logs = await ProductEditLog.find({ productId: req.params.id })
      .populate('editedBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ logs });
  } catch (error) {
    console.error('Get product logs error:', error);
    res.status(500).json({ message: 'Failed to retrieve product logs.' });
  }
};

// Get published products for public/user view
exports.getPublishedProducts = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const filter = { status: 'published' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tagline: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { developerName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .select('-createdBy -updatedBy')
      .populate('attributes.attributeId', 'name displayOnHomepage showForFiltering')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get published products error:', error);
    res.status(500).json({ message: 'Failed to retrieve products.' });
  }
};

// Get products by attribute value (for homepage categories)
exports.getProductsByAttribute = async (req, res) => {
  try {
    const { attributeId, value, limit = 200 } = req.query;
    const filter = { status: 'published' };

    if (attributeId && value) {
      filter['attributes'] = {
        $elemMatch: {
          attributeId,
          values: value,
        },
      };
    }

    const products = await Product.find(filter)
      .select('name tagline logo tags developerName')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit));

    res.json({ products });
  } catch (error) {
    console.error('Get products by attribute error:', error);
    res.status(500).json({ message: 'Failed to retrieve products.' });
  }
};

// Production-level search with multi-attribute filtering
exports.searchProducts = async (req, res) => {
  try {
    const { search, filters, productIds, page = 1, limit = 20 } = req.query;
    const filter = { status: 'published' };

    if (productIds) {
      const ids = productIds
        .toString()
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        filter._id = { $in: ids };
      }
    }

    // Text search across multiple fields
    if (search && search.trim()) {
      const searchRegex = search.trim().split(/\s+/).map(word =>
        `(?=.*${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`
      ).join('');
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tagline: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { developerName: { $regex: search, $options: 'i' } },
        { 'attributes.values': { $regex: search, $options: 'i' } },
      ];
    }

    // Multi-attribute filtering: filters is JSON like {"attrId1":["val1","val2"],"attrId2":["val3"]}
    if (filters) {
      try {
        const parsed = typeof filters === 'string' ? JSON.parse(filters) : filters;
        const attrConditions = [];
        for (const [attrId, values] of Object.entries(parsed)) {
          if (Array.isArray(values) && values.length > 0) {
            attrConditions.push({
              attributes: {
                $elemMatch: {
                  attributeId: attrId,
                  values: { $in: values },
                },
              },
            });
          }
        }
        if (attrConditions.length > 0) {
          filter.$and = attrConditions;
        }
      } catch (e) {
        // Invalid JSON, skip filters
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);
    
    // Sort logic mapping
    const sort = req.query.sort || 'relevance';
    let sortQuery = { updatedAt: -1 }; // Fallback relevance
    if (sort === 'newest') sortQuery = { createdAt: -1 };
    if (sort === 'alphabetical') sortQuery = { name: 1 };
    
    const products = await Product.find(filter)
      .select('name tagline logo tags developerName attributes createdAt updatedAt')
      .populate('attributes.attributeId', 'name displayOnHomepage showForFiltering')
      .sort(sortQuery)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Search products error:', error);
    res.status(500).json({ message: 'Failed to search products.' });
  }
};

// Dynamic filter facets — recalculates available values based on current filters
exports.getFilterFacets = async (req, res) => {
  try {
    const { search, filters, productIds } = req.query;

    // Get all filterable attributes
    const filterableAttrs = await Attribute.find({ showForFiltering: true })
      .select('name options _id');

    // Build base filter (same logic as searchProducts but without attribute filters)
    const baseFilter = { status: 'published' };
    if (productIds) {
      const ids = productIds
        .toString()
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        baseFilter._id = { $in: ids };
      }
    }
    if (search && search.trim()) {
      baseFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tagline: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
        { developerName: { $regex: search, $options: 'i' } },
        { 'attributes.values': { $regex: search, $options: 'i' } },
      ];
    }

    let parsedFilters = {};
    if (filters) {
      try {
        parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters;
      } catch (e) { /* ignore */ }
    }

    // For each filterable attribute, compute available values
    // by applying all OTHER filters (not the current attribute's filter)
    const facets = [];

    for (const attr of filterableAttrs) {
      const attrFilter = { ...baseFilter };
      const attrConditions = [];

      // Apply all filters EXCEPT this attribute
      for (const [attrId, values] of Object.entries(parsedFilters)) {
        if (attrId !== attr._id.toString() && Array.isArray(values) && values.length > 0) {
          attrConditions.push({
            attributes: {
              $elemMatch: {
                attributeId: attrId,
                values: { $in: values },
              },
            },
          });
        }
      }

      if (attrConditions.length > 0) {
        attrFilter.$and = attrConditions;
      }

      // Find all products matching the cross-filter, then extract unique values for this attribute
      const products = await Product.find(attrFilter)
        .select('attributes')
        .lean();

      const availableValues = new Set();
      for (const prod of products) {
        const prodAttr = (prod.attributes || []).find(
          a => a.attributeId?.toString() === attr._id.toString()
        );
        if (prodAttr) {
          prodAttr.values.forEach(v => availableValues.add(v));
        }
      }

      facets.push({
        _id: attr._id,
        name: attr.name,
        options: attr.options.filter(opt => availableValues.has(opt)),
        selectedValues: parsedFilters[attr._id.toString()] || [],
      });
    }

    res.json({ facets });
  } catch (error) {
    console.error('Get filter facets error:', error);
    res.status(500).json({ message: 'Failed to retrieve filter facets.' });
  }
};

// Get single published product with full attribute data for public detail page
exports.getPublicProduct = async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, status: 'published' })
      .populate('attributes.attributeId', 'name displayOnHomepage showForFiltering options');

    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    // --- DYNAMIC SIMILARITY ENGINE ---
    // 1. Get global similarity settings
    const ContentConfig = require('../models/ContentConfig');
    const similarityConfig = await ContentConfig.findOne({ type: 'similarity_settings' }) || {
      minSimilarityScore: 0.2,
      maxResults: 5,
    };

    // 2. Get attributes configured for similarity
    const similarityAttributes = await Attribute.find({ 'similarity.useInSimilarity': true });
    
    // 3. Get all published products (excluding current)
    const allPublished = await Product.find({ _id: { $ne: product._id }, status: 'published' })
      .populate('attributes.attributeId', 'name similarity')
      .lean();

    // 4. Map target product attributes for easy lookup
    const targetAttrMap = {};
    (product.attributes || []).forEach(attr => {
      const attrId = attr.attributeId?._id?.toString() || attr.attributeId?.toString();
      if (attrId) targetAttrMap[attrId] = attr.values || [];
    });

    // 5. Scoring Loop
    const scoredProducts = allPublished.map(p => {
      let score = 0;
      let totalPossibleWeight = 0;

      similarityAttributes.forEach(attr => {
        const attrId = attr._id.toString();
        const targetValues = targetAttrMap[attrId] || [];
        const pAttr = (p.attributes || []).find(a => (a.attributeId?._id?.toString() || a.attributeId?.toString()) === attrId);
        const pValues = pAttr ? (pAttr.values || []) : [];
        
        const weight = attr.similarity?.weight || 1;
        totalPossibleWeight += weight;

        if (targetValues.length > 0 && pValues.length > 0) {
          const matchType = attr.similarity?.matchType || 'exact';
          let matched = false;

          if (matchType === 'exact') {
            // Arrays are same or target is subset
            matched = targetValues.length === pValues.length && targetValues.every(v => pValues.includes(v));
          } else if (matchType === 'overlap') {
            matched = targetValues.some(v => pValues.includes(v));
          } else if (matchType === 'partial') {
            matched = targetValues.some(v1 => pValues.some(v2 => 
              v1.toLowerCase().includes(v2.toLowerCase()) || v2.toLowerCase().includes(v1.toLowerCase())
            ));
          }

          if (matched) {
            score += weight;
          }
        }
      });

      // Normalize score (0 to 1)
      const normalizedScore = totalPossibleWeight > 0 ? score / totalPossibleWeight : 0;
      
      // Fallback check: does it match the fallback attribute?
      let isFallbackMatch = false;
      if (similarityConfig.fallbackAttributeId) {
        const fallId = similarityConfig.fallbackAttributeId.toString();
        const targetFallValues = targetAttrMap[fallId] || [];
        const pFallAttr = (p.attributes || []).find(a => (a.attributeId?._id?.toString() || a.attributeId?.toString()) === fallId);
        const pFallValues = pFallAttr ? (pFallAttr.values || []) : [];
        isFallbackMatch = targetFallValues.length > 0 && pFallValues.some(v => targetFallValues.includes(v));
      }

      return { product: p, score: normalizedScore, isFallbackMatch };
    });

    // 6. Filtering & Ranking
    // Threshold filtering
    let filtered = scoredProducts.filter(sp => sp.score >= (similarityConfig.minSimilarityScore || 0.2));

    // Fallback logic if results are low
    const maxRes = similarityConfig.maxResults || 5;
    if (filtered.length < maxRes && similarityConfig.fallbackAttributeId) {
      const fallbackResults = scoredProducts
        .filter(sp => sp.isFallbackMatch && !filtered.find(f => f.product._id.toString() === sp.product._id.toString()))
        .sort((a, b) => b.score - a.score);
      
      filtered = [...filtered, ...fallbackResults];
    }

    // Final Sort: Score DESC, then newest
    filtered.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.product.createdAt) - new Date(a.product.createdAt);
    });

    const similarProducts = filtered.slice(0, maxRes).map(sp => sp.product);

    res.json({ product, similarProducts });
  } catch (error) {
    console.error('Get public product error:', error);
    res.status(500).json({ message: 'Failed to retrieve product.' });
  }
};
