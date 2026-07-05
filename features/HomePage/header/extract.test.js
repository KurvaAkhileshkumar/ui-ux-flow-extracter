'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test('Extract header styles — greeting, date, nav controls', async ({ page }) => {
  await extractSection(page, {
    name:     'Header',
    selector: '.l1-topBar',
    outputDir: __dirname,
  });
});
