
// vocab-popup.js (layout: controls up top, scrollable content area)
export async function initVocabPopup({ rootId = 'vocabPopupRoot', jsonUrl = './voc_guide_conv.json' } = {}) {
  const root = document.getElementById(rootId);
  if (!root) throw new Error('Racine introuvable pour la popup vocabulaire.');

  // Styles isolés
  const style = document.createElement('style');
  style.textContent = `
    #vocabPopup { position: fixed; z-index: 5000; left: 50%; top: 6vh; transform: translateX(-50%);
      width: min(900px, 96vw); max-height: 88vh; background:#fff; border:1px solid #ccc; border-radius:14px;
      box-shadow:0 10px 30px rgba(0,0,0,.2); display:none; display:flex; flex-direction:column; overflow:hidden; }
    #vocabHeader { display:flex; align-items:center; justify-content:space-between; gap:.5rem;
      padding:10px 14px; border-bottom:1px solid #eee; }
    #vocabHeader h3 { margin:0; font-size:1.05rem; }
    #vocabBody { display:flex; flex-direction:column; gap:.6rem; padding:10px 14px; overflow:hidden; }
    .toolbar { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
#inputMode { min-width: 110px; }
    .toolbar .spacer { flex:1; }
    select, input[type="text"], button { font-size:1rem; padding:.45rem .7rem; border-radius:10px; border:1px solid #bbb; }
    input[type="text"] { min-width: 260px; }
    button { cursor:pointer; }
    button.primary { border-color:#888; background:#f0f0f0; }
    button.primary:hover { background:#e9e9e9; }
    .card { border:1px solid #eee; border-radius:12px; padding:12px; }
    .muted { color:#666; font-size:.95rem; }
    .big { font-size:1.25rem; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    @media (max-width:780px){ .grid { grid-template-columns:1fr; } }
    .tag { display:inline-block; padding:.1rem .5rem; border:1px solid #ddd; border-radius:999px; font-size:.85rem; margin-left:.4rem; }
    .right { margin-left:auto; }
    .sep { height:1px; background:#eee; margin:.8rem 0; }

    
    /* Keypad compact */
    .keypad-section { border:1px solid #eee; border-radius:12px; padding:8px; max-height:40vh; overflow:auto; }
    .keypad-title { font-weight:600; margin-bottom:6px; }
    .keypad { margin-top:6px; display:grid; grid-template-columns: repeat(5, 1fr); gap:4px; }
    .keypad .key { font-size:1rem; padding:.4rem 0; text-align:center; border-radius:10px; border:1px solid #bbb; background:#fafafa; }
    .keypad .key:hover { background:#f0f0f0; }
    .keypad-ops { display:flex; gap:6px; flex-wrap:wrap; margin-top:4px; }
    .keypad-ops .key { padding:.45rem .7rem; }
    .footer { display:flex; justify-content:flex-end; gap:.5rem; padding:8px 14px; border-top:1px solid #eee; }
  
/* color classes */
.fr-green { color: #2e7d32; }      /* FR */
.kana-blue { color: #1565c0; }     /* Kana */
.kanji-red { color: #c62828; }     /* Kanji */
.romaji-black { color: #111111; }  /* Romaji */


/* Feedback styles */
.answer-correct { border: 2px solid #2e7d32 !important; background-color: #e8f5e9; }
.answer-wrong { border: 2px solid #c62828 !important; background-color: #ffebee; }

    #goodCounter { padding: .15rem .5rem; border: 1px solid #d6e9d8; border-radius: 999px; background: #f1faf1; }
    
    #resetGoodBtn { background:none; border:none; cursor:pointer; font-size:0.9rem; }
    #resetGoodBtn:hover { transform: scale(1.2); }
    
    #triesCounter { margin-left: .5rem; }
    .op-btn { display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:86px; padding:.35rem .6rem; }
    .op-btn .op-sym { font-size:1.2rem; line-height:1.1; }
    .op-btn .op-main { font-size:.9rem; font-weight:600; line-height:1.1; }
    .op-btn .op-sub { font-size:.8rem; color:#666; line-height:1.1; }
    .footer { display:flex; align-items:center; justify-content:space-between; gap:.5rem; padding:8px 14px; border-top:1px solid #eee; }
    .counters-left { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
        
/* ===== Responsive / iOS-friendly tweaks ===== */
/* Smooth scrolling in scrollable areas for iOS */
.keypad-section { -webkit-overflow-scrolling: touch; touch-action: manipulation; }
#vocabBody { -webkit-overflow-scrolling: touch; }

@media (max-width: 640px) {
  /* Make toolbar more compact and wrap nicely */
  .toolbar { gap:.4rem; }
  .toolbar > * { flex: 0 0 auto; }
  #searchInput { flex: 1 1 180px; min-width: 160px; }
}

@media (max-width: 480px) {
  /* Smaller fonts, tighter paddings */
  select, input[type="text"], button { font-size:.95rem; padding:.4rem .6rem; }
  .big { font-size:1.1rem; }

  /* Keypad layout: 4 columns for better fit */
  .keypad { grid-template-columns: repeat(4, 1fr); gap:4px; }
  .keypad .key { padding:.45rem 0; min-height: 38px; }

  /* Dakuten/Handakuten buttons: horizontal compact */
  .op-btn { min-width:auto; padding:.3rem .5rem; flex-direction:row; gap:.35rem; }
  .op-btn .op-sym { font-size:1.15rem; }
  .op-btn .op-main { font-size:.9rem; font-weight:600; }
  .op-btn .op-sub { display:none; } /* cacher la sous-légende pour gagner de la place */

  /* Counters line: allow wrap without breaking alignment */
  .footer { gap:.4rem; }
  .counters-left { gap:.4rem; flex-wrap:wrap; }

  /* Keep the popup usable on very small heights */
  #vocabPopup { max-height: 90vh; }
  .keypad-section { max-height: 42vh; }
}
`;
  document.head.appendChild(style);

  root.innerHTML = `
    <div id="vocabPopup" role="dialog" aria-modal="true">
      <div id="vocabHeader">
        <h3>📘 Vocabulaire — Quiz</h3>
        <div class="right">
          <button id="vocabCloseBtn" title="Fermer">✖</button>
        </div>
      </div>
      <div id="vocabBody">
        <div class="toolbar">
          <select id="catSelect"><option value="">Toutes catégories</option></select>
          <input id="searchInput" type="text" placeholder="Filtrer (français, kana, romaji, kanji)">
          <button id="randBtn" title="Tirage aléatoire">🎲</button>
<select id="inputMode" title="Mode de saisie"><option value="kana">kana</option><option value="romaji">romaji</option></select>
          <div class="spacer"></div>
          <button id="prevBtn" title="Précédent">⬅️</button>
          <button id="nextBtn" title="Suivant">➡️</button>
          <button id="checkBtn" class="primary">Vérifier</button>
          <button id="showHintBtn">Indice (kana)</button>
          <button id="showSolBtn">Solution</button>
<button id="speakBtn" title="Lecture audio (ja-JP)">🔊</button>
        </div>

        <div id="fixedZone">
          <div class="card" id="qaZone">
            <div class="grid">
              <div>
                <div class="muted">FR</div>
                <div id="frTxt" class="big fr-green">—</div>
              </div>
              <div>
                <div class="muted">Ta réponse (kana)</div>
                <input id="answerKana" type="text" placeholder="kana (ex: よこ)" autocomplete="off">
                <div class="muted" style="margin-top:.3rem;">Tu peux utiliser le clavier ci-dessous ou taper au clavier.</div>
              </div>
              <div>
                <div class="muted">Kana</div><div id="kanaTxt" class="big kana-blue">•••</div>
              </div>
              <div>
                <div class="muted">Romaji / Kanji</div>
                <div><span id="romajiTxt" class="romaji-black" class="romaji-black">•••</span> <span id="jpTxt" class="tag kanji-red kanji-red">•••</span></div>
              </div>
            </div>
          </div>

          <div class="keypad-section">
            <div class="keypad-title">Clavier hiragana</div>
            <div class="keypad" id="keypadBase"></div>
            <div class="keypad" id="keypadSmall"></div>
            <div class="keypad-ops">
              <button class="key op-btn" data-op="dakuten"><span class="op-sym">゛</span><span class="op-main">Dakuten</span><span class="op-sub">(voisée)</span></button>
              <button class="key op-btn" data-op="handakuten"><span class="op-sym">゜</span><span class="op-main">Handakuten</span><span class="op-sub">(p)</span></button>
              <button class="key" data-op="space">␣ espace</button>
              <button class="key" data-op="back">← effacer</button>
              <button class="key" data-op="clear">⟲ tout effacer</button>
              <button class="key" data-op="ok">OK (vérifier)</button>
            </div>
          </div>

          <div class="footer">
            <div class="counters-left"><span class="muted" id="goodCounter">✅ 0</span><span class="muted" id="triesCounter">🎯 0</span><button id="resetGoodBtn" title="Réinitialiser le compteur">♻️</button></div>
            <span class="right muted" id="counter">0 / 0</span>
          </div>
        </div>
      </div>
    </div>
  `;

  const $ = id => document.getElementById(id);
  const popup = $('vocabPopup');
  const closeBtn = $('vocabCloseBtn');

  closeBtn.addEventListener('click', () => popup.style.display = 'none');

  // Charge & met en cache le JSON
  let DATA = await fetch(jsonUrl, { cache: 'no-store' }).then(r => {
    if (!r.ok) throw new Error('Échec de chargement du vocabulaire');
    return r.json();
  });

  // Normalisation minimale & garde-fous
  DATA = Array.isArray(DATA) ? DATA : [];
  const fields = ['Francais','Kana','Romaji','Japonais','Categorie'];
  DATA = DATA.filter(row => fields.every(f => f in row));

  // Remplir catégories + restaurer sélection
  const catSelect = $('catSelect');
  const savedCat = (localStorage.getItem('vocab_cat') || '').trim();
  const cats = Array.from(new Set(DATA.map(r => (r.Categorie || '').trim()).filter(Boolean))).sort();
  for (const c of cats) {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    if (savedCat && savedCat === c) opt.selected = true;
    catSelect.appendChild(opt);
  }

  // État du quiz
  let currentList = DATA.slice();
  let index = 0;
  let totalTries = 0;
  let goodCount = 0;
  const correctKeys = new Set();
  function rowKey(r){ return `${r.Francais}|${r.Kana}|${r.Romaji}|${r.Japonais}`; }

  const frTxt = $('frTxt');
  const kanaTxt = $('kanaTxt');
  const romajiTxt = $('romajiTxt');
  const jpTxt = $('jpTxt');
  const answer = $('answerKana');
  const feedback = document.createElement('span'); // feedback non-visible par défaut; on le mettra dans le titre FR si besoin
  feedback.className = 'muted';

  const counter = $('counter');
  const goodCounter = $('goodCounter');
  const triesCounter = $('triesCounter');
  const resetGoodBtn = $('resetGoodBtn');
  const inputMode = $('inputMode');
  const keypadSection = document.querySelector('.keypad-section');

  function setModeUI() {
    const mode = inputMode ? inputMode.value : 'kana';
    if (mode === 'romaji') {
      answer.placeholder = 'romaji (ex: yoko)';
      if (keypadSection) keypadSection.style.display = 'none';
    } else {
      answer.placeholder = 'kana (ex: よこ)';
      if (keypadSection) keypadSection.style.display = '';
    }
  }


  function normalizeKana(s='') {
    return String(s).trim().replace(/\s+/g,' ').replace(/[~〜・・]/g,'・');
  }
  function normalizeRomaji(s='') {
    return String(s).toLowerCase().replace(/[^a-z]/g,'');
  }

  function applyFilters() {
    const cat = catSelect.value.trim().toLowerCase();
    const q = ($('searchInput').value || '').trim().toLowerCase();
    currentList = DATA.filter(r => {
      const okCat = !cat || (String(r.Categorie||'').toLowerCase() === cat);
      const blob = `${r.Francais} ${r.Kana} ${r.Romaji} ${r.Japonais}`.toLowerCase();
      const okQ = !q || blob.includes(q);
      return okCat && okQ;
    });
    index = 0;
    render();
  }

  function render() {
    if (currentList.length === 0) {
      frTxt.textContent = '—';
      kanaTxt.textContent = '—';
      romajiTxt.textContent = '—';
      jpTxt.textContent = '—';
      counter.textContent = '0 / 0';
      return;
    }
    const row = currentList[index];
    frTxt.textContent = row.Francais;
    kanaTxt.textContent = '•••';
    romajiTxt.textContent = '•••';
    jpTxt.textContent = '•••';
    answer.value = '';
    counter.textContent = `${index + 1} / ${currentList.length}`;
    if (goodCounter) goodCounter.textContent = `✅ ${goodCount}`;
    if (triesCounter) triesCounter.textContent = `🎯 ${totalTries}`;
  }

  function showHint() {
    if (currentList.length === 0) return;
    const row = currentList[index];
    const kana = normalizeKana(row.Kana);
    const hint = kana.split(/[ /]/)[0] || kana.slice(0, 1);
    kanaTxt.textContent = hint + ' …';
  }

  function showSolution() {
    if (currentList.length === 0) return;
    const row = currentList[index];
    kanaTxt.textContent = row.Kana;
    romajiTxt.textContent = row.Romaji;
    jpTxt.textContent = row.Japonais;
  }

  function check() {
    if (currentList.length === 0) return;
    totalTries++;
    if (triesCounter) triesCounter.textContent = `🎯 ${totalTries}`;
    const row = currentList[index];
    const mode = inputMode ? inputMode.value : 'kana';
    let ok = false;
    if (mode === 'romaji') {
      const userR = normalizeRomaji(answer.value);
      const targetR = normalizeRomaji(row.Romaji);
      ok = userR && userR === targetR;
    } else {
      const userK = normalizeKana(answer.value);
      const targetK = normalizeKana(row.Kana);
      ok = userK && userK === targetK;
    }
    // remove previous feedback classes
    answer.classList.remove('answer-correct','answer-wrong');
    if (!ok) {
      romajiTxt.textContent = row.Romaji;
      answer.classList.add('answer-wrong');
      answer.value = '❌ ' + answer.value;
    } else {
      goodAnswers++;
      document.getElementById('goodCounter').textContent = '✅ ' + goodAnswers;
      showSolution();
      answer.classList.add('answer-correct');
      answer.value = '✅ ' + answer.value;
    }
  }

  function next() {
    if (currentList.length === 0) return;
    index = (index + 1) % currentList.length;
    render();
  }
  function prev() {
    if (currentList.length === 0) return;
    index = (index - 1 + currentList.length) % currentList.length;
    render();
  }
  
  function pickJaVoice(preferFemale = true) {
    const voices = window.speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('ja'));
    if (!voices.length) return null;
    // If main page exposes a selected voice name, try to use it
    try {
      if (window.selectedVoiceName) {
        const v = voices.find(v => v.name === window.selectedVoiceName);
        if (v) return v;
      }
    } catch(_) {}
    // Otherwise infer preference from the main voice toggle icon
    let preferFem = preferFemale;
    const toggle = document.getElementById('voiceToggle');
    if (toggle && toggle.textContent) preferFem = toggle.textContent.includes('👩');
    // Heuristic by name
    const femalePat = /(kyoko|mizuki|nanami|sayaka|haruka|hikari|tsukasa|kana|yui|female|woman)/i;
    const malePat   = /(otoya|show|shin|takumi|ren|taichi|ichi|male|man|male voice)/i;
    const fem = voices.find(v => femalePat.test(v.name));
    const mal = voices.find(v => malePat.test(v.name));
    if (preferFem) return fem || voices[0];
    return mal || voices[1] || voices[0];
  }

  function speakJapanese(text) {
    if (!text) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'ja-JP';
    utt.rate = 0.85;
    const v = pickJaVoice(true);
    if (v) utt.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  }

  function randomPick() {
    if (currentList.length === 0) return;
    index = Math.floor(Math.random() * currentList.length);
    render();
  }

  // ===== Clavier kana cliquable =====
  const keypadBase = $('keypadBase');
  const keypadSmall = $('keypadSmall');

  const rows = [
    ['あ','い','う','え','お'],
    ['か','き','く','け','こ'],
    ['さ','し','す','せ','そ'],
    ['た','ち','つ','て','と'],
    ['な','に','ぬ','ね','の'],
    ['は','ひ','ふ','へ','ほ'],
    ['ま','み','む','め','も'],
    ['や','(i)','ゆ','(e)','よ'],
    ['ら','り','る','れ','ろ'],
    ['わ','(i)','(u)','(e)','を'],
    ['ん','ー','・','、','。']
  ];
  const smalls = ['ゃ','ゅ','ょ','ぁ','ぃ','ぅ','ぇ','ぉ','っ'];

  const toDakuten = new Map(Object.entries({
    'か':'が','き':'ぎ','く':'ぐ','け':'げ','こ':'ご',
    'さ':'ざ','し':'じ','す':'ず','せ':'ぜ','そ':'ぞ',
    'た':'だ','ち':'ぢ','つ':'づ','て':'で','と':'ど',
    'は':'ば','ひ':'び','ふ':'ぶ','へ':'べ','ほ':'ぼ',
    'う':'ゔ'
  }));
  const toHandakuten = new Map(Object.entries({
    'は':'ぱ','ひ':'ぴ','ふ':'ぷ','へ':'ぺ','ほ':'ぽ'
  }));
  for (const [k,v] of Array.from(toDakuten.entries())) toDakuten.set(v, k);
  for (const [k,v] of Array.from(toHandakuten.entries())) toHandakuten.set(v, k);

  function insertAtCaret(el, text) {
    el.focus();
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    el.value = before + text + after;
    const pos = start + text.length;
    el.setSelectionRange(pos, pos);
  }
  function backspaceAtCaret(el) {
    el.focus();
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    if (start !== end) {
      const before = el.value.slice(0, start);
      const after = el.value.slice(end);
      el.value = before + after;
      el.setSelectionRange(start, start);
      return;
    }
    if (start === 0) return;
    const before = el.value.slice(0, start - 1);
    const after = el.value.slice(end);
    el.value = before + after;
    const pos = start - 1;
    el.setSelectionRange(pos, pos);
  }
  function transformLastChar(el, map) {
    el.focus();
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? el.value.length;
    if (s !== e) return;
    if (s === 0) return;
    const ch = el.value[s-1];
    if (!map.has(ch)) return;
    const repl = map.get(ch);
    el.value = el.value.slice(0, s-1) + repl + el.value.slice(s);
    el.setSelectionRange(s, s);
  }
  function makeKey(txt) {
    const b = document.createElement('button');
    b.className = 'key';
    b.type = 'button';
    b.textContent = txt;
    b.addEventListener('click', () => {
      if (txt.startsWith('(')) return;
      insertAtCaret(answer, txt);
    });
    return b;
  }
  function renderKeypad() {
    rows.forEach(row => row.forEach(cell => keypadBase.appendChild(makeKey(cell))));
    smalls.forEach(s => keypadSmall.appendChild(makeKey(s)));
    document.querySelectorAll('.keypad-ops .key').forEach(k => {
      const op = k.getAttribute('data-op');
      k.addEventListener('click', () => {
        switch(op) {
          case 'dakuten':       transformLastChar(answer, toDakuten); break;
          case 'handakuten':    transformLastChar(answer, toHandakuten); break;
          case 'space':         insertAtCaret(answer, ' '); break;
          case 'back':          backspaceAtCaret(answer); break;
          case 'clear':         answer.value=''; answer.focus(); break;
          case 'ok':            check(); break;
        }
      });
    });
  }
  renderKeypad();
  // ===== fin clavier kana =====

  // Listeners
  $('searchInput').addEventListener('input', applyFilters);
  catSelect.addEventListener('change', () => { localStorage.setItem('vocab_cat', catSelect.value || ''); applyFilters();
  setModeUI(); });
  $('randBtn').addEventListener('click', randomPick);
  $('showHintBtn').addEventListener('click', showHint);
  $('showSolBtn').addEventListener('click', showSolution);
  $('checkBtn').addEventListener('click', check);
  $('nextBtn').addEventListener('click', next);
  $('prevBtn').addEventListener('click', prev);

  if (resetGoodBtn) resetGoodBtn.addEventListener('click', () => {
    goodCount = 0;
    totalTries = 0;
    correctKeys.clear();
    if (goodCounter) goodCounter.textContent = `✅ ${goodCount}`;
    if (triesCounter) triesCounter.textContent = `🎯 ${totalTries}`;
  });


  const speakBtn = $('speakBtn');
  if (speakBtn) speakBtn.addEventListener('click', () => {
    if (!currentList.length) return;
    const row = currentList[index];
    const text = (row.Japonais && String(row.Japonais).trim()) ? row.Japonais : row.Kana;
    speakJapanese(text);
  });

  if (inputMode) inputMode.addEventListener('change', setModeUI);

  answer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      check();
    }
  });

  applyFilters();
  setModeUI();
}
