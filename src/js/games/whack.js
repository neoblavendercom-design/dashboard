// Whack-a-Mole game
window.WhackGame = (function() {
  let moleTimer = null;
  let moleTimeout = null;
  let showDuration = 1500;
  let spawnInterval = 2000;
  let activeHole = -1;

  const moles = ['🐹', '🐿️', '🦫', '🐀'];

  function start() {
    showDuration = 1500;
    spawnInterval = 2000;
    activeHole = -1;

    const area = document.getElementById('game-area');
    area.innerHTML = `
      <div style="position:relative;">
        <div class="combo-display" id="combo-text"></div>
        <div class="whack-grid" id="whack-grid">
          ${Array.from({ length: 9 }, (_, i) => `<div class="whack-hole" data-index="${i}"></div>`).join('')}
        </div>
      </div>
    `;

    const grid = document.getElementById('whack-grid');
    grid.addEventListener('click', handleClick);

    spawnMole();
  }

  function spawnMole() {
    if (!GameEngine.isRunning()) return;

    // Clear previous
    clearActiveHole();

    // Pick random hole
    let newHole;
    do {
      newHole = Math.floor(Math.random() * 9);
    } while (newHole === activeHole);

    activeHole = newHole;
    const holes = document.querySelectorAll('.whack-hole');
    if (holes[activeHole]) {
      holes[activeHole].classList.add('active');
      holes[activeHole].textContent = moles[Math.floor(Math.random() * moles.length)];
    }

    // Auto-hide after duration
    moleTimeout = setTimeout(() => {
      if (activeHole === newHole) {
        clearActiveHole();
        GameEngine.addMiss();
      }
    }, showDuration);

    // Gradually speed up
    showDuration = Math.max(500, showDuration - 15);
    spawnInterval = Math.max(800, spawnInterval - 20);

    moleTimer = setTimeout(spawnMole, spawnInterval);
  }

  function clearActiveHole() {
    const holes = document.querySelectorAll('.whack-hole');
    holes.forEach(h => {
      h.classList.remove('active');
      h.textContent = '';
    });
    activeHole = -1;
    clearTimeout(moleTimeout);
  }

  function handleClick(e) {
    if (!GameEngine.isRunning()) return;

    const hole = e.target.closest('.whack-hole');
    if (!hole) return;

    const idx = parseInt(hole.dataset.index);

    if (idx === activeHole && hole.classList.contains('active')) {
      // Hit!
      const points = GameEngine.addScore(10);
      GameEngine.incrementCombo();
      showComboText(points);

      hole.classList.remove('active');
      hole.textContent = '💥';
      setTimeout(() => {
        if (hole.textContent === '💥') hole.textContent = '';
      }, 200);

      activeHole = -1;
      clearTimeout(moleTimeout);
    } else if (!hole.classList.contains('active')) {
      // Miss - clicked empty hole
      GameEngine.addMiss();
    }
  }

  function showComboText(points) {
    const el = document.getElementById('combo-text');
    if (!el) return;
    const state = GameEngine.getState();
    if (state.combo > 1) {
      el.textContent = `${state.combo}x COMBO! +${points}`;
    } else {
      el.textContent = `+${points}`;
    }
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 500);
  }

  return { start };
})();
