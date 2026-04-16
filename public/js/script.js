(() => {
  'use strict'

  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })
})();

(() => {
  const toggleButtons = Array.from(document.querySelectorAll('[data-password-toggle]'));

  if (!toggleButtons.length) {
    return;
  }

  toggleButtons.forEach((button) => {
    const input = button.parentElement?.querySelector('[data-password-input]');
    const icon = button.querySelector('i');

    if (!input) {
      return;
    }

    button.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(isPassword));
      button.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');

      if (icon) {
        icon.classList.toggle('bi-eye', !isPassword);
        icon.classList.toggle('bi-eye-slash', isPassword);
      }
    });
  });
})();

(() => {
  const authModalElement = document.getElementById('authModal');

  if (!authModalElement || !window.bootstrap) {
    return;
  }

  const switchButtons = Array.from(authModalElement.querySelectorAll('[data-auth-switch]'));
  const panels = Array.from(authModalElement.querySelectorAll('[data-auth-panel]'));
  const modalTitle = authModalElement.querySelector('#authModalLabel');
  const modalInstance = bootstrap.Modal.getOrCreateInstance(authModalElement);
  const navAuthTriggers = Array.from(document.querySelectorAll('.auth-nav-btn[data-auth-open][data-bs-target="#authModal"]'));
  const defaultAuthTrigger = document.querySelector('.auth-nav-btn[data-auth-open="login"]');

  const setMode = (mode) => {
    const normalizedMode = mode === 'signup' ? 'signup' : 'login';

    authModalElement.dataset.authOpen = normalizedMode;

    switchButtons.forEach((button) => {
      const shouldShow = button.dataset.authSwitch !== normalizedMode;
      button.classList.toggle('d-none', !shouldShow);
    });

    panels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.dataset.authPanel === normalizedMode);
    });

    if (modalTitle) {
      modalTitle.textContent = normalizedMode === 'signup' ? 'Signup' : 'Login';
    }
  };

  const openModal = (mode) => {
    setMode(mode);
    modalInstance.show();
  };

  window.openAuthModal = (mode) => {
    openModal(mode);
  };

  window.setAuthModalMode = (mode) => {
    setMode(mode);
  };

  navAuthTriggers.forEach((trigger) => {
    trigger.addEventListener('click', () => {
      authModalElement.dataset.authOpen = trigger.dataset.authOpen;
    });
  });

  authModalElement.addEventListener('show.bs.modal', (event) => {
    const triggerMode = event.relatedTarget?.dataset?.authOpen || authModalElement.dataset.authOpen || 'login';
    setMode(triggerMode);
  });

  authModalElement.addEventListener('hidden.bs.modal', () => {
    setMode('login');

    if (authModalElement.contains(document.activeElement)) {
      document.activeElement.blur();
    }

    if (defaultAuthTrigger) {
      window.requestAnimationFrame(() => defaultAuthTrigger.focus());
    }
  });

  switchButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      setMode(button.dataset.authSwitch);
    });
  });

  const modalParam = new URLSearchParams(window.location.search).get('modal');
  if (modalParam === 'login' || modalParam === 'signup') {
    openModal(modalParam);
  }
})();

