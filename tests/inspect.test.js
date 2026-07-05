'use strict';

const { test } = require('@playwright/test');
const path = require('path');
const { DashboardInspector } = require('../src/inspector');

test('Inspect Edwisely Faculty Dashboard — Insights & Actions', async ({ page }) => {
  const inspector = new DashboardInspector(page, {
    outputDir: path.join(process.cwd(), 'features', 'HomePage'),
  });

  await inspector.run();
});
