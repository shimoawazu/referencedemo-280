import { readBlockConfig } from '../../scripts/aem.js';
import {
  div, a, p, h3, picture, img,
} from '../../scripts/dom-helpers.js';

export default function decorate(block) {
  // Capture the authored image (picture) before reading config, since
  // readBlockConfig only returns text/link values.
  const authoredPicture = block.querySelector('picture');

  const cfg = readBlockConfig(block);

  const title = cfg.title || '';
  const description = cfg.description || '';
  const primaryLabel = cfg['primary-label'] || '';
  const primaryLink = cfg['primary-link'] || '';
  const secondaryLabel = cfg['secondary-label'] || '';
  const secondaryLink = cfg['secondary-link'] || '';

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
