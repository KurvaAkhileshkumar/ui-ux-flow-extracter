'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test('Extract insights styles — Insights & actions ranked cards', async ({ page }) => {
  await extractSection(page, {
    name:           'Insights & actions',
    heading:        'Insights & actions',
    parentSelector: '.l1-mainGrid > div',
    nthSection:     0,
    outputDir:      __dirname,
  });
});
