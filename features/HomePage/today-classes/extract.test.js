'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');

test("Extract today-classes styles — Today's classes card row", async ({ page }) => {
  await extractSection(page, {
    name:           "Today's classes",
    heading:        "Today's classes",
    parentSelector: '.l1-mainGrid > div',
    nthSection:     1,
    outputDir:      __dirname,
  });
});
