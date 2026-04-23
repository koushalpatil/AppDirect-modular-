const Attribute = require('../models/Attribute');
const Product = require('../models/Product');

// ── Field limits ──────────────────────────────────────────────────────────────
const LIMITS = {
  name: { min: 1, max: 100 },
  description: { max: 500 },
  option: { max: 100 },
  maxOptions: 50,
};

const VALID_MATCH_TYPES = new Set(['exact', 'overlap', 'partial']);

// Create a new attribute
exports.createAttribute = async (req, res) => {
  try {
    const { name, description, displayOnHomepage, requiredInProductEditor, showForFiltering, options, similarity } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Attribute name is required.' });
    }

    const trimmedName = String(name).trim();
    if (trimmedName.length > LIMITS.name.max) {
      return res.status(400).json({ message: `Attribute name must be under ${LIMITS.name.max} characters.` });
    }

    // Validate description
    if (description && String(description).length > LIMITS.description.max) {
      return res.status(400).json({ message: `Description must be under ${LIMITS.description.max} characters.` });
    }

    // Validate options
    if (Array.isArray(options)) {
      if (options.length > LIMITS.maxOptions) {
        return res.status(400).json({ message: `Maximum ${LIMITS.maxOptions} options allowed.` });
      }
      for (let i = 0; i < options.length; i++) {
        const opt = String(options[i] || '').trim();
        if (!opt) {
          return res.status(400).json({ message: `Option #${i + 1} cannot be empty.` });
        }
        if (opt.length > LIMITS.option.max) {
          return res.status(400).json({ message: `Option #${i + 1} must be under ${LIMITS.option.max} characters.` });
        }
      }
    }

    const existing = await Attribute.findOne({ name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
    if (existing) {
      return res.status(409).json({ message: 'An attribute with this name already exists.' });
    }

    if (similarity && similarity.weight !== undefined) {
      const w = Number(similarity.weight);
      if (isNaN(w) || w < 0 || w > 10) {
        return res.status(400).json({ message: 'Similarity weight must be between 0 and 10.' });
      }
    }
    if (similarity && similarity.matchType && !VALID_MATCH_TYPES.has(similarity.matchType)) {
      return res.status(400).json({ message: 'matchType must be one of: exact, overlap, partial.' });
    }

    const attribute = await Attribute.create({
      name: trimmedName,
      description: description ? String(description).trim().slice(0, LIMITS.description.max) : '',
      displayOnHomepage: displayOnHomepage || false,
      requiredInProductEditor: requiredInProductEditor || false,
      showForFiltering: showForFiltering || false,
      options: (options || []).map(o => String(o).trim().slice(0, LIMITS.option.max)).filter(Boolean),
      similarity: similarity || {
        useInSimilarity: false,
        weight: 1,
        matchType: 'exact',
      },
    });

    res.status(201).json({ message: 'Attribute created successfully.', attribute });
  } catch (error) {
    console.error('Create attribute error:', error);
    res.status(500).json({ message: 'Failed to create attribute.' });
  }
};

// Get all attributes
exports.getAttributes = async (req, res) => {
  try {
    const attributes = await Attribute.find().sort({ name: 1 });

    // Count linked products for each attribute
    const attributesWithCounts = await Promise.all(
      attributes.map(async (attr) => {
        const count = await Product.countDocuments({
          'attributes.attributeId': attr._id,
          status: 'published',
        });
        const attrObj = attr.toObject();
        attrObj.linkedProductsCount = count;
        return attrObj;
      })
    );

    res.json({ attributes: attributesWithCounts });
  } catch (error) {
    console.error('Get attributes error:', error);
    res.status(500).json({ message: 'Failed to retrieve attributes.' });
  }
};

// Get single attribute
exports.getAttribute = async (req, res) => {
  try {
    const attribute = await Attribute.findById(req.params.id);
    if (!attribute) {
      return res.status(404).json({ message: 'Attribute not found.' });
    }
    res.json({ attribute });
  } catch (error) {
    console.error('Get attribute error:', error);
    res.status(500).json({ message: 'Failed to retrieve attribute.' });
  }
};

// Update an attribute
exports.updateAttribute = async (req, res) => {
  try {
    const { name, description, displayOnHomepage, requiredInProductEditor, showForFiltering, options, similarity } = req.body;

    const attribute = await Attribute.findById(req.params.id);
    if (!attribute) {
      return res.status(404).json({ message: 'Attribute not found.' });
    }

    if (name !== undefined) {
      const trimmedName = String(name).trim();
      if (!trimmedName) {
        return res.status(400).json({ message: 'Attribute name is required.' });
      }
      if (trimmedName.length > LIMITS.name.max) {
        return res.status(400).json({ message: `Attribute name must be under ${LIMITS.name.max} characters.` });
      }
      const existing = await Attribute.findOne({
        name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(409).json({ message: 'An attribute with this name already exists.' });
      }
      attribute.name = trimmedName;
    }
    if (description !== undefined) {
      if (String(description).length > LIMITS.description.max) {
        return res.status(400).json({ message: `Description must be under ${LIMITS.description.max} characters.` });
      }
      attribute.description = String(description).trim().slice(0, LIMITS.description.max);
    }
    if (displayOnHomepage !== undefined) attribute.displayOnHomepage = displayOnHomepage;
    if (requiredInProductEditor !== undefined) attribute.requiredInProductEditor = requiredInProductEditor;
    if (showForFiltering !== undefined) attribute.showForFiltering = showForFiltering;
    if (options !== undefined) {
      if (Array.isArray(options)) {
        if (options.length > LIMITS.maxOptions) {
          return res.status(400).json({ message: `Maximum ${LIMITS.maxOptions} options allowed.` });
        }
        for (let i = 0; i < options.length; i++) {
          const opt = String(options[i] || '').trim();
          if (!opt) return res.status(400).json({ message: `Option #${i + 1} cannot be empty.` });
          if (opt.length > LIMITS.option.max) return res.status(400).json({ message: `Option #${i + 1} must be under ${LIMITS.option.max} characters.` });
        }
      }
      attribute.options = (Array.isArray(options) ? options : []).map(o => String(o).trim().slice(0, LIMITS.option.max)).filter(Boolean);
    }
    if (similarity !== undefined) {
      if (similarity.weight !== undefined) {
        const w = Number(similarity.weight);
        if (isNaN(w) || w < 0 || w > 10) {
          return res.status(400).json({ message: 'Similarity weight must be between 0 and 10.' });
        }
      }
      if (similarity.matchType && !VALID_MATCH_TYPES.has(similarity.matchType)) {
        return res.status(400).json({ message: 'matchType must be one of: exact, overlap, partial.' });
      }
      attribute.similarity = {
        ...attribute.similarity,
        ...similarity,
      };
    }

    await attribute.save();
    res.json({ message: 'Attribute updated successfully.', attribute });
  } catch (error) {
    console.error('Update attribute error:', error);
    res.status(500).json({ message: 'Failed to update attribute.' });
  }
};

// Delete an attribute
exports.deleteAttribute = async (req, res) => {
  try {
    const attribute = await Attribute.findById(req.params.id);
    if (!attribute) {
      return res.status(404).json({ message: 'Attribute not found.' });
    }

    if (attribute.name.toLowerCase() === 'category') {
      return res.status(403).json({ message: 'The standard Category attribute cannot be deleted.' });
    }

    // Check if any products use this attribute
    const linkedProducts = await Product.countDocuments({ 'attributes.attributeId': req.params.id });
    if (linkedProducts > 0) {
      return res.status(409).json({
        message: `Cannot delete. ${linkedProducts} product(s) are using this attribute.`,
      });
    }

    await Attribute.findByIdAndDelete(req.params.id);
    res.json({ message: 'Attribute deleted successfully.' });
  } catch (error) {
    console.error('Delete attribute error:', error);
    res.status(500).json({ message: 'Failed to delete attribute.' });
  }
};
