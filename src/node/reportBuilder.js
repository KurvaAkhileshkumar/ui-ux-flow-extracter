'use strict';

/**
 * reportBuilder.js — Builds typed JSON reports from raw extracted element data.
 */

// ─── Normalise colour strings ──────────────────────────────────────────────

const SKIP_COLORS = new Set(['none', 'transparent', 'inherit', 'initial', 'unset', 'currentcolor', 'currentColor', '']);

function isSkipColor(c) {
  if (!c) return true;
  const lc = c.toLowerCase().trim();
  return SKIP_COLORS.has(lc) || lc === 'rgba(0, 0, 0, 0)';
}

function normaliseColor(c) {
  if (!c) return null;
  return c.trim();
}

// ─── Typography Report ──────────────────────────────────────────────────────

function buildTypographyReport(elements) {
  const fontFamilies = new Map();
  const fontSizes = new Map();
  const fontWeights = new Map();
  const textColors = new Map();
  const lineHeights = new Map();
  const letterSpacings = new Map();
  const textAligns = new Map();
  const textTransforms = new Map();
  const textDecorations = new Map();

  const register = (map, value, selector) => {
    if (!value || value === 'normal' || value === 'none') return;
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(selector);
  };

  for (const el of elements) {
    const t = el.typography;
    const sel = el.dom?.cssSelector || '';
    if (!t) continue;

    register(fontFamilies, t.fontFamily, sel);
    register(fontSizes, t.fontSize, sel);
    register(fontWeights, t.fontWeight, sel);
    if (!isSkipColor(t.textColor)) register(textColors, normaliseColor(t.textColor), sel);
    register(lineHeights, t.lineHeight, sel);
    register(letterSpacings, t.letterSpacing, sel);
    register(textAligns, t.textAlign, sel);
    register(textTransforms, t.textTransform, sel);
    register(textDecorations, t.textDecoration, sel);
  }

  const toEntry = (map) =>
    Array.from(map.entries())
      .map(([value, selectors]) => ({ value, occurrences: selectors.length, selectors: selectors.slice(0, 5) }))
      .sort((a, b) => b.occurrences - a.occurrences);

  return {
    summary: {
      uniqueFontFamilies: fontFamilies.size,
      uniqueFontSizes: fontSizes.size,
      uniqueFontWeights: fontWeights.size,
      uniqueTextColors: textColors.size,
      uniqueLineHeights: lineHeights.size,
    },
    fontFamilies: toEntry(fontFamilies),
    fontSizes: toEntry(fontSizes),
    fontWeights: toEntry(fontWeights),
    textColors: toEntry(textColors),
    lineHeights: toEntry(lineHeights),
    letterSpacings: toEntry(letterSpacings),
    textAligns: toEntry(textAligns),
    textTransforms: toEntry(textTransforms),
    textDecorations: toEntry(textDecorations),
  };
}

// ─── Colors Report ──────────────────────────────────────────────────────────

function buildColorsReport(elements) {
  // { colorValue -> { usages: [{role, selector}], count } }
  const colorMap = new Map();

  const add = (color, role, selector) => {
    if (isSkipColor(color)) return;
    const key = normaliseColor(color);
    if (!colorMap.has(key)) colorMap.set(key, { usages: [], count: 0 });
    const entry = colorMap.get(key);
    entry.count++;
    if (entry.usages.length < 8) entry.usages.push({ role, selector });
  };

  for (const el of elements) {
    const sel = el.dom?.cssSelector || '';
    const t = el.typography;
    const bg = el.background;
    const b = el.borders;
    const fx = el.effects;
    const svg = el.svg;

    if (t) add(t.textColor, 'text', sel);
    if (bg) {
      add(bg.backgroundColor, 'background', sel);
      if (bg.backgroundImage && bg.backgroundImage !== 'none') {
        add(bg.backgroundImage, 'backgroundImage', sel);
      }
    }
    if (b) {
      add(b.borderTopColor, 'border', sel);
      add(b.borderRightColor, 'border', sel);
      add(b.borderBottomColor, 'border', sel);
      add(b.borderLeftColor, 'border', sel);
      add(b.outlineColor, 'outline', sel);
    }
    if (fx && fx.boxShadow !== 'none') {
      add(fx.boxShadow, 'boxShadow', sel);
    }
    if (svg) {
      add(svg.fill, 'svgFill', sel);
      add(svg.stroke, 'svgStroke', sel);
    }
  }

  const colors = Array.from(colorMap.entries())
    .map(([value, data]) => ({ value, count: data.count, usages: data.usages }))
    .sort((a, b) => b.count - a.count);

  const byRole = {};
  for (const [value, data] of colorMap.entries()) {
    for (const { role } of data.usages) {
      if (!byRole[role]) byRole[role] = [];
      if (!byRole[role].includes(value)) byRole[role].push(value);
    }
  }

  return {
    summary: { totalUniqueColors: colorMap.size },
    colors,
    byRole,
  };
}

