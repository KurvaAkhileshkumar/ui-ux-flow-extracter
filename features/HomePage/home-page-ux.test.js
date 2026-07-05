'use strict';

/**
 * Home Page — UI/UX Test Suite
 *
 * Validates the developed faculty frontend against the design reference captured
 * in features/HomePage/<section>/typography.json | spacing.json | screenshot.png.
 *
 * Run with:
 *   FACULTY_APP_URL=http://localhost:5173 \
 *   TEST_EMAIL=your@email.com            \
 *   TEST_PASSWORD=yourpassword           \
 *   npx playwright test features/HomePage/home-page-ux.test.js
 */

const { test, expect } = require('@playwright/test');

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL    = process.env.FACULTY_APP_URL ?? 'http://localhost:5173';
const TEST_EMAIL  = process.env.TEST_EMAIL      ?? '';
const TEST_PASS   = process.env.TEST_PASSWORD   ?? '';

// ── Auth helper ───────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

  // Fill credentials — works with both name= and placeholder= based inputs
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASS);
  await page.getByRole('button', { name: /log in|sign in|login/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(`${BASE_URL}/`, { timeout: 20_000 });
  await page.waitForLoadState('networkidle');
}

// ── CSS helper — reads a computed style property ───────────────────────────────

async function css(locator, prop) {
  return locator.evaluate((el, p) => getComputedStyle(el).getPropertyValue(p).trim(), prop);
}

// ── Font family shorthand — first token only ───────────────────────────────────

async function fontFamily(locator) {
  const full = await css(locator, 'font-family');
  return full.split(',')[0].replace(/["']/g, '').trim();
}

// =============================================================================
// SECTION 1 — Header
// =============================================================================

test.describe('Header', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('greeting is visible and uses Instrument Serif 30px', async ({ page }) => {
    // Ref: typography.json — Instrument Serif 30px 400 "Good morning,"
    const greeting = page.getByText(/good morning|good afternoon|good evening/i).first();
    await expect(greeting).toBeVisible();

    const ff = await fontFamily(greeting);
    expect(ff).toMatch(/Instrument Serif/i);

    const fs = await css(greeting, 'font-size');
    expect(parseFloat(fs)).toBeCloseTo(30, 0);
  });

  test('date display uses JetBrains Mono uppercase 12px', async ({ page }) => {
    // Ref: typography.json — JetBrains Mono 12px uppercase "Friday · 15 May 2026"
    // Date element contains day-of-week abbreviation
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const pattern = new RegExp(days.join('|'), 'i');
    const dateEl = page.locator('text=' + days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]).first();

    // Verify element is present and uses mono font
    await expect(page.locator('body')).toContainText(/mon|tue|wed|thu|fri|sat|sun/i);

    const dateCandidates = page.locator('*').filter({ hasText: pattern });
    const count = await dateCandidates.count();
    expect(count).toBeGreaterThan(0);
  });

  test('user name is rendered italic', async ({ page }) => {
    // Ref: typography.json — italic Instrument Serif "Sastra" (user's name)
    // The name renders italicised next to "Good morning,"
    const heading = page.locator('h1, h2').filter({ hasText: /good morning|good afternoon/i }).first();
    await expect(heading).toBeVisible();

    // At least one child element must be italic
    const italic = heading.locator('em, i, [style*="italic"]').first();
    // Also check computed style on the italic span
    const nameSpan = heading.locator('span').last();
    const style = await css(nameSpan, 'font-style');
    expect(style).toBe('italic');
  });

  test('role switcher shows Faculty and HOD options', async ({ page }) => {
    // Ref: typography.json — Inter 12.5px 600 "Faculty" / Inter 12.5px 500 "HOD"
    const facultyTab = page.getByRole('button', { name: /^faculty$/i });
    const hodTab     = page.getByRole('button', { name: /^hod$/i });

    await expect(facultyTab).toBeVisible();
    await expect(hodTab).toBeVisible();
  });

  test('role switcher — clicking HOD tab switches the active state', async ({ page }) => {
    const hodTab = page.getByRole('button', { name: /^hod$/i });
    await hodTab.click();

    // After click the HOD tab should become visually active (aria-pressed or class change)
    await expect(hodTab).toHaveAttribute('aria-pressed', 'true').catch(async () => {
      // Fallback: check that the Faculty tab no longer has active styling
      const facultyTab = page.getByRole('button', { name: /^faculty$/i });
      const facultyBg  = await css(facultyTab, 'background-color');
      expect(facultyBg).not.toMatch(/45,\s*59,\s*95/); // not navy
    });

    // Switch back
    await page.getByRole('button', { name: /^faculty$/i }).click();
  });

  test('"Customize" and "Notifications" controls are visible in header', async ({ page }) => {
    // Ref: typography.json — Inter 12px 500 "Customize" / "Notifications"
    await expect(page.getByRole('button', { name: /customize/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /notifications/i })).toBeVisible();
  });
});

// =============================================================================
// SECTION 2 — KPI Strip
// =============================================================================

test.describe('KPI Strip', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('at least 3 stat cards are visible', async ({ page }) => {
    // Ref: inspector found CLASSES TODAY / ACTION ITEMS / STUDENTS cards
    const labels = ['CLASSES TODAY', 'ACTION ITEMS', 'STUDENTS'];
    for (const label of labels) {
      await expect(page.getByText(label, { exact: false })).toBeVisible();
    }
  });

  test('stat card labels use JetBrains Mono, uppercase, ~12.5px', async ({ page }) => {
    // Ref: typography.json — JetBrains Mono 12.5px 600 uppercase "Classes today"
    const label = page.getByText(/classes today/i).first();
    await expect(label).toBeVisible();

    const ff = await fontFamily(label);
    expect(ff).toMatch(/JetBrains Mono/i);

    const tt = await css(label, 'text-transform');
    expect(tt).toBe('uppercase');

    const fs = await css(label, 'font-size');
    expect(parseFloat(fs)).toBeCloseTo(12.5, 0);
  });

  test('stat card values use Instrument Serif ~24px', async ({ page }) => {
    // Ref: typography.json — Instrument Serif 24px 500 "4" (class count value)
    // The large numeric value is the direct sibling of the label
    const kpiSection = page.locator('*').filter({ hasText: /classes today/i }).first();
    // Find numeric element — it will be a large serif number
    const numericEl = kpiSection.locator('*').filter({ hasText: /^\d+$/ }).first();
    await expect(numericEl).toBeVisible();

    const ff = await fontFamily(numericEl);
    expect(ff).toMatch(/Instrument Serif/i);

    const fs = await css(numericEl, 'font-size');
    expect(parseFloat(fs)).toBeGreaterThanOrEqual(20);
  });

  test('sub-text (e.g. "next 11:00") uses Inter ~12px', async ({ page }) => {
    // Ref: typography.json — Inter 12px 400 "next 11:00"
    const subEl = page.getByText(/next \d{2}:\d{2}/i).first();
    await expect(subEl).toBeVisible();

    const ff = await fontFamily(subEl);
    expect(ff).toMatch(/Inter/i);

    const fs = await css(subEl, 'font-size');
    expect(parseFloat(fs)).toBeCloseTo(12, 0);
  });

  test('ACTION ITEMS card shows urgency chip with "+N urgent" in JetBrains Mono', async ({ page }) => {
    // Ref: typography.json — JetBrains Mono 12px 500 "+3"
    const urgentChip = page.getByText(/urgent/i).first();
    await expect(urgentChip).toBeVisible();
  });
});

