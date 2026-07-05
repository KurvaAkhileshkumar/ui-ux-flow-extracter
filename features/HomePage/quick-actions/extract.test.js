'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test('Extract quick-actions styles — pinned action buttons grid', async ({ page }) => {
  await extractSection(page, {
    name:           'Quick actions',
    heading:        'Quick actions',
    parentSelector: '.l1-rightRail',
    nthSection:     0,
    outputDir:      __dirname,
  });
});
