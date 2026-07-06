import {
  div, a, p, h3, picture, img,
} from '../../scripts/dom-helpers.js';

/*
 * Config values are read by their data-aue-prop in the Universal Editor, so the
 * order of the config fields in the dialog does NOT matter there. On publish
 * (no data-aue attributes) we fall back to the positional index, which must
 * match the teaser-event model field order:
 *   0  image
 *   1  imageAlt
 *   2  title
 *   3  description
 *   4  primaryLabel
 *   5  primaryLink
 *   6  secondaryLabel
 *   7  secondaryLink
 */
export default function decorate(block) {
  const childDivs = [...block.querySelectorAll(':scope > div')];

  // Capture the authored image (picture) before reading config.
  const authoredPicture = block.querySelector('picture');

  const readProp = (prop, index) => {
    const authored = block.querySelector(`:scope > div [data-aue-prop="${prop}"]`);
    if (authored) return authored.textContent.trim();
    return childDivs[index]?.querySelector('div')?.textContent?.trim() || '';
  };

  const title = readProp('title', 2);
  const description = readProp('description', 3);
  const primaryLabel = readProp('primaryLabel', 4);
  const secondaryLabel = readProp('secondaryLabel', 6);

  // The link fields (aem-content) render as an <a> with no stable data-aue-prop,
  // so — like hero/hero-centered's CTA link — they're read positionally.
  const primaryLinkAnchor = childDivs[5]?.querySelector('a');
  const primaryLink = primaryLinkAnchor?.getAttribute('href')
    || childDivs[5]?.querySelector('div')?.textContent?.trim()
    || '';
  const secondaryLinkAnchor = childDivs[7]?.querySelector('a');
  const secondaryLink = secondaryLinkAnchor?.getAttribute('href')
    || childDivs[7]?.querySelector('div')?.textContent?.trim()
    || '';

  // --- Media column (left) ---
  const media = div({ class: 'teaser-event-media' });
  if (authoredPicture) {
    media.append(authoredPicture);
  } else {
    media.append(picture(img({ class: 'teaser-event-placeholder', alt: '' })));
  }

  // --- Content column (right) ---
  const content = div({ class: 'teaser-event-content' });
  if (title) content.append(h3({ class: 'teaser-event-title' }, title));
  if (description) content.append(p({ class: 'teaser-event-description' }, description));

  // --- CTA row: secondary (More Details) then primary (RSVP) ---
  if ((primaryLabel && primaryLink) || (secondaryLabel && secondaryLink)) {
    const ctaRow = div({ class: 'teaser-event-cta-row' });
    if (secondaryLabel && secondaryLink) {
      ctaRow.append(
        p(
          { class: 'button-container' },
          a({ href: secondaryLink, class: 'button teaser-event-button-secondary', title: secondaryLabel }, secondaryLabel),
        ),
      );
    }
    if (primaryLabel && primaryLink) {
      ctaRow.append(
        p(
          { class: 'button-container' },
          a({ href: primaryLink, class: 'button teaser-event-button-primary', title: primaryLabel }, primaryLabel),
        ),
      );
    }
    content.append(ctaRow);
  }

  block.textContent = '';
  block.append(media, content);
}