// ─── Spacing Report ─────────────────────────────────────────────────────────

function buildSpacingReport(elements) {
  const paddingValues = new Map();
  const marginValues = new Map();
  const gapValues = new Map();

  const register = (map, value, selector) => {
    if (!value || value === '0px' || value === 'auto' || value === 'normal') return;
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(selector);
  };

  const addSpacing = (map, top, right, bottom, left, selector) => {
    register(map, top, selector);
    register(map, right, selector);
    register(map, bottom, selector);
    register(map, left, selector);
  };

  for (const el of elements) {
    const sp = el.spacing;
    const sel = el.dom?.cssSelector || '';
    if (!sp) continue;

    addSpacing(paddingValues, sp.paddingTop, sp.paddingRight, sp.paddingBottom, sp.paddingLeft, sel);
    addSpacing(marginValues, sp.marginTop, sp.marginRight, sp.marginBottom, sp.marginLeft, sel);
    register(gapValues, sp.gap, sel);
    register(gapValues, sp.rowGap, sel);
    register(gapValues, sp.columnGap, sel);
  }

  const toSorted = (map) =>
    Array.from(map.entries())
      .map(([value, selectors]) => ({
        value,
        valuePx: parseFloat(value),
        occurrences: selectors.length,
        selectors: selectors.slice(0, 5),
      }))
      .sort((a, b) => a.valuePx - b.valuePx);

  return {
    summary: {
      uniquePaddingValues: paddingValues.size,
      uniqueMarginValues: marginValues.size,
      uniqueGapValues: gapValues.size,
    },
    padding: toSorted(paddingValues),
    margin: toSorted(marginValues),
    gap: toSorted(gapValues),
  };
}

// ─── Layout Report ──────────────────────────────────────────────────────────

function buildLayoutReport(elements) {
  const displayTypes = new Map();
  const positions = new Map();
  const flexLayouts = [];
  const gridLayouts = [];
  const overflows = new Map();
  const zIndexes = new Map();

  const reg = (map, value, selector) => {
    if (!value || value === 'static' || value === 'auto' || value === 'visible' || value === '0') return;
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(selector);
  };

  for (const el of elements) {
    const lyt = el.layout;
    const sel = el.dom?.cssSelector || '';
    if (!lyt) continue;

    reg(displayTypes, lyt.display, sel);
    reg(positions, lyt.position, sel);
    reg(overflows, lyt.overflow, sel);
    reg(zIndexes, lyt.zIndex, sel);

    if (lyt.display === 'flex' || lyt.display === 'inline-flex') {
      flexLayouts.push({
        selector: sel,
        flexDirection: lyt.flexDirection,
        justifyContent: lyt.justifyContent,
        alignItems: lyt.alignItems,
        flexWrap: lyt.flexWrap,
        gap: el.spacing?.gap,
      });
    }

    if (lyt.display === 'grid' || lyt.display === 'inline-grid') {
      gridLayouts.push({
        selector: sel,
        gridTemplateColumns: lyt.gridTemplateColumns,
        gridTemplateRows: lyt.gridTemplateRows,
        gap: el.spacing?.gap,
      });
    }
  }

  const toArr = (map) =>
    Array.from(map.entries())
      .map(([value, selectors]) => ({ value, occurrences: selectors.length, selectors: selectors.slice(0, 5) }))
      .sort((a, b) => b.occurrences - a.occurrences);

  return {
    summary: {
      uniqueDisplayTypes: displayTypes.size,
      flexContainers: flexLayouts.length,
      gridContainers: gridLayouts.length,
    },
    displayTypes: toArr(displayTypes),
    positions: toArr(positions),
    overflows: toArr(overflows),
    zIndexes: toArr(zIndexes),
    flexLayouts,
    gridLayouts,
  };
}

