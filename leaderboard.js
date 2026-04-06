export class Leaderboard {
  constructor() {
    this._overlay = document.getElementById('lb-overlay');
    this._submitPanel = document.getElementById('lb-submit');
    this._boardPanel = document.getElementById('lb-board');
    this._scoreText = document.getElementById('lb-score-text');
    this._nameInput = document.getElementById('lb-name');
    this._saveBtn = document.getElementById('lb-save');
    this._skipBtn = document.getElementById('lb-skip');
    this._status = document.getElementById('lb-status');
    this._hint = document.getElementById('lb-hint');
    this._tabNormal = document.getElementById('lb-tab-normal');
    this._tabMiga = document.getElementById('lb-tab-miga');
    this._list = document.getElementById('lb-list');
    this._playAgainBtn = document.getElementById('lb-play-again');

    this._score = 0;
    this._gameMode = 'NORMAL';
    this._activeTab = 'NORMAL';
    this._onPlayAgain = null;
    this._cachedRows = null;
    this.available = false;

    // Probe the API on load. Resolves quickly; disables the post-game modal
    // if the API isn't reachable (e.g. GitHub Pages).
    this._ready = fetch('/api/leaderboard?mode=NORMAL')
      .then(r => { this.available = r.ok; })
      .catch(() => { this.available = false; });

    this._saveBtn.addEventListener('click', () => this._handleSave());
    this._skipBtn.addEventListener('click', () => this._showBoard());
    this._playAgainBtn.addEventListener('click', () => this._handlePlayAgain());
    this._nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSave();
    });
    this._tabNormal.addEventListener('click', () => this._switchTab('NORMAL'));
    this._tabMiga.addEventListener('click', () => this._switchTab('MIGA'));
  }

  /** Called when the game ends. Checks qualification before showing the submit panel. */
  async showSubmit(score, gameMode, onPlayAgain) {
    this._score = score;
    this._gameMode = gameMode;
    this._activeTab = gameMode;
    this._onPlayAgain = onPlayAgain;
    this._overlay.querySelector('h2').textContent = score === 300 ? 'PERFECT GAME' : 'Game Over';
    this._overlay.style.display = 'flex';

    // Fetch current top 10 to decide whether this score qualifies
    let qualifies = true;
    try {
      const res = await fetch(`/api/leaderboard?mode=${gameMode}`);
      const rows = await res.json();
      this._cachedRows = { mode: gameMode, rows };
      qualifies = score === 300 || rows.length < 10 || score > rows[rows.length - 1].score;
    } catch {
      // If the fetch fails, default to showing the submit form
    }

    if (qualifies) {
      const modeLabel = gameMode === 'MIGA' ? 'MIGA (Hell Edition)' : 'Normal';
      this._scoreText.textContent = `${modeLabel} · Final score: ${score}`;
      this._nameInput.value = '';
      this._status.textContent = '';
      this._hint.textContent = score === 300 && gameMode === 'NORMAL' ? 'Hint: tap the top right' : '';
      this._submitPanel.style.display = '';
      this._boardPanel.style.display = 'none';
      setTimeout(() => this._nameInput.focus(), 80);
    } else {
      this._showBoard();
    }
  }


  openBoard(mode) {
    this._activeTab = mode;
    this._onPlayAgain = null;
    this._submitPanel.style.display = 'none';
    this._boardPanel.style.display = '';
    this._overlay.style.display = 'flex';
    this._updateTabs(mode);
    this._loadList(mode);
  }

  _hide() {
    this._overlay.style.display = 'none';
  }

  async _handleSave() {
    const name = this._nameInput.value.trim();
    if (!name) {
      this._status.textContent = 'Enter a name to save your score.';
      return;
    }

    this._saveBtn.disabled = true;
    this._saveBtn.textContent = 'Saving…';
    this._status.textContent = '';

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score: this._score, mode: this._gameMode }),
      });
      if (!res.ok) throw new Error('server error');
    } catch {
      this._status.textContent = 'Could not save — showing leaderboard anyway.';
    }

    this._saveBtn.disabled = false;
    this._saveBtn.textContent = 'Save Score';
    this._cachedRows = null;
    this._showBoard();
  }

  _showBoard() {
    this._submitPanel.style.display = 'none';
    this._boardPanel.style.display = '';
    this._updateTabs(this._activeTab);
    this._loadList(this._activeTab);
  }

  async _switchTab(mode) {
    if (mode === this._activeTab) return;
    this._activeTab = mode;
    this._updateTabs(mode);
    await this._loadList(mode);
  }

  _updateTabs(mode) {
    this._tabNormal.classList.toggle('lb-active', mode === 'NORMAL');
    this._tabMiga.classList.toggle('lb-active', mode === 'MIGA');
  }

  async _loadList(mode) {
    // Use the rows already fetched during qualification check to avoid a double-fetch
    if (this._cachedRows?.mode === mode) {
      this._renderRows(this._cachedRows.rows);
      this._cachedRows = null;
      return;
    }
    this._list.innerHTML = '<li class="lb-dim">Loading…</li>';
    try {
      const res = await fetch(`/api/leaderboard?mode=${mode}`);
      const rows = await res.json();
      this._renderRows(rows);
    } catch {
      this._list.innerHTML = '<li class="lb-dim">Failed to load scores.</li>';
    }
  }

  _renderRows(rows) {
    if (!rows.length) {
      this._list.innerHTML = '<li class="lb-dim">No scores yet — be the first!</li>';
      return;
    }
    this._list.innerHTML = rows.map((r, i) =>
      `<li>
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-name">${esc(r.player_name)}</span>
        <span class="lb-pts">${r.score}</span>
      </li>`
    ).join('');
  }

  _handlePlayAgain() {
    this._hide();
    this._onPlayAgain?.();
  }
}

function esc(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
