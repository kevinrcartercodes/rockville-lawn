// Kevin's Lawn Journal — weather engine + Rate My Lawn (Claude vision)
// Weather: Open-Meteo (no key). Rating: Anthropic Claude via direct-browser-access.

const ROCKVILLE = { lat: 39.0840, lon: -77.1528, tz: 'America/New_York' };
const TARGET_INCHES_WEEK = 1.0;
const WAIT_IF_RAIN_NEXT_48H = 0.25;
const SUMMER_DORMANT_START = { month: 6, day: 15 };
const SUMMER_DORMANT_END   = { month: 9, day: 1 };
const CLAUDE_MODEL = 'claude-haiku-4-5';

/* ───────── Weather ───────── */

async function fetchWeather() {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: ROCKVILLE.lat,
    longitude: ROCKVILLE.lon,
    current: 'temperature_2m,precipitation',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
    hourly: 'soil_temperature_6cm',
    past_days: 7,
    forecast_days: 3,
    timezone: ROCKVILLE.tz,
    temperature_unit: 'fahrenheit',
    precipitation_unit: 'inch'
  });
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Weather ${r.status}`);
  return r.json();
}

function todayInRockville() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: ROCKVILLE.tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = fmt.formatToParts(new Date()).reduce((a, x) => (a[x.type] = x.value, a), {});
  return { iso: `${p.year}-${p.month}-${p.day}`, month: +p.month, day: +p.day, year: +p.year };
}

const asOrd = (m, d) => m * 100 + d;
const inSummerDormancy = t => asOrd(t.month, t.day) >= asOrd(SUMMER_DORMANT_START.month, SUMMER_DORMANT_START.day) && asOrd(t.month, t.day) < asOrd(SUMMER_DORMANT_END.month, SUMMER_DORMANT_END.day);
const inFertilizerBlackout = t => asOrd(t.month, t.day) >= asOrd(11, 16) || asOrd(t.month, t.day) <= asOrd(3, 1);

function moodFromColor(color) {
  return { red: 'water', green: 'skip', blue: 'wait', amber: 'dormant', slate: 'dormant' }[color] || 'loading';
}

function computeDecision(w, today) {
  const dates = w.daily.time;
  const rain = w.daily.precipitation_sum;
  const probs = w.daily.precipitation_probability_max;
  let todayIdx = dates.indexOf(today.iso);
  if (todayIdx === -1) todayIdx = 7;

  const start = Math.max(0, todayIdx - 6);
  const rainfall7d = rain.slice(start, todayIdx + 1).reduce((a, b) => a + (b || 0), 0);
  const rainfallNext48 = rain.slice(todayIdx, todayIdx + 2).reduce((a, b) => a + (b || 0), 0);
  const probNext48 = Math.max(0, ...probs.slice(todayIdx, todayIdx + 2).map(x => x || 0));

  const base = { rainfall7d, rainfallNext48, probNext48 };

  if (inFertilizerBlackout(today) && (today.month >= 12 || today.month <= 2)) {
    return { ...base, color: 'slate', status: 'DORMANT', headline: 'Nothing to do.', sub: 'Lawn is winter-dormant. MD fertilizer blackout is in effect until March 1.' };
  }
  if (inSummerDormancy(today)) {
    if (rainfall7d < 0.25) {
      return { ...base, color: 'amber', status: 'DORMANT · RESCUE OK', headline: 'Let it sleep.', sub: `Only ${rainfall7d.toFixed(2)}" in the last week. If it's been brown 4+ weeks, one deep 0.5" soak keeps the crowns alive. Otherwise leave it alone.` };
    }
    return { ...base, color: 'amber', status: 'SUMMER DORMANT', headline: 'Let it sleep.', sub: `UMD says let cool-season grass go dormant in summer. Past 7 days brought ${rainfall7d.toFixed(2)}" — plenty for the crowns.` };
  }
  if (rainfall7d >= TARGET_INCHES_WEEK) {
    return { ...base, color: 'green', status: 'SKIP', headline: 'No watering today.', sub: `The last 7 days brought ${rainfall7d.toFixed(2)}" — above the 1" weekly target. Rain handled it.` };
  }
  if (rainfallNext48 >= WAIT_IF_RAIN_NEXT_48H || probNext48 >= 70) {
    return { ...base, color: 'blue', status: 'WAIT', headline: 'Wait it out.', sub: `${rainfallNext48.toFixed(2)}" of rain forecast in the next 48 hours (max probability ${probNext48}%). Let the sky water the lawn.` };
  }
  const deficit = Math.max(0, TARGET_INCHES_WEEK - rainfall7d);
  return { ...base, color: 'red', status: 'WATER', headline: 'Water today.', sub: `Only ${rainfall7d.toFixed(2)}" of rain in the last 7 days — short by ${deficit.toFixed(2)}". Put down about ${deficit.toFixed(1)}" deep between 5 and 10 AM. One long soak, not four short ones.`, deficit };
}

