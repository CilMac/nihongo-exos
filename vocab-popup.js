
// vocab-popup.js — v4 clean
export async function initVocabPopup({ rootId = 'vocabPopupRoot', jsonUrl = './voc_guide_conv.json' } = {}) {
  const root = document.getElementById(rootId);
  if (!root) throw new Error('Racine introuvable pour la popup vocabulaire.');

  // ---------- Styles ----------
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
    .toolbar .spacer { flex:1; }
    select, input[type="text"], button { font-size:1rem; padding:.45rem .7rem; border-radius:10px; border:1px solid #bbb; }
    input[type="text"] { min-width: 240px; }
    #inputMode { min-width:110px; }
    #questionMode, #answerMode { min-width: 140px; }
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

    /* Colors */
    .fr-green { color: #2e7d32; }
    .kana-blue { color: #1565c0; }
    .kanji-red { color: #c62828; }
    .romaji-black { color: #111111; }

    /* Feedback */
    .answer-correct { border: 2px solid #2e7d32 !important; background-color: #e8f5e9; }
    .answer-wrong   { border: 2px solid #c62828 !important; background-color: #ffebee; }

    /* Choices list */
    .choices-section { border:1px solid #eee; border-radius:12px; padding:8px; max-height:40vh; overflow:auto; -webkit-overflow-scrolling: touch; }
    .choices-title { font-weight:600; margin-bottom:6px; }
    #choicesList { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:6px; }
    #choicesList li { border:1px solid #bbb; border-radius:10px; padding:.5rem .7rem; cursor:pointer; }
    #choicesList li:hover { background:#f5f5f5; }
    #choicesList li.selected { outline:2px solid #1565c0; background:#eef5ff; }

    /* Footer */
    .footer { display:flex; align-items:center; justify-content:space-between; gap:.5rem; padding:8px 14px; border-top:1px solid #eee; }
    .counters-left { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
    #goodCounter { padding: .15rem .5rem; border: 1px solid #d6e9d8; border-radius: 999px; background: #f1faf1; }
    #triesCounter { margin-left:.5rem; }

    /* Responsive */
    #vocabBody, .choices-section { -webkit-overflow-scrolling: touch; }
    @media (max-width: 480px) {
      select, input[type="text"], button { font-size:.95rem; padding:.4rem .6rem; }
      .big { font-size:1.1rem; }
      #vocabPopup { max-height: 90vh; }
      .choices-section { max-height: 42vh; }
    }
  `;
  document.head.appendChild(style);

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
          <input id="searchInput" type="text" placeholder="Filtrer (français, kana, romaji, kanji)">
          <button id="randBtn" title="Tirage aléatoire">🎲</button>
          <select id="inputMode" title="Mode de saisie"><option value="kana">kana</option><option value="romaji">romaji</option></select>
          <select id="questionMode" title="Type de question"><option value="fr2ja">FR → JA</option><option value="ja2fr">JA → FR</option></select>
          <select id="answerMode" title="Mode de réponse"><option value="keyboard">Clavier</option><option value="choices">Liste</option></select>
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
                <div class="muted">Ta réponse</div>
                <input id="answerKana" type="text" placeholder="kana (ex: よこ)" autocomplete="off">
              </div>
              <div>
                <div class="muted">Kana</div><div id="kanaTxt" class="big kana-blue">•••</div>
              </div>
              <div>
                <div class="muted">Romaji / Kanji</div>
                <div><span id="romajiTxt" class="romaji-black">•••</span> <span id="jpTxt" class="tag kanji-red">•••</span></div>
              </div>
            </div>
          </div>

          <div class="choices-section" id="choicesPanel" style="display:none;">
            <div class="choices-title">Choisir une réponse</div>
            <ul id="choicesList"></ul>
          </div>

          <div class="footer">
            <div class="counters-left">
              <span class="muted" id="goodCounter">✅ 0</span>
              <span class="muted" id="triesCounter">🎯 0</span>
              <button id="resetGoodBtn" title="Réinitialiser le compteur">♻️</button>
            </div>
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
  const answer = $('answerKana');
  const counter = $('counter');
  const goodCounter = $('goodCounter');
  const triesCounter = $('triesCounter');
  const resetGoodBtn = $('resetGoodBtn');
  const inputMode = $('inputMode');
  const questionMode = $('questionMode');
  const answerMode = $('answerMode');
  const catSelect = $('catSelect');
  const searchInput = $('searchInput');
  const choicesPanel = $('choicesPanel');
  const choicesList = $('choicesList');

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
    // Restore persisted answerMode (default keyboard)
    try {
      const saved = localStorage.getItem('vocab_answerMode');
      answerMode.value = (saved === 'choices' || saved === 'keyboard') ? saved : 'keyboard';
    } catch(_) { answerMode.value = 'keyboard'; }

    const qmode = questionMode?.value || 'fr2ja';
    const mode  = inputMode?.value || 'kana';
    if (qmode === 'ja2fr')      answer.placeholder = 'français (ex: école)';
    else if (mode === 'romaji') answer.placeholder = 'romaji (ex: yoko)';
    else                        answer.placeholder = 'kana (ex: よこ)';

    choicesPanel.style.display = (answerMode.value === 'choices') ? '' : 'none';
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
    answer.value = '';
    answer.classList.remove('answer-correct','answer-wrong');
    counter.textContent = `${index + 1} / ${currentList.length}`;
    if (goodCounter)  goodCounter.textContent  = `✅ ${goodCount}`;
    if (triesCounter) triesCounter.textContent = `🎯 ${totalTries}`;

    if (answerMode.value === 'choices') renderChoices(row);
    else choicesList.innerHTML = '';
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
    if (!currentList.length) return;
    totalTries++;
    if (triesCounter) triesCounter.textContent = `🎯 ${totalTries}`;

    const row = currentList[index];
    const qmode = questionMode?.value || 'fr2ja';
    const mode  = inputMode?.value || 'kana';

    let ok = false;
    if (qmode === 'ja2fr'){
      const user = String(answer.value).trim().toLowerCase();
      const target = String(row.Francais).trim().toLowerCase();
      ok = !!user && user === target;
    } else if (mode === 'romaji'){
      const userR = normalizeRomaji(answer.value);
      const targetR = normalizeRomaji(row.Romaji);
      ok = !!userR && userR === targetR;
    } else {
      const userK = normalizeKana(answer.value);
      const targetK = normalizeKana(row.Kana);
      ok = !!userK && userK === targetK;
    }

    answer.classList.remove('answer-correct','answer-wrong');
    if (!ok){
      romajiTxt.textContent = row.Romaji;
      jpTxt.textContent     = row.Japonais;
      answer.classList.add('answer-wrong');
      if (!String(answer.value).startsWith('❌')) answer.value = '❌ ' + answer.value;
    } else {
      const key = rowKey(row);
      if (!correctKeys.has(key)){
        correctKeys.add(key);
        goodCount++;
        if (goodCounter) goodCounter.textContent = `✅ ${goodCount}`;
      }
      showSolution();
      answer.classList.add('answer-correct');
      if (!String(answer.value).startsWith('✅')) answer.value = '✅ ' + answer.value;
    }
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
  document.getElementById('randBtn').addEventListener('click', randomPick);
  document.getElementById('showHintBtn').addEventListener('click', showHint);
  document.getElementById('showSolBtn').addEventListener('click', showSolution);
  document.getElementById('checkBtn').addEventListener('click', check);
  document.getElementById('nextBtn').addEventListener('click', next);
  document.getElementById('prevBtn').addEventListener('click', prev);
  document.getElementById('speakBtn').addEventListener('click', () => {
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
  if (answerMode)   answerMode.addEventListener('change', () => {
    try { localStorage.setItem('vocab_answerMode', answerMode.value || 'keyboard'); } catch(_) {}
    setModeUI(); render();
  });
  answer.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); check(); } });

  // ---------- Init ----------
  // Restore persisted answerMode (handled in setModeUI) and render
  setModeUI();
  applyFilters();
}
