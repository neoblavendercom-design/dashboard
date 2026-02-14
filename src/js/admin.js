// Admin panel module
(function() {
  let currentTab = 'users';
  let roles = [];

  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    if (res.status === 401) {
      window.location.href = '/index.html';
      throw new Error('Unauthorized');
    }
    if (res.status === 403) {
      window.location.href = '/dashboard.html';
      throw new Error('Forbidden');
    }
    return res;
  }

  function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Load profile
  async function loadProfile() {
    try {
      const res = await api('/api/me');
      const user = await res.json();
      if (!user.is_admin) {
        window.location.href = '/dashboard.html';
        return;
      }
      document.getElementById('user-name').textContent = user.display_name;
      const initials = user.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
      document.getElementById('user-avatar').textContent = initials;
    } catch {
      window.location.href = '/index.html';
    }
  }

  // Pre-load roles for dropdowns
  async function loadRoles() {
    const res = await api('/api/admin/roles');
    roles = await res.json();
  }

  // Tab navigation
  document.querySelectorAll('.admin-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      loadTab(currentTab);
    });
  });

  async function loadTab(tab) {
    const content = document.getElementById('admin-content');
    switch (tab) {
      case 'users': await renderUsersTab(content); break;
      case 'apps': await renderAppsTab(content); break;
      case 'roles': await renderRolesTab(content); break;
      case 'settings': await renderSettingsTab(content); break;
    }
  }

  // ===== Users Tab =====
  async function renderUsersTab(container) {
    const res = await api('/api/admin/users');
    const users = await res.json();

    container.innerHTML = `
      <div class="admin-toolbar">
        <h2>Users</h2>
        <button class="btn-primary btn-small" id="add-user-btn">+ Add User</button>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Display Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Admin</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>${u.id}</td>
              <td>${escapeHtml(u.username)}</td>
              <td>${escapeHtml(u.display_name)}</td>
              <td>${escapeHtml(u.email)}</td>
              <td>
                <select class="role-select" data-user-id="${u.id}" style="width:auto; padding:0.25rem 0.5rem; font-size:0.8125rem;">
                  <option value="">None</option>
                  ${roles.map(r => `<option value="${r.id}" ${u.role_id === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}
                </select>
              </td>
              <td>${u.is_admin ? 'Yes' : 'No'}</td>
              <td><span class="status-badge ${u.is_active ? 'status-active' : 'status-inactive'}">${u.is_active ? 'Active' : 'Inactive'}</span></td>
              <td>
                <button class="btn-small btn-secondary edit-user-btn" data-id="${u.id}">Edit</button>
                ${u.is_active
                  ? `<button class="btn-small btn-danger deactivate-user-btn" data-id="${u.id}">Deactivate</button>`
                  : `<button class="btn-small btn-primary reactivate-user-btn" data-id="${u.id}">Reactivate</button>`
                }
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Event handlers
    document.getElementById('add-user-btn').addEventListener('click', () => showUserForm());

    container.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const userId = e.target.dataset.userId;
        const roleId = e.target.value ? parseInt(e.target.value) : null;
        await api(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          body: JSON.stringify({ role_id: roleId }),
        });
        showToast('Role updated');
      });
    });

    container.querySelectorAll('.edit-user-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const user = users.find(u => u.id === parseInt(btn.dataset.id));
        if (user) showUserForm(user);
      });
    });

    container.querySelectorAll('.deactivate-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Deactivate this user?')) return;
        await api(`/api/admin/users/${btn.dataset.id}`, { method: 'DELETE' });
        showToast('User deactivated');
        await renderUsersTab(container);
      });
    });

    container.querySelectorAll('.reactivate-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await api(`/api/admin/users/${btn.dataset.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ is_active: true }),
        });
        showToast('User reactivated');
        await renderUsersTab(container);
      });
    });
  }

  function showUserForm(user) {
    const isEdit = !!user;
    const formContent = document.getElementById('form-content');
    formContent.innerHTML = `
      <h2>${isEdit ? 'Edit User' : 'Add User'}</h2>
      <form id="user-form">
        ${!isEdit ? `
          <div class="form-group">
            <label>Username</label>
            <input type="text" name="username" required>
          </div>
        ` : ''}
        <div class="form-group">
          <label>Display Name</label>
          <input type="text" name="display_name" value="${isEdit ? escapeHtml(user.display_name) : ''}" required>
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" name="email" value="${isEdit ? escapeHtml(user.email) : ''}" required>
        </div>
        <div class="form-group">
          <label>${isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
          <input type="password" name="password" ${isEdit ? '' : 'required'} minlength="8">
        </div>
        <div class="form-group">
          <label>Role</label>
          <select name="role_id">
            <option value="">None</option>
            ${roles.map(r => `<option value="${r.id}" ${isEdit && user.role_id === r.id ? 'selected' : ''}>${escapeHtml(r.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" name="is_admin" ${isEdit && user.is_admin ? 'checked' : ''}>
            Administrator
          </label>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="form-cancel">Cancel</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Save Changes' : 'Create User'}</button>
        </div>
      </form>
    `;

    document.getElementById('form-overlay').classList.add('active');
    document.getElementById('form-cancel').addEventListener('click', closeForm);

    document.getElementById('user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {
        display_name: form.display_name.value,
        email: form.email.value,
        role_id: form.role_id.value ? parseInt(form.role_id.value) : null,
        is_admin: form.is_admin.checked,
      };

      if (form.password.value) {
        data.password = form.password.value;
      }

      if (isEdit) {
        await api(`/api/admin/users/${user.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        showToast('User updated');
      } else {
        data.username = form.username.value;
        if (!data.password) {
          showToast('Password is required', 'error');
          return;
        }
        const res = await api('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res.status === 409) {
          showToast('Username or email already exists', 'error');
          return;
        }
        showToast('User created');
      }

      closeForm();
      loadTab('users');
    });
  }

  // ===== Apps Tab =====
  async function renderAppsTab(container) {
    const res = await api('/api/admin/apps');
    const apps = await res.json();

    container.innerHTML = `
      <div class="admin-toolbar">
        <h2>Apps</h2>
        <button class="btn-primary btn-small" id="add-app-btn">+ Add App</button>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>Icon</th>
            <th>Name</th>
            <th>URL</th>
            <th>Order</th>
            <th>Roles</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${apps.map(app => `
            <tr>
              <td>${app.icon || '📱'}</td>
              <td>${escapeHtml(app.name)}</td>
              <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(app.url)}</td>
              <td>${app.sort_order}</td>
              <td>${(app.role_ids || []).map(rid => {
                const r = roles.find(role => role.id === rid);
                return r ? escapeHtml(r.name) : rid;
              }).join(', ') || 'None'}</td>
              <td><span class="status-badge ${app.is_active ? 'status-active' : 'status-inactive'}">${app.is_active ? 'Active' : 'Inactive'}</span></td>
              <td>
                <button class="btn-small btn-secondary edit-app-btn" data-id="${app.id}">Edit</button>
                <button class="btn-small btn-danger delete-app-btn" data-id="${app.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.getElementById('add-app-btn').addEventListener('click', () => showAppForm());

    container.querySelectorAll('.edit-app-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const app = apps.find(a => a.id === parseInt(btn.dataset.id));
        if (app) showAppForm(app);
      });
    });

    container.querySelectorAll('.delete-app-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this app?')) return;
        await api(`/api/admin/apps/${btn.dataset.id}`, { method: 'DELETE' });
        showToast('App deleted');
        await renderAppsTab(container);
      });
    });
  }

  function showAppForm(app) {
    const isEdit = !!app;
    const formContent = document.getElementById('form-content');
    formContent.innerHTML = `
      <h2>${isEdit ? 'Edit App' : 'Add App'}</h2>
      <form id="app-form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" value="${isEdit ? escapeHtml(app.name) : ''}" required>
        </div>
        <div class="form-group">
          <label>URL</label>
          <input type="url" name="url" value="${isEdit ? escapeHtml(app.url) : ''}" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="2">${isEdit ? escapeHtml(app.description || '') : ''}</textarea>
        </div>
        <div class="form-group">
          <label>Icon (emoji)</label>
          <input type="text" name="icon" value="${isEdit ? (app.icon || '') : ''}" maxlength="4">
        </div>
        <div class="form-group">
          <label>Sort Order</label>
          <input type="number" name="sort_order" value="${isEdit ? app.sort_order : 0}" min="0">
        </div>
        <div class="form-group">
          <label>Assign to Roles</label>
          <div class="checkbox-group">
            ${roles.map(r => `
              <label class="checkbox-label">
                <input type="checkbox" name="roles" value="${r.id}" ${isEdit && (app.role_ids || []).includes(r.id) ? 'checked' : ''}>
                ${escapeHtml(r.name)}
              </label>
            `).join('')}
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="form-cancel">Cancel</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Save Changes' : 'Create App'}</button>
        </div>
      </form>
    `;

    document.getElementById('form-overlay').classList.add('active');
    document.getElementById('form-cancel').addEventListener('click', closeForm);

    document.getElementById('app-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const roleCheckboxes = form.querySelectorAll('input[name="roles"]:checked');
      const roleIds = Array.from(roleCheckboxes).map(cb => parseInt(cb.value));

      const data = {
        name: form.name.value,
        url: form.url.value,
        description: form.description.value || null,
        icon: form.icon.value || null,
        sort_order: parseInt(form.sort_order.value) || 0,
        role_ids: roleIds,
      };

      if (isEdit) {
        await api(`/api/admin/apps/${app.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        showToast('App updated');
      } else {
        await api('/api/admin/apps', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        showToast('App created');
      }

      closeForm();
      loadTab('apps');
    });
  }

  // ===== Roles Tab =====
  async function renderRolesTab(container) {
    await loadRoles();

    container.innerHTML = `
      <div class="admin-toolbar">
        <h2>Roles</h2>
        <button class="btn-primary btn-small" id="add-role-btn">+ Add Role</button>
      </div>
      <table class="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${roles.map(r => `
            <tr>
              <td>${r.id}</td>
              <td>${escapeHtml(r.name)}</td>
              <td>${escapeHtml(r.description || '')}</td>
              <td>
                <button class="btn-small btn-secondary edit-role-btn" data-id="${r.id}">Edit</button>
                <button class="btn-small btn-danger delete-role-btn" data-id="${r.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    document.getElementById('add-role-btn').addEventListener('click', () => showRoleForm());

    container.querySelectorAll('.edit-role-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const role = roles.find(r => r.id === parseInt(btn.dataset.id));
        if (role) showRoleForm(role);
      });
    });

    container.querySelectorAll('.delete-role-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this role?')) return;
        const res = await api(`/api/admin/roles/${btn.dataset.id}`, { method: 'DELETE' });
        if (res.status === 409) {
          showToast('Cannot delete role with assigned users', 'error');
          return;
        }
        showToast('Role deleted');
        await renderRolesTab(container);
      });
    });
  }

  function showRoleForm(role) {
    const isEdit = !!role;
    const formContent = document.getElementById('form-content');
    formContent.innerHTML = `
      <h2>${isEdit ? 'Edit Role' : 'Add Role'}</h2>
      <form id="role-form">
        <div class="form-group">
          <label>Name</label>
          <input type="text" name="name" value="${isEdit ? escapeHtml(role.name) : ''}" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="2">${isEdit ? escapeHtml(role.description || '') : ''}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="form-cancel">Cancel</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Save Changes' : 'Create Role'}</button>
        </div>
      </form>
    `;

    document.getElementById('form-overlay').classList.add('active');
    document.getElementById('form-cancel').addEventListener('click', closeForm);

    document.getElementById('role-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const data = {
        name: form.name.value,
        description: form.description.value || null,
      };

      if (isEdit) {
        await api(`/api/admin/roles/${role.id}`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
        showToast('Role updated');
      } else {
        const res = await api('/api/admin/roles', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res.status === 409) {
          showToast('Role name already exists', 'error');
          return;
        }
        showToast('Role created');
      }

      closeForm();
      loadTab('roles');
    });
  }

  // ===== Settings Tab =====
  async function renderSettingsTab(container) {
    const res = await api('/api/admin/settings');
    const settings = await res.json();

    const settingsMap = {};
    for (const s of settings) settingsMap[s.key] = s;

    const gamesEnabled = settingsMap.games_enabled?.value === 'true';
    const dailyLimit = settingsMap.daily_game_limit?.value || '2';
    const duration = settingsMap.game_duration_seconds?.value || '60';

    container.innerHTML = `
      <h2>Game Settings</h2>
      <div class="settings-form">
        <div class="settings-row">
          <div>
            <div class="settings-label">Games Enabled</div>
            <div class="settings-desc">Master toggle for the games system</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="games-enabled" ${gamesEnabled ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Daily Play Limit</div>
            <div class="settings-desc">Max games per user per day</div>
          </div>
          <input type="number" id="daily-limit" class="settings-input" value="${dailyLimit}" min="1" max="20">
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">Game Duration (seconds)</div>
            <div class="settings-desc">Default max game duration</div>
          </div>
          <input type="number" id="game-duration" class="settings-input" value="${duration}" min="10" max="300">
        </div>
        <div style="margin-top: 1.5rem;">
          <button class="btn-primary" id="save-settings-btn" style="width:auto;">Save Settings</button>
        </div>
      </div>
    `;

    document.getElementById('save-settings-btn').addEventListener('click', async () => {
      const enabled = document.getElementById('games-enabled').checked;
      const limit = document.getElementById('daily-limit').value;
      const dur = document.getElementById('game-duration').value;

      await Promise.all([
        api('/api/admin/settings/games_enabled', {
          method: 'PATCH',
          body: JSON.stringify({ value: enabled ? 'true' : 'false' }),
        }),
        api('/api/admin/settings/daily_game_limit', {
          method: 'PATCH',
          body: JSON.stringify({ value: limit }),
        }),
        api('/api/admin/settings/game_duration_seconds', {
          method: 'PATCH',
          body: JSON.stringify({ value: dur }),
        }),
      ]);

      showToast('Settings saved');
    });
  }

  // Modal helpers
  function closeForm() {
    document.getElementById('form-overlay').classList.remove('active');
  }

  document.getElementById('form-close').addEventListener('click', closeForm);
  document.getElementById('form-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('form-overlay')) closeForm();
  });

  // Logout
  document.getElementById('logout-btn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/index.html';
  });

  // Initialize
  async function init() {
    await loadProfile();
    await loadRoles();
    loadTab('users');
  }

  init();
})();
