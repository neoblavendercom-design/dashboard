// Memory Match game
window.MemoryGame = (function() {
  const emojis = ['⭐', '🔥', '💎', '🎯', '🚀', '🔔', '🎲', '🏆'];
  let cards = [];
  let flippedCards = [];
  let matchedCount = 0;
  let locked = false;
  let lastFlipTime = 0;

  function start() {
    matchedCount = 0;
    flippedCards = [];
    locked = false;

    // Create 8 pairs, shuffle
    cards = [...emojis, ...emojis];
    shuffle(cards);

    const area = document.getElementById('game-area');
    area.innerHTML = `
      <div style="position:relative;">
        <div class="combo-display" id="combo-text"></div>
        <div class="memory-grid" id="memory-grid">
          ${cards.map((emoji, i) => `
            <div class="memory-card" data-index="${i}" data-emoji="${emoji}">
              <div class="memory-card-inner">
                <div class="memory-card-front">?</div>
                <div class="memory-card-back">${emoji}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('memory-grid').addEventListener('click', handleClick);
  }

  function handleClick(e) {
    if (!GameEngine.isRunning() || locked) return;

    const card = e.target.closest('.memory-card');
    if (!card || card.classList.contains('flipped') || card.classList.contains('matched')) return;

    card.classList.add('flipped');
    flippedCards.push(card);

    if (flippedCards.length === 1) {
      lastFlipTime = Date.now();
      return;
    }

    if (flippedCards.length === 2) {
      locked = true;
      const [a, b] = flippedCards;
      const emojiA = a.dataset.emoji;
      const emojiB = b.dataset.emoji;

      if (emojiA === emojiB) {
        // Match!
        const elapsed = Date.now() - lastFlipTime;
        const speedBonus = elapsed < 1000 ? 10 : elapsed < 2000 ? 5 : 0;
        const points = GameEngine.addScore(20 + speedBonus);
        GameEngine.incrementCombo();
        showComboText(points);

        a.classList.add('matched');
        b.classList.add('matched');
        matchedCount++;

        flippedCards = [];
        locked = false;

        // Check if all matched
        if (matchedCount === 8) {
          setTimeout(() => {
            GameEngine.endGame();
          }, 500);
        }
      } else {
        // No match
        GameEngine.addMiss();

        setTimeout(() => {
          a.classList.remove('flipped');
          b.classList.remove('flipped');
          flippedCards = [];
          locked = false;
        }, 800);
      }
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
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
