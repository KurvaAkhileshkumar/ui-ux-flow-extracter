'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test('Student · Extract header styles — greeting, date, topbar controls', async ({ page }) => {
  await extractSection(page, {
    name:          'Student Header',
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    heading:       'Good morning',
    outputDir:     __dirname,
  });
});
