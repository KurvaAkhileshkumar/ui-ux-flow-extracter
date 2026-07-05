'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test('Student · Extract insights styles — action cards, AI suggestions', async ({ page }) => {
  await extractSection(page, {
    name:          'Insights & Actions',
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    heading:       'Insights & actions',
    outputDir:     __dirname,
  });
});
