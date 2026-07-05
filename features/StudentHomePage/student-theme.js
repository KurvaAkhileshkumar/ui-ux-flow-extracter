'use strict';

const STUDENT_URL =
  'https://edwisely-ai.github.io/edwisely-faculty-migration-designs/student.html';

/**
 * Applies the "Plum, single-tone" theme via the real UI:
 *   1. Opens the "More" (⋯) dropdown in the topbar.
 *   2. Clicks the "Plum, single-tone" palette button.
 *   3. Waits for React to re-render with plum colors.
 *
 * Why UI interaction instead of window.applyPalette():
 *   applyPalette() only mutates the C.orange / C.teal JS objects — it does NOT
 *   call the React state setter, so the DOM never re-renders.  Clicking the
 *   real button triggers the React onClick handler which updates component
 *   state and causes a full re-render with the new colors.
 */
async function applyPlumTheme(page) {
  // Open the "More" (⋯) dropdown
  await page.locator('button[title="More"]').first().click();
  await page.waitForTimeout(400);

  // Click "Plum, single-tone" in the palette list
  await page.getByRole('button', { name: 'Plum, single-tone' }).click();
  await page.waitForTimeout(800);

  // Close dropdown if still open (click outside)
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

module.exports = { STUDENT_URL, applyPlumTheme };
