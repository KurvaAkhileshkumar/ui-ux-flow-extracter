'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test('Student · Extract momentum styles — streak graph, goal badges', async ({ page }) => {
  await extractSection(page, {
    name:          'Your Momentum',
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    heading:       'Your momentum',
    outputDir:     __dirname,
  });
});