(() => {
  const signupForm = document.getElementById('signupOtpForm');

  if (!signupForm) {
    return;
  }

  const usernameInput = document.getElementById('signupUsername');
  const emailInput = document.getElementById('signupEmail');
  const passwordInput = document.getElementById('signupPassword');
  const otpInput = document.getElementById('signupOtp');
  const otpWrapper = document.getElementById('signupOtpWrapper');
  const sendOtpButton = document.getElementById('sendSignupOtpBtn');
  const verifyButton = document.getElementById('signupVerifyBtn');

  if (!usernameInput || !emailInput || !passwordInput || !otpInput || !otpWrapper || !sendOtpButton || !verifyButton) {
    return;
  }

  const showInlineToast = (message, type = 'error') => {
    if (typeof window.showWishlistToast === 'function') {
      window.showWishlistToast(message, type);
      return;
    }

    alert(message);
  };

  const resetOtpState = () => {
    otpWrapper.classList.add('d-none');
    otpInput.value = '';
    otpInput.required = false;
    verifyButton.disabled = true;
    sendOtpButton.disabled = false;
    sendOtpButton.textContent = 'Send OTP';
  };

  const revealOtpState = () => {
    otpWrapper.classList.remove('d-none');
    otpInput.required = true;
    verifyButton.disabled = false;
    sendOtpButton.disabled = false;
    sendOtpButton.textContent = 'Resend OTP';
  };

  const requestOtp = async () => {
    if (!usernameInput.value.trim() || !emailInput.value.trim() || !passwordInput.value.trim()) {
      signupForm.classList.add('was-validated');
      showInlineToast('Please fill username, email, and password first.', 'error');
      return;
    }

    sendOtpButton.disabled = true;
    sendOtpButton.textContent = 'Sending OTP...';

    try {
      const response = await fetch('/signup/request-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          username: usernameInput.value.trim(),
          email: emailInput.value.trim(),
          password: passwordInput.value
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to send OTP.');
      }

      revealOtpState();
      const successMessage = payload.previewUrl
        ? `${payload.message} Preview: ${payload.previewUrl}`
        : (payload.message || 'OTP sent. Please check your email inbox.');
      showInlineToast(successMessage, 'success');
      otpInput.focus();
    } catch (error) {
      showInlineToast(error.message || 'Failed to send OTP.', 'error');
      sendOtpButton.disabled = false;
      sendOtpButton.textContent = 'Send OTP';
    }
  };

  sendOtpButton.addEventListener('click', () => {
    requestOtp();
  });

  const fieldsThatInvalidateOtp = [usernameInput, emailInput, passwordInput];
  fieldsThatInvalidateOtp.forEach((input) => {
    input.addEventListener('input', () => {
      if (!otpWrapper.classList.contains('d-none')) {
        resetOtpState();
      }
    });
  });

  signupForm.addEventListener('submit', (event) => {
    if (verifyButton.disabled) {
      event.preventDefault();
      showInlineToast('Please send OTP first.', 'error');
      return;
    }

    const otpValue = otpInput.value.trim();
    if (!/^\d{6}$/.test(otpValue)) {
      event.preventDefault();
      otpInput.classList.add('is-invalid');
      showInlineToast('Please enter a valid 6-digit OTP.', 'error');
      return;
    }

    otpInput.classList.remove('is-invalid');
  });

  resetOtpState();
})();

(() => {
  const guardedAddExperienceLinks = document.querySelectorAll('[data-requires-login="add-experience"]');

  if (!guardedAddExperienceLinks.length) {
    return;
  }

  const ensureToastContainer = () => {
    let container = document.getElementById('wishlist-toast-container');

    if (!container) {
      container = document.createElement('div');
      container.id = 'wishlist-toast-container';
      container.className = 'wishlist-toast-container';
      document.body.appendChild(container);
    }

    return container;
  };

  const showToast = (message, type = 'error') => {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `wishlist-toast ${type}`;

    const icon = document.createElement('i');
    icon.className = type === 'error' ? 'bi bi-exclamation-circle-fill' : 'bi bi-info-circle-fill';

    const text = document.createElement('span');
    text.textContent = message;

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 3000);
  };

  window.showWishlistToast = showToast;

  guardedAddExperienceLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      showToast('Please login to add a destination.', 'error');
    });
  });
})();

(() => {
  const profileDropdown = document.querySelector('.nav-item.dropdown .user-dropdown');

  if (!profileDropdown) {
    return;
  }

  const dropdownItem = profileDropdown.closest('.nav-item.dropdown');

  if (!dropdownItem) {
    return;
  }

  profileDropdown.addEventListener('shown.bs.dropdown', () => {
    dropdownItem.classList.add('profile-dropdown-open');
  });

  profileDropdown.addEventListener('hidden.bs.dropdown', () => {
    dropdownItem.classList.remove('profile-dropdown-open');
  });
})();