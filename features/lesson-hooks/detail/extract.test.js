'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

const URL = 'https://edwisely-ai.github.io/edwisely-faculty-migration-designs/Faculty_Dashboard_TeachStudio_Lessonhooks_updated.html';

test('Extract Lesson Hook - Hook detail (grid view)', async ({ page }) => {
  await extractSection(page, {
    name:      'Lesson Hook - Detail',
    url:       URL,
    selector:  'main',
    outputDir: __dirname,
    afterNavigate: async (pg) => {
      await pg.evaluate(() => {
        [...document.querySelectorAll('.nav-feature')].find(e => e.textContent.trim().includes('Lesson Hook')).click();
      });
      await pg.waitForTimeout(1500);
      await pg.evaluate(() => {
        const btns = [...document.querySelector('main').querySelectorAll('button')]
          .filter(b => b.textContent.trim().length > 30 && b.textContent.trim().includes('BIO101'));
        if (btns[0]) btns[0].click();
      });
      await pg.waitForTimeout(1000);
    },
  });
});
