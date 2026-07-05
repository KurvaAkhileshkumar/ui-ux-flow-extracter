'use strict';

/**
 * tokenizer.js — Post-processes extracted data to generate semantic design tokens.
 * Attempts to infer token names based on usage frequency and context.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function pxValue(str) {
  if (!str) return NaN;
  return parseFloat(str);
}

function roundToStep(value, step = 4) {
  return Math.round(value / step) * step;
}

// ─── Spacing Scale ───────────────────────────────────────────────────────────

function buildSpacingScale(spacingValues) {
  // spacingValues: [{ value: '16px', px: 16 }, ...]
  const unique = new Map();
  for (const s of spacingValues) {
    if (!isNaN(s.px)) unique.set(s.px, s.value);
  }

  const sorted = Array.from(unique.entries()).sort((a, b) => a[0] - b[0]);

  const scale = {};
  const names = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '14', '16', '20', '24', '28', '32', '36', '40', '44', '48', '56', '64', '72', '80', '96'];

  sorted.forEach(([px, cssValue], i) => {
    const tokenName = `space-${i + 1}`;
    scale[tokenName] = { value: cssValue, px };
  });

  return scale;
}

// ─── Color Palette ───────────────────────────────────────────────────────────

function categoriseColor(rgbStr) {
  // Very basic categorisation — detects if it's likely a background, accent, text, etc.
  const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return 'unknown';

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

  if (a < 0.1) return 'transparent';

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  if (saturation < 0.12) {
    if (brightness > 220) return 'white';
    if (brightness < 40) return 'black';
    return 'neutral';
  }

  if (r > g && r > b) return r - g > 50 ? 'red' : 'orange';
  if (g > r && g > b) return 'green';
  if (b > r && b > g) return r > 100 ? 'purple' : 'blue';

  return 'mixed';
}

function buildColorTokens(colors, byRole) {
  const palette = {};
  const semanticTokens = {};

  // Build palette
  const categoryCounters = {};
  for (const color of colors) {
    const category = categoriseColor(color);
    categoryCounters[category] = (categoryCounters[category] || 0) + 1;
    const tokenName = `${category}-${categoryCounters[category]}`;
    palette[tokenName] = color;
  }

  // Map role usages to semantic names
  const roles = Object.keys(byRole || {});
  for (const role of roles) {
    const colorsForRole = byRole[role];
    if (!colorsForRole || colorsForRole.length === 0) continue;

    const semanticName = roleToToken(role);
    if (colorsForRole.length === 1) {
      semanticTokens[semanticName] = colorsForRole[0];
    } else {
      colorsForRole.forEach((c, i) => {
        semanticTokens[`${semanticName}-${i + 1}`] = c;
      });
    }
  }

  return { palette, semanticTokens };
}

function roleToToken(role) {
  const map = {
    text: 'color-text',
    background: 'color-background',
    backgroundImage: 'color-gradient',
    border: 'color-border',
    outline: 'color-outline',
    boxShadow: 'color-shadow',
    svgFill: 'color-icon-fill',
    svgStroke: 'color-icon-stroke',
  };
  return map[role] || `color-${role}`;
}

// ─── Typography Scale ────────────────────────────────────────────────────────

function buildTypographyScale(typographyReport) {
  const scale = {};

  // Font sizes (sorted small to large)
  const sizes = (typographyReport.fontSizes || [])
    .map((s) => ({ value: s.value, px: pxValue(s.value) }))
    .filter((s) => !isNaN(s.px))
    .sort((a, b) => a.px - b.px);

  const sizeNames = ['xs', 'sm', 'base', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];
  sizes.forEach((s, i) => {
    scale[`font-size-${sizeNames[i] || i + 1}`] = s.value;
  });

  // Font weights
  const weights = typographyReport.fontWeights || [];
  const weightNames = { 100: 'thin', 200: 'extralight', 300: 'light', 400: 'regular', 500: 'medium', 600: 'semibold', 700: 'bold', 800: 'extrabold', 900: 'black' };
  for (const w of weights) {
    const num = parseInt(w.value);
    const name = weightNames[num] || `weight-${num}`;
    scale[`font-weight-${name}`] = w.value;
  }

  // Font families
  (typographyReport.fontFamilies || []).forEach((f, i) => {
    scale[`font-family-${i + 1}`] = f.value;
  });

  return scale;
}

// ─── Main token builder ──────────────────────────────────────────────────────

function buildAllTokens(colorsReport, typographyReport, spacingReport, bordersData) {
  const spacingScale = buildSpacingScale(spacingReport?.padding || []);
  const { palette, semanticTokens } = buildColorTokens(
    (colorsReport?.colors || []).map((c) => c.value),
    colorsReport?.byRole || {}
  );
  const typographyScale = buildTypographyScale(typographyReport || {});

  const borderRadii = {};
  const radiiNames = ['none', 'sm', 'base', 'md', 'lg', 'xl', '2xl', 'full'];

  return {
    meta: {
      description: 'Auto-generated design tokens from DOM inspection',
      source: 'dashboard-design-inspector',
    },
    colors: {
      palette,
      semantic: semanticTokens,
    },
    typography: typographyScale,
    spacing: spacingScale,
    borderRadius: borderRadii,
  };
}

module.exports = { buildAllTokens, buildColorTokens, buildSpacingScale, buildTypographyScale };
