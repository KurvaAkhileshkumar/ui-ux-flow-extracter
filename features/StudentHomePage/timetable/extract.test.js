'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test("Student · Extract timetable styles — today's class schedule cards", async ({ page }) => {
  await extractSection(page, {
    name:          "Today's Timetable",
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    heading:       "Today's timetable",
    outputDir:     __dirname,
  });
});
