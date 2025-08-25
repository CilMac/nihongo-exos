
// vocab-popup.js — v4 clean
export async function initVocabPopup({ rootId = 'vocabPopupRoot', jsonUrl = './voc_guide_conv.json' } = {}) {
  const root = document.getElementById(rootId);
  if (!root) throw new Error('Racine introuvable pour la popup vocabulaire.');
  // ---------- Styles ----------
  // (désormais chargés via vocabulaire.css)
// ---------- HTML ----------
  root.innerHTML = `
    <div id="vocabPopup" role="dialog" aria-modal="true">
      <div id="vocabHeader">
        <h3>📘 Vocabulaire — Quiz</h3>
        <div class="right"><button id="vocabCloseBtn" title="Fermer">✖</button></div>
      </div>

      <div id="vocabBody">
        <div class="toolbar">
          <select id="catSelect"><option value="">Toutes catégories</option></select>
          <input id="searchInput" type="text" placeholder="🔎 Filtrer (français, kana, romaji, kanji)">
          <button id="randBtn" title="Tirage aléatoire">🎲</button>
          <select id="inputMode" title="Mode de saisie">
            <option value="kana">🈁 kana</option>
            <option value="romaji">🔤 romaji</option>
          </select>
          <select id="questionMode" title="Type de question">
            <option value="fr2ja">FR → JA</option>
            <option value="ja2fr">JA → FR</option>
          </select>
          <div class="spacer"></div>
          <button id="prevBtn" title="Précédent">◀️</button>
          <button id="nextBtn" title="Suivant">▶️</button>
          <button id="showAnswerBtn" title="Montrer">👁️ Montrer</button>
          <button id="speakBtn" title="Écouter">🔊</button>
        </div>

        <div class="card">
          <div class="card-lines">
            <div class="vocab-line">
              <div class="muted">FR</div>
              <div id="frTxt" class="big fr-green">—</div>
            </div>
            <div class="vocab-spacer"></div>
            <div class="vocab-line">
              <div class="muted">Romaji</div>
              <div id="romajiTxt" class="big romaji-black">•••</div>
            </div>
            <div class="vocab-spacer"></div>
            <div class="vocab-line">
              <div class="muted">Kana</div>
              <div id="kanaTxt" class="big kana-blue">•••</div>
            </div>
            <div class="vocab-spacer"></div>
            <div class="vocab-line">
              <div class="muted">Kanji</div>
              <div id="jpTxt" class="big tag kanji-red">•••</div>
            </div>
          </div>

          <div class="footer">
            <span class="right muted" id="counter">0 / 0</span>
          </div>
        </div>

      </div>
    </div>
  `;

  
  const $ = id => document.getElementById(id);

// platform detection for macOS styling
(function(){
  try {
    const isMac = (navigator.platform && /Mac/.test(navigator.platform)) || /Macintosh/.test(navigator.userAgent);
    if (isMac) document.documentElement.classList.add('macos');
  } catch(_) {}
})();

  const popup = $('vocabPopup');
  const closeBtn = $('vocabCloseBtn');

  // --- overlay / blocage clics + flou (réutilise #popupOverlay défini dans index.html)
  let overlay = document.getElementById('popupOverlay');
  if (!overlay) {
    // create overlay if not present
    overlay = document.createElement('div');
    overlay.id = 'popupOverlay';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.22)';
    overlay.style.zIndex = '4999';
    document.body.appendChild(overlay);
  }

  function showOverlay() {
    if (!overlay) return;
    const popupZ = parseInt(getComputedStyle(popup).zIndex || 5000, 10);
    overlay.style.zIndex = Math.max(0, popupZ - 1);
    overlay.style.display = 'block';
    overlay.style.pointerEvents = 'auto';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.22)';
    overlay.style.backdropFilter = 'blur(5px)';
  }
  function hideOverlay() {
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none';
    overlay.style.backdropFilter = 'none';
  }

  // fermeture via la croix : cache la popup et l'overlay
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (popup) popup.style.display = 'none';
      hideOverlay();
      window.popupActive = false;
    });
  }

  // Observateur pour réagir si d'autres scripts ouvrent/ferment la popup
  const mo = new MutationObserver(() => {
    const vis = popup && getComputedStyle(popup).display !== 'none';
    if (vis) {
      showOverlay();
      window.popupActive = true;
      try { popup.focus(); } catch(_) {}
    } else {
      hideOverlay();
      window.popupActive = false;
    }
  });
  if (popup) mo.observe(popup, { attributes: true, attributeFilter: ['style', 'class'] });

  // Empêcher les clics / focus hors modal tant que l'overlay est actif
  document.addEventListener('keydown', (e) => {
    if (window.popupActive && e.key === 'Tab') {
      const focusable = popup ? popup.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') : [];
      if (!focusable.length) { e.preventDefault(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  }, true);
  closeBtn.addEventListener('click', () => popup.style.display = 'none');

  // ---------- Data ----------
  let DATA = await fetch(jsonUrl, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('Échec de chargement du vocabulaire');
    return r.json();
  });
  DATA = Array.isArray(DATA) ? DATA : [];
  const fields = ['Francais','Kana','Romaji','Japonais','Categorie'];
  DATA = DATA.filter(row => fields.every(f => f in row));

  // ---------- State ----------
  let currentList = DATA.slice();
  let index = 0;
  let totalTries = 0;
  let goodCount = 0;
  const correctKeys = new Set();
  const rowKey = r => `${r.Francais}|${r.Kana}|${r.Romaji}|${r.Japonais}`;

  // ---------- Refs ----------
  const frTxt = $('frTxt');
  const kanaTxt = $('kanaTxt');
  const romajiTxt = $('romajiTxt');
  const jpTxt = $('jpTxt');
  const answer = $('answerKana'); // may be null in simplified mode
  const counter = $('counter');
  const goodCounter = $('goodCounter');
  const triesCounter = $('triesCounter');
  const resetGoodBtn = $('resetGoodBtn');
  const inputMode = $('inputMode');
  const questionMode = $('questionMode');
  const answerMode = $('answerMode'); // may be null
  const catSelect = $('catSelect');
  const searchInput = $('searchInput');
  const choicesPanel = $('choicesPanel'); // may be null
  const choicesList = $('choicesList'); // may be null

  // ---------- Helpers ----------
  const normalizeKana = (s='') => String(s).trim().replace(/\s+/g,' ').replace(/[~〜・・]/g,'・');
  const normalizeRomaji = (s='') => String(s).toLowerCase().replace(/[^a-z]/g,'');

  function targetText(row){
    const qmode = questionMode?.value || 'fr2ja';
    const mode  = inputMode?.value || 'kana';
    if (qmode === 'ja2fr') return String(row.Francais);
    return (mode === 'romaji') ? String(row.Romaji) : String(row.Kana);
  }
  function promptText(row){
    const qmode = questionMode?.value || 'fr2ja';
    return (qmode === 'ja2fr') ? String(row.Kana) : String(row.Francais);
  }
  function pickRandom(arr, n){
    const out = [];
    const used = new Set();
    while (out.length < Math.min(n, arr.length)) {
      const i = Math.floor(Math.random() * arr.length);
      if (used.has(i)) continue;
      used.add(i); out.push(arr[i]);
    }
    return out;
  }
  function renderChoices(correctRow){
    choicesList.innerHTML='';
    const pool = currentList.length ? currentList : DATA;
    const correctVal = targetText(correctRow);
    const distractors = pool.filter(r => targetText(r) !== correctVal);
    const picks = pickRandom(distractors, 9);
    const items = [correctRow, ...picks];
    // shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    items.forEach(r => {
      const li = document.createElement('li');
      li.textContent = targetText(r);
      li.tabIndex = 0;
      li.addEventListener('click', () => {
        [...choicesList.children].forEach(c => c.classList.remove('selected'));
        li.classList.add('selected');
        answer.value = li.textContent;
      });
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); }
      });
      choicesList.appendChild(li);
    });
  }

  // ---------- UI ----------
  function setModeUI(){
    // Simplified mode: no answer field or choice panel to configure.
    // Preserve question and input modes only.
    return;
  }

  function applyFilters(){
    const cat = (catSelect.value || '').trim().toLowerCase();
    const q   = (searchInput.value || '').trim().toLowerCase();
    currentList = DATA.filter(r => {
      const okCat = !cat || String(r.Categorie||'').toLowerCase() === cat;
      const blob = `${r.Francais} ${r.Kana} ${r.Romaji} ${r.Japonais}`.toLowerCase();
      const okQ = !q || blob.includes(q);
      return okCat && okQ;
    });
    index = 0;
    render();
  }

  function render(){
    if (!currentList.length){
      frTxt.textContent = kanaTxt.textContent = romajiTxt.textContent = jpTxt.textContent = '—';
      counter.textContent = '0 / 0';
      if (choicesList) choicesList.innerHTML = '';
      return;
    }
    const row = currentList[index];
    const qmode = questionMode?.value || 'fr2ja';
    if (qmode === 'ja2fr') { frTxt.textContent = '•••'; kanaTxt.textContent = row.Kana; }
    else                   { frTxt.textContent = row.Francais; kanaTxt.textContent = '•••'; }
    romajiTxt.textContent = '•••';
    jpTxt.textContent     = '•••';
    // In simplified mode there is no answer input; clear if present
    if (answer) {
      answer.value = '';
      answer.classList.remove('answer-correct','answer-wrong');
    }
    counter.textContent = `${index + 1} / ${currentList.length}`;
    if (goodCounter)  goodCounter.textContent  = `✅ ${goodCount}`;
    if (triesCounter) triesCounter.textContent = `🎯 ${totalTries}`;

    // No choices mode in simplified version; clear list if it exists
    if (choicesList) choicesList.innerHTML = '';
  }

  function showHint(){
    if (!currentList.length) return;
    const row = currentList[index];
    const kana = normalizeKana(row.Kana);
    const head = kana.split(/[ /]/)[0] || kana.slice(0, 1);
    kanaTxt.textContent = head + ' …';
  }

  function showSolution(){
    if (!currentList.length) return;
    const row = currentList[index];
    frTxt.textContent     = row.Francais;
    kanaTxt.textContent   = row.Kana;
    romajiTxt.textContent = row.Romaji;
    jpTxt.textContent     = row.Japonais;
  }

  function check(){
    // Simplified mode: no answer checking
    return;
  }

  function next(){ if (currentList.length){ index = (index + 1) % currentList.length; render(); } }
  function prev(){ if (currentList.length){ index = (index - 1 + currentList.length) % currentList.length; render(); } }
  function randomPick(){ if (currentList.length){ index = Math.floor(Math.random() * currentList.length); render(); } }

  // Audio
  function pickJaVoice(preferFemale = true) {
    const voices = window.speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('ja'));
    if (!voices.length) return null;
    try {
      if (window.selectedVoiceName) {
        const v = voices.find(v => v.name === window.selectedVoiceName);
        if (v) return v;
      }
    } catch(_) {}
    let preferFem = preferFemale;
    const toggle = document.getElementById('voiceToggle');
    if (toggle && toggle.textContent) preferFem = toggle.textContent.includes('👩');
    const femalePat = /(kyoko|mizuki|nanami|sayaka|haruka|hikari|tsukasa|kana|yui|female|woman)/i;
    const malePat   = /(otoya|show|shin|takumi|ren|taichi|ichi|male|man|male voice)/i;
    const fem = voices.find(v => femalePat.test(v.name));
    const mal = voices.find(v => malePat.test(v.name));
    return preferFem ? (fem || voices[0]) : (mal || voices[1] || voices[0]);
  }
  function speakJapanese(text) {
    if (!text) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ja-JP'; utt.rate = 0.85;
    const v = pickJaVoice(true);
    if (v) utt.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }

  // ---------- Categories ----------
  const savedCat = (localStorage.getItem('vocab_cat') || '').trim();
  const cats = Array.from(new Set(DATA.map(r => (r.Categorie || '').trim()).filter(Boolean))).sort();
  for (const c of cats) {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    if (savedCat && savedCat === c) opt.selected = true;
    catSelect.appendChild(opt);
  }

  // ---------- Listeners ----------
  searchInput.addEventListener('input', applyFilters);
  catSelect.addEventListener('change', () => { try { localStorage.setItem('vocab_cat', catSelect.value || ''); } catch(_) {} applyFilters(); });
  document.getElementById('randBtn')?.addEventListener('click', randomPick);
  // Simplified mode: no hint, solution, or verification buttons
  const showBtn = document.getElementById('showAnswerBtn');
  if (showBtn) {
    showBtn.addEventListener('click', function(){
      showSolution();
      if (!currentList.length) return;
      const row = currentList[index];
      const textToSpeak = (row.Japonais && String(row.Japonais).trim()) ? row.Japonais : row.Kana;
      speakJapanese(textToSpeak);
    });
  }

  document.getElementById('nextBtn')?.addEventListener('click', next);
  document.getElementById('prevBtn')?.addEventListener('click', prev);
  document.getElementById('speakBtn')?.addEventListener('click', () => {
    if (!currentList.length) return;
    const row = currentList[index];
    const text = (row.Japonais && String(row.Japonais).trim()) ? row.Japonais : row.Kana;
    speakJapanese(text);
  });
  if (resetGoodBtn) resetGoodBtn.addEventListener('click', () => {
    goodCount = 0; totalTries = 0; correctKeys.clear();
    if (goodCounter)  goodCounter.textContent  = `✅ ${goodCount}`;
    if (triesCounter) triesCounter.textContent = `🎯 ${totalTries}`;
  });

  if (inputMode)    inputMode.addEventListener('change', () => { setModeUI(); render(); });
  if (questionMode) questionMode.addEventListener('change', () => { setModeUI(); render(); });
  // Simplified mode: no answerMode or answer input

  // ---------- Init ----------
  // Restore persisted answerMode (handled in setModeUI) and render
  setModeUI();
  applyFilters();

  
  /* --- Mobile portrait adjustments for iPhone only (fixed) --- */
  (function(){
    const mq = window.matchMedia('(max-width:420px) and (orientation: portrait)');
    const popup = document.getElementById('vocabPopup');
    const catSelect = document.getElementById('catSelect');
    const origNext = document.getElementById('nextBtn');
    const origPrev = document.getElementById('prevBtn');
    const counter = document.getElementById('counter');
    const speakBtn = document.getElementById('speakBtn');
    if (!catSelect || !counter || !origPrev || !origNext || !speakBtn) return;

    let counterCopy = null;
    let controlsWrapper = null;
    let prevClone = null;
    let nextClone = null;
    let counterObserver = null;

    function createCounterCopy(){
      if (!catSelect || !counter) return;
      if (!counterCopy){
        counterCopy = document.createElement('span');
        counterCopy.id = 'counterCopy';
        counterCopy.className = 'muted right counter-copy';
        counterCopy.style.marginLeft = '8px';
        counterCopy.style.fontSize = '0.95rem';
        catSelect.parentNode.insertBefore(counterCopy, catSelect.nextSibling);
      }
      counterCopy.textContent = counter.textContent;
    }
    function removeCounterCopy(){
      if (counterCopy && counterCopy.parentNode){
        counterCopy.parentNode.removeChild(counterCopy);
        counterCopy = null;
      }
    }
    function observeCounter(){
      if (!counter || counterObserver) return;
      counterObserver = new MutationObserver(() => { if (counterCopy) counterCopy.textContent = counter.textContent; });
      counterObserver.observe(counter, { characterData: true, subtree: true, childList: true });
    }
    function disconnectCounterObserver(){
      if (counterObserver){ counterObserver.disconnect(); counterObserver = null; }
    }

    function createControlsWrapper(){
      if (controlsWrapper) return;
      // create wrapper inline-flex to hold prev & next side-by-side
      controlsWrapper = document.createElement('div');
      controlsWrapper.id = 'mobileControlsWrapper';
      controlsWrapper.style.display = 'inline-flex';
      controlsWrapper.style.gap = '8px';
      controlsWrapper.style.alignItems = 'center';
      controlsWrapper.style.marginLeft = '8px';
      // clone prev
      prevClone = origPrev.cloneNode(true);
      prevClone.id = 'prevBtn_clone_mobile';
      prevClone.addEventListener('click', function(e){ e.preventDefault(); origPrev.click(); });
      // clone next
      nextClone = origNext.cloneNode(true);
      nextClone.id = 'nextBtn_clone_mobile';
      nextClone.addEventListener('click', function(e){ e.preventDefault(); origNext.click(); });
      // ensure clones display inline-block
      prevClone.style.display = 'inline-block';
      nextClone.style.display = 'inline-block';
      // append clones
      controlsWrapper.appendChild(prevClone);
      controlsWrapper.appendChild(nextClone);
      // insert wrapper after speakBtn so they're on same visual row as audio
      if (speakBtn && speakBtn.parentNode) speakBtn.parentNode.insertBefore(controlsWrapper, speakBtn.nextSibling);
      // hide originals to avoid duplicates/wrapping
      origPrev.style.display = 'none';
      origNext.style.display = 'none';
    }

    function removeControlsWrapper(){
      if (controlsWrapper && controlsWrapper.parentNode){
        controlsWrapper.parentNode.removeChild(controlsWrapper);
      }
      controlsWrapper = null;
      prevClone = null;
      nextClone = null;
      if (origPrev) origPrev.style.display = '';
      if (origNext) origNext.style.display = '';
    }

    function applyIfNeeded(){
      const popupVisible = popup && getComputedStyle(popup).display !== 'none';
      if (!popupVisible){
        removeCounterCopy(); disconnectCounterObserver(); removeControlsWrapper(); return;
      }
      if (mq.matches){
        createCounterCopy();
        observeCounter();
        createControlsWrapper();
      } else {
        removeCounterCopy();
        disconnectCounterObserver();
        removeControlsWrapper();
      }
    }

    try { mq.addEventListener('change', applyIfNeeded); } catch(e){ mq.addListener && mq.addListener(applyIfNeeded); }
    window.addEventListener('resize', applyIfNeeded);
    window.addEventListener('orientationchange', applyIfNeeded);

    const popupMo = new MutationObserver(applyIfNeeded);
    if (popup) popupMo.observe(popup, { attributes: true, attributeFilter: ['style', 'class'] });

    // initial check after render
    setTimeout(applyIfNeeded, 250);
  })();

}
