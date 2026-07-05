'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test('Extract courses styles — Your courses table rows', async ({ page }) => {
  await extractSection(page, {
    name:           'Your courses',
    heading:        'Your courses',
    parentSelector: '.l1-mainGrid > div',
    nthSection:     2,
    outputDir:      __dirname,
  });
});
