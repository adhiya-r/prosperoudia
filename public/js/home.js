const modal = document.querySelector('[data-login-modal]');
const openButtons = document.querySelectorAll('[data-open-login]');
const closeButtons = document.querySelectorAll('[data-close-login]');
const passwordInput = document.querySelector('[data-password-input]');
const passwordToggle = document.querySelector('[data-password-toggle]');
const searchInput = document.querySelector('[data-search-input]');
const suggestionsContainer = document.querySelector('[data-search-suggestions]');

function setModalVisible(visible) {
  if (!modal) {
    return;
  }

  modal.classList.toggle('is-visible', visible);
  document.body.classList.toggle('has-modal-open', visible);
}

openButtons.forEach((button) => {
  button.addEventListener('click', () => setModalVisible(true));
});

closeButtons.forEach((button) => {
  button.addEventListener('click', () => setModalVisible(false));
});

if (modal) {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      setModalVisible(false);
    }
  });
}

if (passwordInput && passwordToggle) {
  passwordToggle.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    passwordToggle.textContent = isHidden ? 'Sembunyikan' : 'Lihat';
  });
}

function renderSuggestions(query, suggestions = []) {
  if (!suggestionsContainer) {
    return;
  }

  if (!suggestions.length) {
    suggestionsContainer.hidden = true;
    suggestionsContainer.innerHTML = '';
    return;
  }

  const listItems = suggestions.map((suggestion) => {
    const badge = suggestion.badge ? `<span class="search-suggestion__badge">${suggestion.badge}</span>` : '';
    return `
      <a class="search-suggestion" href="/medicines/${suggestion.id}">
        <div class="search-suggestion__content">
          <strong>${suggestion.name}</strong>
          <span>${suggestion.category_name || ''}</span>
        </div>
        ${badge}
      </a>
    `;
  }).join('');

  const footer = query
    ? `<a class="search-suggestions__footer" href="/?q=${encodeURIComponent(query)}#catalog">${query} di Semua Kategori</a>`
    : '';

  suggestionsContainer.innerHTML = `
    <div class="search-suggestions__list">${listItems}</div>
    ${footer}
  `;
  suggestionsContainer.hidden = false;
}

let searchTimeoutId = null;

async function loadSuggestions(query = '') {
  try {
    const response = await fetch(`/search/suggestions?q=${encodeURIComponent(query)}`, {
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      return;
    }

    const payload = await response.json();
    renderSuggestions(query, payload.data?.suggestions || []);
  } catch (error) {
    suggestionsContainer.hidden = true;
  }
}

if (searchInput && suggestionsContainer) {
  searchInput.addEventListener('focus', () => {
    loadSuggestions(searchInput.value.trim());
  });

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeoutId);
    const query = searchInput.value.trim();
    searchTimeoutId = setTimeout(() => {
      loadSuggestions(query);
    }, 120);
  });

  document.addEventListener('click', (event) => {
    const isInsideSearch = event.target.closest('.storefront-search-panel');
    if (!isInsideSearch) {
      suggestionsContainer.hidden = true;
    }
  });
}
