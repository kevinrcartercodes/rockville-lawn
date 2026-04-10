// Kevin's Lawn Journal — weather engine + Rate My Lawn (Claude vision)
// Weather: Open-Meteo (no key). Rating: Anthropic Claude via direct-browser-access.

const ROCKVILLE = { lat: 39.0840, lon: -77.1528, tz: 'America/New_York' };
const TARGET_INCHES_WEEK = 1.0;
const WAIT_IF_RAIN_NEXT_48H = 0.25;
const SUMMER_DORMANT_START = { month: 6, day: 15 };
const SUMMER_DORMANT_END   = { month: 9, day: 1 };

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

function iconForMood(mood) {
  return { water: '💦', skip: '☀️', wait: '☔', dormant: '😴', loading: '🌱' }[mood] || '🌱';
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
  const mood = moodFromColor(d.color);
  hero.dataset.mood = mood;
  document.getElementById('heroIcon').textContent = iconForMood(mood);
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

function renderYearGrid(today) {
  const grid = document.getElementById('yearGrid');
  grid.innerHTML = '';
  for (const item of window.LAWN_SCHEDULE) {
    const box = el('div', { class: 'month-box', role: 'button', tabindex: '0' });
    if (item.month === today.month) {
      box.classList.add('current', 'expanded');
    } else if (item.month < today.month) {
      box.classList.add('past');
    }
    box.appendChild(el('div', { class: 'mb-icon', text: item.icon }));
    box.appendChild(el('div', { class: 'mb-name', text: item.name }));
    box.appendChild(el('div', { class: 'mb-short', text: item.short }));
    box.appendChild(el('div', { class: 'mb-detail', text: item.detail }));
    box.addEventListener('click', () => box.classList.toggle('expanded'));
    box.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); box.classList.toggle('expanded'); } });
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

    const item = el('div', { class: 'next-item' });
    if (days < 0) item.classList.add('overdue');
    if (days === 0) item.classList.add('today');

    item.appendChild(el('div', { class: 'next-icon', text: it.icon || '📅' }));

    const body = el('div');
    body.appendChild(el('div', { class: 'next-label', text: it.label }));
    body.appendChild(el('div', { class: 'next-note', text: it.note }));
    item.appendChild(body);

    const when = el('div', { class: 'next-when' });
    if (days === 0) {
      when.appendChild(el('span', { class: 'days-num', text: 'Today' }));
    } else if (days < 0) {
      when.appendChild(el('span', { class: 'days-num', text: String(Math.abs(days)) }));
      when.appendChild(el('span', { class: 'days-unit', text: 'DAYS LATE' }));
    } else {
      when.appendChild(el('span', { class: 'days-num', text: String(days) }));
      when.appendChild(el('span', { class: 'days-unit', text: days === 1 ? 'DAY' : 'DAYS' }));
    }
    item.appendChild(when);

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
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const item = el('div', { class: 'log-item' });
    item.appendChild(el('div', { class: 'log-icon', text: l.icon || '✓' }));
    const mid = el('div');
    mid.appendChild(el('div', { class: 'log-label', text: l.label }));
    mid.appendChild(el('div', { class: 'log-detail', text: l.detail }));
    item.appendChild(mid);
    item.appendChild(el('div', { class: 'log-date', text: dateStr }));
    box.appendChild(item);
  }
}

function renderProducts() {
  const log = window.LAWN_LOG || [];
  const hasScotts = log.some(l => /scotts/i.test(l.label));
  const hasPreEmergent = log.some(l => l.completes === 'pre-emergent');

  const products = [
    { icon: '💊', title: 'Weed & Feed',      sub: hasScotts ? 'Applied Apr 2' : 'Scotts Turf Builder', done: hasScotts },
    { icon: '🎯', title: 'Pre-emergent',     sub: hasPreEmergent ? 'Applied' : 'Dimension · by mid-Apr',  done: hasPreEmergent },
    { icon: '🌱', title: 'Starter fert',     sub: 'Veri-Green 12-18-8 · Sep' },
    { icon: '🌿', title: 'Black Beauty seed', sub: 'Overseed Sep 1 – Oct 1' }
  ];

  const grid = document.getElementById('productGrid');
  grid.innerHTML = '';
  for (const p of products) {
    const card = el('div', { class: 'product' });
    if (p.done) card.classList.add('done');
    card.appendChild(el('div', { class: 'product-icon', text: p.icon }));
    card.appendChild(el('h3', { text: p.title }));
    card.appendChild(el('div', { class: 'product-sub', text: p.sub }));
    grid.appendChild(card);
  }
}

