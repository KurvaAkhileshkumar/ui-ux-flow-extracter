'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test('Student · Extract faculty-feed styles — faculty activity cards', async ({ page }) => {
  await extractSection(page, {
    name:          'From Your Faculty',
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    heading:       'From your faculty',
    outputDir:     __dirname,
  });
});
