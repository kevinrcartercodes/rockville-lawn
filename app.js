// Rockville Lawn — live watering recommendation engine.
// Weather: Open-Meteo (no API key). Location: Rockville, MD.

const ROCKVILLE = { lat: 39.0840, lon: -77.1528, tz: 'America/New_York' };

// Watering thresholds — derived from UMD Extension "Watering Lawns" guidance.
const TARGET_INCHES_WEEK = 1.0;
const WAIT_IF_RAIN_NEXT_48H = 0.25;
const SUMMER_DORMANT_START = { month: 6, day: 15 };
const SUMMER_DORMANT_END   = { month: 9, day: 1 };

async function fetchWeather() {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({
    latitude: ROCKVILLE.lat,
    longitude: ROCKVILLE.lon,
    current: 'temperature_2m,precipitation,weather_code',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
    hourly: 'soil_temperature_6cm',
    past_days: 7,
    forecast_days: 3,
    timezone: ROCKVILLE.tz,
    temperature_unit: 'fahrenheit',
    precipitation_unit: 'inch',
    wind_speed_unit: 'mph'
  });
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Weather fetch failed: ${resp.status}`);
  return resp.json();
}

function todayInRockville() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: ROCKVILLE.tz,
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const parts = fmt.formatToParts(new Date()).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return {
    iso: `${parts.year}-${parts.month}-${parts.day}`,
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    year: parseInt(parts.year, 10)
  };
}

function isInSummerDormancy(today) {
  const asNum = (m, d) => m * 100 + d;
  const now = asNum(today.month, today.day);
  const start = asNum(SUMMER_DORMANT_START.month, SUMMER_DORMANT_START.day);
  const end = asNum(SUMMER_DORMANT_END.month, SUMMER_DORMANT_END.day);
  return now >= start && now < end;
}

function isInFertilizerBlackout(today) {
  const asNum = (m, d) => m * 100 + d;
  const now = asNum(today.month, today.day);
  // Nov 16 – Mar 1 (inclusive of Nov 16, through Mar 1)
  return now >= asNum(11, 16) || now <= asNum(3, 1);
}

function computeWateringDecision(weather, today) {
  const dailyDates = weather.daily.time;
  const dailyRain = weather.daily.precipitation_sum;
  const todayIdx = dailyDates.indexOf(today.iso);

  // Rolling 7 days ending today (inclusive).
  const start = Math.max(0, (todayIdx === -1 ? dailyDates.length - 3 : todayIdx) - 6);
  const end = (todayIdx === -1 ? dailyDates.length - 3 : todayIdx) + 1;
  const last7 = dailyRain.slice(start, end);
  const rainfall7d = last7.reduce((a, b) => a + (b || 0), 0);

  // Next 48 hours = remaining portion of today + next 2 days (use today + next 2 entries as approximation).
  const next48start = (todayIdx === -1 ? dailyDates.length - 3 : todayIdx);
  const next48 = dailyRain.slice(next48start, next48start + 2);
  const rainfallNext48 = next48.reduce((a, b) => a + (b || 0), 0);

  // Max rain probability in next 48h
  const probNext48 = Math.max(...weather.daily.precipitation_probability_max.slice(next48start, next48start + 2).map(x => x || 0));

  if (isInFertilizerBlackout(today) && (today.month === 12 || today.month === 1 || today.month === 2)) {
    return {
      status: 'DORMANT',
      headline: 'Lawn is dormant — no watering needed',
      explain: `Tall fescue is winter-dormant. Nothing to water, nothing to fertilize (MD blackout in effect until March 1).`,
      color: 'slate',
      rainfall7d, rainfallNext48, probNext48
    };
  }

  if (isInSummerDormancy(today)) {
    if (rainfall7d < 0.25) {
      return {
        status: 'DORMANT (DEEP RESCUE OK)',
        headline: 'Summer dormancy — deep rescue watering is optional',
        explain: `UMD's default stance is to let tall fescue go dormant June–August. Past 7 days got only ${rainfall7d.toFixed(2)}". If the lawn has been brown for 4+ weeks, a single deep 0.5" soak will keep crowns alive. Otherwise, leave it alone.`,
        color: 'amber',
        rainfall7d, rainfallNext48, probNext48
      };
    }
    return {
      status: 'DORMANT — DO NOT WATER',
      headline: 'Summer dormancy — skip it',
      explain: `UMD says let cool-season grass go dormant in summer. Past 7 days: ${rainfall7d.toFixed(2)}" — plenty to keep crowns alive. Save the water bill.`,
      color: 'amber',
      rainfall7d, rainfallNext48, probNext48
    };
  }

  if (rainfall7d >= TARGET_INCHES_WEEK) {
    return {
      status: 'SKIP',
      headline: 'Rain covered it — no watering needed',
      explain: `The last 7 days brought ${rainfall7d.toFixed(2)}" of rain — above the 1.0" weekly target for tall fescue. Don't water today.`,
      color: 'green',
      rainfall7d, rainfallNext48, probNext48
    };
  }

  if (rainfallNext48 >= WAIT_IF_RAIN_NEXT_48H || probNext48 >= 70) {
    return {
      status: 'WAIT',
      headline: 'Rain incoming — hold off',
      explain: `Forecast shows ${rainfallNext48.toFixed(2)}" of rain in the next 48 hours (max probability ${probNext48}%). Wait for it, then reassess.`,
      color: 'blue',
      rainfall7d, rainfallNext48, probNext48
    };
  }

  const deficit = Math.max(0, TARGET_INCHES_WEEK - rainfall7d);
  return {
    status: 'WATER',
    headline: `Water about ${deficit.toFixed(1)}" deeply, between 5 and 10 AM`,
    explain: `Only ${rainfall7d.toFixed(2)}" of rain in the last 7 days — you're short by ${deficit.toFixed(2)}". Water deeply and infrequently (one ${deficit.toFixed(1)}" soak is better than 4 shallow ones). Morning watering avoids brown patch disease.`,
    color: 'red',
    rainfall7d, rainfallNext48, probNext48
  };
}

