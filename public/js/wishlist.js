(() => {
  const TOAST_DURATION = 3000;

  function ensureToastContainer() {
    let container = document.getElementById('wishlist-toast-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'wishlist-toast-container';
      container.className = 'wishlist-toast-container';
      document.body.appendChild(container);
    }

    return container;
  }

  function showWishlistToast(message, type = 'success') {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `wishlist-toast ${type}`;

    const icon = document.createElement('i');
    icon.className = type === 'error' ? 'bi bi-exclamation-circle-fill' : (type === 'info' ? 'bi bi-info-circle-fill' : 'bi bi-heart-fill');

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, TOAST_DURATION);
  }

  function syncButtonState(button, isSaved) {
    const isAuthenticated = button.dataset.authenticated === 'true';
    const icon = button.querySelector('i');

    if (!isAuthenticated) {
      button.classList.remove('active');
      button.dataset.active = 'false';
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Please login to add wishlist');

      if (button.title !== undefined) {
        button.title = 'Please login to add wishlist';
      }

      if (icon) {
        icon.classList.add('bi-heart');
        icon.classList.remove('bi-heart-fill');
      }

      return;
    }

    button.classList.toggle('active', isSaved);
    button.dataset.active = isSaved ? 'true' : 'false';
    button.setAttribute('aria-pressed', String(isSaved));
    button.setAttribute('aria-label', isSaved ? 'Remove from wishlist' : 'Add to wishlist');

    if (button.title !== undefined) {
      button.title = isSaved ? 'Remove from wishlist' : 'Add to wishlist';
    }

    if (icon) {
      icon.classList.toggle('bi-heart', !isSaved);
      icon.classList.toggle('bi-heart-fill', isSaved);
    }
  }

  async function handleWishlistClick(button, event) {
    event.preventDefault();
    event.stopPropagation();

    const isAuthenticated = button.dataset.authenticated === 'true';
    if (!isAuthenticated) {
      showWishlistToast('Please login to add wishlist.', 'error');
      return;
    }

    const listingId = button.dataset.id;
    if (!listingId) {
      return;
    }

    if (button.dataset.loading === 'true') {
      return;
    }

    button.dataset.loading = 'true';
    button.disabled = true;

    try {
      const response = await fetch(`/listings/${listingId}/wishlist`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      const contentType = response.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await response.json() : null;

      if (response.status === 401) {
        showWishlistToast('Please login to add wishlist.', 'error');
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message || 'Unable to update wishlist.');
      }

      const isSaved = Boolean(payload?.saved);
      syncButtonState(button, isSaved);
      showWishlistToast(payload?.message || (isSaved ? 'Added to wishlist.' : 'Removed from wishlist.'), isSaved ? 'success' : 'info');
    } catch (error) {
      showWishlistToast(error.message || 'Something went wrong.', 'error');
    } finally {
      button.dataset.loading = 'false';
      button.disabled = false;
    }
  }

  function initWishlistButtons() {
    document.querySelectorAll('.wishlist-btn, .save-btn').forEach((button) => {
      const saved = button.dataset.active === 'true' || button.classList.contains('active');
      syncButtonState(button, saved);

      button.addEventListener('click', (event) => handleWishlistClick(button, event));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWishlistButtons);
  } else {
    initWishlistButtons();
  }
})();