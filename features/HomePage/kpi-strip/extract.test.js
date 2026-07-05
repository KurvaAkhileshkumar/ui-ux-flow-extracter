'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test('Extract kpi-strip styles — stat cards (Classes today, Action items…)', async ({ page }) => {
  await extractSection(page, {
    name:     'KPI Strip',
    selector: '.l1-kpiStrip',
    outputDir: __dirname,
  });
});
