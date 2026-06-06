const homeService = require('./homeService');
const medicineService = require('../medicines/medicineService');

async function showHome(req, res) {
  const searchQuery = String(req.query.q ?? '').trim();
  const categoryFilter = String(req.query.category ?? '').trim();
  const isLoginOpen = req.query.login === '1';
  const loginError = String(req.query.error ?? '').trim() || null;
  const loginIdentifier = String(req.query.identifier ?? '').trim();
  const [featuredProducts, categoryHighlights] = await Promise.all([
    homeService.listFeaturedProducts(searchQuery, { category: categoryFilter }),
    homeService.listCategoryHighlights()
  ]);

  return res.render('pages/home/index', {
    pageTitle: 'Beranda',
    featuredProducts,
    categoryHighlights,
    catalogSidebar: homeService.getCatalogSidebar(),
    activeCategoryFilter: categoryFilter,
    searchQuery,
    isLoginOpen,
    loginError,
    loginFormValues: {
      identifier: loginIdentifier
    }
  });
}

async function listSearchSuggestions(req, res) {
  const searchQuery = String(req.query.q ?? '').trim();
  const suggestions = await medicineService.listSearchSuggestions(searchQuery);

  return res.json({
    success: true,
    data: {
      query: searchQuery,
      suggestions
    }
  });
}

module.exports = {
  showHome,
  listSearchSuggestions
};
