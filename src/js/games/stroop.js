// Color Match / Stroop game
window.StroopGame = (function() {
  const colors = [
    { name: 'RED', hex: '#EF4444' },
    { name: 'BLUE', hex: '#3B82F6' },
    { name: 'GREEN', hex: '#10B981' },
    { name: 'YELLOW', hex: '#F59E0B' },
  ];

  let currentWord = null;
  let currentColor = null;
  let roundStart = 0;
  let rounds = 0;
  let maxRounds = 15;

  function start() {
    rounds = 0;

    const area = document.getElementById('game-area');
    area.innerHTML = `
      <div class="stroop-area">
        <div class="stroop-word" id="stroop-word"></div>
        <div class="stroop-feedback" id="stroop-feedback"></div>
        <div class="stroop-buttons" id="stroop-buttons">
          ${colors.map(c => `
            <button class="stroop-btn" data-color="${c.name}" style="background:${c.hex}">
              ${c.name}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('stroop-buttons').addEventListener('click', handleClick);
    nextRound();
  }

  function nextRound() {
    if (!GameEngine.isRunning()) return;

    rounds++;
    if (rounds > maxRounds) {
      GameEngine.endGame();
      return;
    }

    // Pick word and font color (different from each other)
    currentWord = colors[Math.floor(Math.random() * colors.length)];
    do {
      currentColor = colors[Math.floor(Math.random() * colors.length)];
    } while (currentColor.name === currentWord.name);

    const wordEl = document.getElementById('stroop-word');
    wordEl.textContent = currentWord.name;
    wordEl.style.color = currentColor.hex;

    document.getElementById('stroop-feedback').textContent = '';
    roundStart = Date.now();
  }

  function handleClick(e) {
    if (!GameEngine.isRunning()) return;

    const btn = e.target.closest('.stroop-btn');
    if (!btn) return;

    const chosen = btn.dataset.color;
    const feedback = document.getElementById('stroop-feedback');
    const elapsed = (Date.now() - roundStart) / 1000;

    if (chosen === currentColor.name) {
      // Correct! Match the FONT color
      const speedBonus = elapsed < 2 ? 10 : 0;
      const points = GameEngine.addScore(10 + speedBonus);
      GameEngine.incrementCombo();
      feedback.textContent = `Correct! +${points}`;
      feedback.style.color = 'var(--success)';
    } else {
      // Wrong
      GameEngine.addMiss();
      // Deduct 5 from score
      const state = GameEngine.getState();
      feedback.textContent = `Wrong! The font color was ${currentColor.name}`;
      feedback.style.color = 'var(--error)';
    }

    setTimeout(nextRound, 600);
  }

  return { start };
})();
