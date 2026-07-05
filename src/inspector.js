'use strict';

const path = require('path');
const { writeJSON, sanitiseFilename } = require('./node/fileWriter');
const {
  buildTypographyReport,
  buildColorsReport,
  buildSpacingReport,
  buildLayoutReport,
  buildComponentsReport,
  buildDesignTokens,
  buildSummary,
} = require('./node/reportBuilder');
const { buildAllTokens } = require('./node/tokenizer');
const {
  captureFullPage,
  captureSection,
  captureCards,
  captureButtons,
} = require('./node/screenshotter');

// ─── Text mapping helper ──────────────────────────────────────────────────────

/**
 * Returns one entry per unique visible text string in the section, paired with
 * its typographic and colour properties. Container elements whose text is just
 * the concatenation of all their children are excluded via a length cap.
 */
function textMapping(elements) {
  const seen = new Set();
  const results = [];

  for (const el of elements) {
    const text = (el.dom?.text ?? '').trim().replace(/\s+/g, ' ');
    if (!text || text.length > 150) continue; // skip empty or container-blob text

    const t = el.typography;
    if (!t?.fontSize) continue;

    // Deduplicate by text + full style fingerprint
    const key = `${text}|${t.fontFamily}|${t.fontSize}|${t.fontWeight}|${t.textColor}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      text,
      tag:             el.dom?.tag             ?? null,
      color:           t.textColor             ?? null,
      backgroundColor: el.background?.backgroundColor ?? null,
      fontFamily:      t.fontFamily            ?? null,
      fontSize:        t.fontSize              ?? null,
      fontWeight:      t.fontWeight            ?? null,
      lineHeight:      t.lineHeight            ?? null,
    });
  }

  return results;
}

const DEFAULT_URL =
  'https://edwisely-ai.github.io/edwisely-faculty-migration-designs/Faculty_Activity_Tracker_v2.1.html';

class DashboardInspector {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {object} opts
   * @param {string}   [opts.url]        — override the target URL
   * @param {string[]} [opts.sections]   — manually pin section names; null = auto-discover all
   * @param {string}   [opts.outputDir]  — root features directory (e.g. features/HomePage)
   */
  constructor(page, opts = {}) {
    this.page = page;
    this.targetUrl = opts.url || DEFAULT_URL;
    this.sectionOverrides = opts.sections || null; // null → auto-discover
    this.featuresDir = opts.outputDir || path.join(process.cwd(), 'features', 'HomePage');
    this.browserScriptPath = path.resolve(__dirname, 'browser', 'domInspector.js');
  }

  // ─── Navigation ───────────────────────────────────────────────────────────

  async navigate() {
    console.log(`\n🌐 Navigating to:\n   ${this.targetUrl}\n`);

    await this.page.goto(this.targetUrl, {
      waitUntil: 'networkidle',
      timeout: 60_000,
    });

    await this.page.evaluate(() => document.fonts.ready);
    await this.page.waitForTimeout(2000);

    console.log('✓ Page fully loaded.');
  }

  // ─── Script Injection ─────────────────────────────────────────────────────

  async injectInspector() {
    await this.page.addScriptTag({ path: this.browserScriptPath });
    const loaded = await this.page.evaluate(() => typeof window.__inspector !== 'undefined');
    if (!loaded) throw new Error('domInspector.js failed to inject.');
    console.log('✓ Browser inspector injected.');
  }

  // ─── Page Metadata ────────────────────────────────────────────────────────

  async getPageMeta() {
    return this.page.evaluate(() => window.__inspector.getPageMeta());
  }

  // ─── Lightweight Structure Map ────────────────────────────────────────────

  async getPageStructure() {
    console.log('\n🗂  Building DOM structure map...');
    const structure = await this.page.evaluate(() => window.__inspector.getPageStructure());
    console.log(`  ✓ ${structure.length} nodes mapped`);
    return structure;
  }

  // ─── Auto-discover All Sections ───────────────────────────────────────────

  async discoverSections() {
    if (this.sectionOverrides) {
      console.log(`\n📌 Using manual section overrides: ${this.sectionOverrides.join(', ')}`);
      return this.sectionOverrides.map((name) => ({ name, selector: null, method: 'manual' }));
    }

    console.log('\n🔭 Auto-discovering all sections...');
    const sections = await this.page.evaluate(() => window.__inspector.discoverAllSections());

    if (sections.length === 0) {
      console.log('  ⚠ No sections found — will extract full page only.');
    } else {
      console.log(`  ✓ ${sections.length} section(s) discovered:`);
      sections.forEach((s, i) =>
        console.log(`    ${String(i + 1).padStart(2)}. "${s.name}" (${s.method}) @ y=${s.rect?.y ?? '?'}`)
      );
    }

    return sections;
  }

  // ─── Full Page Extraction ─────────────────────────────────────────────────

  async extractFullPage() {
    console.log('\n🔍 Extracting full page (all visible elements)...');

    const result = await this.page.evaluate(() => {
      const elements = window.__inspector.traverseFullPage();
      const components = window.__inspector.detectComponents(document.body);
      return { elementCount: elements.length, elements, components };
    });

    console.log(`  ✓ ${result.elementCount} visible elements captured across full page`);
    return result;
  }

  // ─── Per-Section Extraction ───────────────────────────────────────────────

  /**
   * Extracts a section discovered by discoverAllSections() — uses its CSS selector directly.
   */
  async extractSectionByInfo(sectionInfo) {
    const result = await this.page.evaluate((info) => {
      let el = null;

      // Try the pre-computed selector first
      if (info.selector) {
        try { el = document.querySelector(info.selector); } catch (_) { el = null; }
      }

      // Fall back to the text-search finder
      if (!el) {
        const found = window.__inspector.findSection(info.name);
        el = found ? found.el : null;
      }

      if (!el) return { found: false, elements: [], components: {}, elementCount: 0 };

      const elements = window.__inspector.traverseSection(el, info.name);
      const components = window.__inspector.detectComponents(el);

      return {
        found: true,
        method: info.method,
        sectionSelector: info.selector,
        elementCount: elements.length,
        elements,
        components,
      };
    }, sectionInfo);

    return result;
  }

  /**
   * Extracts a section by plain name string (manual override path).
   */
  async extractSectionByName(name) {
    const result = await this.page.evaluate((n) => {
      const found = window.__inspector.findSection(n);
      if (!found) return { found: false, elements: [], components: {}, elementCount: 0 };

      const { el, method } = found;
      const elements = window.__inspector.traverseSection(el, n);
      const components = window.__inspector.detectComponents(el);

      const sectionSelector = el.id
        ? `#${el.id}`
        : el.className
        ? `.${el.className.toString().split(' ')[0]}`
        : el.tagName.toLowerCase();

      return { found: true, method, sectionSelector, elementCount: elements.length, elements, components };
    }, name);

    return result;
  }

  // ─── Extract All Sections ─────────────────────────────────────────────────

  async extractAllSections(discoveredSections) {
    const sectionResults = {};

    for (const section of discoveredSections) {
      process.stdout.write(`  → "${section.name}"... `);

      const result =
        section.method === 'manual'
          ? await this.extractSectionByName(section.name)
          : await this.extractSectionByInfo(section);

      sectionResults[section.name] = result;

      if (result.found) {
        console.log(`✓ ${result.elementCount} elements`);
      } else {
        console.log(`✗ not found`);
      }
    }

    return sectionResults;
  }

  // ─── Screenshot Pipeline ──────────────────────────────────────────────────

  async takeScreenshots(discoveredSections, sectionResults, fullPageComponents) {
    console.log('\n📸 Screenshot pipeline...');

    await captureFullPage(this.page, this.featuresDir);

    // Screenshot each discovered section → features/<page>/<section>/screenshot.png
    for (const section of discoveredSections) {
      const result = sectionResults[section.name];
      const selector = result?.sectionSelector || section.selector;
      if (result?.found && selector) {
        await captureSection(this.page, selector, section.name, this.featuresDir);
      }
    }

    // Aggregate all cards and buttons
    const allCards = [...(fullPageComponents?.cards || [])];
    const allButtons = [...(fullPageComponents?.buttons || [])];

    for (const result of Object.values(sectionResults)) {
      if (result?.components) {
        allCards.push(...(result.components.cards || []));
        allButtons.push(...(result.components.buttons || []));
      }
    }

    // Deduplicate
    const uniqueCards = [...new Map(allCards.map((c) => [c.selector, c])).values()];
    const uniqueButtons = [...new Map(allButtons.map((b) => [b.selector, b])).values()];

    await captureCards(this.page, uniqueCards.slice(0, 30), this.featuresDir);
    await captureButtons(this.page, uniqueButtons.slice(0, 40), this.featuresDir);
  }

  // ─── Section summary helper ───────────────────────────────────────────────

  _sectionSummary(r) {
    const els = r.elements || [];
    const colorSet = new Set();
    const fontSizeSet = new Set();
    const fontFamilySet = new Set();
    const shadowSet = new Set();
    const radiusSet = new Set();
    const componentCounts = {};

    for (const el of els) {
      const t = el._meta?.componentType || 'element';
      componentCounts[t] = (componentCounts[t] || 0) + 1;
      if (el.typography?.textColor) colorSet.add(el.typography.textColor);
      if (el.background?.backgroundColor) colorSet.add(el.background.backgroundColor);
      if (el.typography?.fontSize) fontSizeSet.add(el.typography.fontSize);
      if (el.typography?.fontFamily) fontFamilySet.add(el.typography.fontFamily);
      if (el.effects?.boxShadow && el.effects.boxShadow !== 'none') shadowSet.add(el.effects.boxShadow);
      if (el.borders?.borderRadius && el.borders.borderRadius !== '0px') radiusSet.add(el.borders.borderRadius);
    }

    return {
      elementCount: els.length,
      uniqueColors: colorSet.size,
      uniqueFontSizes: fontSizeSet.size,
      uniqueFontFamilies: fontFamilySet.size,
      uniqueShadows: shadowSet.size,
      uniqueBorderRadii: radiusSet.size,
      cards: r.components?.cards?.length ?? 0,
      buttons: r.components?.buttons?.length ?? 0,
      badges: r.components?.badges?.length ?? 0,
      componentCounts,
    };
  }

  // ─── Report Generation ────────────────────────────────────────────────────

  writeReports(fullPageResult, sectionResults, structure, pageMeta) {
    console.log('\n📄 Generating JSON reports...');

    const allElements  = fullPageResult.elements || [];
    const fullPageDir  = path.join(this.featuresDir, 'full-page');
    const now          = new Date().toISOString();

    // ── One styles.json per section → features/<page>/<section>/styles.json ──
    const usedFolders  = new Map();
    const sectionIndex = {};

    console.log('\n  Sections:');
    for (const [name, r] of Object.entries(sectionResults)) {
      const base   = sanitiseFilename(name);
      const count  = usedFolders.get(base) || 0;
      usedFolders.set(base, count + 1);
      const folder = count === 0 ? base : `${base}-${count + 1}`;

      const els = r.elements || [];

      writeJSON(path.join(this.featuresDir, folder, 'styles.json'), {
        meta: {
          name,
          folder,
          found:        r.found,
          elementCount: els.length,
          extractedAt:  now,
        },
        texts: r.found ? textMapping(els) : [],
      });

      sectionIndex[name] = {
        folder,
        found:        r.found,
        elementCount: els.length,
        method:       r.method ?? null,
      };
    }

    // ── full-page/index.json — map of all sections ────────────────────────────
    writeJSON(path.join(fullPageDir, 'index.json'), {
      meta: {
        ...pageMeta,
        extractedAt:           now,
        totalFullPageElements: allElements.length,
        totalSections:         Object.keys(sectionResults).length,
      },
      sections: sectionIndex,
    });

    // ── full-page/structure.json — lightweight DOM tree ───────────────────────
    writeJSON(path.join(fullPageDir, 'structure.json'), {
      meta: { totalNodes: structure.length },
      tree: structure,
    });

    // ── full-page/ — same report shape, scoped to the whole page ─────────────
    const typography   = buildTypographyReport(allElements);
    const colors       = buildColorsReport(allElements);
    const spacing      = buildSpacingReport(allElements);
    const layout       = buildLayoutReport(allElements);
    const components   = buildComponentsReport(allElements);
    const designTokens = buildDesignTokens(allElements);
    const summary      = buildSummary(allElements, pageMeta, sectionResults);
    const tokens       = buildAllTokens(colors, typography, spacing, {});

    writeJSON(path.join(fullPageDir, 'colors.json'),         colors);
    writeJSON(path.join(fullPageDir, 'typography.json'),     typography);
    writeJSON(path.join(fullPageDir, 'spacing.json'),        spacing);
    writeJSON(path.join(fullPageDir, 'layout.json'),         layout);
    writeJSON(path.join(fullPageDir, 'components.json'),     components);
    writeJSON(path.join(fullPageDir, 'design-tokens.json'),  designTokens);
    writeJSON(path.join(fullPageDir, 'tokens-extended.json'), tokens);
    writeJSON(path.join(fullPageDir, 'summary.json'),        summary);
    writeJSON(path.join(fullPageDir, 'elements.json'), {
      meta: { elementCount: allElements.length, extractedAt: now },
      elements: allElements,
    });

    return { typography, colors, spacing, layout, components, summary };
  }

  // ─── Summary Console Output ───────────────────────────────────────────────

  printSummary(summary, discoveredSections) {
    const s = summary.statistics;
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║              INSPECTION COMPLETE                     ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log(`\n  Elements captured   : ${s.totalElements}`);
    console.log(`  Sections discovered : ${discoveredSections.length}`);
    console.log(`  Unique colors       : ${s.uniqueColors}`);
    console.log(`  Unique font sizes   : ${s.uniqueFontSizes}`);
    console.log(`  Unique font families: ${s.uniqueFontFamilies}`);
    console.log(`  Unique border radii : ${s.uniqueBorderRadii}`);
    console.log(`  Unique shadows      : ${s.uniqueShadows}`);
    console.log(`  Unique spacing vals : ${s.uniqueSpacingValues}`);

    console.log('\n  Component breakdown:');
    for (const [type, count] of Object.entries(s.componentTypeCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${type.padEnd(24)} ${count}`);
    }

    console.log('\n  Sections extracted:');
    for (const sec of discoveredSections) {
      const found = summary.sections?.[sec.name];
      const cnt = found?.elementCount ?? '—';
      console.log(`    · "${sec.name}"  (${cnt} elements)`);
    }

    console.log(`\n  Output: ${this.featuresDir}\n`);
  }

  // ─── Main Run ─────────────────────────────────────────────────────────────

  async run() {
    await this.navigate();
    await this.injectInspector();

    const pageMeta = await this.getPageMeta();
    console.log(`\n  Page      : "${pageMeta.title}"`);
    console.log(`  Viewport  : ${pageMeta.viewport.width}×${pageMeta.viewport.height}`);
    console.log(`  Scroll    : ${pageMeta.scrollSize.width}×${pageMeta.scrollSize.height}px`);
    console.log(`  DOM nodes : ${pageMeta.totalDOMElements}`);

    // 1. Lightweight structure map
    const structure = await this.getPageStructure();

    // 2. Full page deep extraction (all visible elements + all CSS)
    const fullPageResult = await this.extractFullPage();

    // 3. Auto-discover all sections
    const discoveredSections = await this.discoverSections();

    // 4. Per-section extraction
    console.log('\n🔬 Extracting per-section data...');
    const sectionResults = await this.extractAllSections(discoveredSections);

    // 5. Screenshots
    await this.takeScreenshots(discoveredSections, sectionResults, fullPageResult.components);

    // 6. Reports
    const reports = this.writeReports(fullPageResult, sectionResults, structure, pageMeta);

    // 7. Summary
    this.printSummary(reports.summary, discoveredSections);
  }
}

module.exports = { DashboardInspector };
