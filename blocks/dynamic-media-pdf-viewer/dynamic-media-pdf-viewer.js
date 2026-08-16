const urnPattern = /(\/adobe\/assets\/urn:[^/]+)/i;

function getPageImageUrl(baseUrl, assetIdPath, page) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('width', '1600');
  params.set('quality', '85');
  params.set('preferwebp', 'true');
  return `${baseUrl}${assetIdPath}?${params.toString()}`;
}

async function fetchPageCount(baseUrl, assetIdPath) {
  try {
    const res = await fetch(`${baseUrl}${assetIdPath}/metadata`);
    if (!res.ok) return null;
    const data = await res.json();
    const metadata = data.metadata || data;
    const candidates = [
      metadata.pageCount,
      metadata['tiff:pageCount'],
      metadata['pdf:pageCount'],
      metadata['dam:pageCount'],
    ];
    const found = candidates.find((value) => typeof value === 'number' && value > 0);
    return found || null;
  } catch (error) {
    return null;
  }
}

/**
 * Decorate the dynamic-media-pdf-viewer block.
 * @param {Element} block The block root element.
 */
export default async function decorate(block) {
  const link = block.querySelector('a[href]');
  if (!link) {
    block.innerHTML = '';
    return;
  }

  const pdfUrl = link.href;
  const match = pdfUrl.match(urnPattern);
  if (!match) {
    console.error('Invalid Dynamic Media PDF URL format');
    block.innerHTML = '';
    return;
  }

  const urlObj = new URL(pdfUrl);
  const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`;
  const assetIdPath = match[1];

  const children = Array.from(block.children);
  const getTextFromChild = (index) => {
    const childDiv = children[index];
    if (!childDiv) return '';
    const p = childDiv.querySelector('p');
    return p?.textContent?.trim() || childDiv.textContent?.trim() || '';
  };

  const title = getTextFromChild(1);
  const startPageRaw = parseInt(getTextFromChild(2), 10);
  const startPage = Number.isFinite(startPageRaw) && startPageRaw > 0 ? startPageRaw : 1;
  const showPageIndicator = getTextFromChild(3)?.toLowerCase() !== 'false';

  let currentPage = startPage;
  let totalPages = null;

  block.innerHTML = '';

  const viewer = document.createElement('div');
  viewer.className = 'dynamic-media-pdf-viewer-container';

  if (title) {
    const titleEl = document.createElement('p');
    titleEl.className = 'dynamic-media-pdf-viewer-title';
    titleEl.textContent = title;
    viewer.append(titleEl);
  }

  const stage = document.createElement('div');
  stage.className = 'dynamic-media-pdf-viewer-stage';

  const prevBtn = document.createElement('button');
  prevBtn.type = 'button';
  prevBtn.className = 'dynamic-media-pdf-viewer-nav dynamic-media-pdf-viewer-prev';
  prevBtn.setAttribute('aria-label', 'Previous page');

  const img = document.createElement('img');
  img.className = 'dynamic-media-pdf-viewer-page';
  img.loading = 'lazy';

  const nextBtn = document.createElement('button');
  nextBtn.type = 'button';
  nextBtn.className = 'dynamic-media-pdf-viewer-nav dynamic-media-pdf-viewer-next';
  nextBtn.setAttribute('aria-label', 'Next page');

  stage.append(prevBtn, img, nextBtn);
  viewer.append(stage);

  const indicator = document.createElement('p');
  indicator.className = 'dynamic-media-pdf-viewer-indicator';
  if (showPageIndicator) viewer.append(indicator);

  block.append(viewer);

  function updateIndicator() {
    if (!showPageIndicator) return;
    indicator.textContent = totalPages ? `${currentPage} / ${totalPages}` : `${currentPage}`;
  }

  function updateNavState() {
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = totalPages != null && currentPage >= totalPages;
  }

  function renderPage(page) {
    img.alt = title ? `${title} - page ${page}` : `PDF page ${page}`;
    img.src = getPageImageUrl(baseUrl, assetIdPath, page);
    updateIndicator();
    updateNavState();
  }

  img.addEventListener('error', () => {
    if (currentPage <= 1) {
      stage.innerHTML = '';
      const errorMsg = document.createElement('p');
      errorMsg.className = 'dynamic-media-pdf-viewer-error';
      errorMsg.textContent = 'Unable to load PDF.';
      stage.append(errorMsg);
      return;
    }
    // Beyond the last page: lock bounds here and step back.
    totalPages = currentPage - 1;
    currentPage = totalPages;
    renderPage(currentPage);
  });

  prevBtn.addEventListener('click', () => {
    if (currentPage <= 1) return;
    currentPage -= 1;
    renderPage(currentPage);
  });

  nextBtn.addEventListener('click', () => {
    if (totalPages != null && currentPage >= totalPages) return;
    currentPage += 1;
    renderPage(currentPage);
  });

  totalPages = await fetchPageCount(baseUrl, assetIdPath);
  renderPage(currentPage);
}
