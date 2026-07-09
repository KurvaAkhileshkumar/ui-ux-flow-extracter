'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test('Extract Lesson Hook - New Hook', async ({ page }) => {
  await extractSection(page, {
    name:      'Lesson Hook - New Hook',
    url:       'https://edwisely-ai.github.io/edwisely-faculty-migration-designs/Faculty_Dashboard_TeachStudio_Lessonhooks_updated.html',
    selector:  'main',
    outputDir: __dirname,
    afterNavigate: async (pg) => {
      await pg.evaluate(() => [...document.querySelectorAll('.nav-feature')].find(e => e.textContent.trim().includes('Lesson Hook')).click());
      await pg.waitForTimeout(1500);
      await pg.evaluate(() => [...document.querySelector('main').querySelectorAll('button')].find(b => b.textContent.trim() === 'New hook')?.click());
      await pg.waitForTimeout(1500);
    },
  });
});
