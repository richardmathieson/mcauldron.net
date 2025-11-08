(function() {
  const messagesEl = document.getElementById('messages');
  const messageInput = document.getElementById('messageInput');
  const composer = document.getElementById('composer');
  const categoryColumnsEl = document.getElementById('categoryColumns');
  const activeLinksEl = document.getElementById('activeLinks');
  const acceptAllBtn = document.getElementById('acceptAllBtn');
  const dismissAllBtn = document.getElementById('dismissAllBtn');
  const suggestBtn = document.getElementById('suggestBtn');
  const resetDemoBtn = document.getElementById('resetDemoBtn');
  const suggestionsAside = document.querySelector('.suggestions');
  const versionV1Btn = document.getElementById('versionV1Btn');
  const versionV2Btn = document.getElementById('versionV2Btn');

  const ACCEPT_THRESHOLD = 0.8; // 80%
  let currentVersion = 'v1';

  // State
  const activeLinkIds = new Set(); // string IDs
  let currentCategorySuggestions = new Map(); // key -> Suggestion[]

  // Categories and code detection
  const baseCategories = [
    { key: 'awards', label: 'Awards', synonyms: ['award','awards'], codeRegex: /\bAWD-\d{3,6}\b/gi },
    { key: 'offers', label: 'Offers', synonyms: ['offer','offers'], codeRegex: /\bOFF-\d{3,6}\b/gi },
    { key: 'bid-events', label: 'Bid Events', synonyms: ['bid','bids','tender','rfq'], codeRegex: /\bBID-\d{3,6}\b/gi },
    { key: 'teva', label: 'Teva', synonyms: ['teva'], codeRegex: /\bTEVA-\d{3,6}\b/gi },
    { key: 'hikma', label: 'Hikma', synonyms: ['hikma'], codeRegex: /\bHIKMA-\d{3,6}\b/gi },
    { key: 'camber', label: 'Camber', synonyms: ['camber'], codeRegex: /\bCAMBER-\d{3,6}\b/gi },
    { key: 'price-changes', label: 'Price Changes', synonyms: ['price change','price changes','pricing','price'], codeRegex: /\bPRC-\d{4}-\d{1,2}\b/gi },
    { key: 'negotiations', label: 'Negotiations', synonyms: ['negotiation','negotiations','negotiate'], codeRegex: /\bNEG-\d{3,6}\b/gi },
    { key: 'negotiation-items', label: 'Negotiation Items', synonyms: ['negotiation item','line item','item'], codeRegex: /\bNEGI-\d{3,6}\b/gi },
    { key: 'ndc', label: 'NDC', synonyms: ['ndc'], codeRegex: /\b\d{9}\b/gi },
    { key: 'gid', label: 'GID', synonyms: ['gid'], codeRegex: /\bGID-?\d{5}\b/gi },
    { key: 'fid', label: 'FID', synonyms: ['fid'], codeRegex: /\bFID-?\d{4}\b/gi }
  ];

  const v2ExtraCategories = [
    { key: 'sentiment', label: 'Sentiment', synonyms: ['sentiment','tone','mood'], codeRegex: null },
    { key: 'customer', label: 'Customer', synonyms: ['customer','costco','walmart','cvs','walgreens','target','sam\'s club','rite aid'], codeRegex: /\b(COSTCO|WALMART|CVS|WALGREENS|TARGET|SAM\'S CLUB|RITE AID)\b/gi },
    { key: 'intelligence', label: 'Intelligence', synonyms: ['intelligence','insight','analysis','agentic','recommend','prioritise','prioritize'], codeRegex: null }
  ];

  function getCategories() {
    return currentVersion === 'v1' ? baseCategories : baseCategories.concat(v2ExtraCategories);
  }

  // Sample catalog across categories (expanded to include NDC/GID/FID)
  const catalog = [
    { id: 'AWD-1002', title: 'Q4 National Award – Retail', categoryKey: 'awards' },
    { id: 'AWD-1045', title: 'Hospital Award – Midwest Region', categoryKey: 'awards' },
    { id: 'OFF-301', title: 'Introductory Offer – New Accounts', categoryKey: 'offers' },
    { id: 'OFF-466', title: 'Seasonal Offer – Limited Time', categoryKey: 'offers' },
    { id: 'BID-889', title: 'State Bid Event – Q1', categoryKey: 'bid-events' },
    { id: 'BID-932', title: 'National Tender – Cardiovascular', categoryKey: 'bid-events' },
    { id: 'TEVA-112', title: 'Teva Contract Update', categoryKey: 'teva' },
    { id: 'TEVA-203', title: 'Teva Supply Notice', categoryKey: 'teva' },
    { id: 'HIKMA-902', title: 'Hikma Pricing Letter', categoryKey: 'hikma' },
    { id: 'HIKMA-935', title: 'Hikma Supply Constraint', categoryKey: 'hikma' },
    { id: 'CAMBER-455', title: 'Camber Contract Amendment', categoryKey: 'camber' },
    { id: 'CAMBER-470', title: 'Camber New Launch', categoryKey: 'camber' },
    { id: 'PRC-2025-11', title: 'Price Change Bulletin – Nov 2025', categoryKey: 'price-changes' },
    { id: 'PRC-2025-12', title: 'Price Change Bulletin – Dec 2025', categoryKey: 'price-changes' },
    { id: 'NEG-777', title: 'Q1 Portfolio Negotiation', categoryKey: 'negotiations' },
    { id: 'NEG-821', title: 'Vendor Terms Negotiation', categoryKey: 'negotiations' },
    { id: 'NEGI-778', title: 'Line Item – ACE Inhibitors', categoryKey: 'negotiation-items' },
    { id: 'NEGI-905', title: 'Line Item – Oncology', categoryKey: 'negotiation-items' },
    { id: '4712', title: 'Payment webhook signature mismatch on Stripe', categoryKey: 'negotiations' },
    { id: '4788', title: 'API returns 500 on /checkout for iOS clients', categoryKey: 'negotiations' },
    { id: '123456789', title: 'NDC 123456789 – Product A', categoryKey: 'ndc' },
    { id: '987654321', title: 'NDC 987654321 – Product B', categoryKey: 'ndc' },
    { id: '555666777', title: 'NDC 555666777 – Product C', categoryKey: 'ndc' },
    { id: 'GID-12345', title: 'Group ID 12345 – Contract Alpha', categoryKey: 'gid' },
    { id: 'GID-67890', title: 'Group ID 67890 – Contract Beta', categoryKey: 'gid' },
    { id: 'FID-1234', title: 'Facility ID 1234 – NY Warehouse', categoryKey: 'fid' },
    { id: 'FID-5678', title: 'Facility ID 5678 – CA Warehouse', categoryKey: 'fid' },
    // v2 seeded examples
    { id: 'CUST-COSTCO', title: 'Customer: Costco', categoryKey: 'customer' },
    { id: 'CUST-WALMART', title: 'Customer: Walmart', categoryKey: 'customer' },
    { id: 'INTL-INSIGHT-01', title: 'Insight: Auto-triage suggests P1', categoryKey: 'intelligence' }
  ];

  function nowTime() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  function addMessage(author, text) {
    const el = document.createElement('div');
    el.className = 'message';
    el.innerHTML = `
      <div class="message__author">${author}</div>
      <div class="message__time">${nowTime()}</div>
      <div class="message__body"></div>
    `;
    el.querySelector('.message__body').textContent = text;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderActiveLinks() {
    activeLinksEl.innerHTML = '';
    if (activeLinkIds.size === 0) return;
    const items = catalog.concat(dynamicFromCodes(Array.from(activeLinkIds)))
      .filter(it => activeLinkIds.has(String(it.id)));
    items.forEach(it => {
      const el = document.createElement('div');
      el.className = 'linked';
      el.innerHTML = `
        <div class="linked__left">
          <span class="linked__id">#${it.id}</span>
          <span>${it.title}</span>
        </div>
        <div>
          <button class="btn btn--small btn--ghost" aria-label="Unlink #${it.id}">Unlink</button>
        </div>
      `;
      el.querySelector('button').addEventListener('click', () => {
        activeLinkIds.delete(String(it.id));
        renderActiveLinks();
        renderColumns();
        setBulkButtonsState();
      });
      activeLinksEl.appendChild(el);
    });
  }

  function anySuggestionAboveThreshold() {
    for (const arr of currentCategorySuggestions.values()) {
      if (arr.some(s => s.score >= ACCEPT_THRESHOLD)) return true;
    }
    return false;
  }

  function setBulkButtonsState() {
    const anyAbove = anySuggestionAboveThreshold();
    const anySuggestions = Array.from(currentCategorySuggestions.values()).some(arr => arr.length > 0);
    acceptAllBtn.disabled = !anyAbove;
    dismissAllBtn.disabled = !anySuggestions;
    suggestionsAside.classList.remove('is-hidden');
    // Update version switch aria state
    if (versionV1Btn && versionV2Btn) {
      versionV1Btn.setAttribute('aria-pressed', String(currentVersion === 'v1'));
      versionV2Btn.setAttribute('aria-pressed', String(currentVersion === 'v2'));
    }
  }

  function renderColumns() {
    categoryColumnsEl.innerHTML = '';
    const keys = Array.from(currentCategorySuggestions.keys());
    const order = getCategories().map(c => c.key);
    const ordered = order.filter(k => keys.includes(k));
    for (const key of ordered) {
      const cat = getCategories().find(c => c.key === key);
      const list = currentCategorySuggestions.get(key) || [];
      if (!list.length) continue;
      const col = document.createElement('div');
      col.className = 'column';
      col.innerHTML = `<div class="column__title">${cat.label}</div><div class="column__list"></div>`;
      const listEl = col.querySelector('.column__list');
      list.forEach(s => {
        const isLinked = activeLinkIds.has(String(s.id));
        const low = s.score < ACCEPT_THRESHOLD;
        const barStyle = `width:${Math.round(s.score*100)}%;${low ? 'background: linear-gradient(90deg, #ff6b6b, #ff9f43);' : ''}`;
        const item = document.createElement('div');
        const specialClass = (currentVersion === 'v2' && (key === 'sentiment' || key === 'customer' || key === 'intelligence')) ? ` card--${key}` : '';
        let sentimentMod = '';
        if (currentVersion === 'v2' && key === 'sentiment') {
          const sid = String(s.id || '').toUpperCase();
          if (sid.includes('NEG')) sentimentMod = ' card--sentiment--neg';
          else if (sid.includes('POS')) sentimentMod = ' card--sentiment--pos';
          else sentimentMod = ' card--sentiment--neu';
        }
        item.className = `card${specialClass}${sentimentMod}`;
        item.innerHTML = `
          <div class="card__title">#${s.id} · ${s.title}</div>
          <div class="card__meta">
            <span class="pill"><span>Confidence</span><span class="pill__bar"><span class="pill__bar-inner" style="${barStyle}"></span></span></span>
            ${isLinked ? '<span class="badge badge--ok">Linked</span>' : (low ? '<span class="badge badge--warn" title="Below 80%">Not recommended</span>' : '')}
          </div>
          <div class="card__actions">
            ${isLinked ? '<button class="btn btn--small btn--secondary" disabled>Linked</button>' : `<button class=\"btn btn--small ${low ? 'btn--secondary' : 'btn--primary'}\" ${low ? 'title=\"Below 80% confidence\"' : ''}>Link</button>`}
            <button class="btn btn--small btn--ghost">Dismiss</button>
          </div>
        `;
        const buttons = item.querySelectorAll('button');
        if (!isLinked) {
          const linkBtn = buttons[0];
          linkBtn.addEventListener('click', () => {
            activeLinkIds.add(String(s.id));
            renderActiveLinks();
            renderColumns();
            setBulkButtonsState();
          });
        }
        const dismissBtn = buttons[isLinked ? 0 : 1];
        dismissBtn.addEventListener('click', () => {
          removeSuggestionById(s.id);
          renderColumns();
          setBulkButtonsState();
        });
        listEl.appendChild(item);
      });
      // Manual link input per category
      const manual = document.createElement('div');
      manual.className = 'column__manual';
      manual.innerHTML = `
        <input type="text" class="input" placeholder="Link ID to ${cat.label}…" aria-label="Manual link to ${cat.label}">
        <button class="btn btn--small btn--secondary">Link ID</button>
      `;
      const input = manual.querySelector('input');
      const btn = manual.querySelector('button');
      const submit = () => {
        const raw = (input.value || '').trim();
        if (!raw) return;
        const id = String(raw).toUpperCase();
        // If not present in suggestions for this category, inject a suggestion
        const arr = currentCategorySuggestions.get(key) || [];
        if (!arr.some(x => String(x.id) === id)) {
          arr.unshift({ id, title: `${cat.label} ${id}`, score: 1 });
          currentCategorySuggestions.set(key, arr);
        }
        activeLinkIds.add(id);
        input.value = '';
        renderActiveLinks();
        renderColumns();
        setBulkButtonsState();
      };
      btn.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
      col.appendChild(manual);

      categoryColumnsEl.appendChild(col);
    }
  }

  function removeSuggestionById(id) {
    for (const [key, arr] of currentCategorySuggestions.entries()) {
      const filtered = arr.filter(s => String(s.id) !== String(id));
      if (filtered.length !== arr.length) {
        if (filtered.length) currentCategorySuggestions.set(key, filtered); else currentCategorySuggestions.delete(key);
      }
    }
  }

  function normalize(text) { return (text || '').toLowerCase(); }

  function dynamicFromCodes(ids) {
    const results = [];
    for (const id of ids) {
      if (catalog.some(x => String(x.id) === String(id))) continue;
      let categoryKey = null;
      if (/^\d{9}$/.test(id)) categoryKey = 'ndc';
      else if (/^GID-?\d{5}$/i.test(id)) categoryKey = 'gid';
      else if (/^FID-?\d{4}$/i.test(id)) categoryKey = 'fid';
      else if (/^\d{3,8}$/.test(id)) categoryKey = 'negotiations';
      if (!categoryKey) continue;
      const normId = categoryKey === 'ndc' ? id : id.toUpperCase();
      const title = categoryKey === 'ndc' ? `NDC ${id}` : `${categoryKey.toUpperCase()} ${normId.replace(/^[A-Z]+-?/, '')}`;
      results.push({ id: normId.toUpperCase(), title, categoryKey });
    }
    return results;
  }

  function extractExplicitRefs(text) {
    const ids = new Set();
    const rxNum = /#(\d{3,8})\b/g; let m; while ((m = rxNum.exec(text)) !== null) ids.add(m[1]);
    for (const c of getCategories()) { if (!c.codeRegex) continue; const re = new RegExp(c.codeRegex); let mm; while ((mm = re.exec(text)) !== null) ids.add(mm[0].toUpperCase()); }
    return Array.from(ids);
  }

  function scoreCatalogItemAgainst(text, item) {
    const t = normalize(text);
    let score = 0;
    const cat = getCategories().find(c => c.key === item.categoryKey);
    if (cat && cat.synonyms.some(s => t.includes(s))) score += 0.6; // base signal
    for (const word of String(item.title).toLowerCase().split(/[^a-z0-9]+/)) if (word && t.includes(word)) score += 0.05;
    if (/price/.test(t) && item.categoryKey === 'price-changes') score += 0.25;
    if (currentVersion === 'v2') {
      if (item.categoryKey === 'intelligence' && /(insight|triage|priorit)/.test(t)) score = Math.max(score, 0.9);
      if (item.categoryKey === 'customer' && /(costco|walmart|cvs|walgreens|target|rite aid)/.test(t)) score = Math.max(score, 0.9);
    }
    if (cat && cat.synonyms.some(s => t.includes(s))) score = Math.max(score, 0.82);
    return Math.min(1, score);
  }

  function estimateSentimentScore(text) {
    const t = normalize(text);
    const pos = (t.match(/good|great|excellent|improve|success|love|nice|happy/g) || []).length;
    const neg = (t.match(/bad|fail|error|issue|problem|delay|angry|sad|hate/g) || []).length;
    if (pos === 0 && neg === 0) return 0.5;
    const raw = Math.max(0, Math.min(1, 0.5 + (pos - neg) / 10));
    return raw;
  }

  function generateCategorySuggestions(text) {
    const explicitIds = extractExplicitRefs(text).map(String);
    const t = normalize(text);
    const cats = getCategories();
    const byKey = new Map();

    // Explicit: exact matches from catalog
    for (const id of explicitIds) {
      const found = catalog.find(it => String(it.id) === id);
      if (found && !activeLinkIds.has(id)) {
        const arr = byKey.get(found.categoryKey) || []; arr.push({ id: found.id, title: found.title, score: 1 }); byKey.set(found.categoryKey, arr);
      }
    }

    // Explicit: dynamic codes (NDC/GID/FID/etc.)
    for (const dyn of dynamicFromCodes(explicitIds)) {
      if (!activeLinkIds.has(String(dyn.id))) {
        const arr = byKey.get(dyn.categoryKey) || []; arr.push({ id: dyn.id, title: dyn.title, score: 0.95 }); byKey.set(dyn.categoryKey, arr);
      }
    }

    // Category keyword present -> surface multiple items from that category immediately
    for (const c of cats) {
      const hasSyn = c.synonyms.some(s => t.includes(s));
      const hasCodeMention = c.codeRegex ? (t.match(c.codeRegex) || []).length > 0 : false;
      if (hasSyn || hasCodeMention) {
        const base = hasCodeMention ? 0.95 : 0.84;
        const jitter = hasCodeMention ? 0.03 : 0.08;
        const items = catalog.filter(it => it.categoryKey === c.key && !activeLinkIds.has(String(it.id)));
        const ranked = items.map(it => ({ id: it.id, title: it.title, score: Math.min(1, base + Math.random() * jitter) }));
        if (ranked.length) {
          const existing = byKey.get(c.key) || [];
          const seen = new Set(existing.map(s => String(s.id)));
          const merged = existing.concat(ranked.filter(s => !seen.has(String(s.id)))).slice(0, 6);
          byKey.set(c.key, merged);
        }
      }
    }

    // v2 synthetic categories
    if (currentVersion === 'v2') {
      // Sentiment
      if (t.trim()) {
        const s = estimateSentimentScore(t);
        const label = s > 0.6 ? 'Positive' : s < 0.4 ? 'Negative' : 'Neutral';
        const arr = byKey.get('sentiment') || [];
        arr.unshift({ id: `SENT-${label.toUpperCase()}`, title: `Sentiment: ${label}`, score: Math.max(0.82, s) });
        byKey.set('sentiment', arr.slice(0, 3));
      }
      // Customer
      const customerMatches = (t.match(/costco|walmart|cvs|walgreens|target|rite aid/g) || []).map(x => x.toUpperCase());
      if (customerMatches.length) {
        const arr = byKey.get('customer') || [];
        for (const c of Array.from(new Set(customerMatches))) {
          const id = `CUST-${c.replace(/\s+/g, '')}`;
          const title = `Customer: ${c[0]}${c.slice(1).toLowerCase()}`;
          if (!arr.some(x => x.id === id)) arr.push({ id, title, score: 0.9 + Math.random()*0.08 });
        }
        byKey.set('customer', arr.slice(0, 6));
      }
      // Intelligence (simple heuristic)
      if (/(triage|priorit|insight|recommend|auto|agentic)/.test(t)) {
        const arr = byKey.get('intelligence') || [];
        if (!arr.some(x => x.id === 'INTL-INSIGHT-01')) arr.unshift({ id: 'INTL-INSIGHT-01', title: 'Insight: Auto-triage suggests P1', score: 0.92 });
        byKey.set('intelligence', arr.slice(0, 6));
      }
    }

    // General relevance-based fill
    const scored = catalog
      .filter(it => !activeLinkIds.has(String(it.id)))
      .map(it => ({ it, score: scoreCatalogItemAgainst(text, it) }))
      .filter(x => x.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);
    for (const { it, score } of scored) {
      const arr = byKey.get(it.categoryKey) || []; const exists = arr.some(s => String(s.id) === String(it.id));
      if (!exists) { arr.push({ id: it.id, title: it.title, score }); byKey.set(it.categoryKey, arr.slice(0, 6)); }
    }

    return byKey;
  }

  function refreshSuggestionsFor(text) {
    currentCategorySuggestions = generateCategorySuggestions(text);
    renderColumns();
    setBulkButtonsState();
  }

  function acceptAllSuggestions() {
    for (const arr of currentCategorySuggestions.values()) {
      for (const s of arr) if (s.score >= ACCEPT_THRESHOLD) activeLinkIds.add(String(s.id));
    }
    renderActiveLinks();
    renderColumns();
    setBulkButtonsState();
  }

  function dismissAllSuggestions() {
    currentCategorySuggestions.clear();
    renderColumns();
    setBulkButtonsState();
  }

  // Debounce helper
  function debounce(fn, delay) { let t; return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), delay); }; }
  const debouncedSuggest = debounce((text) => {
    if (!text.trim()) { currentCategorySuggestions.clear(); renderColumns(); setBulkButtonsState(); return; }
    refreshSuggestionsFor(text);
  }, 150);

  // Events
  composer.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = (messageInput.value || '').trim();
    if (!text) return;
    addMessage('You', text);
    refreshSuggestionsFor(text);
    messageInput.value = '';
  });

  messageInput.addEventListener('input', () => { debouncedSuggest(messageInput.value || ''); });
  suggestBtn.addEventListener('click', () => { const t = (messageInput.value || '').trim(); if (t) refreshSuggestionsFor(t); });
  acceptAllBtn.addEventListener('click', acceptAllSuggestions);
  dismissAllBtn.addEventListener('click', dismissAllSuggestions);
  resetDemoBtn.addEventListener('click', () => { messagesEl.innerHTML = ''; activeLinkIds.clear(); currentCategorySuggestions.clear(); renderActiveLinks(); renderColumns(); setBulkButtonsState(); });
  if (versionV1Btn && versionV2Btn) {
    versionV1Btn.addEventListener('click', () => { currentVersion = 'v1'; setBulkButtonsState(); const t = (messageInput.value||''); if (t.trim()) refreshSuggestionsFor(t); else { currentCategorySuggestions.clear(); renderColumns(); } });
    versionV2Btn.addEventListener('click', () => { currentVersion = 'v2'; setBulkButtonsState(); const t = (messageInput.value||''); if (t.trim()) refreshSuggestionsFor(t); else { currentCategorySuggestions.clear(); renderColumns(); } });
  }

  // Initial: no suggestions shown
  setBulkButtonsState();
})();


// Password gate logic
(function setupAuth(){
  const gate = document.getElementById('authGate');
  const pwd = document.getElementById('authPassword');
  const btn = document.getElementById('authSubmit');
  const err = document.getElementById('authError');
  const app = document.querySelector('.app');
  if (!gate || !pwd || !btn || !app) return;
  function showApp() {
    gate.hidden = true;
    err && (err.hidden = true);
    app.hidden = false;
  }
  function lockApp() {
    gate.hidden = false;
    app.hidden = true;
  }
  function unlockIfOk() {
    const val = (pwd.value || '').trim();
    if (val === 'clippy') {
      sessionStorage.setItem('ark_auth', 'ok');
      pwd.value = '';
      pwd.blur();
      showApp();
    } else {
      if (err) err.hidden = false;
    }
  }
  if (sessionStorage.getItem('ark_auth') === 'ok') {
    showApp();
  } else {
    lockApp();
  }
  btn.addEventListener('click', unlockIfOk);
  pwd.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); unlockIfOk(); } });
})();
