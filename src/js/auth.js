// Auth module - handles login, Google SSO, forgot password
(function() {
  const loginForm = document.getElementById('login-form');
  const errorMessage = document.getElementById('error-message');
  const loginBtn = document.getElementById('login-btn');
  const googleBtn = document.getElementById('google-btn');
  const forgotLink = document.getElementById('forgot-link');
  const forgotForm = document.getElementById('forgot-form');
  const backToLogin = document.getElementById('back-to-login');
  const resetBtn = document.getElementById('reset-btn');

  // Check for error params in URL
  const params = new URLSearchParams(window.location.search);
  const urlError = params.get('error');
  if (urlError) {
    const messages = {
      'google_denied': 'Google sign-in was cancelled.',
      'google_token_failed': 'Google authentication failed. Please try again.',
      'google_userinfo_failed': 'Could not retrieve Google account info.',
      'no_account': 'No account found for this Google email. Contact your admin.',
    };
    showError(messages[urlError] || 'An error occurred.');
  }

  // Login form submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      if (!username || !password) {
        showError('Please enter both username and password.');
        return;
      }

      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in...';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          showError(data.error || 'Login failed.');
          return;
        }

        // Show any new badges
        if (data.new_badges && data.new_badges.length > 0) {
          for (const badge of data.new_badges) {
            showToast(`${badge.icon} ${badge.name} unlocked!`, 'success');
          }
          // Wait a moment to show badges
          await new Promise(r => setTimeout(r, 1500));
        }

        window.location.href = '/dashboard.html';
      } catch (err) {
        showError('Network error. Please try again.');
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
      }
    });
  }

  // Google SSO
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      window.location.href = '/api/auth/google';
    });
  }

  // Forgot password toggle
  if (forgotLink) {
    forgotLink.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      forgotLink.style.display = 'none';
      forgotForm.style.display = 'block';
      hideError();
    });
  }

  if (backToLogin) {
    backToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'block';
      forgotLink.style.display = 'block';
      forgotForm.style.display = 'none';
      hideError();
    });
  }

  // Reset password
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      const email = document.getElementById('reset-email').value.trim();
      if (!email) {
        showError('Please enter your email address.');
        return;
      }

      resetBtn.disabled = true;
      resetBtn.textContent = 'Sending...';

      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        hideError();
        showToast(data.message || 'If that email exists, a reset link has been sent.', 'success');
      } catch {
        showError('Network error. Please try again.');
      } finally {
        resetBtn.disabled = false;
        resetBtn.textContent = 'Send Reset Link';
      }
    });
  }

  function showError(msg) {
    if (errorMessage) {
      errorMessage.textContent = msg;
      errorMessage.classList.add('visible');
    }
  }

  function hideError() {
    if (errorMessage) {
      errorMessage.textContent = '';
      errorMessage.classList.remove('visible');
    }
  }

  function showToast(msg, type) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
})();