/* ───────── Render ───────── */

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

function renderDate(today) {
  const d = new Date(today.year, today.month - 1, today.day);
  document.getElementById('todayDate').textContent =
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
}

function renderHero(d) {
  const hero = document.getElementById('hero');
  hero.dataset.mood = moodFromColor(d.color);
  document.getElementById('heroKicker').textContent = d.status;
  document.getElementById('heroHeadline').textContent = d.headline;
  document.getElementById('heroSub').textContent = d.sub;
}

function renderStats(w, d, today) {
  const stats = document.getElementById('stats');
  stats.innerHTML = '';
  const items = [
    { label: 'Now',        value: Math.round(w.current.temperature_2m), unit: '°F' },
    { label: 'Rain · 7d',  value: d.rainfall7d.toFixed(2),              unit: '″' },
    { label: 'Rain · 48h', value: d.rainfallNext48.toFixed(2),          unit: '″' },
    { label: 'Rain prob',  value: d.probNext48,                         unit: '%' },
  ];

  // Replace "Rain prob" with soil temp during pre-emergent window (Mar–Apr).
  if ((today.month === 3 || today.month === 4) && w.hourly && w.hourly.soil_temperature_6cm && w.hourly.time) {
    const soilTemps = w.hourly.soil_temperature_6cm;
    const times = w.hourly.time;
    const todayStart = times.findIndex(t => t.startsWith(today.iso));
    if (todayStart > 0) {
      const sliceStart = Math.max(0, todayStart - 120);
      const past5d = soilTemps.slice(sliceStart, todayStart).filter(x => x !== null);
      if (past5d.length) {
        const avg = past5d.reduce((a, b) => a + b, 0) / past5d.length;
        items[3] = { label: 'Soil · 2″', value: Math.round(avg), unit: '°F', soilTemp: avg };
      }
    }
  }

  for (const it of items) {
    const cell = el('div', { class: 'stat' });
    cell.appendChild(el('div', { class: 'stat-label', text: it.label }));
    const val = el('div', { class: 'stat-value' });
    val.appendChild(document.createTextNode(String(it.value)));
    val.appendChild(el('span', { class: 'unit', text: it.unit }));
    cell.appendChild(val);
    stats.appendChild(cell);
  }
  return items;
}

function renderAdvisory(items, today) {
  const adv = document.getElementById('advisory');
  const soilItem = items.find(i => i.soilTemp !== undefined);
  const preEmergentDone = window.LAWN_LOG && window.LAWN_LOG.some(l => l.completes === 'pre-emergent');

  if ((today.month === 3 || today.month === 4) && soilItem && soilItem.soilTemp >= 53 && !preEmergentDone) {
    adv.hidden = false;
    adv.innerHTML = '';
    adv.appendChild(el('strong', { text: 'Pre-emergent alert. ' }));
    adv.appendChild(document.createTextNode(
      `Soil at 2″ is averaging ${soilItem.soilTemp.toFixed(0)}°F — crabgrass germinates at sustained 55°F. ` +
      `You haven't logged a pre-emergent yet this year. Put down Dimension (dithiopyr) ASAP. Wait at least 2 weeks after the Apr 2 Scotts application to safely stack herbicides.`
    ));
    return;
  }
  adv.hidden = true;
}

function renderThisMonth(today) {
  const item = window.LAWN_SCHEDULE.find(x => x.month === today.month);
  document.getElementById('thisMonthKicker').textContent = `📅 ${item.name.toUpperCase()}`;
  document.getElementById('thisMonthHeadline').textContent = item.headline;
  document.getElementById('thisMonthDetail').textContent = item.detail;
}

