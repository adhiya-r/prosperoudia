(() => {
  const root = document.documentElement;
  const body = document.body;
  const passwordToggle = document.querySelector('[data-password-toggle]');
  const passwordInput = document.querySelector('#password');

  function togglePasswordVisibility() {
    if (!passwordToggle || !passwordInput) {
      return;
    }

    const hidden = passwordInput.type === 'password';
    passwordInput.type = hidden ? 'text' : 'password';
    passwordToggle.setAttribute('aria-pressed', String(hidden));
    passwordToggle.setAttribute('aria-label', hidden ? 'Sembunyikan password' : 'Tampilkan password');

    const showIcon = passwordToggle.querySelector('.password-field__icon--show');
    const hideIcon = passwordToggle.querySelector('.password-field__icon--hide');

    if (showIcon) {
      showIcon.style.display = hidden ? 'none' : 'block';
    }

    if (hideIcon) {
      hideIcon.style.display = hidden ? 'block' : 'none';
    }
  }

  function setupResponsiveSidebar() {
    const sidebar = document.querySelector('[data-sidebar]');
    const overlay = document.querySelector('[data-sidebar-overlay]');
    const openButtons = Array.from(document.querySelectorAll('[data-sidebar-toggle]'));
    const closeButtons = Array.from(document.querySelectorAll('[data-sidebar-close]'));
    const desktopMedia = window.matchMedia('(min-width: 961px)');

    if (!sidebar || !overlay || !openButtons.length) {
      return;
    }

    function closeSidebar() {
      body.classList.remove('sidebar-open');
      body.classList.remove('body-scroll-lock');
      sidebar.setAttribute('aria-hidden', 'true');
    }

    function openSidebar() {
      body.classList.add('sidebar-open');
      body.classList.add('body-scroll-lock');
      sidebar.setAttribute('aria-hidden', 'false');
    }

    function toggleSidebar() {
      if (body.classList.contains('sidebar-open')) {
        closeSidebar();
        return;
      }

      openSidebar();
    }

    function syncSidebarForViewport() {
      if (desktopMedia.matches) {
        body.classList.remove('sidebar-open');
        body.classList.remove('body-scroll-lock');
        sidebar.setAttribute('aria-hidden', 'false');
        return;
      }

      sidebar.setAttribute('aria-hidden', String(!body.classList.contains('sidebar-open')));
    }

    openButtons.forEach((button) => {
      button.addEventListener('click', toggleSidebar);
    });

    closeButtons.forEach((button) => {
      button.addEventListener('click', closeSidebar);
    });

    overlay.addEventListener('click', closeSidebar);
    desktopMedia.addEventListener('change', syncSidebarForViewport);

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && body.classList.contains('sidebar-open')) {
        closeSidebar();
      }
    });

    syncSidebarForViewport();
  }

  function setupModal() {
    const modal = document.querySelector('[data-edit-modal]');
    const modalForm = document.querySelector('[data-edit-modal-form]');
    const modalTitle = document.querySelector('#edit-modal-title');
    const modalDescription = document.querySelector('#edit-modal-description');
    const modalSubmit = document.querySelector('[data-edit-modal-submit]');
    const modalImageInput = modal?.querySelector('input[type="file"][name="product_image"]') || null;
    const modalPreviewImage = modal?.querySelector('[data-edit-image-preview-image]') || null;
    const modalPreviewPlaceholder = modal?.querySelector('[data-edit-image-preview-placeholder]') || null;
    const modalPreviewText = modal?.querySelector('[data-edit-image-preview-text]') || null;
    const modalPreviewOpen = modal?.querySelector('[data-edit-image-preview-open]') || null;
    const modalPreviewDialog = document.querySelector('[data-edit-image-modal]') || document.querySelector('[data-table-image-modal]');
    const modalPreviewDialogImage =
      modalPreviewDialog?.querySelector('[data-edit-image-modal-image]') ||
      modalPreviewDialog?.querySelector('[data-table-image-modal-image]') ||
      null;
    const modalPreviewDialogClose =
      modalPreviewDialog?.querySelector('[data-edit-image-close]') ||
      modalPreviewDialog?.querySelector('[data-table-image-close]') ||
      null;
    const openButtons = document.querySelectorAll('[data-edit-modal-open]');
    const closeButtons = document.querySelectorAll('[data-modal-close]');

    if (!modal || !modalForm) {
      return;
    }

    const fieldMap = new Map(
      Array.from(modal.querySelectorAll('[data-edit-modal-field]')).map((element) => [element.dataset.editModalField, element])
    );

    function showModalImagePlaceholder(message) {
      if (!modalPreviewImage || !modalPreviewPlaceholder || !modalPreviewText) {
        return;
      }

      modalPreviewImage.classList.add('is-hidden');
      modalPreviewImage.removeAttribute('src');
      modalPreviewPlaceholder.classList.remove('is-hidden');
      modalPreviewText.textContent = message;
      if (modalPreviewDialogImage) {
        modalPreviewDialogImage.removeAttribute('src');
      }
    }

    function showModalImage(src, description) {
      if (!modalPreviewImage || !modalPreviewPlaceholder || !modalPreviewText) {
        return;
      }

      modalPreviewImage.src = src;
      modalPreviewImage.classList.remove('is-hidden');
      modalPreviewPlaceholder.classList.add('is-hidden');
      modalPreviewText.textContent = description;
      if (modalPreviewDialogImage) {
        modalPreviewDialogImage.src = src;
      }
    }

    function updateModalImagePreview(payload = {}) {
      if (!modalImageInput) {
        return;
      }

      if (modalImageInput.files && modalImageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
          showModalImage(String(reader.result || ''), modalImageInput.files[0].name);
        };
        reader.readAsDataURL(modalImageInput.files[0]);
        return;
      }

      if (payload.image_path) {
        showModalImage(String(payload.image_path), 'Gambar produk saat ini');
        return;
      }

      showModalImagePlaceholder('Belum ada gambar produk.');
    }

    function openModalImageDialog() {
      if (!modalPreviewDialog || !modalPreviewImage || modalPreviewImage.classList.contains('is-hidden')) {
        return;
      }

      if (!modalPreviewImage.getAttribute('src')) {
        return;
      }

      modalPreviewDialog.classList.remove('is-hidden');
      modalPreviewDialog.setAttribute('aria-hidden', 'false');
      body.classList.add('body-scroll-lock');
    }

    function closeModalImageDialog() {
      if (!modalPreviewDialog) {
        return;
      }

      modalPreviewDialog.classList.add('is-hidden');
      modalPreviewDialog.setAttribute('aria-hidden', 'true');
      body.classList.remove('body-scroll-lock');
    }

    function openModal(payload) {
      const data = payload || {};
      const baseFormAction = data.action || '#';
      const csrfField = modalForm.querySelector('input[name="csrfToken"]');
      const csrfToken = csrfField ? csrfField.value : '';
      const hasFileInput = Boolean(modalForm.querySelector('input[type="file"]'));
      const formAction = hasFileInput && csrfToken
        ? `${baseFormAction}${String(baseFormAction).includes('?') ? '&' : '?'}csrfToken=${encodeURIComponent(csrfToken)}`
        : baseFormAction;

      modalForm.setAttribute('action', formAction);
      if (modalTitle && data.title) {
        modalTitle.textContent = data.title;
      }
      if (modalDescription && data.description) {
        modalDescription.textContent = data.description;
      }
      if (modalSubmit && data.submitLabel) {
        modalSubmit.textContent = data.submitLabel;
      }

      fieldMap.forEach((field, fieldName) => {
        const value = data[fieldName];
        if (field.tagName === 'SELECT') {
          Array.from(field.options).forEach((option) => {
            option.selected = String(option.value) === String(value ?? '');
          });
        } else if (field.tagName === 'INPUT' && field.type === 'file') {
          field.value = '';
        } else if (field.tagName === 'TEXTAREA' || field.tagName === 'INPUT') {
          field.value = value ?? '';
        }
      });

      updateModalImagePreview(data);

      modal.classList.remove('is-hidden');
      modal.setAttribute('aria-hidden', 'false');
      body.classList.add('body-scroll-lock');

      const firstField = modal.querySelector('[data-edit-modal-field]');
      if (firstField) {
        firstField.focus();
      }
    }

    function closeModal() {
      if (modalForm) {
        modalForm.reset();
      }
      showModalImagePlaceholder('Belum ada gambar produk.');
      modal.classList.add('is-hidden');
      modal.setAttribute('aria-hidden', 'true');
      body.classList.remove('body-scroll-lock');
      closeModalImageDialog();
    }

    openButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const payloadRaw = button.getAttribute('data-edit-modal-payload') || '';
        const payload = payloadRaw ? JSON.parse(decodeURIComponent(payloadRaw)) : {};
        openModal(payload);
      });
    });

    const autoOpenPayloadScript = document.querySelector('#module-auto-edit-modal-payload');
    if (autoOpenPayloadScript) {
      try {
        const autoOpenPayload = JSON.parse(autoOpenPayloadScript.textContent || '{}');
        if (autoOpenPayload && typeof autoOpenPayload === 'object') {
          openModal(autoOpenPayload);
        }
      } catch (error) {
        console.warn('Failed to parse auto edit modal payload:', error);
      }
    }

    closeButtons.forEach((button) => {
      button.addEventListener('click', closeModal);
    });

    if (modalImageInput) {
      modalImageInput.addEventListener('change', () => updateModalImagePreview());
    }

    if (modalPreviewOpen) {
      modalPreviewOpen.addEventListener('click', openModalImageDialog);
    }

    if (modalPreviewDialogClose) {
      modalPreviewDialogClose.addEventListener('click', closeModalImageDialog);
    }

    if (modalPreviewDialog) {
      modalPreviewDialog.addEventListener('click', (event) => {
        if (event.target === modalPreviewDialog) {
          closeModalImageDialog();
        }
      });
    }

    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !modal.classList.contains('is-hidden')) {
        closeModal();
      }
    });
  }

  function setupImagePreview() {
    const imageInputs = Array.from(document.querySelectorAll('[data-image-preview-input]'));
    const previewImage = document.querySelector('[data-image-preview-image]');
    const previewPlaceholder = document.querySelector('[data-image-preview-placeholder]');
    const previewText = document.querySelector('[data-image-preview-text]');
    const previewOpen = document.querySelector('[data-image-preview-open]');
    const previewModal = document.querySelector('[data-image-preview-modal]');
    const previewModalImage = document.querySelector('[data-image-preview-modal-image]');
    const previewModalClose = document.querySelector('[data-image-preview-close]');
    const initialSrc = previewImage?.getAttribute('src') || '';

    if (!imageInputs.length || !previewImage || !previewPlaceholder || !previewText) {
      return;
    }

    const fileInput = imageInputs.find((input) => input.type === 'file') || null;

    function showPlaceholder(message) {
      previewImage.classList.add('is-hidden');
      previewPlaceholder.classList.remove('is-hidden');
      previewText.textContent = message;
    }

    function showImage(src, description) {
      previewImage.src = src;
      previewImage.classList.remove('is-hidden');
      previewPlaceholder.classList.add('is-hidden');
      previewText.textContent = description;
      if (previewModalImage) {
        previewModalImage.src = src;
      }
    }

    function updatePreview() {
      if (fileInput && fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
          showImage(String(reader.result || ''), fileInput.files[0].name);
        };
        reader.readAsDataURL(fileInput.files[0]);
        return;
      }

      if (initialSrc) {
        showImage(initialSrc, 'Gambar produk saat ini');
        return;
      }

      previewImage.removeAttribute('src');
      showPlaceholder('Belum ada gambar produk. Pilih file untuk melihat preview.');
    }

    previewImage.addEventListener('error', () => {
      showPlaceholder('Preview tidak tersedia untuk sumber gambar ini.');
    });

    function openPreviewModal() {
      if (!previewModal || previewImage.classList.contains('is-hidden') || !previewImage.getAttribute('src')) {
        return;
      }

      previewModal.classList.remove('is-hidden');
      previewModal.setAttribute('aria-hidden', 'false');
      body.classList.add('body-scroll-lock');
    }

    function closePreviewModal() {
      if (!previewModal) {
        return;
      }

      previewModal.classList.add('is-hidden');
      previewModal.setAttribute('aria-hidden', 'true');
      body.classList.remove('body-scroll-lock');
    }

    imageInputs.forEach((input) => {
      const eventName = input.type === 'file' ? 'change' : 'input';
      input.addEventListener(eventName, updatePreview);
    });

    if (previewOpen) {
      previewOpen.addEventListener('click', openPreviewModal);
    }

    if (previewModalClose) {
      previewModalClose.addEventListener('click', closePreviewModal);
    }

    if (previewModal) {
      previewModal.addEventListener('click', (event) => {
        if (event.target === previewModal) {
          closePreviewModal();
        }
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && previewModal && !previewModal.classList.contains('is-hidden')) {
        closePreviewModal();
      }
    });

    updatePreview();
  }

  function setupTableImagePreview() {
    const openButtons = Array.from(document.querySelectorAll('[data-table-image-open]'));
    const previewModal = document.querySelector('[data-table-image-modal]');
    const previewImage = document.querySelector('[data-table-image-modal-image]');
    const previewClose = document.querySelector('[data-table-image-close]');

    if (!openButtons.length || !previewModal || !previewImage) {
      return;
    }

    function openPreview(src, alt) {
      previewImage.src = src;
      previewImage.alt = alt || 'Preview gambar';
      previewModal.classList.remove('is-hidden');
      previewModal.setAttribute('aria-hidden', 'false');
      body.classList.add('body-scroll-lock');
    }

    function closePreview() {
      previewModal.classList.add('is-hidden');
      previewModal.setAttribute('aria-hidden', 'true');
      body.classList.remove('body-scroll-lock');
    }

    openButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const src = button.getAttribute('data-table-image-src') || '';
        const alt = button.getAttribute('data-table-image-alt') || 'Preview gambar';

        if (src) {
          openPreview(src, alt);
        }
      });
    });

    if (previewClose) {
      previewClose.addEventListener('click', closePreview);
    }

    previewModal.addEventListener('click', (event) => {
      if (event.target === previewModal) {
        closePreview();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !previewModal.classList.contains('is-hidden')) {
        closePreview();
      }
    });
  }

  function setupWarehouseTransferForm() {
    const contextNode = document.getElementById('module-form-context');
    const sourceSelect = document.querySelector('#source_warehouse_id');
    const productSelect = document.querySelector('#product_id[data-transfer-product-select="true"]');

    if (!contextNode || !sourceSelect || !productSelect) {
      return;
    }

    let formContext;
    try {
      formContext = JSON.parse(contextNode.textContent || '{}');
    } catch (error) {
      return;
    }

    const productOptionsByWarehouse = formContext.transferProductsByWarehouse || {};
    const initialProductValue = productSelect.value;

    function renderProductOptions(warehouseId) {
      const options = productOptionsByWarehouse[String(warehouseId || '')] || [];
      const currentValue = productSelect.value || initialProductValue;

      productSelect.innerHTML = '';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = options.length ? 'Select product' : 'Tidak ada product dengan stok di gudang ini';
      productSelect.appendChild(placeholder);

      options.forEach((option) => {
        const optionNode = document.createElement('option');
        optionNode.value = option.value;
        optionNode.textContent = option.label;
        if (String(option.value) === String(currentValue)) {
          optionNode.selected = true;
        }
        productSelect.appendChild(optionNode);
      });

      if (!options.some((option) => String(option.value) === String(currentValue))) {
        productSelect.value = '';
      }
    }

    renderProductOptions(sourceSelect.value);
    sourceSelect.addEventListener('change', () => {
      renderProductOptions(sourceSelect.value);
    });
  }

  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', togglePasswordVisibility);
  }

  setupModal();
  setupImagePreview();
  setupTableImagePreview();
  setupWarehouseTransferForm();
  setupResponsiveSidebar();
})();