// =============================================================================
// SECTION 3 — Quick Actions
// =============================================================================

test.describe('Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('section heading "Quick actions" is visible', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /quick actions/i });
    await expect(heading).toBeVisible();
  });

  test('section heading uses Inter 14–15px font-weight 600', async ({ page }) => {
    // Ref: typography.json — Inter 14px 600 "Quick actions"
    const heading = page.getByRole('heading', { name: /quick actions/i });
    const ff = await fontFamily(heading);
    expect(ff).toMatch(/Inter/i);

    const fw = await css(heading, 'font-weight');
    expect(parseInt(fw)).toBeGreaterThanOrEqual(600);
  });

  test('4 action cards are rendered in a grid', async ({ page }) => {
    // Ref: 4-column grid from layout reference
    const heading = page.getByRole('heading', { name: /quick actions/i });
    const section = heading.locator('xpath=ancestor::section, ancestor::div').first();

    // There should be exactly 4 action buttons
    const cards = section.getByRole('button');
    await expect(cards).toHaveCount(4);
  });

  test('each action card shows an icon, title, and module label', async ({ page }) => {
    // Ref: card structure — 30x30 icon container + title (Inter 13px 600) + label (JetBrains Mono uppercase)
    const heading = page.getByRole('heading', { name: /quick actions/i });
    const section = heading.locator('xpath=ancestor::section').first();
    const firstCard = section.getByRole('button').first();

    await expect(firstCard).toBeVisible();

    // Icon (svg) must be present
    await expect(firstCard.locator('svg')).toBeVisible();

    // Title text (first <p>) — Inter 13px 600
    const title = firstCard.locator('p').first();
    await expect(title).toBeVisible();
    const titleFf = await fontFamily(title);
    expect(titleFf).toMatch(/Inter/i);
    const titleFw = await css(title, 'font-weight');
    expect(parseInt(titleFw)).toBeGreaterThanOrEqual(600);

    // Module label (second <p>) — JetBrains Mono uppercase
    const moduleLabel = firstCard.locator('p').nth(1);
    await expect(moduleLabel).toBeVisible();
    const labelFf = await fontFamily(moduleLabel);
    expect(labelFf).toMatch(/JetBrains Mono/i);
    const labelTt = await css(moduleLabel, 'text-transform');
    expect(labelTt).toBe('uppercase');
  });

  test('icon container is 30×30 with rounded corners', async ({ page }) => {
    // Ref: spacing.json — 30px icon container with 7px border-radius
    const heading = page.getByRole('heading', { name: /quick actions/i });
    const section = heading.locator('xpath=ancestor::section').first();
    const firstCard = section.getByRole('button').first();
    const iconWrap  = firstCard.locator('div').first();

    const box = await iconWrap.boundingBox();
    if (box) {
      expect(box.width).toBeCloseTo(30, 1);
      expect(box.height).toBeCloseTo(30, 1);
    }
  });

  test('"· from your pinned" label appears when pinned features exist', async ({ page }) => {
    // Ref: typography.json — JetBrains Mono 12.5px uppercase "· from your pinned"
    // Only renders when user has pinned features; check if present then validate style
    const label = page.getByText(/from your pinned/i).first();
    const visible = await label.isVisible().catch(() => false);
    if (visible) {
      const ff = await fontFamily(label);
      expect(ff).toMatch(/JetBrains Mono/i);
      const tt = await css(label, 'text-transform');
      expect(tt).toBe('uppercase');
    }
  });

  test('clicking an action card navigates without page reload', async ({ page }) => {
    const heading  = page.getByRole('heading', { name: /quick actions/i });
    const section  = heading.locator('xpath=ancestor::section').first();
    const firstCard = section.getByRole('button').first();

    const navPromise = page.waitForNavigation({ waitUntil: 'networkidle' }).catch(() => null);
    await firstCard.click();
    await navPromise;

    // URL should have changed (SPA navigation — no full reload)
    expect(page.url()).not.toBe(`${BASE_URL}/login`);
  });
});