function renderRules() {
  const rules = [
    { icon: '🚫', title: 'Blackout',    body: 'No fertilizer Nov 16 – Mar 1. Last legal day is Nov 15.' },
    { icon: '⚖️', title: 'N cap',       body: '≤ 0.9 lb total N / 1,000 sq ft per application, ≤ 0.7 lb soluble.' },
    { icon: '📊', title: 'Yearly',      body: '≤ 2.5 lb N / 1,000 sq ft/year for enhanced-efficiency products.' },
    { icon: '🐢', title: 'Slow release', body: 'All MD turf fertilizer must be ≥ 20% slow-release nitrogen.' },
    { icon: '🅿️', title: 'No P',        body: 'Phosphorus banned on established lawns. Allowed at seeding/renovation.' },
    { icon: '🌊', title: 'Setbacks',    body: '15 ft from waterways (10 ft with drop/deflector spreader). No app if rain forecast or ground frozen/saturated.' }
  ];
  const grid = document.getElementById('rulesGrid');
  grid.innerHTML = '';
  for (const r of rules) {
    const card = el('div', { class: 'rule', role: 'button', tabindex: '0' });
    card.appendChild(el('div', { class: 'rule-icon', text: r.icon }));
    card.appendChild(el('div', { class: 'rule-title', text: r.title }));
    card.appendChild(el('div', { class: 'rule-detail', text: r.body }));
    card.addEventListener('click', () => card.classList.toggle('expanded'));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.classList.toggle('expanded'); } });
    grid.appendChild(card);
  }
}

/* ───────── Rate My Lawn (the local roast generator) ───────── */

let currentImageB64 = null;

const ROAST = {
  headlines: [
    'Not bad. Not Kevin-level. But not bad.',
    'It\'s a lawn. It\'s there. Kevin\'s is nicer.',
    'Mid. Respectably mid.',
    'Decent effort. Kevin would still mow circles around you.',
    'We\'ve seen worse. Kevin has not.',
    'Acceptable for your zip code. Unfortunately Kevin lives in it.',
    'It\'s a green rectangle. Kevin has a green rectangle too. His is greener.',
    'Nice try. Now go look at Kevin\'s.',
    'Competent. In the way a participation trophy is competent.',
    'Grass: confirmed. Vibes: concerning.',
  ],
  strengths: [
    'There is grass. That\'s a start.',
    'The photo is in focus. Unlike your edging.',
    'You remembered to water at some point this century.',
    'No visible deer carcass. Low bar. Cleared.',
    'The color is somewhere in the green family.',
    'It\'s mowed. Recently? Debatable. But mowed.',
    'You clearly own a lawn mower.',
    'The grass appears to be alive.',
    'No obvious evidence of a Slip \'N Slide incident.',
    'Ground cover exceeds 50%. Barely. But exceeds.',
    'You picked a nice angle. The photo, I mean.',
    'The fence or border visible in frame is pleasant.',
  ],
  issues: [
    'Blade length inconsistency in the upper-left quadrant. Kevin would never.',
    'I\'m seeing subtle crabgrass pressure in the shadows. Possibly imagined. Still concerning.',
    'The edging is giving "weekend warrior" rather than "golf course pro shop."',
    'Turf density is borderline. I\'ve seen thicker shag carpets.',
    'A suspicious yellow tinge. Have you been letting the dog out?',
    'The mowing pattern lacks commitment. Where\'s the stripe game?',
    'I count at least three different shades of green. Pick one.',
    'Possible brown patch. Possible shadow. Kevin wouldn\'t have either.',
    'The grass blade angle suggests you mow when it\'s wet. Shame.',
    'A dandelion. I can see a dandelion. Or a freckle. Either way: concerning.',
    'Thatch layer looks… spirited. Almost performative.',
    'Visible compaction near what I assume is your "path worn by apathy."',
  ],
  recommendations: [
    'Apply Jonathan Green Black Beauty. Like Kevin does. Coincidence? Not a chance.',
    'Mow at 3.5". Not 3. Not 4. 3.5. Kevin measures with a ruler.',
    'Water between 5 and 10 AM only. Kevin sets an alarm.',
    'Core aerate in August. Kevin rents the machine the second it\'s available.',
    'Apply Dimension (dithiopyr) pre-emergent in late March. Kevin already did.',
    'Get a soil test. Kevin has three, from different years, laminated.',
    'Remove all clover. Yes, all of it. Kevin did.',
    'Overseed in September. With Black Beauty. Like Kevin.',
    'Stop whatever you\'re doing. Call Kevin.',
    'Read Kevin\'s Lawn Journal. Study. Weep. Try again.',
    'Never apply weed & feed in summer. Kevin wouldn\'t, and neither should you.',
    'Keep clippings on the lawn. Free nitrogen. Kevin knows.',
  ],
  kevinWins: [
    'Kevin\'s lawn has a measured 97% ground cover. Yours has… hopes.',
    'Kevin mows every 4.2 days on a rolling schedule. You mow when the neighbors complain.',
    'Kevin\'s soil pH is 6.7. Yours is probably fine? Kevin\'s is 6.7.',
    'Kevin knows the name of every species of grass in his lawn. You call them "the green ones."',
    'Kevin\'s edging is so sharp it cleared TSA.',
    'Kevin\'s Google Maps satellite view has a little shimmer. Yours doesn\'t.',
    'Kevin has a soil thermometer. You have a thumb.',
    'Kevin\'s lawn has been peer-reviewed. Twice.',
    'Kevin\'s HOA sends HIM compliments.',
    'Kevin\'s Black Beauty germination rate beat the manufacturer\'s own claims.',
    'Kevin has a dedicated mower for each direction of his stripe pattern.',
    'Kevin\'s lawn produces its own oxygen now. His words.',
    'Kevin\'s lawn was spotted by a passing drone and the drone bowed.',
    'Kevin named each of his 4 fescue cultivars. One is called Steve.',
  ],
  partingShots: [
    'Keep trying. Kevin\'s been doing this for years. You\'ll catch up. Just kidding — you won\'t.',
    'Your lawn is perfectly fine. For someone who is not Kevin.',
    'Maybe ask Kevin to borrow a bag of fertilizer. Just don\'t tell him why.',
    'The good news: you have a lawn. The bad news: Kevin\'s is better.',
    'Remember: every lawn has a purpose. Yours is to make Kevin\'s look better by comparison.',
    'We rated this lawn honestly. We rated Kevin\'s honestly too. His was higher.',
    'Kevin would like you to know he\'s not competitive. He just wins.',
    'Only one person in Rockville can have the best lawn. It\'s Kevin. Sorry.',
    'Your lawn has potential. Kevin\'s lawn has a résumé.',
    'We\'ll put this on the fridge. Under a magnet. Of Kevin\'s lawn.',
  ]
};

