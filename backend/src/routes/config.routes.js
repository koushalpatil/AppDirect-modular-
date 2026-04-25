const router = require('express').Router();
const auth = require('../middlewares/auth');
const tryAuth = require('../middlewares/tryAuth');
const adminOnly = require('../middlewares/rbac');
const {
  getHomepageConfig,
  updateHomepageConfig,
  getPublicHomepage,
  submitPublicContactForm,
  getFooterConfig,
  updateFooterConfig,
  getPublicFooter,
  getUserApps,
  getContactTemplates,
  getContactTemplate,
  createContactTemplate,
  updateContactTemplate,
  deleteContactTemplate,
  cloneContactTemplate,
} = require('../controllers/configController');

// Public routes
router.get('/public/homepage', getPublicHomepage);
router.post('/public/contact-form/submit', tryAuth, submitPublicContactForm);
router.get('/public/footer', getPublicFooter);
router.get('/my-apps', auth, getUserApps);

// Admin routes
router.get('/homepage', auth, adminOnly, getHomepageConfig);
router.put('/homepage', auth, adminOnly, updateHomepageConfig);
router.get('/footer', auth, adminOnly, getFooterConfig);
router.put('/footer', auth, adminOnly, updateFooterConfig);

// Contact form template routes (Admin)
router.get('/contact-templates', auth, adminOnly, getContactTemplates);
router.post('/contact-templates', auth, adminOnly, createContactTemplate);
router.get('/contact-templates/:id', auth, adminOnly, getContactTemplate);
router.put('/contact-templates/:id', auth, adminOnly, updateContactTemplate);
router.delete('/contact-templates/:id', auth, adminOnly, deleteContactTemplate);
router.post('/contact-templates/:id/clone', auth, adminOnly, cloneContactTemplate);

module.exports = router;
