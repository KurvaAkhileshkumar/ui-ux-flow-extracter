'use strict';

const path = require('path');
const { writeBuffer, sanitiseFilename } = require('./fileWriter');

/**
 * screenshotter.js — Captures full-page, section, card, and button screenshots.
 */

const SCREENSHOT_OPTS = {
  type: 'png',
  animations: 'disabled',
};

// ─── Full page ──────────────────────────────────────────────────────────────

async function captureFullPage(page, featuresDir) {
  console.log('\n📸 Taking full-page screenshot...');

  const buffer = await page.screenshot({
    ...SCREENSHOT_OPTS,
    fullPage: true,
  });

  writeBuffer(path.join(featuresDir, 'full-page', 'screenshot.png'), buffer);
}

// ─── Section screenshot ─────────────────────────────────────────────────────

async function captureSection(page, sectionSelector, name, featuresDir) {
  try {
    const locator = page.locator(sectionSelector).first();
    const count = await locator.count();
    if (count === 0) {
      console.log(`  ⚠ Section "${name}" not found for screenshot.`);
      return;
    }

    await locator.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const buffer = await locator.screenshot(SCREENSHOT_OPTS);
    writeBuffer(path.join(featuresDir, sanitiseFilename(name), 'screenshot.png'), buffer);
  } catch (err) {
    console.log(`  ⚠ Could not screenshot section "${name}": ${err.message}`);
  }
}

// ─── Cards ──────────────────────────────────────────────────────────────────

async function captureCards(page, cardSelectors, featuresDir) {
  if (!cardSelectors || cardSelectors.length === 0) return;

  console.log(`\n📸 Capturing ${cardSelectors.length} card(s)...`);

  const cardsDir = path.join(featuresDir, 'full-page', 'cards');

  for (let i = 0; i < cardSelectors.length; i++) {
    const { selector } = cardSelectors[i];
    try {
      const locator = page.locator(selector).first();
      const count = await locator.count();
      if (count === 0) continue;

      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(150);

      const buffer = await locator.screenshot(SCREENSHOT_OPTS);
      writeBuffer(path.join(cardsDir, `card-${i}.png`), buffer);
    } catch (err) {
      console.log(`  ⚠ card-${i}: ${err.message}`);
    }
  }
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

async function captureButtons(page, buttonSelectors, featuresDir) {
  if (!buttonSelectors || buttonSelectors.length === 0) return;

  console.log(`\n📸 Capturing ${buttonSelectors.length} button(s)...`);

  const buttonsDir = path.join(featuresDir, 'full-page', 'buttons');

  for (let i = 0; i < buttonSelectors.length; i++) {
    const { selector } = buttonSelectors[i];
    try {
      const locator = page.locator(selector).first();
      const count = await locator.count();
      if (count === 0) continue;

      await locator.scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);

      const buffer = await locator.screenshot(SCREENSHOT_OPTS);
      writeBuffer(path.join(buttonsDir, `button-${i}.png`), buffer);
    } catch (err) {
      console.log(`  ⚠ button-${i}: ${err.message}`);
    }
  }
}

// ─── Viewport snapshot at original scroll position ─────────────────────────

async function captureViewport(page, name, featuresDir) {
  const buffer = await page.screenshot({ ...SCREENSHOT_OPTS, fullPage: false });
  writeBuffer(path.join(featuresDir, sanitiseFilename(name), 'screenshot.png'), buffer);
}

module.exports = {
  captureFullPage,
  captureSection,
  captureCards,
  captureButtons,
  captureViewport,
};