function renderWaterCard(decision, weather, today) {
  const card = document.getElementById('waterCard');
  card.classList.remove('loading');
  card.dataset.color = decision.color;

  document.getElementById('waterStatus').textContent = decision.status;
  document.getElementById('waterExplain').textContent = decision.explain;
  document.getElementById('updated').textContent = `updated ${new Date().toLocaleString('en-US', { timeZone: ROCKVILLE.tz, hour: 'numeric', minute: '2-digit' })}`;

  // Weather grid
  const todayTemp = Math.round(weather.current.temperature_2m);
  const grid = document.getElementById('weatherGrid');
  grid.innerHTML = '';

  const cells = [
    { label: 'Now', value: `${todayTemp}°F` },
    { label: 'Rain, last 7 days', value: `${decision.rainfall7d.toFixed(2)}"` },
    { label: 'Rain, next 48 hr', value: `${decision.rainfallNext48.toFixed(2)}"` },
    { label: 'Rain probability', value: `${decision.probNext48}%` },
  ];

  // Pre-emergent advisory (March only) — soil temp at 6cm (~2.4")
  if (today.month === 3 && weather.hourly && weather.hourly.soil_temperature_6cm) {
    const soilTemps = weather.hourly.soil_temperature_6cm.filter(x => x !== null);
    if (soilTemps.length > 0) {
      const recent = soilTemps.slice(-120); // last ~5 days of hourly readings
      const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
      cells.push({ label: 'Soil temp (2")', value: `${avg.toFixed(0)}°F` });
      if (avg >= 53) {
        const advisory = document.createElement('div');
        advisory.className = 'advisory';
        advisory.textContent = `Soil temp is at ${avg.toFixed(0)}°F — apply dithiopyr (Dimension) pre-emergent NOW if you haven't already. Crabgrass germinates at sustained 55°F.`;
        card.appendChild(advisory);
      }
    }
  }

  for (const c of cells) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.innerHTML = `<div class="cell-label">${c.label}</div><div class="cell-value">${c.value}</div>`;
    grid.appendChild(el);
  }
}

