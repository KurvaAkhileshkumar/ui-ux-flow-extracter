'use strict';

const path = require('path');
const { writeJSON } = require('./fileWriter');

// ── Helpers ──────────────────────────────────────────────────────────────────

const ZERO = new Set(['0px', '0%', '0', 'auto', 'none', 'normal', 'initial', 'unset']);
const isNonZero = (v) => v != null && !ZERO.has(String(v).trim());

const transparentBg = (v) =>
  !v || v === 'none' || v === 'transparent' || v === 'rgba(0, 0, 0, 0)';

const shortCls = (el) =>
  (el.dom?.classes || []).slice(0, 3).join(' ') || el.dom?.tag || '';

const label = (el) =>
  `<${el.dom?.tag}> ${shortCls(el)}${el.dom?.ownText ? ` "${el.dom.ownText.slice(0, 40)}"` : ''}`.trim();

// ── Writers ───────────────────────────────────────────────────────────────────

/**
 * typography.json
 * ─ uniqueFontStyles: one entry per unique font combination, with usage list
 * ─ allTextElements: every element that carries visible text
 */
function writeTypography(outputDir, meta, elements) {
  const textEls = elements.filter(el => el.dom?.fullText || el.dom?.ownText);

  // Build unique font-style map
  const fontMap = {};
  for (const el of textEls) {
    const t = el.typography;
    if (!t?.fontSize) continue;
    const key = [
      t.fontFamilyPrimary, t.fontSize, t.fontWeight, t.letterSpacing,
      t.textTransform, t.fontStyle, t.fontVariantNumeric,
    ].join('|');

    if (!fontMap[key]) {
      fontMap[key] = {
        fontFamilyPrimary: t.fontFamilyPrimary,
        fontFamily:        t.fontFamily,
        fontSize:          t.fontSize,
        fontSizePx:        t.fontSizePx,
        fontWeight:        t.fontWeight,
        fontStyle:         t.fontStyle,
        fontVariantNumeric:t.fontVariantNumeric,
        letterSpacing:     t.letterSpacing,
        letterSpacingPx:   t.letterSpacingPx,
        lineHeight:        t.lineHeight,
        lineHeightRatio:   t.lineHeightRatio,
        textTransform:     t.textTransform,
        textAlign:         t.textAlign,
        usedBy:            [],
      };
    }
    fontMap[key].usedBy.push({
      label:    label(el),
      color:    el.typography?.color,
      text:     (el.dom?.ownText || el.dom?.fullText || '').slice(0, 60),
    });
  }

  writeJSON(path.join(outputDir, 'typography.json'), {
    meta,
    summary: { uniqueFontStyles: Object.keys(fontMap).length, textElementCount: textEls.length },
    uniqueFontStyles: Object.values(fontMap),
    allTextElements: textEls.map(el => ({
      depth:             el.depth,
      label:             label(el),
      ownText:           el.dom?.ownText,
      fullText:          el.dom?.fullText?.slice(0, 120),
      fontFamilyPrimary: el.typography?.fontFamilyPrimary,
      fontSize:          el.typography?.fontSize,
      fontSizePx:        el.typography?.fontSizePx,
      fontWeight:        el.typography?.fontWeight,
      fontStyle:         el.typography?.fontStyle,
      fontVariantNumeric:el.typography?.fontVariantNumeric,
      letterSpacing:     el.typography?.letterSpacing,
      letterSpacingPx:   el.typography?.letterSpacingPx,
      lineHeight:        el.typography?.lineHeight,
      lineHeightRatio:   el.typography?.lineHeightRatio,
      textTransform:     el.typography?.textTransform,
      textDecoration:    el.typography?.textDecoration,
      textAlign:         el.typography?.textAlign,
      whiteSpace:        el.typography?.whiteSpace,
      color:             el.typography?.color,
      width:             el.geometry?.width,
      height:            el.geometry?.height,
    })),
  });
}

/**
 * colors.json
 * ─ palette: every unique color value with usage count and which roles it appears in
 * ─ allColoredElements: every element with non-transparent colors
 */
