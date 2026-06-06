const path = require('path');

const DONOR_MODULE_VIEW = path.join(__dirname, '../../dashboard/src/views/pages/module.ejs');
const DONOR_MODULE_FORM_VIEW = path.join(__dirname, '../../dashboard/src/views/pages/module-form.ejs');

function parseListParams(query = {}, options = {}) {
  const defaultSort = options.defaultSort || 'created_at';
  const defaultDirection = options.defaultDirection || 'desc';
  const defaultPerPage = Number(options.defaultPerPage || 10);

  const page = Math.max(Number.parseInt(String(query.page || '1'), 10) || 1, 1);
  const perPageCandidate = Number.parseInt(String(query.perPage || defaultPerPage), 10);
  const allowedPageSizes = options.pageSizes || [5, 10, 20, 50];
  const perPage = allowedPageSizes.includes(perPageCandidate) ? perPageCandidate : defaultPerPage;

  return {
    q: String(query.q || '').trim(),
    sort: String(query.sort || defaultSort).trim(),
    direction: String(query.direction || defaultDirection).toLowerCase() === 'asc' ? 'asc' : 'desc',
    page,
    perPage
  };
}

function filterItems(items, searchQuery, fields) {
  const normalizedQuery = String(searchQuery || '').trim().toLowerCase();
  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => fields.some((field) => String(item[field] || '').toLowerCase().includes(normalizedQuery)));
}

function sortItems(items, sortKey, direction) {
  const sortedItems = [...items];
  const multiplier = direction === 'asc' ? 1 : -1;

  sortedItems.sort((left, right) => {
    const leftValue = left?.[sortKey];
    const rightValue = right?.[sortKey];

    if (leftValue == null && rightValue == null) {
      return 0;
    }
    if (leftValue == null) {
      return 1;
    }
    if (rightValue == null) {
      return -1;
    }

    if (typeof leftValue === 'number' || typeof rightValue === 'number') {
      return (Number(leftValue) - Number(rightValue)) * multiplier;
    }

    return String(leftValue).localeCompare(String(rightValue), 'id', { sensitivity: 'base' }) * multiplier;
  });

  return sortedItems;
}

function buildUrl(basePath, params) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function paginateItems(items, { basePath, page, perPage, params }) {
  const totalItems = items.length;
  const totalPages = Math.max(Math.ceil(totalItems / perPage), 1);
  const currentPage = Math.min(page, totalPages);
  const startOffset = (currentPage - 1) * perPage;
  const pagedItems = items.slice(startOffset, startOffset + perPage);
  const startIndex = totalItems === 0 ? 0 : startOffset + 1;
  const endIndex = totalItems === 0 ? 0 : startOffset + pagedItems.length;

  const pages = Array.from({ length: totalPages }, (_, index) => {
    const pageNumber = index + 1;
    return {
      page: pageNumber,
      url: buildUrl(basePath, { ...params, page: pageNumber, perPage }),
      isCurrent: pageNumber === currentPage
    };
  });

  return {
    items: pagedItems,
    pagination: {
      currentPage,
      totalPages,
      totalItems,
      startIndex,
      endIndex,
      prevUrl: currentPage > 1 ? buildUrl(basePath, { ...params, page: currentPage - 1, perPage }) : null,
      nextUrl: currentPage < totalPages ? buildUrl(basePath, { ...params, page: currentPage + 1, perPage }) : null,
      pages
    }
  };
}

function buildErrorSummary(errors = {}) {
  return Object.values(errors).filter(Boolean);
}

function buildListControls(basePath, params, sortOptions, options = {}) {
  return {
    action: basePath,
    searchValue: params.q,
    sortValue: params.sort,
    directionValue: params.direction,
    perPageValue: params.perPage,
    sortOptions,
    directionOptions: options.directionOptions || [
      { value: 'asc', label: 'A-Z / Terkecil' },
      { value: 'desc', label: 'Z-A / Terbesar' }
    ],
    pageSizeOptions: (options.pageSizes || [5, 10, 20, 50]).map((value) => ({
      value,
      label: `${value} data`
    })),
    extraFields: options.extraFields || []
  };
}

function getRoleNames(sessionUser) {
  if (!sessionUser) {
    return [];
  }

  if (Array.isArray(sessionUser.roles)) {
    return sessionUser.roles
      .map((role) => role?.name ?? null)
      .filter(Boolean);
  }

  const primaryRoleName = sessionUser.primaryRole?.name ?? sessionUser.role ?? null;
  return primaryRoleName ? [primaryRoleName] : [];
}

function hasAnyRole(sessionUser, allowedRoles = []) {
  const roleNames = getRoleNames(sessionUser);
  return roleNames.some((roleName) => allowedRoles.includes(roleName));
}

function buildActionButtons(basePath, id, isActive, entityLabel, editPayload, { canManage = true } = {}) {
  if (!canManage) {
    return [];
  }

  const actions = [
    {
      type: 'modal',
      label: 'Ubah',
      variant: 'secondary',
      payload: {
        action: `/${basePath}/${id}`,
        title: `Edit ${entityLabel}`,
        submitLabel: `Update ${entityLabel}`,
        entityLabel,
        ...editPayload
      }
    }
  ];

  if (isActive) {
    actions.push({
      type: 'form',
      label: 'Nonaktifkan',
      action: `/${basePath}/${id}/deactivate`,
      variant: 'danger',
      confirmMessage: `Nonaktifkan ${entityLabel} ini?`
    });
  } else {
    actions.push({
      type: 'form',
      label: 'Aktifkan',
      action: `/${basePath}/${id}/activate`,
      variant: 'secondary',
      confirmMessage: `Aktifkan kembali ${entityLabel} ini?`
    });
    actions.push({
      type: 'form',
      label: 'Hapus',
      action: `/${basePath}/${id}/delete`,
      variant: 'danger',
      confirmMessage: `Hapus permanen ${entityLabel} ini? Aksi ini tidak bisa dibatalkan.`
    });
  }

  return actions;
}

function buildDangerActions(basePath, id, isActive, entityLabel) {
  if (!id) {
    return [];
  }

  if (isActive) {
    return [
      {
        label: 'Nonaktifkan',
        action: `/${basePath}/${id}/deactivate`,
        confirmMessage: `Nonaktifkan ${entityLabel} ini?`
      }
    ];
  }

  return [
    {
      label: 'Aktifkan',
      action: `/${basePath}/${id}/activate`,
      variant: 'secondary',
      confirmMessage: `Aktifkan kembali ${entityLabel} ini?`
    },
    {
      label: 'Hapus',
      action: `/${basePath}/${id}/delete`,
      variant: 'danger',
      confirmMessage: `Hapus permanen ${entityLabel} ini? Aksi ini tidak bisa dibatalkan.`
    }
  ];
}

module.exports = {
  DONOR_MODULE_FORM_VIEW,
  DONOR_MODULE_VIEW,
  buildErrorSummary,
  buildListControls,
  buildUrl,
  filterItems,
  paginateItems,
  parseListParams,
  sortItems,
  hasAnyRole,
  buildActionButtons,
  buildDangerActions
};