function renderThisMonth(today) {
  const item = window.LAWN_SCHEDULE.find(x => x.month === today.month);
  const el = document.getElementById('thisMonth');
  el.innerHTML = `<h3>${item.headline}</h3><p>${item.detail}</p>`;
}

function renderSchedule() {
  const grid = document.getElementById('scheduleGrid');
  const now = todayInRockville();
  for (const item of window.LAWN_SCHEDULE) {
    const div = document.createElement('div');
    div.className = 'month';
    if (item.month === now.month) div.classList.add('current');
    div.innerHTML = `
      <div class="month-name">${item.name}</div>
      <div class="month-headline">${item.headline}</div>
      <div class="month-detail">${item.detail}</div>
    `;
    grid.appendChild(div);
  }
}

function renderNextUp(today) {
  const items = [];
  const order = [];
  for (let i = 0; i < 12; i++) {
    const monthIdx = ((today.month - 1 + i) % 12) + 1;
    order.push(window.LAWN_SCHEDULE.find(x => x.month === monthIdx));
  }

  // Hard-coded upcoming milestones by calendar date
  const upcoming = [];
  const yr = today.year;
  const addIfFuture = (monthDay, label, note) => {
    const [m, d] = monthDay.split('-').map(Number);
    const target = m * 100 + d;
    const now = today.month * 100 + today.day;
    let year = yr;
    if (target < now) year = yr + 1;
    upcoming.push({ date: new Date(year, m - 1, d), label, note });
  };

  addIfFuture('03-25', 'Apply Dimension pre-emergent', 'Watch soil temps — trigger at 53–55°F sustained for 5 days');
  addIfFuture('05-25', 'Deadline for optional spring fertilizer', 'Only if lawn looks thin; skip if already fed last fall');
  addIfFuture('08-20', 'Core-aerate compacted areas', 'Prep for September overseed');
  addIfFuture('09-01', 'Overseed with Black Beauty + Veri-Green starter', 'Primary window Sept 1 – Oct 1');
  addIfFuture('10-15', 'Second fall fertilizer (maintenance)', '~6–8 weeks after the first application');
  addIfFuture('11-15', 'LAST LEGAL fertilizer day', 'MD blackout begins Nov 16');

  upcoming.sort((a, b) => a.date - b.date);
  const next3 = upcoming.slice(0, 3);

  const ul = document.getElementById('nextUp');
  ul.innerHTML = '';
  for (const u of next3) {
    const li = document.createElement('li');
    const dateStr = u.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: u.date.getFullYear() !== today.year ? 'numeric' : undefined });
    const days = Math.ceil((u.date - new Date(today.year, today.month - 1, today.day)) / 86400000);
    const dayLabel = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
    li.innerHTML = `<div class="next-date">${dateStr} <span class="days">· ${dayLabel}</span></div><div class="next-label">${u.label}</div><div class="next-note">${u.note}</div>`;
    ul.appendChild(li);
  }
}

async function main() {
  const today = todayInRockville();
  renderThisMonth(today);
  renderSchedule();
  renderNextUp(today);

  try {
    const weather = await fetchWeather();
    const decision = computeWateringDecision(weather, today);
    renderWaterCard(decision, weather, today);
  } catch (err) {
    const card = document.getElementById('waterCard');
    card.classList.remove('loading');
    card.dataset.color = 'slate';
    document.getElementById('waterStatus').textContent = 'WEATHER UNAVAILABLE';
    document.getElementById('waterExplain').textContent = `Couldn't reach Open-Meteo. ${err.message}`;
  }
}

main();
