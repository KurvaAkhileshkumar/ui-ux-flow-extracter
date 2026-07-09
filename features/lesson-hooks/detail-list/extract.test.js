'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test('Extract Lesson Hook - Detail List View', async ({ page }) => {
  await extractSection(page, {
    name:      'Lesson Hook - Detail List View',
    url:       'https://edwisely-ai.github.io/edwisely-faculty-migration-designs/Faculty_Dashboard_TeachStudio_Lessonhooks_updated.html',
    selector:  'main',
    outputDir: __dirname,
    afterNavigate: async (pg) => {
      await pg.evaluate(() => [...document.querySelectorAll('.nav-feature')].find(e => e.textContent.trim().includes('Lesson Hook')).click());
      await pg.waitForTimeout(1500);
      await pg.evaluate(() => {
        const b = [...document.querySelector('main').querySelectorAll('button')].filter(b => b.textContent.trim().length > 30 && b.textContent.trim().includes('BIO101'));
        if (b[0]) b[0].click();
      });
      await pg.waitForTimeout(1500);
      await pg.evaluate(() => [...document.querySelector('main').querySelectorAll('button')].find(b => b.textContent.trim() === 'List')?.click());
      await pg.waitForTimeout(800);
    },
  });
});
