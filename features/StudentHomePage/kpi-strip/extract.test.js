'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test('Student · Extract kpi-strip styles — stat chips (streak, rank, XP…)', async ({ page }) => {
  await extractSection(page, {
    name:          'Student KPI Strip',
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    selector:      '.l1-kpiStrip',
    outputDir:     __dirname,
  });
});
