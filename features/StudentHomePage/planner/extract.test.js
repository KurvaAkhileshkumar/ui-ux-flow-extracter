'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test('Student · Extract planner styles — task list, log button', async ({ page }) => {
  await extractSection(page, {
    name:          'My Planner',
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    heading:       'My planner',
    outputDir:     __dirname,
  });
});