function pick(arr, n) {
  const copy = [...arr];
  const out = [];
  const count = Math.min(n, copy.length);
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function generateVerdict() {
  const score = rand(58, 74);
  const grade = score >= 72 ? 'C+'
              : score >= 68 ? 'C'
              : score >= 64 ? 'C-'
              : score >= 60 ? 'D+'
              : 'D';
  return {
    score,
    grade,
    headline: pick(ROAST.headlines, 1)[0],
    strengths: pick(ROAST.strengths, 3),
    issues: pick(ROAST.issues, 4),
    recommendations: pick(ROAST.recommendations, 4),
    kevinWins: pick(ROAST.kevinWins, 4),
    partingShot: pick(ROAST.partingShots, 1)[0]
  };
}

function initRateLawn() {
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
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  currentImageB64 = dataUrl;

  const dz = document.getElementById('dropzone');
  dz.classList.add('has-image');
  dz.innerHTML = '';
  const input = el('input', { type: 'file', accept: 'image/*', id: 'lawnPhoto' });
  dz.appendChild(input);
  const img = el('img');
  img.src = dataUrl;
  dz.appendChild(img);
  bindFileInput();
}

const LOADING_PHRASES = [
  'Consulting the turf panel…',
  'Cross-referencing with Kevin\'s lawn…',
  'Measuring blade angles…',
  'Counting the chlorophyll…',
  'Asking the HOA for comment…',
  'Warming up the roast oven…',
  'Checking soil pH. Kevin\'s is 6.7.',
  'Running photogrammetric density analysis…',
];

async function submitRate() {
  if (!currentImageB64) return;
  const result = document.getElementById('rateResult');
  result.hidden = false;
  result.innerHTML = '';
  const loading = el('div', { class: 'rate-loading', text: pick(LOADING_PHRASES, 1)[0] });
  result.appendChild(loading);

  // Cycle loading phrases while we "analyze"
  const phraseInterval = setInterval(() => {
    loading.textContent = pick(LOADING_PHRASES, 1)[0];
  }, 700);

  // Fake analysis delay: 2–3 seconds
  await new Promise(r => setTimeout(r, rand(2000, 3000)));
  clearInterval(phraseInterval);

  renderRateResult(generateVerdict());
}

function renderRateResult(data) {
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
  metaCol.appendChild(el('div', { class: 'score-grade', text: data.grade }));
  metaCol.appendChild(el('div', { class: 'score-headline', text: data.headline }));
  scoreRow.appendChild(metaCol);
  result.appendChild(scoreRow);

  const addList = (title, listClass, items) => {
    const sec = el('div', { class: 'result-section' });
    sec.appendChild(el('h4', { text: title }));
    const ul = el('ul', { class: 'result-list ' + listClass });
    for (const it of items) ul.appendChild(el('li', { text: it }));
    sec.appendChild(ul);
    result.appendChild(sec);
  };

  addList('✅ What\'s working', '', data.strengths);
  addList('⚠️ What\'s not', 'issues', data.issues);
  addList('→ Do these next', 'recs', data.recommendations);
  addList('🏆 Where Kevin\'s lawn wins', 'wins', data.kevinWins);

  result.appendChild(el('div', { class: 'parting-shot', text: data.partingShot }));

  // Scroll the result into view so the user sees it after the fake analysis.
  setTimeout(() => {
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

/* ───────── Main ───────── */

async function main() {
  const today = todayInRockville();
  renderDate(today);
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
