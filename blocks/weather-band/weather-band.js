const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const WEATHER_ICON_PATHS = {
  sun: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>',
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>',
  fog: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path><line x1="4" y1="22" x2="20" y2="22"></line>',
  rain: '<line x1="16" y1="13" x2="16" y2="21"></line><line x1="8" y1="13" x2="8" y2="21"></line><line x1="12" y1="15" x2="12" y2="23"></line><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"></path>',
  snow: '<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="8" y1="20" x2="8.01" y2="20"></line><line x1="12" y1="18" x2="12.01" y2="18"></line><line x1="12" y1="22" x2="12.01" y2="22"></line><line x1="16" y1="16" x2="16.01" y2="16"></line><line x1="16" y1="20" x2="16.01" y2="20"></line>',
  lightning: '<path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9"></path><polyline points="13 11 9 17 15 17 11 23"></polyline>',
};

function codeToWeatherInfo(code) {
  if (code === 0 || code === 1) return { icon: 'sun', label: '晴れ', className: 'is-sunny' };
  if (code === 2 || code === 3) return { icon: 'cloud', label: '曇り', className: '' };
  if (code === 45 || code === 48) return { icon: 'fog', label: '霧', className: '' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { icon: 'rain', label: '雨', className: '' };
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return { icon: 'snow', label: '雪', className: '' };
  if (code >= 95 && code <= 99) return { icon: 'lightning', label: '雷雨', className: '' };
  return { icon: 'cloud', label: '不明', className: '' };
}

function weatherIconSvg(icon) {
  const paths = WEATHER_ICON_PATHS[icon] || WEATHER_ICON_PATHS.cloud;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

function weekdayLabel(dateStr) {
  const date = new Date(`${dateStr}T00:00:00`);
  return WEEKDAY_LABELS[date.getDay()];
}

function buildWeatherBandMarkup(location, weatherData) {
  const { current, daily } = weatherData;
  const todayInfo = codeToWeatherInfo(current.weather_code);

  const days = daily.time.map((dateStr, index) => {
    const isToday = index === 0;
    const label = isToday ? '今日' : weekdayLabel(dateStr);
    const dayInfo = codeToWeatherInfo(daily.weather_code[index]);
    const high = Math.round(daily.temperature_2m_max[index]);
    const low = Math.round(daily.temperature_2m_min[index]);
    return `
      <div class="weather-band-day${isToday ? ' is-today' : ''}">
        <div class="weather-band-day-label">${label}</div>
        <i class="weather-band-day-icon ${dayInfo.className}" aria-hidden="true">${weatherIconSvg(dayInfo.icon)}</i>
        <div class="weather-band-day-temps">
          <span class="weather-band-day-high">${high}&deg;</span>
          <span class="weather-band-day-low">${low}&deg;</span>
        </div>
      </div>`;
  }).join('');

  return `
    <div>
      <div class="weather-band-today">
        <i class="weather-band-icon ${todayInfo.className}" aria-hidden="true">${weatherIconSvg(todayInfo.icon)}</i>
        <div class="weather-band-today-info">
          <div class="weather-band-location">${location}</div>
          <div class="weather-band-temp-row">
            <span class="weather-band-temp">${Math.round(current.temperature_2m)}&deg;C</span>
          </div>
          <div class="weather-band-condition">${todayInfo.label}</div>
        </div>
      </div>
      <div class="weather-band-week">${days}</div>
    </div>`;
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
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=ja&format=json`);
    const geoData = await geoRes.json();
    const place = geoData?.results?.[0];
    if (!place) throw new Error('location not found');

    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=7`);
    const weatherData = await weatherRes.json();

    block.innerHTML = buildWeatherBandMarkup(location, weatherData);
  } catch (err) {
    block.innerHTML = `<p class="weather-band-error">${location}の天気情報を取得できません</p>`;
  }
}
