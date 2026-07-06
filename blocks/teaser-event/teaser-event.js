import {
  div, a, p, h3, picture, img,
} from '../../scripts/dom-helpers.js';

// Maps the normalized key-cell text (the published key-value row's first
// column) to the teaser-event model's field name.
const KEY_MAP = {
  image: 'image',
  imagealt: 'imageAlt',
  title: 'title',
  description: 'description',
  primarylabel: 'primaryLabel',
  primarylink: 'primaryLink',
  secondarylabel: 'secondaryLabel',
  secondarylink: 'secondaryLink',
};

function normalize(s) {
  return (s || '').toLowerCase().replace(/[\s_-]+/g, '');
}

function getCellText(cell) {
  return cell?.textContent?.trim() || '';
}

function getCellLink(cell) {
  const anchor = cell?.querySelector('a');
  return anchor?.getAttribute('href') || getCellText(cell);
}

export default function decorate(block) {
  // Capture the authored image (picture) before reading the rest of the
  // config, since the value cell may just carry a bare <img>/<picture>.
  const authoredPicture = block.querySelector('picture');

  // Map the published key-value rows (key cell -> value cell).
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;
    const field = KEY_MAP[normalize(cells[0].textContent || '')];
    if (!field) return;
    config[field] = cells[1];
  });

  // Read a field's value. In the Universal Editor each value carries a
  // data-aue-prop, so reads are reliable regardless of the key-cell text or
  // field order; on publish (no aue attributes) fall back to the key-value map.
  const read = (name) => {
    const authored = block.querySelector(`[data-aue-prop="${name}"]`);
    if (authored) return authored.textContent.trim();
    return getCellText(config[name]);
  };

  const title = read('title');
  const description = read('description');
  const primaryLabel = read('primaryLabel');
  const secondaryLabel = read('secondaryLabel');

  // The link fields (aem-content) don't carry a stable data-aue-prop, so
  // they're always read from the value cell, like hero/hero-centered's CTA link.
  const primaryLink = getCellLink(config.primaryLink);
  const secondaryLink = getCellLink(config.secondaryLink);

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