function writeColors(outputDir, meta, elements) {
  const colorMap = {};

  const addColor = (value, role, ref) => {
    if (!value || value === 'none' || transparentBg(value)) return;
    if (!colorMap[value]) colorMap[value] = { value, roles: {}, count: 0, examples: [] };
    colorMap[value].roles[role] = (colorMap[value].roles[role] || 0) + 1;
    colorMap[value].count++;
    if (colorMap[value].examples.length < 3) colorMap[value].examples.push(ref);
  };

  for (const el of elements) {
    const ref = label(el);
    addColor(el.colors?.color,           'text',       ref);
    addColor(el.colors?.backgroundColor, 'background', ref);
    addColor(el.borders?.borderTopColor, 'border',     ref);
    addColor(el.borders?.borderRightColor, 'border',   ref);
    addColor(el.borders?.borderBottomColor, 'border',  ref);
    addColor(el.borders?.borderLeftColor,  'border',   ref);
    addColor(el.effects?.boxShadow,       'shadow',    ref);
  }

  const coloredEls = elements.filter(el =>
    !transparentBg(el.colors?.backgroundColor) ||
    el.borders?.borderTopWidth !== '0px' ||
    el.effects?.boxShadow
  );

  writeJSON(path.join(outputDir, 'colors.json'), {
    meta,
    summary: { uniqueColors: Object.keys(colorMap).length, coloredElementCount: coloredEls.length },
    palette: Object.values(colorMap).sort((a, b) => b.count - a.count),
    allColoredElements: coloredEls.map(el => ({
      depth:           el.depth,
      label:           label(el),
      ownText:         el.dom?.ownText,
      textColor:       el.colors?.color,
      backgroundColor: el.colors?.backgroundColor,
      backgroundImage: el.colors?.backgroundImage,
      opacity:         el.colors?.opacity,
      borderColor:     el.borders?.borderTopColor,
      boxShadow:       el.effects?.boxShadow,
    })),
  });
}

/**
 * layout.json
 * ─ every element's geometry + flex/grid/position properties
 */
function writeLayout(outputDir, meta, elements) {
  writeJSON(path.join(outputDir, 'layout.json'), {
    meta,
    elements: elements.map(el => ({
      depth:   el.depth,
      label:   label(el),
      ownText: el.dom?.ownText?.slice(0, 40),
      geometry: el.geometry,
      display:  el.layout?.display,
      position: el.layout?.position,
      zIndex:   el.layout?.zIndex,
      overflow: el.layout?.overflow,
      flex: {
        direction:      el.layout?.flexDirection,
        wrap:           el.layout?.flexWrap,
        justifyContent: el.layout?.justifyContent,
        alignItems:     el.layout?.alignItems,
        alignSelf:      el.layout?.alignSelf,
        justifySelf:    el.layout?.justifySelf,
        flex:           el.layout?.flex,
        flexGrow:       el.layout?.flexGrow,
        flexShrink:     el.layout?.flexShrink,
        flexBasis:      el.layout?.flexBasis,
        order:          el.layout?.order,
        gap:            el.layout?.gap,
        rowGap:         el.layout?.rowGap,
        columnGap:      el.layout?.columnGap,
      },
      grid: {
        templateColumns: el.layout?.gridTemplateColumns,
        templateRows:    el.layout?.gridTemplateRows,
        column:          el.layout?.gridColumn,
        row:             el.layout?.gridRow,
        area:            el.layout?.gridArea,
      },
      sizing: {
        width:     el.layout?.width,
        height:    el.layout?.height,
        minWidth:  el.layout?.minWidth,
        maxWidth:  el.layout?.maxWidth,
        minHeight: el.layout?.minHeight,
        maxHeight: el.layout?.maxHeight,
        boxSizing: el.layout?.boxSizing,
      },
    })),
  });
}

/**
 * spacing.json
 * ─ only elements with non-zero padding / margin / gap
 */
function writeSpacing(outputDir, meta, elements) {
  const spacedEls = elements.filter(el => {
    const s = el.spacing || {};
    return (
      isNonZero(s.paddingTop) || isNonZero(s.paddingRight) ||
      isNonZero(s.paddingBottom) || isNonZero(s.paddingLeft) ||
      isNonZero(s.marginTop) || isNonZero(s.marginRight) ||
      isNonZero(s.marginBottom) || isNonZero(s.marginLeft) ||
      isNonZero(s.gap) || isNonZero(s.rowGap) || isNonZero(s.columnGap)
    );
  });

  writeJSON(path.join(outputDir, 'spacing.json'), {
    meta,
    summary: { spacedElementCount: spacedEls.length },
    elements: spacedEls.map(el => ({
      depth:  el.depth,
      label:  label(el),
      ownText:el.dom?.ownText?.slice(0, 40),
      geometry: { width: el.geometry?.width, height: el.geometry?.height },
      padding: {
        top:    el.spacing?.paddingTop,
        right:  el.spacing?.paddingRight,
        bottom: el.spacing?.paddingBottom,
        left:   el.spacing?.paddingLeft,
      },
      margin: {
        top:    el.spacing?.marginTop,
        right:  el.spacing?.marginRight,
        bottom: el.spacing?.marginBottom,
        left:   el.spacing?.marginLeft,
      },
      gap:       el.spacing?.gap,
      rowGap:    el.spacing?.rowGap,
      columnGap: el.spacing?.columnGap,
    })),
  });
}

