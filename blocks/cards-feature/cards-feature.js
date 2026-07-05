import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/*
 * Config values are read by their data-aue-prop in the Universal Editor, so the
 * order of the config fields in the dialog does NOT matter there. On publish
 * (no data-aue attributes) we fall back to the positional index, which must
 * match the card-feature model field order:
 *   0  image
 *   1  text        (richtext — heading, body)
 *   2  ctalabel     (CTA button label)
 *   3  ctalink      (CTA button link)
 *   4  ctastyle     (CTA button style)
 */
export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const childDivs = [...row.querySelectorAll(':scope > div')];
    const bodyDiv = childDivs[1];

    const readProp = (prop, index) => {
      const authored = row.querySelector(`:scope > div [data-aue-prop="${prop}"]`);
      if (authored) return authored.textContent.trim();
      return childDivs[index]?.querySelector('div')?.textContent?.trim() || '';
    };

    const ctaLabel = readProp('ctalabel', 2);
    const ctaStyle = readProp('ctastyle', 4) || 'button';
    const ctaLinkDiv = childDivs[3];
    const ctaLinkAnchor = ctaLinkDiv?.querySelector('a');
    const ctaLink = ctaLinkAnchor?.getAttribute('href')
      || ctaLinkDiv?.querySelector('div')?.textContent?.trim()
      || '';

    if (ctaLabel && ctaLink && bodyDiv) {
      const ctaContainer = document.createElement('p');
      ctaContainer.className = `button-container cta-${ctaStyle}`;
      const anchor = document.createElement('a');
      anchor.className = 'button';
      anchor.href = ctaLink;
      anchor.title = ctaLabel;
      anchor.textContent = ctaLabel;
      ctaContainer.appendChild(anchor);
      bodyDiv.appendChild(ctaContainer);
    }

    // Hide the CTA configuration-only divs (label/link/style) — their values
    // have already been consumed above to build the explicit button.
    childDivs.forEach((div, index) => {
      if (index > 1 && div) div.style.display = 'none';
    });

    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.style.display === 'none') return;
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-feature-card-image';
      else div.className = 'cards-feature-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';
  block.append(ul);
}
