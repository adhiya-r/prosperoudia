const express = require('express');
const homeController = require('./homeController');

const router = express.Router();

router.get('/search/suggestions', homeController.listSearchSuggestions);
router.get('/', homeController.showHome);

module.exports = router;