function renderYearGrid(today) {
  const grid = document.getElementById('yearGrid');
  grid.innerHTML = '';
  for (const item of window.LAWN_SCHEDULE) {
    const box = el('div', { class: 'month-box' });
    if (item.month === today.month) box.classList.add('current');
    else if (item.month < today.month) box.classList.add('past');
    box.appendChild(el('div', { class: 'mb-name', text: item.name }));
    box.appendChild(el('div', { class: 'mb-headline', text: item.headline }));
    box.appendChild(el('div', { class: 'mb-detail', text: item.detail }));
    grid.appendChild(box);
  }
}

function renderNextUp(today) {
  const milestones = window.LAWN_MILESTONES || [];
  const log = window.LAWN_LOG || [];
  const completedIds = new Set(log.map(l => l.completes).filter(Boolean));
  const nowDate = new Date(today.year, today.month - 1, today.day);

  const enriched = milestones
    .filter(m => !completedIds.has(m.id))
    .map(m => {
      const [mon, d] = m.date.split('-').map(Number);
      let yr = today.year;
      let target = new Date(yr, mon - 1, d);
      const daysFromNow = Math.round((target - nowDate) / 86400000);
      // If milestone is more than 14 days past, roll to next year.
      if (daysFromNow < -14) {
        yr = today.year + 1;
        target = new Date(yr, mon - 1, d);
      }
      return { ...m, dateObj: target };
    })
    .sort((a, b) => a.dateObj - b.dateObj)
    .slice(0, 3);

  const ul = document.getElementById('nextUp');
  ul.innerHTML = '';
  if (enriched.length === 0) {
    ul.appendChild(el('div', { class: 'next-note', text: 'All caught up. Nothing on the horizon.' }));
    return;
  }
  for (const it of enriched) {
    const days = Math.round((it.dateObj - nowDate) / 86400000);
    const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : days < 0 ? `${Math.abs(days)} days ago · overdue` : days < 31 ? `in ${days} days` : `in ${Math.round(days/7)} weeks`;
    const monthAbbr = it.dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const dayNum = it.dateObj.getDate();

    const item = el('div', { class: 'next-item' });
    if (days < 0) item.classList.add('overdue');

    const dateCol = el('div', { class: 'next-date' });
    dateCol.appendChild(el('div', { class: 'next-month', text: monthAbbr }));
    dateCol.appendChild(el('div', { class: 'next-day', text: String(dayNum) }));
    item.appendChild(dateCol);

    const body = el('div');
    body.appendChild(el('div', { class: 'next-when', text: when }));
    body.appendChild(el('div', { class: 'next-label', text: it.label }));
    body.appendChild(el('div', { class: 'next-note', text: it.note }));
    item.appendChild(body);

    ul.appendChild(item);
  }
}

function renderLog() {
  const box = document.getElementById('log');
  box.innerHTML = '';
  const sorted = [...(window.LAWN_LOG || [])].sort((a, b) => b.date.localeCompare(a.date));
  if (sorted.length === 0) {
    box.appendChild(el('div', { class: 'log-detail', text: 'Nothing logged yet this year.' }));
    return;
  }
  for (const l of sorted) {
    const d = new Date(l.date + 'T00:00:00');
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();
    const item = el('div', { class: 'log-item' });
    item.appendChild(el('div', { class: 'log-date', text: dateStr }));
    const mid = el('div');
    mid.appendChild(el('div', { class: 'log-label', text: l.label }));
    mid.appendChild(el('div', { class: 'log-detail', text: l.detail }));
    item.appendChild(mid);
    item.appendChild(el('div', { class: 'log-check', text: '✓' }));
    box.appendChild(item);
  }
}

