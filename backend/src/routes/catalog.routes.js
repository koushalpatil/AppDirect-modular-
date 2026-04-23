const router = require('express').Router();
const auth = require('../middlewares/auth');
const adminOnly = require('../middlewares/rbac');
const {
  createAttribute,
  getAttributes,
  getAttribute,
  updateAttribute,
  deleteAttribute,
} = require('../controllers/catalogController');

// Public route - needed by user pages for filtering
router.get('/public', getAttributes);

// Admin routes
router.post('/', auth, adminOnly, createAttribute);
router.get('/', auth, adminOnly, getAttributes);
router.get('/:id', auth, adminOnly, getAttribute);
router.put('/:id', auth, adminOnly, updateAttribute);
router.delete('/:id', auth, adminOnly, deleteAttribute);

module.exports = router;
