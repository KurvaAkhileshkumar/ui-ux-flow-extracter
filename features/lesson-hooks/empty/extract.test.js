'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

const URL = 'https://edwisely-ai.github.io/edwisely-faculty-migration-designs/Faculty_Dashboard_TeachStudio_Lessonhooks_updated.html';

test('Extract Lesson Hook - Empty state', async ({ page }) => {
  await extractSection(page, {
    name:      'Lesson Hook - Empty State',
    url:       URL,
    selector:  'main',
    outputDir: __dirname,
    afterNavigate: async (pg) => {
      await pg.evaluate(() => {
        [...document.querySelectorAll('.nav-feature')].find(e => e.textContent.trim().includes('Lesson Hook')).click();
      });
      await pg.waitForTimeout(1500);
      await pg.evaluate(() => {
        [...document.querySelector('main').querySelectorAll('button')]
          .find(b => b.textContent.trim() === 'Empty-state preview').click();
      });
      await pg.waitForTimeout(1000);
    },
  });
});