function renderProducts() {
  const log = window.LAWN_LOG || [];
  const hasScotts = log.some(l => /scotts/i.test(l.label));
  const hasPreEmergent = log.some(l => l.completes === 'pre-emergent');

  const products = [
    {
      title: 'Scotts Turf Builder Weed & Feed',
      note: 'Nitrogen + broadleaf weed control (2,4-D). Kills dandelion and clover. At Walmart in the 2-pack for ~$40.',
      done: hasScotts
    },
    {
      title: 'Dimension (dithiopyr) pre-emergent',
      note: 'The only common crabgrass pre-emergent with a short-enough residual (~12 weeks) to allow fall overseeding. Apply by mid-April. At Lowe\'s or Home Depot (Hi-Yield Turf & Ornamental Weed and Grass Stopper).',
      done: hasPreEmergent
    },
    {
      title: 'Jonathan Green Veri-Green Starter 12-18-8',
      note: 'Buy in August. Apply at overseeding in September. The 18% phosphate is legal under Maryland\'s new-lawn exemption. Not "Love Your Lawn – Love Your Soil" — that\'s a soil conditioner, not a starter.'
    },
    {
      title: 'Jonathan Green Black Beauty Original',
      note: '100% tall fescue blend formulated for the Mid-Atlantic. Overseed September 1 – October 1 for best germination.'
    }
  ];

  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  for (const p of products) {
    const card = el('div', { class: 'product' });
    if (p.done) card.classList.add('done');
    card.appendChild(el('h3', { text: p.title }));
    card.appendChild(el('p', { text: p.note }));
    grid.appendChild(card);
  }
}

function renderRules() {
  const rules = [
    { title: 'Blackout', body: 'No lawn fertilizer applications Nov 16 – Mar 1. Last legal day is November 15.' },
    { title: 'Per-application cap', body: '≤ 0.9 lb total nitrogen per 1,000 sq ft, of which no more than 0.7 lb may be water-soluble.' },
    { title: 'Annual cap', body: 'Enhanced-efficiency products are capped at 2.5 lb N per 1,000 sq ft per year, with no more than 0.7 lb released in any given month.' },
    { title: 'Slow-release minimum', body: 'All turf fertilizer sold in Maryland must contain at least 20% slow-release nitrogen.' },
    { title: 'Phosphorus', body: 'Banned on established lawns unless a soil test shows deficiency. Permitted at establishment, patching, or renovation (starter fertilizer).' },
    { title: 'Setbacks', body: '15 ft from any waterway (10 ft with a drop spreader or rotary spreader with a deflector shield). Sweep fertilizer off sidewalks and driveways. No application if heavy rain is forecast or the ground is frozen or saturated.' }
  ];
  const ul = document.getElementById('rulesList');
  ul.innerHTML = '';
  for (const r of rules) {
    const li = el('li');
    li.appendChild(el('strong', { text: r.title + '. ' }));
    li.appendChild(document.createTextNode(r.body));
    ul.appendChild(li);
  }
}

/* ───────── Rate My Lawn ───────── */

let currentMode = 'kevin';
let currentImageB64 = null;
let currentMediaType = null;

function updateKeyStatus() {
  const key = localStorage.getItem('anthropic_api_key');
  const dot = document.getElementById('keyDot');
  const txt = document.getElementById('keyStatusText');
  const clear = document.getElementById('keyClearBtn');
  const set = document.getElementById('keySetBtn');
  if (key) {
    dot.classList.add('ok');
    const preview = key.slice(0, 10) + '…' + key.slice(-4);
    txt.textContent = `Key saved · ${preview}`;
    clear.hidden = false;
    set.textContent = 'Change';
  } else {
    dot.classList.remove('ok');
    txt.textContent = 'No API key set';
    clear.hidden = true;
    set.textContent = 'Set API key';
  }
}

function openKeyModal() {
  const modal = document.getElementById('keyModal');
  const input = document.getElementById('apiKeyInput');
  modal.hidden = false;
  input.value = '';
  setTimeout(() => input.focus(), 50);
}

function closeKeyModal() {
  document.getElementById('keyModal').hidden = true;
}

function saveKey() {
  const input = document.getElementById('apiKeyInput');
  const key = input.value.trim();
  if (!key) {
    input.focus();
    return;
  }
  if (!/^sk-ant-/.test(key)) {
    alert('That doesn\'t look like an Anthropic API key. It should start with "sk-ant-".');
    input.focus();
    return;
  }
  localStorage.setItem('anthropic_api_key', key);
  updateKeyStatus();
  closeKeyModal();
  console.log('[lawn] API key saved to localStorage (length: ' + key.length + ')');
  if (currentImageB64) {
    submitRate();
  }
}

