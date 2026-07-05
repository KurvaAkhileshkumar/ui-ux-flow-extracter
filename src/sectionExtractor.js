'use strict';

const fs   = require('fs');
const path = require('path');
const { writeSectionReports } = require('./node/sectionReporter');

const FACULTY_URL =
  'https://edwisely-ai.github.io/edwisely-faculty-migration-designs/Faculty_Activity_Tracker_v2.1.html';

const EXTRACTOR_SCRIPT = path.resolve(__dirname, 'browser', 'deepExtractor.js');

// ── Page bootstrap ────────────────────────────────────────────────────────────

/**
 * Navigate to `url` (or the default faculty URL), wait for fonts + optional
 * settle time, then inject deepExtractor.js.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object}   [opts]
 * @param {string}   [opts.url]            - override target URL
 * @param {Function} [opts.afterNavigate]  - async(page) hook called after nav/fonts before inject
 */
async function bootPage(page, opts = {}) {
  const url = opts.url || FACULTY_URL;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2000);
  if (typeof opts.afterNavigate === 'function') {
    await opts.afterNavigate(page);
  }
  await page.addScriptTag({ path: EXTRACTOR_SCRIPT });
  const ok = await page.evaluate(() => typeof window.__deepExtractor !== 'undefined');
  if (!ok) throw new Error('deepExtractor.js failed to inject');
}

// ── Section finder ────────────────────────────────────────────────────────────

/**
 * Resolves the root element for a section.
 *
 * Priority:
 *  1. opts.selector  — direct CSS selector
 *  2. opts.heading   — h1/h2/h3 text (case-insensitive contains), walks up to nearest section/.l1-*
 *  3. opts.parentSelector + opts.nthSection — nth .l1-section inside a parent
 */
async function findRoot(page, opts) {
  return page.evaluate(({ selector, heading, parentSelector, nthSection }) => {
    // 1. Direct CSS selector
    if (selector) {
      try {
        const el = document.querySelector(selector);
        if (el) return { found: true, method: 'selector', outerSelector: selector };
      } catch (_) {}
    }

    // 2. Heading text search
    if (heading) {
      const lower = heading.toLowerCase();
      for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
        if (h.textContent.trim().toLowerCase().includes(lower)) {
          const root =
            h.closest('section') ||
            h.closest('[class*="l1-section"]') ||
            h.closest('[class*="l1-"]') ||
            h.parentElement?.parentElement;
          if (root) {
            // Build a unique-enough selector for screenshotting
            const cls = root.classList[0];
            return { found: true, method: 'heading', outerSelector: cls ? `.${cls}` : null };
          }
        }
      }
    }

    // 3. nth section inside parent
    if (parentSelector && nthSection != null) {
      const parent = document.querySelector(parentSelector);
      if (parent) {
        const sections = parent.querySelectorAll(':scope > section');
        const el = sections[nthSection];
        if (el) return { found: true, method: 'nth', outerSelector: null };
      }
    }

    return { found: false };
  }, {
    selector:       opts.selector       ?? null,
    heading:        opts.heading        ?? null,
    parentSelector: opts.parentSelector ?? null,
    nthSection:     opts.nthSection     ?? null,
  });
}

// ── Main extraction ───────────────────────────────────────────────────────────

/**
 * Navigate → find section → extract all elements → write split files → screenshot.
 *
 * @param {import('@playwright/test').Page} page
 * @param {object} opts
 * @param {string}  opts.name              - human-readable section name
 * @param {string}  opts.outputDir         - directory to write output files
 * @param {string}  [opts.url]             - override target URL (default: faculty dashboard)
 * @param {Function}[opts.afterNavigate]   - async(page) hook called after nav, before inject
 * @param {string}  [opts.selector]        - CSS selector for the section root
 * @param {string}  [opts.heading]         - h2/h3 text to find the section
 * @param {string}  [opts.parentSelector]  - parent CSS selector (for nth-section strategy)
 * @param {number}  [opts.nthSection]      - 0-based index of section inside parent
 */
