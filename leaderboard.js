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
    this._tabNormal = document.getElementById('lb-tab-normal');
    this._tabMiga = document.getElementById('lb-tab-miga');
    this._list = document.getElementById('lb-list');
    this._playAgainBtn = document.getElementById('lb-play-again');
    this._viewBtn = document.getElementById('lb-view-btn');

    this._score = 0;
    this._gameMode = 'NORMAL';
    this._activeTab = 'NORMAL';
    this._onPlayAgain = null;

    this._saveBtn.addEventListener('click', () => this._handleSave());
    this._skipBtn.addEventListener('click', () => this._showBoard());
    this._playAgainBtn.addEventListener('click', () => this._handlePlayAgain());
    this._nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this._handleSave();
    });
    this._tabNormal.addEventListener('click', () => this._switchTab('NORMAL'));
    this._tabMiga.addEventListener('click', () => this._switchTab('MIGA'));
    this._viewBtn.addEventListener('click', () => this._openBoard(this._gameMode));
  }

  /** Called when the game ends. Shows the submit-score panel. */
  showSubmit(score, gameMode, onPlayAgain) {
    this._score = score;
    this._gameMode = gameMode;
    this._activeTab = gameMode;
    this._onPlayAgain = onPlayAgain;

    const modeLabel = gameMode === 'MIGA' ? 'MIGA (Hell Edition)' : 'Normal';
    this._scoreText.textContent = `${modeLabel} · Final score: ${score}`;
    this._nameInput.value = '';
    this._status.textContent = '';

    this._submitPanel.style.display = '';
    this._boardPanel.style.display = 'none';
    this._overlay.style.display = 'flex';
    setTimeout(() => this._nameInput.focus(), 80);
  }

  /** Opens the leaderboard view directly (from the button). */
  _openBoard(mode) {
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
    this._list.innerHTML = '<li class="lb-dim">Loading…</li>';
    try {
      const res = await fetch(`/api/leaderboard?mode=${mode}`);
      const rows = await res.json();
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
    } catch {
      this._list.innerHTML = '<li class="lb-dim">Failed to load scores.</li>';
    }
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
