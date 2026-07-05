'use strict';

// Browser-injected script — no require/module.exports
// Exposes window.__deepExtractor

(function () {
  const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'meta', 'head', 'link', 'title', 'template']);

  // ── Visibility check ────────────────────────────────────────────────────────
  function isVisible(el) {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    if (parseFloat(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }

  // ── Own text (direct text nodes only, not children) ─────────────────────────
  function ownText(el) {
    let t = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) t += node.textContent;
    }
    return t.trim() || null;
  }

  // ── Full element extraction ──────────────────────────────────────────────────
  function extractEl(el, depth) {
    const s  = getComputedStyle(el);
    const r  = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();

    // ── DOM metadata ──────────────────────────────────────────────────────────
    const dom = {
      tag,
      id:          el.id || null,
      classes:     Array.from(el.classList),
      ownText:     ownText(el),
      fullText:    el.innerText ? el.innerText.trim().replace(/\s+/g, ' ').slice(0, 300) : null,
      childCount:  el.children.length,
      role:        el.getAttribute('role')        || null,
      ariaLabel:   el.getAttribute('aria-label') || null,
      ariaHidden:  el.getAttribute('aria-hidden')|| null,
      type:        el.getAttribute('type')        || null,
      placeholder: el.getAttribute('placeholder')|| null,
      href:        tag === 'a' ? el.getAttribute('href') : null,
      src:         (tag === 'img' || tag === 'source') ? el.getAttribute('src') : null,
      alt:         el.getAttribute('alt')         || null,
      dataAttrs:   Object.fromEntries(
                     [...el.attributes]
                       .filter(a => a.name.startsWith('data-'))
                       .map(a => [a.name, a.value])
                   ),
    };

    // ── Geometry ──────────────────────────────────────────────────────────────
    const geometry = {
      x:           Math.round(r.x),
      y:           Math.round(r.y),
      width:       Math.round(r.width),
      height:      Math.round(r.height),
      right:       Math.round(r.right),
      bottom:      Math.round(r.bottom),
      aspectRatio: r.height > 0 ? parseFloat((r.width / r.height).toFixed(3)) : null,
    };

    // ── Layout ────────────────────────────────────────────────────────────────
    const layout = {
      display:            s.display,
      position:           s.position,
      top:                s.top,
      right:              s.right,
      bottom:             s.bottom,
      left:               s.left,
      zIndex:             s.zIndex,
      overflow:           s.overflow,
      overflowX:          s.overflowX,
      overflowY:          s.overflowY,
      // flex
      flexDirection:      s.flexDirection,
      flexWrap:           s.flexWrap,
      justifyContent:     s.justifyContent,
      alignItems:         s.alignItems,
      alignSelf:          s.alignSelf,
      justifySelf:        s.justifySelf,
      flex:               s.flex,
      flexGrow:           s.flexGrow,
      flexShrink:         s.flexShrink,
      flexBasis:          s.flexBasis,
      order:              s.order,
      // gap
      gap:                s.gap,
      rowGap:             s.rowGap,
      columnGap:          s.columnGap,
      // grid
      gridTemplateColumns: s.gridTemplateColumns,
      gridTemplateRows:    s.gridTemplateRows,
      gridColumn:         s.gridColumn,
      gridRow:            s.gridRow,
      gridArea:           s.gridArea,
      // sizing
      width:              s.width,
      height:             s.height,
      minWidth:           s.minWidth,
      maxWidth:           s.maxWidth,
      minHeight:          s.minHeight,
      maxHeight:          s.maxHeight,
      boxSizing:          s.boxSizing,
    };

    // ── Typography ────────────────────────────────────────────────────────────
    const fsRaw  = parseFloat(s.fontSize);
    const lhRaw  = s.lineHeight !== 'normal' ? parseFloat(s.lineHeight) : null;
    const lsRaw  = parseFloat(s.letterSpacing) || 0;

    const typography = {
      fontFamily:         s.fontFamily,
      // Primary family name only (first entry before comma)
      fontFamilyPrimary:  s.fontFamily.split(',')[0].trim().replace(/['"]/g, ''),
      fontSize:           s.fontSize,
      fontSizePx:         isNaN(fsRaw) ? null : fsRaw,
      fontWeight:         s.fontWeight,
      fontStyle:          s.fontStyle,
      fontVariant:        s.fontVariant,
      fontVariantNumeric: s.fontVariantNumeric,
      lineHeight:         s.lineHeight,
      lineHeightPx:       lhRaw,
      lineHeightRatio:    (lhRaw && fsRaw) ? parseFloat((lhRaw / fsRaw).toFixed(3)) : null,
      letterSpacing:      s.letterSpacing,
      letterSpacingPx:    lsRaw,
      wordSpacing:        s.wordSpacing,
      textTransform:      s.textTransform,
      textDecoration:     s.textDecoration,
      textDecorationLine: s.textDecorationLine,
      textAlign:          s.textAlign,
      textOverflow:       s.textOverflow,
      whiteSpace:         s.whiteSpace,
      wordBreak:          s.wordBreak,
      overflowWrap:       s.overflowWrap,
      textIndent:         s.textIndent,
      textShadow:         s.textShadow !== 'none' ? s.textShadow : null,
      color:              s.color,
      WebkitLineClamp:    s.webkitLineClamp || null,
    };

    // ── Colors ────────────────────────────────────────────────────────────────
    const colors = {
      color:                s.color,
      backgroundColor:      s.backgroundColor,
      backgroundImage:      s.backgroundImage !== 'none' ? s.backgroundImage : null,
      backgroundSize:       s.backgroundSize,
      backgroundPosition:   s.backgroundPosition,
      backgroundRepeat:     s.backgroundRepeat,
      backgroundAttachment: s.backgroundAttachment,
      backgroundBlendMode:  s.backgroundBlendMode !== 'normal' ? s.backgroundBlendMode : null,
      opacity:              s.opacity,
      mixBlendMode:         s.mixBlendMode !== 'normal' ? s.mixBlendMode : null,
    };

    // ── Spacing ───────────────────────────────────────────────────────────────
    const spacing = {
      paddingTop:    s.paddingTop,
      paddingRight:  s.paddingRight,
      paddingBottom: s.paddingBottom,
      paddingLeft:   s.paddingLeft,
      marginTop:     s.marginTop,
      marginRight:   s.marginRight,
      marginBottom:  s.marginBottom,
      marginLeft:    s.marginLeft,
      gap:           s.gap,
      rowGap:        s.rowGap,
      columnGap:     s.columnGap,
    };

    // ── Borders ───────────────────────────────────────────────────────────────
    const borders = {
      borderTopWidth:         s.borderTopWidth,
      borderRightWidth:       s.borderRightWidth,
      borderBottomWidth:      s.borderBottomWidth,
      borderLeftWidth:        s.borderLeftWidth,
      borderTopStyle:         s.borderTopStyle,
      borderRightStyle:       s.borderRightStyle,
      borderBottomStyle:      s.borderBottomStyle,
      borderLeftStyle:        s.borderLeftStyle,
      borderTopColor:         s.borderTopColor,
      borderRightColor:       s.borderRightColor,
      borderBottomColor:      s.borderBottomColor,
      borderLeftColor:        s.borderLeftColor,
      borderTopLeftRadius:    s.borderTopLeftRadius,
      borderTopRightRadius:   s.borderTopRightRadius,
      borderBottomRightRadius:s.borderBottomRightRadius,
      borderBottomLeftRadius: s.borderBottomLeftRadius,
      outline:                s.outline,
      outlineColor:           s.outlineColor,
      outlineWidth:           s.outlineWidth,
      outlineStyle:           s.outlineStyle,
      outlineOffset:          s.outlineOffset,
    };

    // ── Effects ───────────────────────────────────────────────────────────────
    const effects = {
      boxShadow:       s.boxShadow !== 'none' ? s.boxShadow : null,
      filter:          s.filter !== 'none' ? s.filter : null,
      backdropFilter:  s.backdropFilter !== 'none' ? s.backdropFilter : null,
      transform:       s.transform !== 'none' ? s.transform : null,
      transformOrigin: s.transformOrigin,
      transition:      s.transition,
      animation:       s.animation,
      cursor:          s.cursor,
      pointerEvents:   s.pointerEvents,
      userSelect:      s.userSelect,
      appearance:      s.appearance,
      resize:          s.resize,
      visibility:      s.visibility,
    };

    return { depth, dom, geometry, layout, typography, colors, spacing, borders, effects };
  }

  // ── Recursive walker ─────────────────────────────────────────────────────────
  function walk(el, depth, results) {
    if (!el || el.nodeType !== 1) return;
    if (SKIP_TAGS.has(el.tagName.toLowerCase())) return;
    if (!isVisible(el)) return;
    results.push(extractEl(el, depth));
    for (const child of el.children) {
      walk(child, depth + 1, results);
    }
  }

  window.__deepExtractor = {
    /**
     * Extract every element inside rootEl, recursively.
     * Returns an array of element objects grouped by concern.
     */
    extractSection(rootEl) {
      const results = [];
      walk(rootEl, 0, results);
      return results;
    },

    /** Single-element extraction (for spot checks). */
    extractElement(el) {
      return extractEl(el, 0);
    },

    /** Find a section by its h2/h3 heading text (case-insensitive contains). */
    findByHeading(headingText) {
      const lower = headingText.toLowerCase();
      for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
        if (h.textContent.trim().toLowerCase().includes(lower)) {
          return (
            h.closest('section') ||
            h.closest('[class*="l1-section"]') ||
            h.closest('[class*="l1-"]') ||
            h.parentElement?.parentElement ||
            null
          );
        }
      }
      return null;
    },
  };
})();
