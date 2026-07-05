'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test('Extract activity-wall styles — ongoing/past activity cards', async ({ page }) => {
  await extractSection(page, {
    name:           'Activity wall',
    heading:        'Activity wall',
    parentSelector: '.l1-rightRail',
    nthSection:     1,
    outputDir:      __dirname,
  });
});