/**
 * borders.json
 * ─ only elements with visible borders or non-zero border-radius
 */
function writeBorders(outputDir, meta, elements) {
  const borderedEls = elements.filter(el => {
    const b = el.borders || {};
    return (
      isNonZero(b.borderTopWidth) || isNonZero(b.borderRightWidth) ||
      isNonZero(b.borderBottomWidth) || isNonZero(b.borderLeftWidth) ||
      isNonZero(b.borderTopLeftRadius) || isNonZero(b.borderTopRightRadius) ||
      isNonZero(b.borderBottomRightRadius) || isNonZero(b.borderBottomLeftRadius) ||
      isNonZero(b.outlineWidth)
    );
  });

  writeJSON(path.join(outputDir, 'borders.json'), {
    meta,
    summary: { borderedElementCount: borderedEls.length },
    elements: borderedEls.map(el => ({
      depth:   el.depth,
      label:   label(el),
      ownText: el.dom?.ownText?.slice(0, 40),
      geometry: { width: el.geometry?.width, height: el.geometry?.height },
      borderWidth: {
        top:    el.borders?.borderTopWidth,
        right:  el.borders?.borderRightWidth,
        bottom: el.borders?.borderBottomWidth,
        left:   el.borders?.borderLeftWidth,
      },
      borderStyle: {
        top:    el.borders?.borderTopStyle,
        right:  el.borders?.borderRightStyle,
        bottom: el.borders?.borderBottomStyle,
        left:   el.borders?.borderLeftStyle,
      },
      borderColor: {
        top:    el.borders?.borderTopColor,
        right:  el.borders?.borderRightColor,
        bottom: el.borders?.borderBottomColor,
        left:   el.borders?.borderLeftColor,
      },
      borderRadius: {
        topLeft:     el.borders?.borderTopLeftRadius,
        topRight:    el.borders?.borderTopRightRadius,
        bottomRight: el.borders?.borderBottomRightRadius,
        bottomLeft:  el.borders?.borderBottomLeftRadius,
      },
      outline: {
        width:  el.borders?.outlineWidth,
        style:  el.borders?.outlineStyle,
        color:  el.borders?.outlineColor,
        offset: el.borders?.outlineOffset,
      },
    })),
  });
}

/**
 * effects.json
 * ─ elements with box-shadow, text-shadow, filter, transform, animation
 */
function writeEffects(outputDir, meta, elements) {
  const effectEls = elements.filter(el => {
    const e = el.effects || {};
    const t = el.typography || {};
    return e.boxShadow || t.textShadow || e.filter || e.backdropFilter ||
           (e.transform && e.transform !== 'matrix(1, 0, 0, 1, 0, 0)');
  });

  writeJSON(path.join(outputDir, 'effects.json'), {
    meta,
    summary: { effectElementCount: effectEls.length },
    elements: effectEls.map(el => ({
      depth:          el.depth,
      label:          label(el),
      ownText:        el.dom?.ownText?.slice(0, 40),
      geometry:       { width: el.geometry?.width, height: el.geometry?.height },
      boxShadow:      el.effects?.boxShadow,
      textShadow:     el.typography?.textShadow,
      filter:         el.effects?.filter,
      backdropFilter: el.effects?.backdropFilter,
      transform:      el.effects?.transform,
      transformOrigin:el.effects?.transformOrigin,
      transition:     el.effects?.transition,
      animation:      el.effects?.animation,
      opacity:        el.colors?.opacity,
      cursor:         el.effects?.cursor,
    })),
  });
}

/**
 * components.json
 * ─ detected UI patterns: buttons, inputs, links, images, svgs, badges, cards
 */
