'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

const URL = 'https://edwisely-ai.github.io/edwisely-faculty-migration-designs/Faculty_Dashboard_TeachStudio_Lessonhooks_updated.html';

test('Extract Lesson Hook styles', async ({ page }) => {
  await extractSection(page, {
    name:      'Lesson Hook',
    url:       URL,
    selector:  'main',
    outputDir: __dirname,
    afterNavigate: async (pg) => {
      await pg.evaluate(() => {
        const items = [...document.querySelectorAll('.nav-feature')];
        const el = items.find(e => e.textContent.trim().includes('Lesson Hook'));
        if (el) el.click();
      });
      await pg.waitForTimeout(1500);
    },
  });
});
