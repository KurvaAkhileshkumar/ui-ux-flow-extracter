'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test('Student · Extract sidebar styles — nav links, pin buttons, user row', async ({ page }) => {
  await extractSection(page, {
    name:          'Student Sidebar',
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    selector:      '.l1-sidebar',
    outputDir:     __dirname,
  });
});
