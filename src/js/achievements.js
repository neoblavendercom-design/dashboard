// Achievements module
window.Achievements = (function() {
  async function load() {
    try {
      const [achRes, meRes] = await Promise.all([
        fetch('/api/achievements'),
        fetch('/api/me'),
      ]);

      if (achRes.status === 401 || meRes.status === 401) {
        window.location.href = '/index.html';
        return;
      }

      const achievements = await achRes.json();
      const me = await meRes.json();

      render(achievements, me);
    } catch (err) {
      console.error('Failed to load achievements:', err);
    }
  }

  function render(achievements, me) {
    const streakEl = document.getElementById('streak-display');
    streakEl.innerHTML = `🔥 ${me.current_streak} day streak (best: ${me.longest_streak})`;

    const listEl = document.getElementById('achievements-list');

    // Group by category
    const groups = {};
    for (const ach of achievements) {
      const cat = ach.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(ach);
    }

    let html = '';
    for (const [category, items] of Object.entries(groups)) {
      html += `<div class="achievement-category"><h3>${escapeHtml(category)}</h3>`;
      for (const ach of items) {
        const earned = !!ach.earned_at;
        const dateStr = earned ? new Date(ach.earned_at).toLocaleDateString() : '';
        html += `
          <div class="achievement-item ${earned ? 'earned' : 'unearned'}">
            <div class="achievement-icon">${ach.icon}</div>
            <div class="achievement-info">
              <div class="achievement-name">${escapeHtml(ach.name)}</div>
              <div class="achievement-desc">${escapeHtml(ach.description || '')}</div>
              ${earned ? `<div class="achievement-date">Earned ${dateStr}</div>` : ''}
            </div>
          </div>
        `;
      }
      html += '</div>';
    }

    listEl.innerHTML = html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { load };
})();
