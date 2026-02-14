// Pattern Predictor game
window.PatternGame = (function() {
  const shapes = ['●', '■', '▲', '◆'];
  const patternColors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
  const sizes = ['small', 'large'];

  let round = 0;
  let maxRounds = 10;
  let roundStart = 0;

  function start() {
    round = 0;

    const area = document.getElementById('game-area');
    area.innerHTML = `
      <div class="pattern-area">
        <div class="pattern-round" id="pattern-round"></div>
        <div class="pattern-sequence" id="pattern-sequence"></div>
        <div class="pattern-choices" id="pattern-choices"></div>
      </div>
    `;

    nextRound();
  }

  function nextRound() {
    if (!GameEngine.isRunning()) return;

    round++;
    if (round > maxRounds) {
      GameEngine.endGame();
      return;
    }

    document.getElementById('pattern-round').textContent = `Round ${round} of ${maxRounds}`;
    roundStart = Date.now();

    let sequence, answer, choices;

    if (round <= 3) {
      // Single property: color alternating
      ({ sequence, answer, choices } = generateSimplePattern());
    } else if (round <= 6) {
      // Two properties: color + shape
      ({ sequence, answer, choices } = generateMediumPattern());
    } else {
      // Three properties: color + shape + size
      ({ sequence, answer, choices } = generateHardPattern());
    }

    renderSequence(sequence, answer);
    renderChoices(choices, answer);
  }

  function generateSimplePattern() {
    // Alternating colors with same shape
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const c1 = Math.floor(Math.random() * patternColors.length);
    let c2;
    do { c2 = Math.floor(Math.random() * patternColors.length); } while (c2 === c1);

    const seqLen = 4 + Math.floor(Math.random() * 2);
    const sequence = [];
    for (let i = 0; i < seqLen; i++) {
      sequence.push({
        shape,
        color: patternColors[i % 2 === 0 ? c1 : c2],
        size: 'large',
      });
    }

    const answer = {
      shape,
      color: patternColors[seqLen % 2 === 0 ? c1 : c2],
      size: 'large',
    };

    const choices = generateChoices(answer, 'simple');
    return { sequence, answer, choices };
  }

  function generateMediumPattern() {
    // Alternating color+shape pairs
    const s1 = shapes[Math.floor(Math.random() * shapes.length)];
    let s2;
    do { s2 = shapes[Math.floor(Math.random() * shapes.length)]; } while (s2 === s1);
    const c1 = Math.floor(Math.random() * patternColors.length);
    let c2;
    do { c2 = Math.floor(Math.random() * patternColors.length); } while (c2 === c1);

    const seqLen = 4 + Math.floor(Math.random() * 2);
    const sequence = [];
    for (let i = 0; i < seqLen; i++) {
      sequence.push({
        shape: i % 2 === 0 ? s1 : s2,
        color: patternColors[i % 2 === 0 ? c1 : c2],
        size: 'large',
      });
    }

    const answer = {
      shape: seqLen % 2 === 0 ? s1 : s2,
      color: patternColors[seqLen % 2 === 0 ? c1 : c2],
      size: 'large',
    };

    const choices = generateChoices(answer, 'medium');
    return { sequence, answer, choices };
  }

  function generateHardPattern() {
    // Alternating color+shape+size
    const s1 = shapes[Math.floor(Math.random() * shapes.length)];
    let s2;
    do { s2 = shapes[Math.floor(Math.random() * shapes.length)]; } while (s2 === s1);
    const c1 = Math.floor(Math.random() * patternColors.length);
    let c2;
    do { c2 = Math.floor(Math.random() * patternColors.length); } while (c2 === c1);

    const seqLen = 4 + Math.floor(Math.random() * 3);
    const sequence = [];
    for (let i = 0; i < seqLen; i++) {
      sequence.push({
        shape: i % 2 === 0 ? s1 : s2,
        color: patternColors[i % 2 === 0 ? c1 : c2],
        size: i % 2 === 0 ? 'small' : 'large',
      });
    }

    const answer = {
      shape: seqLen % 2 === 0 ? s1 : s2,
      color: patternColors[seqLen % 2 === 0 ? c1 : c2],
      size: seqLen % 2 === 0 ? 'small' : 'large',
    };

    const choices = generateChoices(answer, 'hard');
    return { sequence, answer, choices };
  }

  function generateChoices(answer, difficulty) {
    const choices = [answer];

    while (choices.length < 4) {
      const choice = {
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        color: patternColors[Math.floor(Math.random() * patternColors.length)],
        size: difficulty === 'hard' ? sizes[Math.floor(Math.random() * 2)] : 'large',
      };

      // Make sure it's different from answer and existing choices
      const isDuplicate = choices.some(c =>
        c.shape === choice.shape && c.color === choice.color && c.size === choice.size
      );
      if (!isDuplicate) {
        choices.push(choice);
      }
    }

    // Shuffle
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    return choices;
  }

  function renderSequence(sequence, answer) {
    const el = document.getElementById('pattern-sequence');
    el.innerHTML = sequence.map(item =>
      `<div class="pattern-item" style="color:${item.color}; font-size:${item.size === 'small' ? '1rem' : '1.5rem'}">${item.shape}</div>`
    ).join('') + '<div class="pattern-question">?</div>';
  }

  function renderChoices(choices, answer) {
    const el = document.getElementById('pattern-choices');
    el.innerHTML = choices.map((choice, i) => `
      <button class="pattern-choice" data-index="${i}" style="color:${choice.color}; font-size:${choice.size === 'small' ? '1rem' : '1.5rem'}">
        ${choice.shape}
      </button>
    `).join('');

    el.addEventListener('click', function handler(e) {
      const btn = e.target.closest('.pattern-choice');
      if (!btn || !GameEngine.isRunning()) return;

      const idx = parseInt(btn.dataset.index);
      const chosen = choices[idx];

      el.removeEventListener('click', handler);

      if (chosen.shape === answer.shape && chosen.color === answer.color && chosen.size === answer.size) {
        // Correct
        const elapsed = (Date.now() - roundStart) / 1000;
        const speedBonus = elapsed < 3 ? 10 : elapsed < 5 ? 5 : 0;
        GameEngine.addScore(10 + speedBonus);
        GameEngine.incrementCombo();
        btn.style.borderColor = 'var(--success)';
        btn.style.background = 'var(--success-light)';
      } else {
        // Wrong
        GameEngine.addMiss();
        btn.style.borderColor = 'var(--error)';
        btn.style.background = 'var(--error-light)';
      }

      setTimeout(nextRound, 700);
    });
  }

  return { start };
})();
