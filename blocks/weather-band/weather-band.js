import { decorateIcons } from '../../scripts/aem.js';

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const JA_TO_ROMAJI = {
  札幌: 'Sapporo',
  仙台: 'Sendai',
  東京: 'Tokyo',
  横浜: 'Yokohama',
  名古屋: 'Nagoya',
  京都: 'Kyoto',
  大阪: 'Osaka',
  神戸: 'Kobe',
  広島: 'Hiroshima',
  福岡: 'Fukuoka',
  長野: 'Nagano',
  新潟: 'Niigata',
  金沢: 'Kanazawa',
  松本: 'Matsumoto',
  軽井沢: 'Karuizawa',
};

const LOCATION_SUFFIX_PATTERN = /[都道府県市区町村]$/;

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
          <div class="weather-band-location">${location}</div>
          <div class="weather-band-temp-row">
            <span class="weather-band-temp">${Math.round(current.temperature_2m)}&deg;C</span>
          </div>
          <div class="weather-band-condition">${weatherCodeToLabel(current.weather_code)}</div>
        </div>
      </div>
      <div class="weather-band-week">${days}</div>
    </div>`;
}

function stripLocationSuffix(name) {
  const stripped = name.replace(LOCATION_SUFFIX_PATTERN, '');
  return stripped.length > 0 ? stripped : name;
}

async function geocode(query) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=ja&format=json`);
  const data = await res.json();
  return data?.results?.[0] || null;
}

// Tries, in order: 1) location with any address suffix (都/道/府/県/市/区/町/村)
// stripped, 2) the original location as authored, 3) a romaji lookup for a
// handful of major cities. Returns the first successful geocoding result.
async function resolvePlace(location) {
  const stripped = stripLocationSuffix(location);

  let place = await geocode(stripped);
  if (place) return place;

  if (stripped !== location) {
    place = await geocode(location);
    if (place) return place;
  }

  const romaji = JA_TO_ROMAJI[stripped] || JA_TO_ROMAJI[location];
  if (romaji) {
    place = await geocode(romaji);
    if (place) return place;
  }

  return null;
}

function readLocation(block) {
  const authored = block.querySelector('[data-aue-prop="location"]');
  if (authored) return authored.textContent.trim();
  return block.querySelector(':scope > div > div > p')?.textContent?.trim()
    || block.querySelector(':scope > div > div')?.textContent?.trim()
    || '';
}

export default async function decorate(block) {
  const location = readLocation(block);

  block.setAttribute('aria-live', 'polite');
  block.innerHTML = `<p class="weather-band-loading">${location}の天気を取得中…</p>`;

  if (!location) {
    block.innerHTML = '<p class="weather-band-error">天気情報を取得できません</p>';
    return;
  }

  try {
    const place = await resolvePlace(location);
    if (!place) throw new Error('location not found');

    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`);
    const weatherData = await weatherRes.json();

    block.innerHTML = buildWeatherBandMarkup(location, weatherData);
    decorateIcons(block);
  } catch (err) {
    block.innerHTML = `<p class="weather-band-error">${location}の天気情報を取得できません</p>`;
  }
}
