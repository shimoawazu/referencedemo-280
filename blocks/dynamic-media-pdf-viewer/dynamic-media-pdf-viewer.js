import { isAuthorEnvironment } from '../../scripts/scripts.js';
import { getHostname } from '../../scripts/utils.js';

// Registered against author-p154442-e1620921.adobeaemcloud.com; add the
// aem.page/aem.live domains in the Adobe Developer Console once this block
// is tested on preview/production.
const PDF_EMBED_CLIENT_ID = '094f4e938b0045ea8a6e598165f1c41b';

const urnPattern = /(\/adobe\/assets\/urn:[^/]+)/i;

// The "reference" field only resolves to a plain "/content/dam/..." path for
// non-image assets (no automatic OpenAPI rewrite the way images get one), so
// derive the author/publish and DM OpenAPI delivery origins ourselves.
async function resolveAemOrigins() {
  if (isAuthorEnvironment()) {
    return {
      isAuthor: true,
      lookupOrigin: '',
      deliveryOrigin: `https://${window.location.hostname.replace('author-', 'delivery-')}`,
    };
  }
  const rawHostname = (await getHostname()) || '';
  const hostname = rawHostname.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!hostname) return null;
  return {
    isAuthor: false,
    lookupOrigin: `https://${hostname.replace('author-', 'publish-')}`,
    deliveryOrigin: `https://${hostname.replace('author-', 'delivery-')}`,
  };
}

// Resolve a DAM content path to its DM OpenAPI delivery URL via the asset's
// jcr:uuid (urn:aaid:aem:{uuid}). Dynamic Media with OpenAPI's image
// transform pipeline does not support PDF page rasterization (JPEG/PNG/GIF/
// TIFF only), so this points at the "original" rendition — the Adobe PDF
// Embed API renders and paginates the PDF itself, client-side.
async function resolveOpenApiUrl(damPath) {
  const origins = await resolveAemOrigins();
  if (!origins) return null;
  const { isAuthor, lookupOrigin, deliveryOrigin } = origins;
  try {
    const res = await fetch(`${isAuthor ? '' : lookupOrigin}${damPath}.1.json`, isAuthor ? { credentials: 'include' } : {});
    if (!res.ok) return null;
    const data = await res.json();
    const uuid = data['jcr:uuid'];
    if (!uuid) return null;
    const filename = damPath.split('/').pop();
    return `${deliveryOrigin}/adobe/assets/urn:aaid:aem:${uuid}/original/as/${filename}`;
  } catch (error) {
    return null;
  }
}

function waitForAdobeDCView() {
  return new Promise((resolve) => {
    if (window.AdobeDC) {
      resolve(window.AdobeDC);
      return;
    }
    document.addEventListener('adobe_dc_view_sdk.ready', () => resolve(window.AdobeDC), { once: true });
  });
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

  let urlObj = new URL(link.href);
  let match = urlObj.pathname.match(urnPattern);

  if (!match) {
    // Plain DAM reference (e.g. "/content/dam/.../file.pdf") — resolve it to
    // the DM OpenAPI delivery URL.
    const resolvedUrl = urlObj.pathname.startsWith('/content/dam/')
      ? await resolveOpenApiUrl(urlObj.pathname)
      : null;
    if (!resolvedUrl) {
      console.error('Invalid Dynamic Media PDF URL format');
      block.innerHTML = '';
      return;
    }
    urlObj = new URL(resolvedUrl);
    match = urlObj.pathname.match(urnPattern);
  }

  const pdfUrl = urlObj.href;
  const filename = urlObj.pathname.split('/').pop();

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

  block.innerHTML = '';

  const viewer = document.createElement('div');
  viewer.className = 'dynamic-media-pdf-viewer-container';

  if (title) {
    const titleEl = document.createElement('p');
    titleEl.className = 'dynamic-media-pdf-viewer-title';
    titleEl.textContent = title;
    viewer.append(titleEl);
  }

  const embedHost = document.createElement('div');
  embedHost.className = 'dynamic-media-pdf-viewer-embed';
  embedHost.id = `dynamic-media-pdf-viewer-embed-${Math.random().toString(36).slice(2, 10)}`;
  viewer.append(embedHost);

  block.append(viewer);

  const AdobeDC = await waitForAdobeDCView();
  const adobeDCView = new AdobeDC.View({ clientId: PDF_EMBED_CLIENT_ID, divId: embedHost.id });
  const previewFilePromise = adobeDCView.previewFile({
    content: { location: { url: pdfUrl } },
    metaData: { fileName: filename },
  }, {
    embedMode: 'SIZED_CONTAINER',
    showDownloadPDF: false,
    showPrintPDF: false,
    showAnnotationTools: false,
    showLeftHandPanel: false,
    showZoomControl: false,
  });

  if (startPage > 1) {
    const adobeViewer = await previewFilePromise;
    const apis = await adobeViewer.getAPIs();
    await apis.gotoLocation(startPage).catch(() => {});
  }
}