// ─── Components Report ──────────────────────────────────────────────────────

function buildComponentsReport(elements) {
  const componentGroups = {};

  for (const el of elements) {
    const type = el._meta?.componentType || 'element';
    if (!componentGroups[type]) componentGroups[type] = [];

    componentGroups[type].push({
      selector: el.dom?.cssSelector,
      tag: el.dom?.tag,
      text: el.dom?.text,
      id: el.dom?.id,
      classList: el.dom?.classList,
      geometry: el.geometry
        ? { x: el.geometry.x, y: el.geometry.y, width: el.geometry.width, height: el.geometry.height }
        : null,
      fontSize: el.typography?.fontSize,
      fontWeight: el.typography?.fontWeight,
      textColor: el.typography?.textColor,
      backgroundColor: el.background?.backgroundColor,
      borderRadius: el.borders?.borderRadius,
      boxShadow: el.effects?.boxShadow,
      padding: {
        top: el.spacing?.paddingTop,
        right: el.spacing?.paddingRight,
        bottom: el.spacing?.paddingBottom,
        left: el.spacing?.paddingLeft,
      },
    });
  }

  const summary = Object.fromEntries(
    Object.entries(componentGroups).map(([type, items]) => [type, items.length])
  );

  return { summary, componentGroups };
}

// ─── Design Tokens ──────────────────────────────────────────────────────────

function buildDesignTokens(elements) {
  const colorSet = new Set();
  const fontFamilySet = new Set();
  const fontSizeMap = new Map();
  const fontWeightSet = new Set();
  const spacingSet = new Set();
  const borderRadiusSet = new Set();
  const shadowSet = new Set();
  const lineHeightSet = new Set();
  const transitionSet = new Set();

  for (const el of elements) {
    const t = el.typography;
    const bg = el.background;
    const b = el.borders;
    const sp = el.spacing;
    const fx = el.effects;

    if (t) {
      if (!isSkipColor(t.textColor)) colorSet.add(t.textColor);
      if (t.fontFamily) fontFamilySet.add(t.fontFamily);
      if (t.fontSize) fontSizeMap.set(t.fontSize, parseFloat(t.fontSize));
      if (t.fontWeight && t.fontWeight !== 'normal') fontWeightSet.add(t.fontWeight);
      if (t.lineHeight && t.lineHeight !== 'normal') lineHeightSet.add(t.lineHeight);
    }
    if (bg && !isSkipColor(bg.backgroundColor)) colorSet.add(bg.backgroundColor);
    if (b) {
      if (b.borderRadius && b.borderRadius !== '0px') borderRadiusSet.add(b.borderRadius);
    }
    if (sp) {
      [sp.paddingTop, sp.paddingRight, sp.paddingBottom, sp.paddingLeft,
       sp.marginTop, sp.marginRight, sp.marginBottom, sp.marginLeft,
       sp.gap, sp.rowGap, sp.columnGap].forEach((v) => {
        if (v && v !== '0px' && v !== 'auto' && v !== 'normal') spacingSet.add(v);
      });
    }
    if (fx) {
      if (fx.boxShadow && fx.boxShadow !== 'none') shadowSet.add(fx.boxShadow);
      if (fx.transition && fx.transition !== 'none' && fx.transition !== 'all 0s ease 0s') {
        transitionSet.add(fx.transition);
      }
    }
  }

  // Sort font sizes numerically
  const fontSizes = Array.from(fontSizeMap.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([value]) => value);

  // Create a token-like structure
  const spacingScale = Array.from(spacingSet)
    .map((v) => ({ value: v, px: parseFloat(v) }))
    .sort((a, b) => a.px - b.px);

  const radii = Array.from(borderRadiusSet)
    .map((v) => ({ value: v, px: parseFloat(v) }))
    .sort((a, b) => a.px - b.px);

  return {
    meta: { generatedFrom: 'extracted DOM properties', elementCount: elements.length },
    colors: Array.from(colorSet),
    typography: {
      fontFamilies: Array.from(fontFamilySet),
      fontSizes,
      fontWeights: Array.from(fontWeightSet),
      lineHeights: Array.from(lineHeightSet),
    },
    spacing: spacingScale,
    borderRadius: radii,
    shadows: Array.from(shadowSet),
    transitions: Array.from(transitionSet),
    summary: {
      totalColors: colorSet.size,
      totalFontFamilies: fontFamilySet.size,
      totalFontSizes: fontSizeMap.size,
      totalSpacingValues: spacingSet.size,
      totalBorderRadii: borderRadiusSet.size,
      totalShadows: shadowSet.size,
    },
  };
}