function initRateLawn() {
  updateKeyStatus();

  for (const btn of document.querySelectorAll('.mode-btn')) {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      if (currentImageB64) submitRate();
    });
  }

  const dz = document.getElementById('dropzone');
  bindFileInput();

  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragging'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragging'));
  dz.addEventListener('drop', async e => {
    e.preventDefault();
    dz.classList.remove('dragging');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await loadImage(file);
      submitRate();
    }
  });

  document.getElementById('keySetBtn').addEventListener('click', openKeyModal);
  document.getElementById('keyClearBtn').addEventListener('click', () => {
    if (confirm('Clear the stored API key?')) {
      localStorage.removeItem('anthropic_api_key');
      updateKeyStatus();
    }
  });
  document.getElementById('keyCancel').addEventListener('click', closeKeyModal);
  document.getElementById('keySave').addEventListener('click', saveKey);
  document.getElementById('apiKeyInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveKey(); }
    if (e.key === 'Escape') closeKeyModal();
  });
  document.getElementById('keyModal').addEventListener('click', e => {
    if (e.target.id === 'keyModal') closeKeyModal();
  });
}

function bindFileInput() {
  const input = document.getElementById('lawnPhoto');
  if (!input) return;
  input.addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    await loadImage(file);
    submitRate();
  });
}

async function loadImage(file) {
  const base64 = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  currentImageB64 = base64;
  currentMediaType = file.type;

  const dz = document.getElementById('dropzone');
  dz.classList.add('has-image');
  dz.innerHTML = '';
  const input = el('input', { type: 'file', accept: 'image/*', id: 'lawnPhoto' });
  dz.appendChild(input);
  const img = el('img');
  img.src = `data:${file.type};base64,${base64}`;
  dz.appendChild(img);
  bindFileInput();
}

async function submitRate() {
  if (!currentImageB64) {
    console.warn('[lawn] submitRate called with no image loaded');
    return;
  }
  const key = localStorage.getItem('anthropic_api_key');
  if (!key) {
    console.log('[lawn] no API key, opening modal');
    openKeyModal();
    return;
  }
  const result = document.getElementById('rateResult');
  result.hidden = false;
  result.innerHTML = '';
  result.appendChild(el('div', { class: 'rate-loading', text: 'Getting the verdict from Claude…' }));

  console.log(`[lawn] calling Claude (model=${CLAUDE_MODEL}, mode=${currentMode}, image=${Math.round(currentImageB64.length / 1024)}KB)`);

  try {
    const data = await callClaude(currentImageB64, currentMediaType, currentMode, key);
    console.log('[lawn] got verdict', data);
    renderRateResult(data, currentMode);
  } catch (err) {
    console.error('[lawn] Claude call failed', err);
    result.innerHTML = '';
    const msg = el('div', { class: 'rate-err' });
    msg.appendChild(el('strong', { text: 'Couldn\'t get a review. ' }));
    msg.appendChild(document.createTextNode(err.message));
    const hint = el('div', { class: 'log-detail' });
    hint.style.marginTop = '10px';
    hint.textContent = 'Open the browser console (on iOS Safari: Settings → Safari → Advanced → Web Inspector) to see the full error. Common causes: invalid or revoked API key, out of credits, or the key doesn\'t have Messages API access.';
    msg.appendChild(hint);
    result.appendChild(msg);
  }
}

