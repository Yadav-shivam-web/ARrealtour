/**
 * ============================================================================
 * AR-REALTOUR - AUTHENTICATION CLIENT MODULE
 * Connects to Local MongoDB via /api/auth REST Endpoints (JWT Bearer Token)
 * ============================================================================
 */

const Auth = {
  STORAGE_KEY: 'villa3d_user',
  TOKEN_KEY: 'villa3d_token',

  getApiBase() {
    if (window.DB && window.DB.API_BASE) {
      return window.DB.API_BASE;
    }
    if (window.location.origin && window.location.origin.includes(':5000')) {
      return '/api';
    }
    return 'http://localhost:5000/api';
  },

  saveSession(user, token, remember = true) {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(this.TOKEN_KEY, token);
    storage.setItem(this.STORAGE_KEY, JSON.stringify({ ...user, token }));
  },

  init() {
    this.initLoginForm();
    this.initRegisterForm();
    this.initPasswordToggles();
    this.checkSessionForNav();
  },

    /* ========================================================================== 
      LOGIN LOGIC
      ========================================================================== */
  initLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLoginSubmit(loginForm);
    });
  },

  async handleLoginSubmit(form) {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const rememberInput = document.getElementById('login-remember');
    const alertBox = document.getElementById('auth-alert');

    let isValid = true;
    this.clearErrors();

    const loginValue = emailInput ? emailInput.value.trim() : '';
    const passwordValue = passwordInput ? passwordInput.value : '';

    // Validate Username or Email
    if (!loginValue) {
      this.showError('login-email-error', 'Username or email is required');
      if (emailInput) emailInput.classList.add('has-error');
      isValid = false;
    }

    // Validate Password
    if (!passwordValue) {
      this.showError('login-password-error', 'Password is required');
      if (passwordInput) passwordInput.classList.add('has-error');
      isValid = false;
    }

    if (!isValid) return;

    const submitBtn = form.querySelector('.btn-auth-submit');
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Authenticating with MongoDB...';
    }

    try {
      const res = await fetch(`${this.getApiBase()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginValue,
          password: passwordValue
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid email or password.');
      }

      const user = {
        ...data.user,
        token: data.token
      };

      this.saveSession(user, data.token, rememberInput && rememberInput.checked);

      const isAdmin = user.role === 'admin';
      const redirectMsg = isAdmin
        ? 'Verified Admin JWT token! Loading Executive Portal...'
        : 'Signed in successfully! Launching 3D Tour Studio...';

      this.showAlert(alertBox, redirectMsg, 'success');

      setTimeout(() => {
        if (isAdmin) {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'user-panel.html';
        }
      }, 700);
    } catch (err) {
      console.error('Login error:', err);
      this.showAlert(alertBox, err.message || 'Connection to authentication service failed.', 'error');
      if (alertBox && err.message && err.message.includes('No account found')) {
        const registerLink = document.createElement('a');
        registerLink.href = 'register.html';
        registerLink.className = 'auth-link';
        registerLink.textContent = 'Create an account';
        alertBox.append(document.createTextNode(' '), registerLink);
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  },

  /* ==========================================================================
     REGISTER LOGIC (REAL LOCAL MONGODB USER CREATION)
     ========================================================================== */
  initRegisterForm() {
    const registerForm = document.getElementById('register-form');
    if (!registerForm) return;

    const passInput = document.getElementById('reg-password');
    if (passInput) {
      passInput.addEventListener('input', (e) => this.checkPasswordStrength(e.target.value));
    }

    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegisterSubmit(registerForm);
    });
  },

  async handleRegisterSubmit(form) {
    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const confirmPassInput = document.getElementById('reg-confirm-password');
    const termsInput = document.getElementById('reg-terms');
    const alertBox = document.getElementById('auth-alert');

    let isValid = true;
    this.clearErrors();

    // Name validation
    if (!nameInput || !nameInput.value.trim()) {
      this.showError('reg-name-error', 'Username or full name is required');
      if (nameInput) nameInput.classList.add('has-error');
      isValid = false;
    }

    // Email validation
    if (!emailInput || !emailInput.value.trim() || !this.isValidEmail(emailInput.value.trim())) {
      this.showError('reg-email-error', 'Please enter a valid email address');
      if (emailInput) emailInput.classList.add('has-error');
      isValid = false;
    }

    // Password validation
    if (!passwordInput || !passwordInput.value || passwordInput.value.length < 6) {
      this.showError('reg-password-error', 'Password must be at least 6 characters');
      if (passwordInput) passwordInput.classList.add('has-error');
      isValid = false;
    }

    // Confirm password validation
    if (confirmPassInput && passwordInput && passwordInput.value !== confirmPassInput.value) {
      this.showError('reg-confirm-password-error', 'Passwords do not match');
      confirmPassInput.classList.add('has-error');
      isValid = false;
    }

    // Terms validation
    if (termsInput && !termsInput.checked) {
      this.showError('reg-terms-error', 'You must agree to the terms');
      isValid = false;
    }

    if (!isValid) return;

    const submitBtn = form.querySelector('.btn-auth-submit');
    const originalBtnHTML = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving user to MongoDB...';
    }

    try {
      const res = await fetch(`${this.getApiBase()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          password: passwordInput.value
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Registration failed.');
      }

      const user = {
        ...data.user,
        token: data.token
      };

      this.saveSession(user, data.token);

      this.showAlert(alertBox, 'Account created successfully in MongoDB! Opening 3D Tour Studio...', 'success');

      setTimeout(() => {
        window.location.href = 'user-panel.html';
      }, 900);
    } catch (err) {
      console.error('Registration error:', err);
      this.showAlert(alertBox, err.message || 'Could not connect to MongoDB server.', 'error');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
      }
    }
  },

  /* ==========================================================================
     HELPERS & UTILITIES
     ========================================================================== */
  initPasswordToggles() {
    document.querySelectorAll('.btn-eye-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const input = btn.previousElementSibling;
        const icon = btn.querySelector('i');
        if (!input) return;

        if (input.type === 'password') {
          input.type = 'text';
          if (icon) {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
          }
        } else {
          input.type = 'password';
          if (icon) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
          }
        }
      });
    });
  },

  checkPasswordStrength(password) {
    const fill = document.getElementById('strength-bar-fill');
    const text = document.getElementById('strength-text');
    if (!fill || !text) return;

    let score = 0;
    if (password.length >= 6) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (password.length === 0) {
      fill.style.width = '0%';
      text.textContent = 'Minimum 6 characters';
      text.style.color = 'var(--auth-text-subtle)';
    } else if (score <= 1) {
      fill.style.width = '25%';
      fill.style.backgroundColor = '#f43f5e';
      text.textContent = 'Weak password';
      text.style.color = '#f43f5e';
    } else if (score === 2) {
      fill.style.width = '50%';
      fill.style.backgroundColor = '#f59e0b';
      text.textContent = 'Moderate password';
      text.style.color = '#f59e0b';
    } else if (score === 3) {
      fill.style.width = '75%';
      fill.style.backgroundColor = '#38bdf8';
      text.textContent = 'Strong password';
      text.style.color = '#38bdf8';
    } else {
      fill.style.width = '100%';
      fill.style.backgroundColor = '#10b981';
      text.textContent = 'Very strong password';
      text.style.color = '#10b981';
    }
  },

  showError(elementId, message) {
    const errorEl = document.getElementById(elementId);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
  },

  clearErrors() {
    document.querySelectorAll('.auth-error-msg').forEach(el => {
      el.classList.remove('show');
      el.textContent = '';
    });
    document.querySelectorAll('.auth-input').forEach(el => {
      el.classList.remove('has-error');
    });
  },

  showAlert(alertBox, message, type = 'error') {
    if (!alertBox) return;
    alertBox.className = `auth-alert auth-alert-${type} show`;
    let iconClass = 'fa-triangle-exclamation';
    if (type === 'success') iconClass = 'fa-circle-check';
    if (type === 'info') iconClass = 'fa-circle-info';
    alertBox.innerHTML = `<i class="fa-solid ${iconClass}"></i> ${message}`;
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  /* ==========================================================================
     SESSION STATE IN NAVBAR
     ========================================================================== */
  checkSessionForNav() {
    const raw = localStorage.getItem(this.STORAGE_KEY) || sessionStorage.getItem(this.STORAGE_KEY);
    const navAuthLinks = document.getElementById('nav-auth-buttons');
    const navUserBadge = document.getElementById('nav-user-badge');
    const navUserName = document.getElementById('nav-user-name');
    const navAvatar = document.getElementById('nav-user-avatar');
    const logoutBtn = document.getElementById('nav-logout-btn');

    if (raw && navAuthLinks && navUserBadge) {
      try {
        const user = JSON.parse(raw);
        navAuthLinks.style.display = 'none';
        navUserBadge.style.display = 'flex';
        if (navUserName) navUserName.textContent = user.name || 'Member';
        if (navAvatar && user.name) {
          navAvatar.textContent = user.name.charAt(0).toUpperCase();
        }

        if (logoutBtn) {
          logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
  },

  logout() {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    window.location.href = 'index.html';
  }
};

window.Auth = Auth;

window.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
