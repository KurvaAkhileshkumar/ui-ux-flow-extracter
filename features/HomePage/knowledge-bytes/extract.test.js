'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test('Extract knowledge-bytes styles — article carousel cards', async ({ page }) => {
  await extractSection(page, {
    name:           'Knowledge bytes',
    heading:        'Knowledge bytes',
    parentSelector: '.l1-rightRail',
    nthSection:     3,
    outputDir:      __dirname,
  });
});