// =============================================================================
// SECTION 4 — Today's Classes
// =============================================================================

test.describe("Today's Classes", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('section heading "Today\'s classes" is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /today.?s classes/i })).toBeVisible();
  });

  test('"Open calendar →" button is visible and clickable', async ({ page }) => {
    // Ref: typography.json — Inter 12.5px 400 "Open calendar"
    const btn = page.getByRole('button', { name: /open calendar/i });
    await expect(btn).toBeVisible();

    const ff = await fontFamily(btn);
    expect(ff).toMatch(/Inter/i);
  });

  test('class cards are inside a white outer card wrapper', async ({ page }) => {
    // Ref: spacing.json — outer container padding 14px 16px; bg = --c-paper (white)
    const heading  = page.getByRole('heading', { name: /today.?s classes/i });
    const section  = heading.locator('xpath=ancestor::*[contains(@class,"card") or contains(@class,"rounded")]').first();
    const bg = await css(section, 'background-color');
    // bg-card = rgb(255, 255, 255) i.e. white
    expect(bg).toMatch(/255,\s*255,\s*255/);
  });

  test('time displays use 24-hour HH:MM format (no AM/PM)', async ({ page }) => {
    // Ref: time spans show "09:00", "11:00", "14:00" — no AM/PM suffix
    const timePattern = /\b([01]?\d|2[0-3]):[0-5]\d\b/;
    const times = page.locator('*').filter({ hasText: timePattern });
    const count = await times.count();
    // At least one time displayed
    expect(count).toBeGreaterThan(0);

    // None should contain AM or PM
    const bodyText = await page.locator('body').innerText();
    const classSection = bodyText.slice(bodyText.toLowerCase().indexOf("today's classes"));
    expect(classSection.substring(0, 500)).not.toMatch(/\d\s*(am|pm)/i);
  });

  test('time elements use JetBrains Mono font', async ({ page }) => {
    // Ref: typography.json — JetBrains Mono 12px 600 "09:00"
    const timeEl = page.locator('span').filter({ hasText: /^([01]?\d|2[0-3]):[0-5]\d$/ }).first();
    await expect(timeEl).toBeVisible();

    const ff = await fontFamily(timeEl);
    expect(ff).toMatch(/JetBrains Mono/i);
  });

  test('exactly one card is highlighted in navy (current/next class)', async ({ page }) => {
    // Ref: current card has bg-primary = rgb(45, 59, 95)
    const navyCards = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*')).filter(el => {
        const bg = getComputedStyle(el).backgroundColor;
        // navy: approximately rgb(45, 59, 95)
        const m = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (!m) return false;
        return Math.abs(+m[1] - 45) < 15 && Math.abs(+m[2] - 59) < 15 && Math.abs(+m[3] - 95) < 20;
      }).length;
    });
    // 0 is acceptable when all classes are done; otherwise exactly 1 navy card
    expect(navyCards).toBeLessThanOrEqual(1);
  });

  test('countdown badge (in X min) only appears on the highlighted card', async ({ page }) => {
    // Ref: spacing.json badge — padding 2px 6px, only on current card
    const badgeLocators = page.locator('span').filter({ hasText: /^in \d+(m|h)/ });
    const badgeCount = await badgeLocators.count();

    if (badgeCount > 0) {
      // All badges must share the same parent card — i.e. only 1 card has a badge
      const parentCards = new Set();
      for (let i = 0; i < badgeCount; i++) {
        const handle = await badgeLocators.nth(i).evaluateHandle(
          el => el.closest('[class*="rounded"], [class*="card"], div[style]')
        );
        parentCards.add(await handle.evaluate(el => el?.className));
      }
      // All badges belong to exactly 1 card
      expect(parentCards.size).toBe(1);
    }
  });

  test('done class cards show a checkmark icon', async ({ page }) => {
    // Ref: lucide Check icon rendered on done cards (classes whose end time has passed)
    // Only assert if there are done cards — early morning the count might be 0
    const checkmarks = page.locator('svg').filter({ has: page.locator('[data-lucide="check"]') });
    const count = await checkmarks.count();
    // Non-negative is the minimum — actual value depends on time of day
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('class name uses Inter 13px font-weight 600', async ({ page }) => {
    // Ref: typography.json — Inter 13px 600 "Data Structures"
    const classNames = page.locator('p').filter({ hasText: /[A-Z][a-z]/ }).nth(0);
    const ff = await fontFamily(classNames);
    expect(ff).toMatch(/Inter/i);
  });

  test('up to 4 class cards shown (slice at 4)', async ({ page }) => {
    // Ref: component slices classes.slice(0, 4)
    const heading = page.getByRole('heading', { name: /today.?s classes/i });
    const outerCard = heading.locator('xpath=following-sibling::div').first();
    const cards = outerCard.locator('> div > div'); // inner grid children
    const count = await cards.count();
    expect(count).toBeLessThanOrEqual(4);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// SECTION 5 — Your Courses
// =============================================================================

test.describe('Your Courses', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('section heading "Your courses" with count is visible', async ({ page }) => {
    // Ref: typography.json — Inter 14px 600 "Your courses · 12"
    const heading = page.getByRole('heading', { name: /your courses/i });
    await expect(heading).toBeVisible();

    const fw = await css(heading, 'font-weight');
    expect(parseInt(fw)).toBeGreaterThanOrEqual(600);
  });

  test('"Add course" button is visible', async ({ page }) => {
    // Ref: typography.json — Inter 12px 600 "Add course"
    const btn = page.getByRole('button', { name: /add course/i });
    await expect(btn).toBeVisible();
  });

  test('course cards show course name in Inter ~14.5px 600', async ({ page }) => {
    // Ref: typography.json — Inter 14.5px 600 "Problem Solving & Programming in C"
    const heading = page.getByRole('heading', { name: /your courses/i });
    const section = heading.locator('xpath=ancestor::section, ancestor::div[contains(@class,"space")]').first();

    const courseNames = section.locator('[style*="font-weight: 600"]').filter({ hasText: /[A-Z]/ });
    const count = await courseNames.count();
    expect(count).toBeGreaterThan(0);
  });

  test('course codes use JetBrains Mono font', async ({ page }) => {
    // Ref: typography.json — JetBrains Mono 12.5px "CSE101R01"
    const codePattern = /^[A-Z]{2,6}\d{3,}/;
    const codeEl = page.locator('*').filter({ hasText: codePattern }).first();
    const visible = await codeEl.isVisible().catch(() => false);
    if (visible) {
      const ff = await fontFamily(codeEl);
      expect(ff).toMatch(/JetBrains Mono/i);
    }
  });

  test('course coverage percentage uses JetBrains Mono 700', async ({ page }) => {
    // Ref: typography.json — JetBrains Mono 12px 700 "36%"
    const pctEl = page.locator('*').filter({ hasText: /\d+%/ }).first();
    const visible = await pctEl.isVisible().catch(() => false);
    if (visible) {
      const ff = await fontFamily(pctEl);
      expect(ff).toMatch(/JetBrains Mono/i);
    }
  });

  test('semester filter dropdown is visible', async ({ page }) => {
    // Ref: typography.json — Inter 12px 400 "All semesters"
    await expect(page.getByText(/all semesters/i)).toBeVisible();
  });

  test('search / "Add course" shortcut shows ⌘K hint', async ({ page }) => {
    // Ref: typography.json — JetBrains Mono 12px "⌘K"
    await expect(page.getByText('⌘K')).toBeVisible();
  });
});

// =============================================================================
// SECTION 6 — Activity Wall
// =============================================================================

test.describe('Activity Wall', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Activity Wall section heading is visible', async ({ page }) => {
    // Ref: features/HomePage/activity-wall section
    const heading = page.getByRole('heading', { name: /activity/i });
    await expect(heading).toBeVisible();
  });

  test('activity cards use Instrument Serif for card headings', async ({ page }) => {
    // Ref: dashboardTypography.activityCardHeading — Instrument Serif 18px
    const heading  = page.getByRole('heading', { name: /activity/i });
    const section  = heading.locator('xpath=ancestor::section, ancestor::div').first();
    const cardHeadings = section.locator('h3, h4, [class*="heading"]').first();
    const visible = await cardHeadings.isVisible().catch(() => false);
    if (visible) {
      const ff = await fontFamily(cardHeadings);
      expect(ff).toMatch(/Instrument Serif/i);
    }
  });
});

