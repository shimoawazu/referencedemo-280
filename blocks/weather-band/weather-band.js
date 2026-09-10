import { decorateIcons } from '../../scripts/aem.js';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const LOCATION_COORDS = {
  札幌: { lat: 43.0618, lon: 141.3545 },
  仙台: { lat: 38.2682, lon: 140.8694 },
  長野: { lat: 36.6513, lon: 138.1810 },
  東京: { lat: 35.6762, lon: 139.6503 },
  金沢: { lat: 36.5613, lon: 136.6562 },
  神戸: { lat: 34.6901, lon: 135.1956 },
  熊本: { lat: 32.8032, lon: 130.7079 },
};

function weatherCodeToIcon(code) {
  if (code === 0 || code === 1) return { name: 'sun', extraClass: 'is-sunny' };
  if (code === 45 || code === 48) return { name: 'fog', extraClass: '' };
  if (code === 2 || code === 3) return { name: 'cloud', extraClass: '' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { name: 'cloud-rain', extraClass: '' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { name: 'snowflake', extraClass: '' };
  if (code >= 95 && code <= 99) return { name: 'cloud-lightning', extraClass: '' };
  return { name: 'cloud', extraClass: '' };
}

function weatherCodeToLabel(code) {
  if (code === 0 || code === 1) return '晴れ';
  if (code === 45 || code === 48) return '霧';
  if (code === 2 || code === 3) return '曇り';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return '雨';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '雪';
  if (code >= 95 && code <= 99) return '雷雨';
  return '不明';
}

function weekdayLabel(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return WEEKDAY_LABELS[date.getDay()];
}

function buildLocationSelect(selectedLocation) {
  const options = Object.keys(LOCATION_COORDS)
    .map((name) => `<option value="${name}"${name === selectedLocation ? ' selected' : ''}>${name}</option>`)
    .join('');
  return `<select class="weather-band-location-select" aria-label="地域を選択">${options}</select>`;
}

function buildWeatherBandMarkup(location, weatherData) {
  const { current, daily } = weatherData;
  const todayIcon = weatherCodeToIcon(current.weather_code);

  const days = daily.time.map((dateStr, index) => {
    const isToday = index === 0;
    const label = isToday ? '今日' : weekdayLabel(dateStr);
    const icon = weatherCodeToIcon(daily.weather_code[index]);
    const high = Math.round(daily.temperature_2m_max[index]);
    const low = Math.round(daily.temperature_2m_min[index]);
    return `
      <div class="weather-band-day${isToday ? ' is-today' : ''}">
        <div class="weather-band-day-label">${label}</div>
        <span class="weather-band-day-icon icon icon-${icon.name}${icon.extraClass === 'is-sunny' ? '-accent' : ''} ${icon.extraClass}" aria-hidden="true"></span>
        <div class="weather-band-day-temps">
          <span class="weather-band-day-high">${high}&deg;</span>
          <span class="weather-band-day-low">${low}&deg;</span>
        </div>
      </div>`;
  }).join('');

  return `
    <div>
      <div class="weather-band-today">
        <span class="weather-band-icon icon icon-${todayIcon.name}-accent" aria-hidden="true"></span>
        <div class="weather-band-today-info">
          <div class="weather-band-location">${buildLocationSelect(location)}</div>
          <div class="weather-band-temp-row">
            <span class="weather-band-temp">${Math.round(current.temperature_2m)}&deg;C</span>
          </div>
          <div class="weather-band-condition">${weatherCodeToLabel(current.weather_code)}</div>
        </div>
      </div>
      <div class="weather-band-week">${days}</div>
    </div>`;
}

function buildLoadingMarkup(location) {
  return `
    <div class="weather-band-today">
      <div class="weather-band-today-info">
        <div class="weather-band-location">${buildLocationSelect(location)}</div>
        <p class="weather-band-loading">${location}の天気を取得中…</p>
      </div>
    </div>`;
}

function buildErrorMarkup(location) {
  return `
    <div class="weather-band-today">
      <div class="weather-band-today-info">
        <div class="weather-band-location">${buildLocationSelect(location)}</div>
        <p class="weather-band-error">${location}の天気情報を取得できません</p>
      </div>
    </div>`;
}

function readLocation(block) {
  const authored = block.querySelector('[data-aue-prop="location"]');
  if (authored) return authored.textContent.trim();
  return block.querySelector(':scope > div > div > p')?.textContent?.trim()
    || block.querySelector(':scope > div > div')?.textContent?.trim()
    || '';
}

async function loadAndRenderWeather(block, location) {
  block.innerHTML = buildLoadingMarkup(location);

  const coords = LOCATION_COORDS[location];
  if (!coords) {
    block.innerHTML = buildErrorMarkup(location);
    return;
  }

  try {
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`);
    const weatherData = await weatherRes.json();

    block.innerHTML = buildWeatherBandMarkup(location, weatherData);
    decorateIcons(block);
  } catch (err) {
    block.innerHTML = buildErrorMarkup(location);
  }
}

export default async function decorate(block) {
  const initialLocation = readLocation(block);

  block.setAttribute('aria-live', 'polite');

  // Delegated on the block (not the <select>) so it keeps working across
  // the innerHTML swaps loadAndRenderWeather does on every location change.
  block.addEventListener('change', (event) => {
    if (event.target.matches('.weather-band-location-select')) {
      loadAndRenderWeather(block, event.target.value);
    }
  });

  await loadAndRenderWeather(block, initialLocation);
}