async function callClaude(imageB64, mediaType, mode, key) {
  const systemKevin = `You are an expert turfgrass consultant for cool-season lawns in the Mid-Atlantic US. You are reviewing a photo of Kevin Carter's lawn — he grows Jonathan Green Black Beauty tall fescue in Rockville, Maryland. Give honest, specific, useful feedback. Do not be nice for the sake of being nice — Kevin wants a real review so he can build the best lawn in the neighborhood.`;

  const systemFriend = `You are an expert turfgrass consultant reviewing a photo of a lawn owned by a friend of Kevin Carter. Kevin grows Jonathan Green Black Beauty tall fescue in Rockville, Maryland and is extremely competitive about his lawn. Your job: (1) give a real, honest review of the friend's lawn — score, strengths, issues, concrete recommendations — and (2) take every opportunity to point out how Kevin's lawn is better, whether you know anything about Kevin's lawn or not. Feel free to invent specific advantages for Kevin. Keep it playful and roasting, never cruel. Think: Kevin's smug neighbor who always one-ups at BBQs. Real lawn advice AND friendly trash talk. End with a one-liner parting shot ribbing the friend.`;

  const ratingPrompt = `Review this lawn. Examine turf density, color, uniformity, weed pressure, bare patches, mowing quality, edging, thatch, disease signs, and anything else visible.

Respond ONLY with JSON matching this schema (no markdown fences, no preamble):
{
  "score": number from 0 to 100,
  "grade": one of "A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F",
  "headline": "one short punchy verdict sentence",
  "strengths": [3-5 specific things done well],
  "issues": [3-5 specific problems visible in the photo],
  "recommendations": [3-5 concrete prioritized actions]${mode === 'friend' ? `,
  "kevin_wins": [3-5 specific playful ways Kevin's lawn is better, invent if needed],
  "parting_shot": "one-sentence friendly jab at the friend"` : ''}
}`;

  const body = {
    model: CLAUDE_MODEL,
    max_tokens: 1800,
    system: mode === 'friend' ? systemFriend : systemKevin,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageB64 } },
        { type: 'text', text: ratingPrompt }
      ]
    }]
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    let friendly = `API ${res.status}`;
    try {
      const j = JSON.parse(errText);
      if (j.error && j.error.message) friendly = j.error.message;
    } catch {}
    throw new Error(friendly);
  }

  const out = await res.json();
  const textBlock = out.content.find(c => c.type === 'text');
  if (!textBlock) throw new Error('No text in response.');
  const match = textBlock.text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Claude did not return JSON.');
  return JSON.parse(match[0]);
}

function renderRateResult(data, mode) {
  const result = document.getElementById('rateResult');
  result.innerHTML = '';

  // Score row
  const scoreRow = el('div', { class: 'rate-score' });
  const scoreCol = el('div');
  const scoreNum = el('div', { class: 'score-num' });
  scoreNum.appendChild(document.createTextNode(String(data.score)));
  scoreNum.appendChild(el('span', { class: 'of', text: ' / 100' }));
  scoreCol.appendChild(scoreNum);
  scoreRow.appendChild(scoreCol);

  const metaCol = el('div', { class: 'score-meta' });
  metaCol.appendChild(el('div', { class: 'score-grade', text: data.grade || '' }));
  metaCol.appendChild(el('div', { class: 'score-headline', text: data.headline || '' }));
  scoreRow.appendChild(metaCol);
  result.appendChild(scoreRow);

  const addList = (title, listClass, items) => {
    if (!items || !items.length) return;
    const sec = el('div', { class: 'result-section' });
    sec.appendChild(el('h4', { text: title }));
    const ul = el('ul', { class: 'result-list ' + listClass });
    for (const it of items) ul.appendChild(el('li', { text: String(it) }));
    sec.appendChild(ul);
    result.appendChild(sec);
  };

  addList('✅ What\'s working', '', data.strengths);
  addList('⚠️ What\'s not', 'issues', data.issues);
  addList('→ Do these next', 'recs', data.recommendations);
  if (mode === 'friend' && data.kevin_wins) {
    addList('🏆 Where Kevin\'s lawn wins', 'wins', data.kevin_wins);
  }
  if (mode === 'friend' && data.parting_shot) {
    result.appendChild(el('div', { class: 'parting-shot', text: data.parting_shot }));
  }
}

/* ───────── Main ───────── */

async function main() {
  const today = todayInRockville();
  renderDate(today);
  renderThisMonth(today);
  renderYearGrid(today);
  renderLog();
  renderProducts();
  renderRules();
  initRateLawn();

  try {
    const weather = await fetchWeather();
    const decision = computeDecision(weather, today);
    renderHero(decision);
    const items = renderStats(weather, decision, today);
    renderAdvisory(items, today);
    renderNextUp(today);
  } catch (err) {
    document.getElementById('heroHeadline').textContent = 'Weather unavailable.';
    document.getElementById('heroSub').textContent = err.message;
    renderNextUp(today);
  }
}

main();
