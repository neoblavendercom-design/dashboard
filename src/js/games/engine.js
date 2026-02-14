// Shared game engine - timer, combo, scoring, results
window.GameEngine = (function() {
  let state = {
    gameKey: null,
    score: 0,
    combo: 1,
    maxCombo: 1,
    hits: 0,
    misses: 0,
    timeLeft: 60,
    duration: 60,
    running: false,
    timerInterval: null,
  };

  function init(gameKey, duration) {
    state = {
      gameKey,
      score: 0,
      combo: 1,
      maxCombo: 1,
      hits: 0,
      misses: 0,
      timeLeft: duration,
      duration,
      running: false,
      timerInterval: null,
    };

    updateDisplay();

    const area = document.getElementById('game-area');
    area.innerHTML = `
      <div class="game-start">
        <h3>${getGameTitle(gameKey)}</h3>
        <p>${getGameDesc(gameKey)}</p>
        <button class="btn-primary" id="start-game-btn">Start Game</button>
      </div>
    `;

    document.getElementById('start-game-btn').addEventListener('click', () => {
      startGame(gameKey);
    });
  }

  function startGame(gameKey) {
    state.running = true;
    updateDisplay();

    // Start timer
    state.timerInterval = setInterval(() => {
      state.timeLeft--;
      document.getElementById('game-timer').textContent = state.timeLeft;

      if (state.timeLeft <= 0) {
        endGame();
      }
    }, 1000);

    // Launch the specific game
    const games = {
      whack: WhackGame,
      memory: MemoryGame,
      typing: TypingGame,
      stroop: StroopGame,
      pattern: PatternGame,
    };

    if (games[gameKey]) {
      games[gameKey].start();
    }
  }

  function addScore(points) {
    const gained = Math.round(points * state.combo);
    state.score += gained;
    state.hits++;
    document.getElementById('game-score').textContent = state.score;
    return gained;
  }

  function incrementCombo() {
    state.combo = Math.min(state.combo + 1, 5);
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    document.getElementById('game-combo').textContent = state.combo + 'x';
  }

  function resetCombo() {
    state.combo = 1;
    document.getElementById('game-combo').textContent = '1x';
  }

  function addMiss() {
    state.misses++;
    resetCombo();
  }

  function getAccuracy() {
    const total = state.hits + state.misses;
    if (total === 0) return 0;
    return Math.round((state.hits / total) * 100);
  }

  function getGrade(score) {
    if (score >= 500) return 'S';
    if (score >= 350) return 'A';
    if (score >= 200) return 'B';
    if (score >= 100) return 'C';
    return 'D';
  }

  async function endGame(customData) {
    if (!state.running) return;
    state.running = false;
    clearInterval(state.timerInterval);

    const accuracy = customData?.accuracy ?? getAccuracy();
    const score = customData?.score ?? state.score;
    const grade = getGrade(score);

    // Submit score to API
    let newBadges = [];
    let remaining = 0;
    try {
      const res = await fetch('/api/games/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_key: state.gameKey,
          score: score,
          accuracy: accuracy,
          max_combo: state.maxCombo,
        }),
      });
      const data = await res.json();
      if (data.new_badges) {
        newBadges = data.new_badges;
        Dashboard.updateBadgeCount(newBadges.length);
      }
      remaining = data.remaining ?? 0;
    } catch (err) {
      console.error('Failed to submit score:', err);
    }

    // Show results
    showResults(score, grade, accuracy, newBadges, remaining);
  }

  function showResults(score, grade, accuracy, newBadges, remaining) {
    const area = document.getElementById('game-area');

    let badgesHtml = '';
    if (newBadges.length > 0) {
      badgesHtml = '<div class="new-badges">';
      for (const b of newBadges) {
        badgesHtml += `<div class="new-badge">${b.icon} ${b.name}</div>`;
      }
      badgesHtml += '</div>';
    }

    area.innerHTML = `
      <div class="game-results">
        <div class="grade-display grade-${grade}">${grade}</div>
        <div class="score-display">${score} points</div>
        <div class="accuracy-display">${accuracy}% accuracy | Max combo: ${state.maxCombo}x</div>
        ${badgesHtml}
        <p style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 1rem;">
          ${remaining > 0 ? `${remaining} play${remaining === 1 ? '' : 's'} remaining today` : 'No plays remaining today'}
        </p>
        <button class="btn-primary" id="back-to-games-btn" style="width:auto; padding: 0.75rem 2rem;">
          Back to Games
        </button>
      </div>
    `;

    document.getElementById('back-to-games-btn').addEventListener('click', () => {
      Dashboard.backToGames();
    });
  }

  function stop() {
    state.running = false;
    clearInterval(state.timerInterval);
  }

  function updateDisplay() {
    document.getElementById('game-score').textContent = state.score;
    document.getElementById('game-timer').textContent = state.timeLeft;
    document.getElementById('game-combo').textContent = state.combo + 'x';
  }

  function isRunning() {
    return state.running;
  }

  function getState() {
    return { ...state };
  }

  function getGameTitle(key) {
    const titles = {
      whack: 'Whack-a-Mole',
      memory: 'Memory Match',
      typing: 'Speed Typing',
      stroop: 'Color Match',
      pattern: 'Pattern Predictor',
    };
    return titles[key] || key;
  }

  function getGameDesc(key) {
    const descs = {
      whack: 'Click the moles as they pop up! Speed up as you go. Click empty holes to lose your combo.',
      memory: 'Match pairs of emoji cards. Faster matches earn bonus points!',
      typing: 'Type the displayed phrases as quickly and accurately as you can.',
      stroop: 'Click the button that matches the FONT COLOR of the word, not the word itself!',
      pattern: 'Predict the next item in the pattern sequence.',
    };
    return descs[key] || '';
  }

  return {
    init,
    addScore,
    incrementCombo,
    resetCombo,
    addMiss,
    endGame,
    stop,
    isRunning,
    getState,
    getAccuracy,
  };
})();
