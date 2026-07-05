'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test('Extract todo styles — task list, checkboxes, urgency badges', async ({ page }) => {
  await extractSection(page, {
    name:           'Todo',
    heading:        'Todo',
    parentSelector: '.l1-rightRail',
    nthSection:     2,
    outputDir:      __dirname,
  });
});
