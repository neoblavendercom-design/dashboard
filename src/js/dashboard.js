// Dashboard module - handles app grid, games launcher, user profile
(function() {
  let currentUser = null;
  let gameStatus = null;

  // API helper
  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (res.status === 401) {
      window.location.href = '/index.html';
      throw new Error('Unauthorized');
    }
    return res;
  }

  function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // Load user profile
  async function loadProfile() {
    try {
      const res = await api('/api/me');
      currentUser = await res.json();

      document.getElementById('user-name').textContent = currentUser.display_name;
      const initials = currentUser.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      document.getElementById('user-avatar').textContent = initials;
      document.getElementById('badge-count').textContent = currentUser.badges_earned;

      if (currentUser.is_admin) {
        document.getElementById('admin-link').style.display = '';
      }
    } catch {
      window.location.href = '/index.html';
    }
  }

  // Load apps
  async function loadApps() {
    try {
      const res = await api('/api/apps');
      const apps = await res.json();
      const grid = document.getElementById('app-grid');
      grid.innerHTML = '';

      if (apps.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-secondary); grid-column: 1/-1;">No apps assigned to your role. Contact your admin.</p>';
        return;
      }

      for (const app of apps) {
        const card = document.createElement('div');
        card.className = 'app-card';
        card.innerHTML = `
          <div class="app-icon">${app.icon || '📱'}</div>
          <div class="app-name">${escapeHtml(app.name)}</div>
          <div class="app-desc">${escapeHtml(app.description || '')}</div>
          <button class="pref-toggle" title="Toggle open in new tab">
            ${app.open_new_tab ? '↗️' : '➡️'}
          </button>
        `;

        // Click card to launch app
        card.addEventListener('click', (e) => {
          if (e.target.closest('.pref-toggle')) return;
          launchApp(app);
        });

        // Toggle new tab preference
        const toggle = card.querySelector('.pref-toggle');
        toggle.addEventListener('click', async (e) => {
          e.stopPropagation();
          app.open_new_tab = !app.open_new_tab;
          toggle.textContent = app.open_new_tab ? '↗️' : '➡️';
          await api('/api/me/preferences', {
            method: 'PATCH',
            body: JSON.stringify({ app_id: app.id, open_new_tab: app.open_new_tab }),
          });
        });

        grid.appendChild(card);
      }
    } catch (err) {
      console.error('Failed to load apps:', err);
    }
  }

  async function launchApp(app) {
    // Record launch
    try {
      const res = await api(`/api/apps/${app.id}/launch`, { method: 'POST' });
      const data = await res.json();
      if (data.new_badges) {
        for (const badge of data.new_badges) {
          showToast(`${badge.icon} ${badge.name} unlocked!`);
          const count = document.getElementById('badge-count');
          count.textContent = parseInt(count.textContent) + 1;
        }
      }
    } catch {
      // Continue even if tracking fails
    }

    if (app.open_new_tab) {
      window.open(app.url, '_blank');
    } else {
      window.location.href = app.url;
    }
  }

  // Games section
  async function loadGameStatus() {
    try {
      const res = await api('/api/games/status');
      gameStatus = await res.json();
      return gameStatus;
    } catch {
      return null;
    }
  }

  function renderGamesModal() {
    if (!gameStatus) return;

    const counter = document.getElementById('plays-counter');
    const remaining = gameStatus.remaining;
    const limit = gameStatus.daily_limit;
    const played = limit - remaining;

    if (!gameStatus.games_enabled) {
      counter.textContent = 'Games are currently disabled';
      counter.classList.add('exhausted');
    } else if (remaining <= 0) {
      counter.textContent = `0 of ${limit} plays left - Come back tomorrow!`;
      counter.classList.add('exhausted');
    } else {
      counter.textContent = `${remaining} of ${limit} plays left`;
      counter.classList.remove('exhausted');
    }

    const games = [
      { key: 'whack', name: 'Whack-a-Mole', icon: '🔨', desc: 'Whack the moles!' },
      { key: 'memory', name: 'Memory Match', icon: '🃏', desc: 'Match the pairs' },
      { key: 'typing', name: 'Speed Typing', icon: '⌨️', desc: 'Type fast!' },
      { key: 'stroop', name: 'Color Match', icon: '🎨', desc: 'Match the colors' },
      { key: 'pattern', name: 'Pattern Predictor', icon: '🔮', desc: 'Find the pattern' },
    ];

    const grid = document.getElementById('games-grid');
    grid.innerHTML = '';

    for (const game of games) {
      const card = document.createElement('div');
      const disabled = !gameStatus.games_enabled || remaining <= 0;
      card.className = `game-card${disabled ? ' disabled' : ''}`;

      const best = gameStatus.personal_bests[game.key];
      const bestText = best ? `Best: ${best.score}` : 'No plays yet';

      card.innerHTML = `
        <div class="game-icon">${game.icon}</div>
        <div class="game-name">${game.name}</div>
        <div class="game-best">${bestText}</div>
        ${disabled ? '<div class="disabled-overlay">Come back tomorrow!</div>' : ''}
      `;

      if (!disabled) {
        card.addEventListener('click', () => startGame(game.key));
      }

      grid.appendChild(card);
    }
  }

  function startGame(gameKey) {
    const overlay = document.getElementById('game-play-overlay');
    overlay.classList.add('active');

    const titles = {
      whack: 'Whack-a-Mole',
      memory: 'Memory Match',
      typing: 'Speed Typing',
      stroop: 'Color Match',
      pattern: 'Pattern Predictor',
    };

    document.getElementById('game-title').textContent = titles[gameKey] || gameKey;

    // Initialize game engine and start game
    const duration = gameKey === 'stroop' ? 45 : (gameStatus.game_duration || 60);
    GameEngine.init(gameKey, duration);
  }

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/index.html';
  });

  // Modal controls
  document.getElementById('games-btn').addEventListener('click', async () => {
    await loadGameStatus();
    renderGamesModal();
    document.getElementById('games-overlay').classList.add('active');
  });

  document.getElementById('games-close').addEventListener('click', () => {
    document.getElementById('games-overlay').classList.remove('active');
  });

  document.getElementById('game-close').addEventListener('click', () => {
    GameEngine.stop();
    document.getElementById('game-play-overlay').classList.remove('active');
  });

  document.getElementById('achievements-btn').addEventListener('click', () => {
    Achievements.load();
    document.getElementById('achievements-overlay').classList.add('active');
  });

  document.getElementById('achievements-close').addEventListener('click', () => {
    document.getElementById('achievements-overlay').classList.remove('active');
  });

  // Close modals on overlay click
  for (const overlay of document.querySelectorAll('.modal-overlay')) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        GameEngine.stop();
        overlay.classList.remove('active');
      }
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Expose for game engine
  window.Dashboard = {
    showToast,
    refreshGameStatus: async () => {
      await loadGameStatus();
      renderGamesModal();
    },
    getGameStatus: () => gameStatus,
    closeGameModal: () => {
      document.getElementById('game-play-overlay').classList.remove('active');
    },
    backToGames: async () => {
      document.getElementById('game-play-overlay').classList.remove('active');
      await loadGameStatus();
      renderGamesModal();
    },
    updateBadgeCount: (increment) => {
      const count = document.getElementById('badge-count');
      count.textContent = parseInt(count.textContent) + increment;
    },
  };

  // Initialize
  async function init() {
    await loadProfile();
    await loadApps();
  }

  init();
})();
