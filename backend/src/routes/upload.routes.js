const router = require('express').Router();
const auth = require('../middlewares/auth');
const { uploadSingle, uploadMultiple } = require('../controllers/uploadController');

router.post('/single', auth, uploadSingle);
router.post('/multiple', auth, uploadMultiple);

module.exports = router;
