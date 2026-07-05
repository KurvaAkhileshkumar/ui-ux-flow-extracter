'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test('Student · Extract courses styles — course cards, progress bars', async ({ page }) => {
  await extractSection(page, {
    name:          'My Courses',
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    heading:       'My courses',
    outputDir:     __dirname,
  });
});
