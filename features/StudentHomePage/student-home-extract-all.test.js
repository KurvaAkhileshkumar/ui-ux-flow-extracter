'use strict';

/**
 * Student Home Page — Full Style Extraction
 *
 * Navigates to the student dashboard reference, applies the "Plum, single-tone"
 * (mono-plum) theme via window.applyPalette(), then extracts all sections in a
 * single page session.
 *
 * Outputs for each section:
 *   features/StudentHomePage/<section>/
 *     typography.json  colors.json  layout.json  spacing.json
 *     borders.json     effects.json components.json  screenshot.png
 *
 * Run:
 *   cd dashboard-design-inspector
 *   STUDENT=1 npx playwright test features/StudentHomePage/student-home-extract-all.test.js
 */

const { test } = require('@playwright/test');
const path = require('path');
const { bootPage } = require('../../src/sectionExtractor');
const { writeSectionReports } = require('../../src/node/sectionReporter');
const { STUDENT_URL, applyPlumTheme } = require('./student-theme');

const EXTRACTOR_SCRIPT = path.resolve(__dirname, '../../src/browser/deepExtractor.js');

// ── Section definitions ────────────────────────────────────────────────────────

const SECTIONS = [
  {
    name:     'Student Header',
    folder:   'header',
    strategy: 'heading',
    value:    'Good morning',
  },
  {
    name:     'Student KPI Strip',
    folder:   'kpi-strip',
    strategy: 'selector',
    value:    '.l1-kpiStrip',
  },
  {
    name:     'Insights & Actions',
    folder:   'insights',
    strategy: 'heading',
    value:    'Insights & actions',
  },
  {
    name:     'From Your Faculty',
    folder:   'faculty-feed',
    strategy: 'heading',
    value:    'From your faculty',
  },
  {
    name:     'My Courses',
    folder:   'courses',
    strategy: 'heading',
    value:    'My courses',
  },
  {
    name:     'Knowledge Bytes',
    folder:   'knowledge-bytes',
    strategy: 'heading',
    value:    'Knowledge bytes',
  },
  {
    name:     'Around You',
    folder:   'around-you',
    strategy: 'heading',
    value:    'Around you',
  },
  {
    name:     "Today's Timetable",
    folder:   'timetable',
    strategy: 'heading',
    value:    "Today's timetable",
  },
  {
    name:     'Challenges',
    folder:   'challenges',
    strategy: 'heading',
    value:    'Challenges',
  },
  {
    name:     'Your Momentum',
    folder:   'momentum',
    strategy: 'heading',
    value:    'Your momentum',
  },
  {
    name:     'My Planner',
    folder:   'planner',
    strategy: 'heading',
    value:    'My planner',
  },
  {
    name:     'Play & Learn',
    folder:   'play-learn',
    strategy: 'heading',
    value:    'Play & learn',
  },
  {
    name:     'Student Sidebar',
    folder:   'sidebar',
    strategy: 'selector',
    value:    '.l1-sidebar',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve a section root element using the heading or selector strategy.
 * Returns the element or null.
 */
async function resolveRoot(page, section) {
  return page.evaluateHandle(({ strategy, value }) => {
    if (strategy === 'selector') {
      try { return document.querySelector(value) || null; } catch (_) { return null; }
    }

    // heading strategy — walk up to nearest section/.l1-* container
    const lower = value.toLowerCase();
    for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      if (h.textContent.trim().toLowerCase().includes(lower)) {
        return (
          h.closest('section') ||
          h.closest('[class*="l1-"]') ||
          h.parentElement?.parentElement ||
          null
        );
      }
    }
    return null;
  }, { strategy: section.strategy, value: section.value });
}

// ── Main test ─────────────────────────────────────────────────────────────────

test('Student Home Page — extract all sections (Plum single-tone)', async ({ page }) => {
  // 1. Navigate + apply theme
  await bootPage(page, { url: STUDENT_URL, afterNavigate: applyPlumTheme });

  // 2. Inject deepExtractor (bootPage already did this, but belt-and-suspenders)
  await page.addScriptTag({ path: EXTRACTOR_SCRIPT }).catch(() => {});

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   Student Home Page — Plum Single-tone Extraction    ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const results = [];

  for (const section of SECTIONS) {
    process.stdout.write(`  → "${section.name}"… `);

    const outputDir = path.join(__dirname, section.folder);

    // Resolve element handle
    const handle = await resolveRoot(page, section);
    const el = handle.asElement();

    if (!el) {
      console.log('✗  root not found — skipped');
      results.push({ name: section.name, found: false, elementCount: 0 });
      continue;
    }

    // Extract elements via deepExtractor
    const { elements, elementCount } = await page.evaluate((domEl) => {
      const els = window.__deepExtractor.extractSection(domEl);
      return { elements: els, elementCount: els.length };
    }, el);

    if (elementCount === 0) {
      console.log('✗  0 elements — skipped');
      results.push({ name: section.name, found: true, elementCount: 0 });
      continue;
    }

    console.log(`✓  ${elementCount} elements`);

    // Write 7 split report files
    writeSectionReports(outputDir, section.name, elements);

    // Screenshot the exact element
    try {
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const buf = await el.screenshot({ type: 'png', animations: 'disabled' });
      const fs = require('fs');
      fs.writeFileSync(path.join(outputDir, 'screenshot.png'), buf);
      console.log(`  📸 ${section.folder}/screenshot.png`);
    } catch (e) {
      console.log(`  ⚠ Screenshot failed: ${e.message}`);
    }

    results.push({ name: section.name, found: true, elementCount });
  }

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                    DONE                               ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  const found    = results.filter(r => r.found && r.elementCount > 0);
  const total    = results.reduce((s, r) => s + r.elementCount, 0);
  console.log(`  Sections extracted : ${found.length} / ${results.length}`);
  console.log(`  Total elements     : ${total}`);
  console.log(`  Theme              : Plum, single-tone (mono-plum)\n`);

  results.forEach(r => {
    const status = r.found && r.elementCount > 0 ? '✓' : '✗';
    console.log(`  ${status} "${r.name}"  (${r.elementCount} elements)`);
  });
  console.log('');
});
