'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test('Extract sidebar styles — nav links, logo, search', async ({ page }) => {
  await extractSection(page, {
    name:     'Sidebar',
    selector: 'aside.l1-sidebar',
    outputDir: __dirname,
  });
});