async function extractSection(page, opts) {
  const { name, outputDir } = opts;

  console.log(`\n🔍 Extracting: "${name}"`);

  await bootPage(page, { url: opts.url, afterNavigate: opts.afterNavigate });

  // Find the root element & get a usable screenshot selector
  const rootInfo = await findRoot(page, opts);

  if (!rootInfo.found) {
    console.log(`  ⚠ Section root not found for "${name}". Skipping.`);
    return;
  }

  console.log(`  ✓ Found via ${rootInfo.method}`);

  // Extract all elements using the same resolution strategy
  const { elements, elementCount } = await page.evaluate(
    ({ selector, heading, parentSelector, nthSection }) => {
      let root = null;

      if (selector) {
        try { root = document.querySelector(selector); } catch (_) {}
      }

      if (!root && heading) {
        const lower = heading.toLowerCase();
        for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
          if (h.textContent.trim().toLowerCase().includes(lower)) {
            root =
              h.closest('section') ||
              h.closest('[class*="l1-section"]') ||
              h.closest('[class*="l1-"]') ||
              h.parentElement?.parentElement;
            break;
          }
        }
      }

      if (!root && parentSelector && nthSection != null) {
        const parent = document.querySelector(parentSelector);
        if (parent) {
          const sections = parent.querySelectorAll(':scope > section');
          root = sections[nthSection] || null;
        }
      }

      if (!root) return { elements: [], elementCount: 0 };

      const elements = window.__deepExtractor.extractSection(root);
      return { elements, elementCount: elements.length };
    },
    {
      selector:       opts.selector       ?? null,
      heading:        opts.heading        ?? null,
      parentSelector: opts.parentSelector ?? null,
      nthSection:     opts.nthSection     ?? null,
    }
  );

  console.log(`  ✓ ${elementCount} elements captured`);

  if (elementCount === 0) {
    console.log(`  ⚠ No elements found inside "${name}". Skipping report.`);
    return;
  }

  // Write the 7 split report files
  writeSectionReports(outputDir, name, elements);

  // Screenshot — uses evaluateHandle to get the exact element, not a generic CSS selector
  await takeScreenshot(page, opts, outputDir);
}

// ── Screenshot ────────────────────────────────────────────────────────────────

/**
 * Resolves the EXACT same DOM element used for data extraction and screenshots it.
 * Uses evaluateHandle so Playwright holds a live reference to the element —
 * no risk of matching the wrong sibling via a generic CSS selector.
 */
async function takeScreenshot(page, opts, outputDir) {
  try {
    // Get an ElementHandle pointing at the exact section root
    const handle = await page.evaluateHandle(
      ({ selector, heading, parentSelector, nthSection }) => {
        // 1. Direct CSS selector
        if (selector) {
          try {
            const el = document.querySelector(selector);
            if (el) return el;
          } catch (_) {}
        }

        // 2. Heading text → walk up to the section container
        if (heading) {
          const lower = heading.toLowerCase();
          for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
            if (h.textContent.trim().toLowerCase().includes(lower)) {
              const root =
                h.closest('section') ||
                h.closest('[class*="l1-section"]') ||
                h.closest('[class*="l1-"]') ||
                h.parentElement?.parentElement;
              if (root) return root;
            }
          }
        }

        // 3. nth section inside parent
        if (parentSelector && nthSection != null) {
          const parent = document.querySelector(parentSelector);
          if (parent) {
            const sections = parent.querySelectorAll(':scope > section');
            return sections[nthSection] || null;
          }
        }

        return null;
      },
      {
        selector:       opts.selector       ?? null,
        heading:        opts.heading        ?? null,
        parentSelector: opts.parentSelector ?? null,
        nthSection:     opts.nthSection     ?? null,
      }
    );

    const el = handle.asElement();
    if (!el) {
      console.log('  ⚠ Screenshot skipped: element handle is null');
      return;
    }

    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const buf = await el.screenshot({ type: 'png', animations: 'disabled' });
    fs.writeFileSync(path.join(outputDir, 'screenshot.png'), buf);
    console.log('  📸 screenshot.png saved');
  } catch (err) {
    console.log(`  ⚠ Screenshot failed: ${err.message}`);
  }
}

module.exports = { extractSection, bootPage };
