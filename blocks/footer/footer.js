import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { isAuthorEnvironment } from '../../scripts/scripts.js';

import {
  getLanguage, getSiteName, TAG_ROOT, PATH_PREFIX, fetchLanguageNavigation,
} from '../../scripts/utils.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = String(getMetadata('footer') || '').trim();
  const isAuthor = isAuthorEnvironment();
  const pagePath = window.location.pathname.toLowerCase();
  const isSharedFragmentPage = isAuthor
    && /\/shared-fragment(?:\.html)?\/?$/.test(pagePath);

  // Hide the complete site footer on the shared fragment page. The footer=off
  // metadata value handles published EDS pages; the path check also covers UE.
  if (footerMeta.toLowerCase() === 'off' || isSharedFragmentPage) {
    const footerElement = block.closest('footer');
    if (footerElement) {
      footerElement.remove();
    } else {
      block.remove();
    }
    return;
  }

  const langCode = getLanguage();
  const siteName = await getSiteName();

  // newsroom と about で footer1 を使う（編集画面=author・配信の両方で有効）
  // 編集画面(Universal Editor)では metadata.json が効かず footerMeta が空になるため、
  // パス判定で footer1 を明示する。
  const isFooter1Page = window.location.pathname.includes('/ja/newsroom')
    || window.location.pathname.includes('/ja/about');
  const footerLeaf = isFooter1Page ? 'footer1' : 'footer';

  let footerPath = `/${langCode}/${footerLeaf}`;

  if (isAuthor) {
    footerPath = footerMeta
      ? new URL(footerMeta, window.location).pathname
      : `/content/${siteName}${PATH_PREFIX}/${langCode}/${footerLeaf}`;
  }

  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);

  block.append(footer);
}