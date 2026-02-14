// Speed Typing game
window.TypingGame = (function() {
  const phrases = [
    'Thank you for contacting our support team',
    'Your order has been shipped and is on its way',
    'Please let me know if you need any further assistance',
    'The meeting has been rescheduled to next Wednesday',
    'All inventory items have been verified and updated',
    'I will follow up with you by the end of the day',
    'The new policy takes effect starting next month',
    'Please review the attached document at your convenience',
    'We appreciate your patience during this process',
    'The system maintenance is scheduled for this weekend',
    'Your request has been received and is being processed',
    'I have forwarded your inquiry to the appropriate team',
    'The quarterly report is ready for your review',
    'Please confirm your availability for the training session',
    'We are working on resolving this issue as quickly as possible',
    'The updated schedule has been posted on the bulletin board',
    'Your feedback is very important to us',
    'The warehouse shipment arrived earlier than expected',
    'Please update your contact information in the system',
    'All team members should complete the survey by Friday',
  ];

  let currentPhrase = '';
  let currentIndex = 0;
  let phrasesCompleted = 0;
  let totalCharsTyped = 0;
  let correctChars = 0;
  let startTime = 0;
  let inputEl = null;

  function start() {
    phrasesCompleted = 0;
    totalCharsTyped = 0;
    correctChars = 0;
    startTime = Date.now();

    const area = document.getElementById('game-area');
    area.innerHTML = `
      <div class="typing-area">
        <div class="typing-phrase" id="typing-phrase"></div>
        <input type="text" class="typing-input" id="typing-input" placeholder="Start typing..." autocomplete="off" autofocus>
        <div class="typing-stats">
          <div class="typing-stat">
            <div class="value" id="typing-wpm">0</div>
            <div class="label">WPM</div>
          </div>
          <div class="typing-stat">
            <div class="value" id="typing-accuracy">100%</div>
            <div class="label">Accuracy</div>
          </div>
          <div class="typing-stat">
            <div class="value" id="typing-phrases">0</div>
            <div class="label">Phrases</div>
          </div>
        </div>
      </div>
    `;

    inputEl = document.getElementById('typing-input');
    inputEl.addEventListener('input', handleInput);
    inputEl.focus();

    nextPhrase();
  }

  function nextPhrase() {
    currentIndex = 0;
    // Pick a random phrase we haven't used recently
    currentPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    renderPhrase();

    if (inputEl) {
      inputEl.value = '';
      inputEl.focus();
    }
  }

  function renderPhrase() {
    const el = document.getElementById('typing-phrase');
    if (!el) return;

    const input = inputEl ? inputEl.value : '';
    let html = '';

    for (let i = 0; i < currentPhrase.length; i++) {
      if (i < input.length) {
        if (input[i] === currentPhrase[i]) {
          html += `<span class="correct">${escapeHtml(currentPhrase[i])}</span>`;
        } else {
          html += `<span class="error">${escapeHtml(currentPhrase[i])}</span>`;
        }
      } else {
        html += `<span class="pending">${escapeHtml(currentPhrase[i])}</span>`;
      }
    }

    el.innerHTML = html;
  }

  function handleInput() {
    if (!GameEngine.isRunning()) return;

    const input = inputEl.value;
    renderPhrase();

    // Update stats
    totalCharsTyped = correctChars;
    let currentCorrect = 0;
    for (let i = 0; i < input.length && i < currentPhrase.length; i++) {
      if (input[i] === currentPhrase[i]) currentCorrect++;
    }

    // Calculate WPM
    const elapsed = (Date.now() - startTime) / 1000 / 60; // minutes
    const wordsTyped = (correctChars + currentCorrect) / 5;
    const wpm = elapsed > 0 ? Math.round(wordsTyped / elapsed) : 0;

    // Calculate accuracy
    const totalTyped = correctChars + input.length;
    const totalCorrect = correctChars + currentCorrect;
    const accuracy = totalTyped > 0 ? Math.round((totalCorrect / totalTyped) * 100) : 100;

    document.getElementById('typing-wpm').textContent = wpm;
    document.getElementById('typing-accuracy').textContent = accuracy + '%';

    // Check if phrase is complete
    if (input.length >= currentPhrase.length) {
      // Count correct chars for this phrase
      correctChars += currentCorrect;
      phrasesCompleted++;
      document.getElementById('typing-phrases').textContent = phrasesCompleted;

      // Score: WPM * accuracy fraction
      const phraseAccuracy = currentCorrect / currentPhrase.length;
      const points = Math.round(wpm * phraseAccuracy);
      GameEngine.addScore(Math.max(points, 5));

      if (phraseAccuracy >= 0.95) {
        GameEngine.incrementCombo();
      } else {
        GameEngine.resetCombo();
      }

      nextPhrase();
    }
  }

  function escapeHtml(ch) {
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '&') return '&amp;';
    if (ch === ' ') return '&nbsp;';
    return ch;
  }

  // Override endGame to include typing-specific accuracy
  const originalEndGame = GameEngine.endGame;

  return {
    start,
  };
})();
