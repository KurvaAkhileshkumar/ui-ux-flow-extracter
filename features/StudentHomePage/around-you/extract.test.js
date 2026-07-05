'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test('Student · Extract around-you styles — peer activity feed, reactions', async ({ page }) => {
  await extractSection(page, {
    name:          'Around You',
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    heading:       'Around you',
    outputDir:     __dirname,
  });
});
