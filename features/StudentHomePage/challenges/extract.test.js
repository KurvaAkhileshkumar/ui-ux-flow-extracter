'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test('Student · Extract challenges styles — aptitude/coding challenge cards', async ({ page }) => {
  await extractSection(page, {
    name:          'Challenges',
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    heading:       'Challenges',
    outputDir:     __dirname,
  });
});
