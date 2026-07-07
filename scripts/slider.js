import {
  loadCSS,
} from './aem.js';

loadCSS(`${window.hlx.codeBasePath}/styles/slider.css`);

// Handling Next / Previous Arrow Image
function arrowIcon(props) {
  const icon = document.createElement('img');
  icon.src = `${window.hlx.codeBasePath}/icons/${props}.svg`;
  icon.alt = `${props}`;
  icon.loading = 'lazy';
  icon.dataset.iconName = `${props}`;
  return icon;
}

// Handling Anchor Tag
function arrow(props) {
  const p = document.createElement('p');
  p.className = 'button-container';
  const anchor = document.createElement('button');
  anchor.className = `button ${props}`;
  anchor.title = `${props}`;
  anchor.type = 'button';
  anchor.append(arrowIcon(props));
  p.append(anchor);
  return p;
}

export default async function createSlider(block) {
  const nextBtn = 'next';
  const prevBtn = 'prev';
  block.append(arrow(`${nextBtn}`));
  block.append(arrow(`${prevBtn}`));

  // Call function after page load
  const moveRightBtns = document.querySelectorAll(`.${nextBtn}`);
  const moveLeftBtns = document.querySelectorAll(`.${prevBtn}`);
  const itemList = [...document.querySelectorAll('.carousel > ul > li')];
  const observerOptions = {
    rootMargin: '0px',
    threshold: 0.25,
  };

  // Advances to the next/previous slide, wrapping around at either end
  // (last -> first going forward, first -> last going backward) instead of
  // stopping. The target index is computed from the actual scrollLeft (not
  // accumulated) so rounding drift can never desync it from the real slide.
  function moveDirection(carousel, itemWidth, option) {
    const carouselItems = carousel.querySelector('ul');
    const totalItems = carouselItems.children.length || 1;
    const currentIndex = Math.round(carouselItems.scrollLeft / itemWidth);
    const nextIndex = option === '+'
      ? (currentIndex + 1) % totalItems
      : (currentIndex - 1 + totalItems) % totalItems;

    carouselItems.style.transition = 'all 0.5s ease-in-out';
    carouselItems.style.transform = option === '+' ? `translateX(-${itemWidth}px)` : `translateX(${itemWidth}px)`;
    setTimeout(() => {
      carouselItems.style.transition = 'none';
      carouselItems.style.transform = 'translateX(0)';
      carouselItems.scrollLeft = nextIndex * itemWidth;
    }, 500);
  }

  // Button Event Handler
  moveLeftBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const carousel = btn.closest('.carousel-container').querySelector('.carousel');
      const carouselItems = carousel.querySelector('ul');
      const totalItems = carouselItems.children.length || 1;
      const itemWidth = parseInt(carouselItems.scrollWidth / totalItems, 10);
      moveDirection(carousel, itemWidth, '-');
    }, true);
  });

  moveRightBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const carousel = btn.closest('.carousel-container').querySelector('.carousel');
      const carouselItems = carousel.querySelector('ul');
      const totalItems = carouselItems.children.length || 1;
      const itemWidth = parseInt(carouselItems.scrollWidth / totalItems, 10);
      moveDirection(carousel, itemWidth, '+');
    }, true);
  });

  // Observer Callback Function
  const callBack = (entries) => {
    const dir = document.documentElement.dir || 'ltr';

    if (dir === 'rtl') {
      document.querySelector('.next').style.right = 'auto';
      document.querySelector('.prev').style.right = 'auto';
      document.querySelector('.next').style.left = '0';
      document.querySelector('.prev').style.left = '0';
    }

    // Prev/next stay enabled at both ends since the carousel loops.
    entries.forEach((entry) => {
      const {
        target,
      } = entry;
      if (entry.intersectionRatio >= 0.25) {
        target.classList.remove('opacity');
        target.classList.add('active');
        target.style.transition = 'opacity 0.3s ease-in-out';
      } else {
        target.classList.remove('active');
        target.classList.add('opacity');
        target.style.transition = 'opacity 0.3s ease-in-out';
      }
    });
  };

  // Create Observer instance
  const observer = new IntersectionObserver(callBack, observerOptions);

  // Apply observer on each item
  itemList.forEach((item) => {
    observer.observe(item);
  });

  // ── Auto-slide ────────────────────────────────────────────
  // Driven by data attributes set on the carousel block by carousel.js
  //   data-autoplay="true|false"
  //   data-autoplay-interval="3000|5000|7000|10000"
  // Pauses on hover (mouseenter), resumes on mouseleave. Pauses permanently
  // when the user manually navigates with prev/next.
  const enableAutoplay = (block.dataset.autoplay === 'true');
  if (enableAutoplay) {
    const intervalMs = parseInt(block.dataset.autoplayInterval, 10) || 5000;
    const carousel = block.querySelector('.carousel') || block;
    const carouselContainer = block.closest('.carousel-container') || block.parentElement;
    let timer = null;

    const tick = () => {
      const nextBtnEl = (carouselContainer || document).querySelector('.next');
      if (nextBtnEl) nextBtnEl.click();
    };

    const start = () => {
      if (timer) return;
      timer = window.setInterval(tick, intervalMs);
    };
    const stop = () => {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    };

    // Hover pause
    (carouselContainer || carousel).addEventListener('mouseenter', stop);
    (carouselContainer || carousel).addEventListener('mouseleave', start);

    // Stop on manual navigation. tick() above also clicks .next, so only
    // react to genuine user clicks (isTrusted) — otherwise autoplay's own
    // synthetic click would stop the timer after the very first tick.
    const stopIfTrusted = (e) => { if (e.isTrusted) stop(); };
    moveLeftBtns.forEach((btn) => btn.addEventListener('click', stopIfTrusted, true));
    moveRightBtns.forEach((btn) => btn.addEventListener('click', stopIfTrusted, true));

    // Pause when tab not visible to save resources
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else start();
    });

    start();
  }
}
