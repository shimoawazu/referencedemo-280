# figma-block-test — Manual Deploy Guide (JCR conversion → AEM import)

This guide covers deploying the composed page `content/figma-block-test.plain.html`
to AEM Author at `content/referencedemo-280/language-masters/en/figma-block-test`.

## Source artifacts

- Page: `content/figma-block-test.plain.html` (7 sections, validated)
- Images: `content/images/figma-block-test/*.png` (9 placeholder images)
- Site: org `shimoawazu` / site `referencedemo-280`, AEM site path `/content/referencedemo-280`

> Note: `content/`, `migration-work/`, and `catalog/` are excluded from git via
> `.git/info/exclude`, so the authored page and images are not committed — they are
> deployed through the JCR pipeline, not version control.

## Sections → blocks

| Section (Figma) | Block | Notes |
|-----------------|-------|-------|
| wknd-hero | `hero` | CTA via `ctalabel`/`ctalink`/`ctastyle` |
| wknd-cards | `cards-feature` | 4 cards, each with dedicated CTA fields |
| wknd-teaser | `teaser-event` | primary/secondary label + link fields |
| wknd-columns | `columns` (core, 2 cols × 1 row) | image + heading/text, no field hints |
| wknd-tabs | `tabs` | 3 tabs: title + content_heading + content_richtext |
| wknd-accordion | `accordion` | 3 items: summary + text |
| wknd-carousel | `carousel` | config row + 2 slides (image + text) |

---

## Step 1 — md2jcr tooling

This repo does not bundle md2jcr; the external workspace-service watcher normally
runs it. To do it manually, use one of:

```bash
# Option A (recommended)
npm install -g @adobe/aem-import-helper

# Option B (helix tooling, per-run)
npx @adobe/helix-html2md ...
npx @adobe/helix-md2jcr ...
```

## Step 2 — plain HTML → Markdown

md2jcr consumes Markdown, so convert the plain HTML first (EDS-standard):

```bash
npx @adobe/helix-html2md content/figma-block-test.plain.html > migration-work/figma-block-test.md
```

This yields the same Markdown format as the existing `migration-work/jcr-content/*.md`.

## Step 3 — Markdown → JCR XML

```bash
npx @adobe/helix-md2jcr migration-work/figma-block-test.md migration-work/jcr-content/figma-block-test.xml
```

Expected JCR structure (same shape as `hero-centered.xml` / `cards-feature.xml`):

```
cq:Page
 └ jcr:content (cq:PageContent)
    └ root
       └ section
          └ block  (one per section, model="hero" / "cards-feature" / ...)
```

Verify no md2jcr errors and that each section emitted correctly:
- hero → `ctalabel` / `ctalink` / `ctastyle` attributes present
- cards-feature → 4 `item_N` (image + text + CTA attributes each)
- teaser-event → `primaryLabel` / `primaryLink` / `secondaryLabel` / `secondaryLink`
- tabs → 3 `item_N` (title + content_heading + content_richtext)
- accordion → 3 `item_N` (summary + text)
- carousel → config + 2 slides
- columns → core columns (col1 = image, col2 = title + text)

## Step 4 — Upload images to DAM

Upload `content/images/figma-block-test/*.png` (9 files) to:

```
/content/dam/referencedemo-280/figma-block-test/
```

Then rewrite image references in the XML from `./images/figma-block-test/xxx.png`
to `/content/dam/referencedemo-280/figma-block-test/xxx.png`.

## Step 5 — Package and import

### Option A — Content package (recommended)

FileVault package layout:

```
jcr_root/content/referencedemo-280/language-masters/en/figma-block-test/.content.xml   ← generated XML
META-INF/vault/filter.xml
```

`filter.xml`:

```xml
<workspaceFilter version="1.0">
  <filter root="/content/referencedemo-280/language-masters/en/figma-block-test"/>
</workspaceFilter>
```

Zip and install via AEM Package Manager (`/crx/packmgr`).

### Option B — aem-import-helper

```bash
aem-import-helper aem upload --target <author-url> \
  --path /content/referencedemo-280/language-masters/en/figma-block-test \
  migration-work/jcr-content/figma-block-test.xml
```

> IMPORTANT: scope the filter root to `.../en/figma-block-test` only — do NOT
> overwrite the existing `.../en` home page.

## Step 6 — Block code deployment

The page's 7 blocks are served by EDS. Ensure the `figma-block-migration` branch is
deployed to `aem.page` / `aem.live`:
- hero, columns, tabs, accordion, carousel — already on `main`
- cards-feature, teaser-event — on `figma-block-migration` (commit `43c3e1b` etc.)

If the branch is unmerged, preview on the branch host below.

## Step 7 — Verify

- Preview: `https://figma-block-migration--referencedemo-280--shimoawazu.aem.page/figma-block-test`
- AEM Author: `https://author-p154442-e620921.adobeaemcloud.com/ui#/editor.html/content/referencedemo-280/language-masters/en/figma-block-test.html`
- Universal Editor: `https://experience.adobe.com/#/aem/editor/canvas/author-p154442-e620921.adobeaemcloud.com/content/referencedemo-280/language-masters/en/figma-block-test.html`

---

## Fastest path: re-run the external watcher

If the workspace-service watcher can be brought back online, Steps 1–3 are automatic:
re-saving `content/figma-block-test.plain.html` regenerates
`migration-work/jcr-content/figma-block-test.xml`. Then only Steps 4–7 remain manual.
