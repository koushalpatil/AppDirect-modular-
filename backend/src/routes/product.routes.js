const router = require('express').Router();
const auth = require('../middlewares/auth');
const adminOnly = require('../middlewares/rbac');
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getProductLogs,
  getPublishedProducts,
  getProductsByAttribute,
  searchProducts,
  getFilterFacets,
  getPublicProduct,
} = require('../controllers/productController');
const {
  getPublicProductContactForm,
} = require('../controllers/configController');

// Public routes
router.get('/public/search', searchProducts);
router.get('/public/facets', getFilterFacets);
router.get('/public', getPublishedProducts);
router.get('/public/by-attribute', getProductsByAttribute);
router.get('/public/:id/contact-form', getPublicProductContactForm);
router.get('/public/:id', getPublicProduct);

// Admin routes
router.post('/', auth, adminOnly, createProduct);
router.get('/', auth, adminOnly, getProducts);
router.get('/:id', auth, adminOnly, getProduct);
router.put('/:id', auth, adminOnly, updateProduct);
router.delete('/:id', auth, adminOnly, deleteProduct);
router.get('/:id/logs', auth, adminOnly, getProductLogs);

module.exports = router;