function writeComponents(outputDir, meta, elements) {
  const buttons  = [];
  const inputs   = [];
  const links    = [];
  const images   = [];
  const svgs     = [];
  const checkboxes = [];
  const textareas  = [];

  for (const el of elements) {
    const tag    = el.dom?.tag;
    const cls    = (el.dom?.classes || []).join(' ');
    const role   = el.dom?.role;
    const t      = el.typography;
    const c      = el.colors;
    const b      = el.borders;
    const s      = el.spacing;
    const g      = el.geometry;
    const e      = el.effects;

    if (tag === 'button' || role === 'button') {
      buttons.push({
        label:           label(el),
        text:            el.dom?.fullText?.slice(0, 80),
        classes:         cls,
        geometry:        g,
        fontSize:        t?.fontSize,
        fontFamilyPrimary: t?.fontFamilyPrimary,
        fontWeight:      t?.fontWeight,
        color:           c?.color,
        backgroundColor: c?.backgroundColor,
        border:          `${b?.borderTopWidth} ${b?.borderTopStyle} ${b?.borderTopColor}`,
        borderRadius: {
          topLeft:     b?.borderTopLeftRadius,
          topRight:    b?.borderTopRightRadius,
          bottomRight: b?.borderBottomRightRadius,
          bottomLeft:  b?.borderBottomLeftRadius,
        },
        padding: {
          top: s?.paddingTop, right: s?.paddingRight,
          bottom: s?.paddingBottom, left: s?.paddingLeft,
        },
        boxShadow:  e?.boxShadow,
        cursor:     e?.cursor,
        transition: e?.transition,
      });
    }

    if (tag === 'input') {
      const type = el.dom?.type;
      if (type === 'checkbox' || type === 'radio') {
        checkboxes.push({ label: label(el), type, geometry: g, classes: cls });
      } else {
        inputs.push({
          label:       label(el),
          type:        type || 'text',
          placeholder: el.dom?.placeholder,
          classes:     cls,
          geometry:    g,
          fontSize:    t?.fontSize,
          border:      `${b?.borderTopWidth} ${b?.borderTopStyle} ${b?.borderTopColor}`,
          borderRadius: b?.borderTopLeftRadius,
          padding:     `${s?.paddingTop} ${s?.paddingRight} ${s?.paddingBottom} ${s?.paddingLeft}`,
        });
      }
    }

    if (tag === 'textarea') {
      textareas.push({ label: label(el), classes: cls, geometry: g });
    }

    if (tag === 'a') {
      links.push({
        label:    label(el),
        text:     el.dom?.fullText?.slice(0, 60),
        href:     el.dom?.href,
        classes:  cls,
        color:    c?.color,
        fontSize: t?.fontSize,
        fontWeight: t?.fontWeight,
        textDecoration: t?.textDecoration,
        geometry: g,
      });
    }

    if (tag === 'img') {
      images.push({
        label:    label(el),
        src:      el.dom?.src,
        alt:      el.dom?.alt,
        classes:  cls,
        geometry: g,
        objectFit: getComputedStyle ? null : null, // captured in layout
      });
    }

    if (tag === 'svg') {
      svgs.push({
        label:   label(el),
        classes: cls,
        geometry: g,
        color:   c?.color,
        fill:    c?.color,
      });
    }
  }

  writeJSON(path.join(outputDir, 'components.json'), {
    meta,
    summary: {
      buttons:   buttons.length,
      inputs:    inputs.length,
      checkboxes:checkboxes.length,
      textareas: textareas.length,
      links:     links.length,
      images:    images.length,
      svgs:      svgs.length,
    },
    components: { buttons, inputs, checkboxes, textareas, links, images, svgs },
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Writes all split report files for a section.
 * @param {string} outputDir   - absolute path to the feature folder
 * @param {string} sectionName - human-readable section name
 * @param {Array}  elements    - raw element array from deepExtractor
 */
function writeSectionReports(outputDir, sectionName, elements) {
  const now  = new Date().toISOString();
  const meta = { section: sectionName, extractedAt: now, elementCount: elements.length };

  console.log(`\n  📝 Writing reports for "${sectionName}" (${elements.length} elements)…`);

  writeTypography(outputDir, meta, elements);
  writeColors(outputDir, meta, elements);
  writeLayout(outputDir, meta, elements);
  writeSpacing(outputDir, meta, elements);
  writeBorders(outputDir, meta, elements);
  writeEffects(outputDir, meta, elements);
  writeComponents(outputDir, meta, elements);

  console.log(`  ✅ 7 files written → ${outputDir}`);
}

module.exports = { writeSectionReports };
