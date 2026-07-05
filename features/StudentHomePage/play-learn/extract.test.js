'use strict';

const { test } = require('@playwright/test');
const { extractSection } = require('../../../src/sectionExtractor');
const { STUDENT_URL, applyPlumTheme } = require('../student-theme');

test('Student · Extract play-learn styles — game cards (Arcade, Duel, Sprint…)', async ({ page }) => {
  await extractSection(page, {
    name:          'Play & Learn',
    url:           STUDENT_URL,
    afterNavigate: applyPlumTheme,
    heading:       'Play & learn',
    outputDir:     __dirname,
  });
});
