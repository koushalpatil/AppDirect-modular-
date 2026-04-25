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

const toComparableValue = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'object') return value;
  // Strip Mongoose-generated _id / __v so only meaningful content is compared
  return JSON.parse(JSON.stringify(value, (key, val) =>
    (key === '_id' || key === '__v') ? undefined : val
  ));
};

const normalizeValue = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
};

const areValuesEqual = (a, b) => {
  const left = toComparableValue(a);
  const right = toComparableValue(b);
  return JSON.stringify(left) === JSON.stringify(right);
};

const getAttributeValueMap = (attributes) => {
  const map = new Map();

  (attributes || []).forEach((attribute) => {
    const attributeId = attribute?.attributeId?._id?.toString?.() || attribute?.attributeId?.toString?.();
    if (!attributeId) return;

    const values = Array.isArray(attribute.values) ? attribute.values : [];
    map.set(attributeId, new Set(values.map(normalizeValue).filter(Boolean)));
  });

  return map;
};

const hasMatchingAttributeValues = (leftValues, rightValues) => {
  if (!leftValues || !rightValues) return false;
  for (const value of leftValues) {
    if (rightValues.has(value)) return true;
  }
  return false;
};

const getSimilarityScore = (currentProduct, candidateProduct) => {
  const currentAttributeMap = getAttributeValueMap(currentProduct.attributes);
  const candidateAttributeMap = getAttributeValueMap(candidateProduct.attributes);

  let matchingAttributesCount = 0;

  for (const [attributeId, currentValues] of currentAttributeMap.entries()) {
    const candidateValues = candidateAttributeMap.get(attributeId);
    if (hasMatchingAttributeValues(currentValues, candidateValues)) {
      matchingAttributesCount += 1;
    }
  }

  const sameDeveloper = normalizeValue(currentProduct.developerName) &&
    normalizeValue(currentProduct.developerName) === normalizeValue(candidateProduct.developerName);

  return (matchingAttributesCount * 2) + (sameDeveloper ? 3 : 0);
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
      name, tagline, developerName, logo,
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
      'name', 'tagline', 'developerName', 'logo',
      'overview', 'features', 'customTabs', 'attributes',
      'supportDescription', 'policies', 'resources',
      'useCustomContactForm', 'contactFields', 'status',
    ];

    updateFields.forEach((field) => {
      if (req.body[field] === undefined) return;

      let value = req.body[field];
      // Sanitize contactFields: strip _uid and clear when toggle is off
      if (field === 'contactFields') {
        value = sanitizeContactFields(value, req.body.useCustomContactForm ?? product.useCustomContactForm);
      }

      const currentValue = product[field];
      if (areValuesEqual(currentValue, value)) return;

      previousValues[field] = currentValue;
      changes[field] = value;
      product[field] = value;
    });

    // Determine action type
    let action = 'updated';
    if (changes.status === 'published' && previousValues.status === 'draft') {
      action = 'published';
    } else if (changes.status === 'draft' && previousValues.status === 'published') {
      action = 'unpublished';
    }

    if (Object.keys(changes).length > 0) {
      product.updatedBy = req.user._id;
      await product.save();

      await ProductEditLog.create({
        productId: product._id,
        editedBy: req.user._id,
        action,
        changes,
        previousValues,
      });
    }

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
      .select('name tagline logo developerName')
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
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const sort = req.query.sort || 'relevance';

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

    const hasSearch = !!(search && search.trim());
    let products = [];
    let total = 0;

    if (hasSearch) {
      const dataPipeline = [];

      if (sort === 'alphabetical') {
        dataPipeline.push({ $addFields: { sortNameLower: { $toLower: '$name' } } });
        dataPipeline.push({ $sort: { sortNameLower: 1, _id: 1 } });
      } else if (sort === 'newest') {
        dataPipeline.push({ $sort: { createdAt: -1 } });
      } else {
        dataPipeline.push({ $sort: { searchScore: -1, createdAt: -1 } });
      }

      dataPipeline.push(
        { $skip: skip },
        { $limit: limitNum },
        {
          $project: {
            name: 1,
            tagline: 1,
            logo: 1,
            developerName: 1,
            attributes: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        }
      );

      const pipeline = [
        {
          $search: {
            index: 'default',
            compound: {
              must: [
                {
                  text: {
                    query: search.trim(),
                    path: ['name', 'tagline'],
                    fuzzy: { maxEdits: 1, prefixLength: 2 },
                  },
                },
              ],
            },
          },
        },
        { $match: filter },
        { $addFields: { searchScore: { $meta: 'searchScore' } } },
        {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: dataPipeline,
          },
        },
      ];

      const result = await Product.aggregate(pipeline);
      const payload = result[0] || { metadata: [], data: [] };
      total = payload.metadata?.[0]?.total || 0;
      products = payload.data || [];
    } else {
      let sortQuery = { updatedAt: -1 };
      if (sort === 'newest') sortQuery = { createdAt: -1 };
      if (sort === 'alphabetical') sortQuery = { name: 1 };

      total = await Product.countDocuments(filter);
      const query = Product.find(filter)
        .select('name tagline logo developerName attributes createdAt updatedAt')
        .populate('attributes.attributeId', 'name displayOnHomepage showForFiltering')
        .sort(sortQuery)
        .skip(skip)
        .limit(limitNum);

      if (sort === 'alphabetical') {
        query.collation({ locale: 'en', strength: 2 });
      }

      products = await query;
    }

    res.json({
      products,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
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

    const facets = filterableAttrs.map((attr) => {
      return {
        _id: attr._id,
        name: attr.name,
        options: attr.options || [],
        selectedValues: parsedFilters[attr._id.toString()] || [],
      };
    });

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

    const allPublished = await Product.find({ _id: { $ne: product._id }, status: 'published' })
      .populate('attributes.attributeId', 'name')
      .lean();

    const scoredProducts = allPublished
      .map((candidate) => ({
        product: candidate,
        score: getSimilarityScore(product, candidate),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.product.createdAt) - new Date(a.product.createdAt);
      });

    const similarProducts = scoredProducts.slice(0, 5).map(item => item.product);

    res.json({ product, similarProducts });
  } catch (error) {
    console.error('Get public product error:', error);
    res.status(500).json({ message: 'Failed to retrieve product.' });
  }
};