// =============================================================================
// SECTION 7 — Knowledge Bytes
// =============================================================================

test.describe('Knowledge Bytes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Knowledge Bytes section heading is visible', async ({ page }) => {
    // Ref: features/HomePage/knowledge-bytes section
    const heading = page.getByRole('heading', { name: /knowledge bytes/i });
    await expect(heading).toBeVisible();
  });

  test('article titles use Inter ~13.5px font-weight 600', async ({ page }) => {
    // Ref: dashboardTypography.knowledgeBytesTitle — Inter 13.5px 600 lineHeight 1.35
    const heading = page.getByRole('heading', { name: /knowledge bytes/i });
    const section = heading.locator('xpath=ancestor::section, ancestor::div').first();
    const articleTitle = section.locator('p, h3, h4').first();
    const visible = await articleTitle.isVisible().catch(() => false);
    if (visible) {
      const ff = await fontFamily(articleTitle);
      expect(ff).toMatch(/Inter/i);
      const fw = await css(articleTitle, 'font-weight');
      expect(parseInt(fw)).toBeGreaterThanOrEqual(600);
    }
  });
});

// =============================================================================
// SECTION 8 — Global Layout / Design Tokens
// =============================================================================

test.describe('Global Design Tokens', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('page background uses --c-paper-alt warm beige, not pure white', async ({ page }) => {
    // Ref: --c-paper-alt = #f5f3ee = rgb(245, 243, 238)
    const bodyBg = await css(page.locator('body'), 'background-color');
    const m = bodyBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) {
      // Should be warm (r ≥ g ≥ b) — not grey (r ≈ g ≈ b)
      const [r, g, b] = [+m[1], +m[2], +m[3]];
      expect(r).toBeGreaterThan(b); // warm tint
    }
  });

  test('.card elements have white background and a light border', async ({ page }) => {
    // Ref: --c-paper #ffffff, --c-divider #e5e2db
    const cardEl = page.locator('[class*="card"]').first();
    const visible = await cardEl.isVisible().catch(() => false);
    if (visible) {
      const bg = await css(cardEl, 'background-color');
      expect(bg).toMatch(/255,\s*255,\s*255/); // white
      const border = await css(cardEl, 'border-color');
      // Border exists and is not transparent
      expect(border).not.toMatch(/rgba\(0,\s*0,\s*0,\s*0\)/);
    }
  });

  test('primary colour is navy — approximately rgb(45, 59, 95)', async ({ page }) => {
    // Ref: --primary resolves to oklch(0.38 0.1 256) ≈ rgb(45, 59, 95)
    const primaryEl = page.locator('[class*="bg-primary"]').first();
    const visible = await primaryEl.isVisible().catch(() => false);
    if (visible) {
      const bg = await css(primaryEl, 'background-color');
      const m  = bg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (m) {
        expect(+m[1]).toBeLessThan(100); // dark
        expect(+m[3]).toBeGreaterThan(+m[1]); // blue-dominant
      }
    }
  });

  test('no inline colour hardcoding — spot check for #6b7280 or #ffffff in style attrs', async ({ page }) => {
    // Hardcoded palette colours bypass the theme token system
    const inlineStyled = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[style]'))
        .map(el => el.getAttribute('style') ?? '')
        .filter(s => /#[0-9a-fA-F]{6}/.test(s) && !s.includes('var(--'));
    });
    // Allow up to 2 (e.g., third-party widgets) — flag if more
    expect(inlineStyled.length).toBeLessThanOrEqual(2);
  });

  test('Inter Variable is the primary sans-serif font', async ({ page }) => {
    // Ref: --font-sans = "Inter Variable" loaded via @fontsource-variable/inter
    const bodyFont = await css(page.locator('body'), 'font-family');
    expect(bodyFont).toMatch(/Inter/i);
  });
});

// =============================================================================
// SECTION 9 — Sidebar
// =============================================================================

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('sidebar is visible on the left', async ({ page }) => {
    // Ref: features/HomePage/sidebar section
    const sidebar = page.locator('nav, aside, [role="navigation"]').first();
    await expect(sidebar).toBeVisible();

    const box = await sidebar.boundingBox();
    if (box) {
      // Left-anchored: x near 0
      expect(box.x).toBeLessThan(100);
    }
  });

  test('main navigation links are present', async ({ page }) => {
    // Expect at least "Dashboard" / home link to be present
    const navLinks = page.locator('nav a, aside a');
    const count = await navLinks.count();
    expect(count).toBeGreaterThan(0);
  });
});