// ─── Summary Statistics ─────────────────────────────────────────────────────

function buildSummary(allElements, pageMeta, sectionResults) {
  const colorSet = new Set();
  const fontSizeSet = new Set();
  const fontFamilySet = new Set();
  const borderRadiusSet = new Set();
  const shadowSet = new Set();
  const spacingSet = new Set();
  const componentTypeCounts = {};

  for (const el of allElements) {
    const t = el.typography;
    const bg = el.background;
    const b = el.borders;
    const sp = el.spacing;
    const fx = el.effects;
    const type = el._meta?.componentType;

    if (type) componentTypeCounts[type] = (componentTypeCounts[type] || 0) + 1;

    if (t) {
      if (!isSkipColor(t.textColor)) colorSet.add(t.textColor);
      if (t.fontSize) fontSizeSet.add(t.fontSize);
      if (t.fontFamily) fontFamilySet.add(t.fontFamily);
    }
    if (bg && !isSkipColor(bg.backgroundColor)) colorSet.add(bg.backgroundColor);
    if (b && b.borderRadius && b.borderRadius !== '0px') borderRadiusSet.add(b.borderRadius);
    if (fx && fx.boxShadow && fx.boxShadow !== 'none') shadowSet.add(fx.boxShadow);
    if (sp) {
      [sp.paddingTop, sp.paddingRight, sp.paddingBottom, sp.paddingLeft,
       sp.marginTop, sp.marginRight, sp.marginBottom, sp.marginLeft,
       sp.gap].forEach((v) => {
        if (v && v !== '0px' && v !== 'auto' && v !== 'normal') spacingSet.add(v);
      });
    }
  }

  return {
    page: pageMeta,
    sections: Object.fromEntries(
      Object.entries(sectionResults).map(([name, res]) => [
        name,
        {
          found: res.found,
          method: res.method,
          sectionSelector: res.sectionSelector,
          elementCount: res.elements?.length ?? 0,
        },
      ])
    ),
    statistics: {
      totalElements: allElements.length,
      uniqueColors: colorSet.size,
      uniqueFontSizes: fontSizeSet.size,
      uniqueFontFamilies: fontFamilySet.size,
      uniqueBorderRadii: borderRadiusSet.size,
      uniqueShadows: shadowSet.size,
      uniqueSpacingValues: spacingSet.size,
      componentTypeCounts,
    },
    topColors: Array.from(colorSet).slice(0, 30),
    topFontSizes: Array.from(fontSizeSet).slice(0, 20),
    topFontFamilies: Array.from(fontFamilySet),
    topBorderRadii: Array.from(borderRadiusSet).slice(0, 20),
    topShadows: Array.from(shadowSet).slice(0, 10),
  };
}

module.exports = {
  buildTypographyReport,
  buildColorsReport,
  buildSpacingReport,
  buildLayoutReport,
  buildComponentsReport,
  buildDesignTokens,
  buildSummary,
};
