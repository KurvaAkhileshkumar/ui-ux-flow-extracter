/**
 * domInspector.js — Browser-side design property extractor.
 * Injected into the page via page.addScriptTag().
 * Sets window.__inspector with all extraction utilities.
 */
(function () {
  'use strict';

  // ─── Visibility ────────────────────────────────────────────────────────────

  function isVisible(el) {
    const s = window.getComputedStyle(el);
    if (s.display === 'none') return false;
    if (s.visibility === 'hidden' || s.visibility === 'collapse') return false;
    if (parseFloat(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) {
      if (!el.closest('svg')) return false;
    }
    return true;
  }

  // ─── CSS Selector ──────────────────────────────────────────────────────────

  function escapeCSS(str) {
    return str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }

  function getCSSSelector(el) {
    const parts = [];
    let cur = el;

    while (cur && cur !== document.documentElement && cur !== document.body && parts.length < 7) {
      if (cur.id) {
        parts.unshift(`#${escapeCSS(cur.id)}`);
        break;
      }

      let segment = cur.tagName.toLowerCase();

      const classes = Array.from(cur.classList)
        .filter((c) => !/^(hover|focus|active|disabled|selected|open|closed|visible|hidden)$/.test(c))
        .slice(0, 2);
      if (classes.length) segment += '.' + classes.map(escapeCSS).join('.');

      const parent = cur.parentElement;
      if (parent) {
        const sameTag = Array.from(parent.children).filter((s) => s.tagName === cur.tagName);
        if (sameTag.length > 1) {
          segment += `:nth-of-type(${sameTag.indexOf(cur) + 1})`;
        }
      }

      parts.unshift(segment);
      cur = cur.parentElement;
    }

    return parts.join(' > ') || el.tagName.toLowerCase();
  }

  // ─── XPath ─────────────────────────────────────────────────────────────────

  function getXPath(el) {
    if (el.id) return `//*[@id="${el.id}"]`;

    const parts = [];
    let cur = el;

    while (cur && cur.nodeType === Node.ELEMENT_NODE) {
      const tag = cur.tagName.toLowerCase();
      const parent = cur.parentElement;

      if (parent) {
        const siblings = Array.from(parent.children).filter((s) => s.tagName === cur.tagName);
        parts.unshift(siblings.length > 1 ? `${tag}[${siblings.indexOf(cur) + 1}]` : tag);
      } else {
        parts.unshift(tag);
      }

      cur = cur.parentElement;
    }

    return '/' + parts.join('/');
  }

  // ─── DOM ───────────────────────────────────────────────────────────────────

  function extractDOM(el) {
    const attrs = {};
    Array.from(el.attributes).forEach((a) => (attrs[a.name] = a.value));

    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      classList: Array.from(el.classList),
      attributes: attrs,
      text: (el.textContent || '').trim().substring(0, 300) || null,
      innerHTML: el.innerHTML.substring(0, 800),
      outerHTML: el.outerHTML.substring(0, 1200),
      cssSelector: getCSSSelector(el),
      xpath: getXPath(el),
      parentSelector: el.parentElement ? getCSSSelector(el.parentElement) : null,
      childrenCount: el.children.length,
      role: el.getAttribute('role') || null,
      ariaLabel: el.getAttribute('aria-label') || null,
    };
  }

  // ─── Geometry ──────────────────────────────────────────────────────────────

  function extractGeometry(el) {
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const sx = window.scrollX;
    const sy = window.scrollY;

    const inViewport = r.top < vh && r.bottom > 0 && r.left < vw && r.right > 0;
    const fullyVisible = r.top >= 0 && r.left >= 0 && r.bottom <= vh && r.right <= vw;

    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      top: r.top,
      right: r.right,
      bottom: r.bottom,
      left: r.left,
      clientRect: { x: r.x, y: r.y, width: r.width, height: r.height },
      absoluteTop: r.top + sy,
      absoluteLeft: r.left + sx,
      aspectRatio: r.height > 0 ? +(r.width / r.height).toFixed(3) : null,
      viewportVisibility: {
        inViewport,
        fullyVisible,
        partiallyVisible: inViewport && !fullyVisible,
        viewportWidth: vw,
        viewportHeight: vh,
      },
    };
  }

  // ─── Typography ────────────────────────────────────────────────────────────

  function extractTypography(el, s) {
    return {
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontSizePx: parseFloat(s.fontSize),
      fontWeight: s.fontWeight,
      fontStyle: s.fontStyle,
      fontVariant: s.fontVariant,
      fontStretch: s.fontStretch,
      lineHeight: s.lineHeight,
      letterSpacing: s.letterSpacing,
      wordSpacing: s.wordSpacing,
      textTransform: s.textTransform,
      textDecoration: s.textDecoration,
      textDecorationColor: s.textDecorationColor,
      textDecorationStyle: s.textDecorationStyle,
      textDecorationLine: s.textDecorationLine,
      textAlign: s.textAlign,
      textColor: s.color,
      opacity: s.opacity,
      textShadow: s.textShadow,
      verticalAlign: s.verticalAlign,
      whiteSpace: s.whiteSpace,
      wordBreak: s.wordBreak,
      wordWrap: s.wordWrap,
      textOverflow: s.textOverflow,
      direction: s.direction,
      writingMode: s.writingMode,
      textRendering: s.textRendering,
      userSelect: s.userSelect,
      caretColor: s.caretColor,
    };
  }

  // ─── Background ────────────────────────────────────────────────────────────

  function extractBackground(el, s) {
    const bgImage = s.backgroundImage;
    return {
      backgroundColor: s.backgroundColor,
      backgroundImage: bgImage,
      hasGradient: bgImage.includes('gradient'),
      hasImage: bgImage !== 'none' && !bgImage.includes('gradient'),
      backgroundRepeat: s.backgroundRepeat,
      backgroundPosition: s.backgroundPosition,
      backgroundSize: s.backgroundSize,
      backgroundAttachment: s.backgroundAttachment,
      backgroundClip: s.backgroundClip,
      backgroundOrigin: s.backgroundOrigin,
      backgroundBlendMode: s.backgroundBlendMode,
    };
  }

  // ─── Borders ───────────────────────────────────────────────────────────────

  function extractBorders(el, s) {
    return {
      borderTopWidth: s.borderTopWidth,
      borderRightWidth: s.borderRightWidth,
      borderBottomWidth: s.borderBottomWidth,
      borderLeftWidth: s.borderLeftWidth,
      borderTopColor: s.borderTopColor,
      borderRightColor: s.borderRightColor,
      borderBottomColor: s.borderBottomColor,
      borderLeftColor: s.borderLeftColor,
      borderTopStyle: s.borderTopStyle,
      borderRightStyle: s.borderRightStyle,
      borderBottomStyle: s.borderBottomStyle,
      borderLeftStyle: s.borderLeftStyle,
      borderRadius: s.borderRadius,
      borderTopLeftRadius: s.borderTopLeftRadius,
      borderTopRightRadius: s.borderTopRightRadius,
      borderBottomRightRadius: s.borderBottomRightRadius,
      borderBottomLeftRadius: s.borderBottomLeftRadius,
      outline: s.outline,
      outlineColor: s.outlineColor,
      outlineWidth: s.outlineWidth,
      outlineStyle: s.outlineStyle,
      outlineOffset: s.outlineOffset,
    };
  }

  // ─── Spacing ───────────────────────────────────────────────────────────────

  function extractSpacing(el, s) {
    return {
      paddingTop: s.paddingTop,
      paddingRight: s.paddingRight,
      paddingBottom: s.paddingBottom,
      paddingLeft: s.paddingLeft,
      marginTop: s.marginTop,
      marginRight: s.marginRight,
      marginBottom: s.marginBottom,
      marginLeft: s.marginLeft,
      gap: s.gap,
      rowGap: s.rowGap,
      columnGap: s.columnGap,
    };
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

  function extractLayout(el, s) {
    return {
      display: s.display,
      flexDirection: s.flexDirection,
      flexWrap: s.flexWrap,
      justifyContent: s.justifyContent,
      alignItems: s.alignItems,
      alignContent: s.alignContent,
      alignSelf: s.alignSelf,
      justifySelf: s.justifySelf,
      flex: s.flex,
      flexGrow: s.flexGrow,
      flexShrink: s.flexShrink,
      flexBasis: s.flexBasis,
      order: s.order,
      gridTemplateColumns: s.gridTemplateColumns,
      gridTemplateRows: s.gridTemplateRows,
      gridTemplateAreas: s.gridTemplateAreas,
      gridColumn: s.gridColumn,
      gridRow: s.gridRow,
      gridArea: s.gridArea,
      gridAutoFlow: s.gridAutoFlow,
      gridAutoColumns: s.gridAutoColumns,
      gridAutoRows: s.gridAutoRows,
      position: s.position,
      top: s.top,
      right: s.right,
      bottom: s.bottom,
      left: s.left,
      zIndex: s.zIndex,
      overflow: s.overflow,
      overflowX: s.overflowX,
      overflowY: s.overflowY,
      boxSizing: s.boxSizing,
      float: s.float,
      clear: s.clear,
      width: s.width,
      minWidth: s.minWidth,
      maxWidth: s.maxWidth,
      height: s.height,
      minHeight: s.minHeight,
      maxHeight: s.maxHeight,
    };
  }

  // ─── Effects ───────────────────────────────────────────────────────────────

  function extractEffects(el, s) {
    return {
      boxShadow: s.boxShadow,
      filter: s.filter,
      backdropFilter: s.backdropFilter,
      transform: s.transform,
      transformOrigin: s.transformOrigin,
      transformStyle: s.transformStyle,
      perspective: s.perspective,
      transition: s.transition,
      transitionProperty: s.transitionProperty,
      transitionDuration: s.transitionDuration,
      transitionTimingFunction: s.transitionTimingFunction,
      transitionDelay: s.transitionDelay,
      animation: s.animation,
      animationName: s.animationName,
      animationDuration: s.animationDuration,
      willChange: s.willChange,
      cursor: s.cursor,
      pointerEvents: s.pointerEvents,
      isolation: s.isolation,
      mixBlendMode: s.mixBlendMode,
      maskImage: s.maskImage,
    };
  }

  // ─── SVG / Icons ───────────────────────────────────────────────────────────

  function extractSVG(el, s) {
    const isSVG = el.tagName.toLowerCase() === 'svg';
    const inSVG = !isSVG && !!el.closest('svg');
    if (!isSVG && !inSVG) return null;

    const svgRoot = isSVG ? el : el.closest('svg');

    return {
      isSVGRoot: isSVG,
      isInsideSVG: inSVG,
      svgOuterHTML: svgRoot ? svgRoot.outerHTML.substring(0, 2000) : null,
      elementOuterHTML: el.outerHTML.substring(0, 500),
      fill: el.getAttribute('fill') || s.fill || null,
      stroke: el.getAttribute('stroke') || s.stroke || null,
      strokeWidth: el.getAttribute('stroke-width') || s.strokeWidth || null,
      strokeLinecap: el.getAttribute('stroke-linecap') || null,
      strokeLinejoin: el.getAttribute('stroke-linejoin') || null,
      viewBox: svgRoot ? svgRoot.getAttribute('viewBox') : null,
      width: el.getAttribute('width') || s.width || null,
      height: el.getAttribute('height') || s.height || null,
      pathData: el.tagName.toLowerCase() === 'path' ? el.getAttribute('d') : null,
    };
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  function extractImage(el) {
    if (el.tagName.toLowerCase() !== 'img') return null;
    return {
      src: el.src || el.getAttribute('src'),
      alt: el.alt || null,
      naturalWidth: el.naturalWidth,
      naturalHeight: el.naturalHeight,
      displayWidth: el.width,
      displayHeight: el.height,
      loading: el.loading || null,
      decoding: el.decoding || null,
      srcset: el.srcset || null,
      sizes: el.sizes || null,
    };
  }

  // ─── Component Classifier ──────────────────────────────────────────────────

  function classifyComponent(el, s, r) {
    const tag = el.tagName.toLowerCase();
    const cls = el.className ? el.className.toString().toLowerCase() : '';
    const role = (el.getAttribute('role') || '').toLowerCase();

    if (tag === 'button' || role === 'button' || /btn|button/.test(cls)) return 'button';
    if (tag === 'input') return `input:${el.type || 'text'}`;
    if (tag === 'select') return 'select';
    if (tag === 'textarea') return 'textarea';
    if (tag === 'a') return 'link';
    if (/^h[1-6]$/.test(tag)) return `heading:${tag}`;
    if (tag === 'img') return 'image';
    if (tag === 'svg') return 'icon:svg';
    if (tag === 'ul' || tag === 'ol') return 'list';
    if (tag === 'li') return 'list-item';
    if (tag === 'table') return 'table';
    if (tag === 'tr') return 'table-row';
    if (tag === 'td' || tag === 'th') return 'table-cell';
    if (tag === 'form') return 'form';
    if (tag === 'nav') return 'nav';
    if (tag === 'header') return 'header';
    if (tag === 'footer') return 'footer';
    if (tag === 'aside') return 'sidebar';
    if (tag === 'main' || tag === 'section' || tag === 'article') return tag;

    if (/badge|chip|tag|pill/.test(cls)) return 'badge';
    if (/avatar|profile-pic|user-pic/.test(cls)) return 'avatar';
    if (/progress|bar|meter/.test(cls)) return 'progress';
    if (/tooltip|popover/.test(cls)) return 'tooltip';
    if (/dropdown|menu/.test(cls)) return 'dropdown';
    if (/modal|dialog|overlay/.test(cls)) return 'modal';
    if (/card|tile|widget|panel/.test(cls)) return 'card';
    if (/stat|metric|kpi|counter/.test(cls)) return 'stat';
    if (/chart|graph|plot/.test(cls)) return 'chart';
    if (/tab/.test(cls) && el.children.length < 5) return 'tab';
    if (/icon/.test(cls)) return 'icon';
    if (/spinner|loader|loading/.test(cls)) return 'loader';
    if (/alert|notice|banner/.test(cls)) return 'alert';
    if (/divider|separator|rule/.test(cls)) return 'divider';
    if (/label/.test(cls)) return 'label';

    const shadow = s.boxShadow !== 'none';
    const hasRadius = parseFloat(s.borderRadius) > 0;
    const hasPadding = parseFloat(s.paddingTop) > 0 || parseFloat(s.paddingLeft) > 0;
    const isCircular = parseFloat(s.borderRadius) >= 50 && Math.abs(r.width - r.height) < 4;

    if (isCircular && r.width < 60) return 'avatar';
    if (shadow && hasRadius && hasPadding && el.children.length > 0) return 'card';
    if (r.width < 200 && r.height < 40 && hasRadius && hasPadding) return 'badge';

    return 'element';
  }

  // ─── Full Element Extraction ────────────────────────────────────────────────

  function extractElement(el, sectionName, index) {
    try {
      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();

      return {
        _meta: {
          section: sectionName,
          index,
          componentType: classifyComponent(el, s, r),
          depth: getDepth(el),
        },
        dom: extractDOM(el),
        geometry: extractGeometry(el),
        typography: extractTypography(el, s),
        background: extractBackground(el, s),
        borders: extractBorders(el, s),
        spacing: extractSpacing(el, s),
        layout: extractLayout(el, s),
        effects: extractEffects(el, s),
        svg: extractSVG(el, s),
        image: extractImage(el),
      };
    } catch (err) {
      return {
        _meta: { section: sectionName, index, error: String(err) },
        dom: { tag: el.tagName.toLowerCase(), id: el.id || null, classList: [] },
      };
    }
  }

  function getDepth(el) {
    let depth = 0;
    let cur = el.parentElement;
    while (cur && cur !== document.body) { depth++; cur = cur.parentElement; }
    return depth;
  }

  // ─── Section Traversal ─────────────────────────────────────────────────────

  function traverseSection(rootEl, sectionName) {
    const elements = [];
    let index = 0;

    function walk(el) {
      if (!isVisible(el)) return;
      elements.push(extractElement(el, sectionName, index++));
      for (const child of el.children) walk(child);
    }

    walk(rootEl);
    return elements;
  }

  // ─── Full Page Traversal ────────────────────────────────────────────────────

  function traverseFullPage() {
    return traverseSection(document.body, 'full-page');
  }

  // ─── Lightweight DOM Structure (no computed styles) ─────────────────────────

  function getPageStructure() {
    const structure = [];
    const MAX_DEPTH = 20;

    function walk(el, depth) {
      if (depth > MAX_DEPTH) return;

      // Cheap visibility: skip only elements with inline display:none
      const inline = el.style;
      if (inline.display === 'none' || inline.visibility === 'hidden') return;

      const rect = el.getBoundingClientRect();
      const hasContent = el.children.length === 0 && !!(el.textContent || '').trim();

      structure.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: Array.from(el.classList),
        depth,
        childrenCount: el.children.length,
        hasText: hasContent,
        text: hasContent ? (el.textContent || '').trim().substring(0, 120) : null,
        role: el.getAttribute('role') || null,
        ariaLabel: el.getAttribute('aria-label') || null,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      });

      for (const child of el.children) walk(child, depth + 1);
    }

    walk(document.body, 0);
    return structure;
  }

  // ─── Auto-discover All Sections ────────────────────────────────────────────

  function discoverAllSections() {
    const results = [];
    const seenSelectors = new Set();

    function addSection(el, name, method) {
      if (!el) return;
      // Quick cheap check before full visibility test
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;

      const sel = getCSSSelector(el);
      if (seenSelectors.has(sel)) return;
      seenSelectors.add(sel);

      results.push({
        name: name.trim().substring(0, 80),
        selector: sel,
        method,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      });
    }

    // 1. Semantic landmark elements (skip <main> — it spans the whole content area and
    //    dominates every inner section through the top-level filter)
    document.querySelectorAll('section, article, nav, aside').forEach((el) => {
      if (el.style.display === 'none') return;
      const heading = el.querySelector('h1,h2,h3,h4,h5,h6');
      const label =
        el.getAttribute('aria-label') ||
        el.getAttribute('data-section') ||
        el.getAttribute('data-name') ||
        el.id;
      const name = label || (heading ? heading.textContent.trim() : el.tagName.toLowerCase());
      if (name) addSection(el, name, 'landmark');
    });

    // 2. Every visible h1/h2/h3 — its containing block is a section
    document.querySelectorAll('h1, h2, h3').forEach((h) => {
      const text = (h.textContent || '').trim();
      if (!text || text.length > 100) return;

      const container =
        h.closest('section') ||
        h.closest('article') ||
        h.closest('[class*="section"]') ||
        h.closest('[class*="panel"]') ||
        h.closest('[class*="widget"]') ||
        h.closest('[class*="block"]') ||
        h.closest('[class*="card"]') ||
        h.closest('[class*="container"]') ||
        h.parentElement?.parentElement ||
        h.parentElement;

      if (container && container !== document.body) addSection(container, text, 'heading');
    });

    // 3. Elements explicitly marked with data attributes
    document.querySelectorAll('[data-section],[data-panel],[data-tab-content],[data-view],[data-module]').forEach((el) => {
      const name =
        el.getAttribute('data-section') ||
        el.getAttribute('data-panel') ||
        el.getAttribute('data-tab-content') ||
        el.getAttribute('data-view') ||
        el.getAttribute('data-module') ||
        el.id ||
        'section';
      addSection(el, name, 'data-attribute');
    });

    // 4. aria-labelled containers
    document.querySelectorAll('[aria-label],[aria-labelledby]').forEach((el) => {
      const tag = el.tagName.toLowerCase();
      if (!['div', 'section', 'article', 'main', 'aside', 'nav', 'form', 'ul'].includes(tag)) return;
      const name =
        el.getAttribute('aria-label') ||
        (el.getAttribute('aria-labelledby')
          ? (document.getElementById(el.getAttribute('aria-labelledby')) || {}).textContent
          : null);
      if (name) addSection(el, name.trim(), 'aria-label');
    });

    // 5. Common class-name patterns that signal section containers
    const sectionPatterns = [
      '[class*="section"]', '[class*="panel"]', '[class*="widget"]',
      '[class*="sidebar"]', '[class*="content-block"]', '[class*="module"]',
    ];
    document.querySelectorAll(sectionPatterns.join(',')).forEach((el) => {
      const heading = el.querySelector('h1,h2,h3,h4');
      const label = el.getAttribute('aria-label') || el.id;
      const name = label || (heading ? heading.textContent.trim() : Array.from(el.classList)[0]);
      if (name) addSection(el, name, 'class-pattern');
    });

    // Sort top-to-bottom by Y position
    results.sort((a, b) => (a.rect.y ?? 0) - (b.rect.y ?? 0));

    // Remove sections fully contained inside an already-found larger section
    // (keep only top-level ones to avoid duplicates in the list)
    const topLevel = [];
    for (let i = 0; i < results.length; i++) {
      const a = results[i];
      const dominated = results.some((b, j) => {
        if (j === i) return false;
        return (
          b.rect.x <= a.rect.x &&
          b.rect.y <= a.rect.y &&
          b.rect.x + b.rect.width >= a.rect.x + a.rect.width &&
          b.rect.y + b.rect.height >= a.rect.y + a.rect.height &&
          (b.rect.width * b.rect.height) > (a.rect.width * a.rect.height) * 1.2
        );
      });
      if (!dominated) topLevel.push(a);
    }

    return topLevel;
  }

  // ─── Named Section Finder (manual override) ────────────────────────────────

  function findSection(name) {
    const lower = name.toLowerCase();
    const candidates = [];

    const byId = document.getElementById(lower);
    if (byId) return { el: byId, method: 'id-exact' };

    Array.from(document.querySelectorAll('[id]')).forEach((el) => {
      if (el.id.toLowerCase().includes(lower)) candidates.push({ el, method: 'id-substr', score: 90 });
    });

    Array.from(document.querySelectorAll('[aria-label]')).forEach((el) => {
      if ((el.getAttribute('aria-label') || '').toLowerCase().includes(lower))
        candidates.push({ el, method: 'aria-label', score: 85 });
    });

    const byData = document.querySelector(`[data-section="${lower}"]`);
    if (byData) return { el: byData, method: 'data-section' };

    Array.from(document.querySelectorAll('*')).forEach((el) => {
      const cls = el.className ? el.className.toString().toLowerCase() : '';
      if (cls.includes(lower)) candidates.push({ el, method: 'class-match', score: 70 });
    });

    document.querySelectorAll('h1,h2,h3,h4,h5,h6,[class*="title"],[class*="heading"]').forEach((h) => {
      const text = (h.textContent || '').trim().toLowerCase();
      if (text === lower || text.startsWith(lower)) {
        const container =
          h.closest('section') || h.closest('[class*="section"]') ||
          h.closest('[class*="widget"]') || h.closest('[class*="panel"]') ||
          h.closest('[class*="card"]') || h.parentElement || h;
        candidates.push({ el: container, method: 'heading-text', score: 95 });
      } else if (text.includes(lower)) {
        const container = h.closest('section') || h.parentElement || h;
        candidates.push({ el: container, method: 'heading-text-partial', score: 75 });
      }
    });

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
    return candidates[0];
  }

  // ─── Detect Cards / Buttons / Badges for Screenshots ───────────────────────

  function detectComponents(rootEl) {
    if (!rootEl) return { cards: [], buttons: [], badges: [] };

    const cards = [];
    const buttons = [];
    const badges = [];
    const seen = new Set();

    function walk(el) {
      if (!isVisible(el)) return;

      const s = window.getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const type = classifyComponent(el, s, r);
      const sel = getCSSSelector(el);

      if (!seen.has(sel)) {
        seen.add(sel);
        const entry = { selector: sel, tag: el.tagName.toLowerCase(), rect: { x: r.x, y: r.y, width: r.width, height: r.height } };

        if (type === 'button' || type === 'link') buttons.push(entry);
        if (type === 'card' || type === 'stat') { if (r.width > 50 && r.height > 40) cards.push(entry); }
        if (type === 'badge') badges.push(entry);
      }

      for (const child of el.children) walk(child);
    }

    walk(rootEl);
    return { cards, buttons, badges };
  }

  // ─── Page Metadata ─────────────────────────────────────────────────────────

  function getPageMeta() {
    return {
      url: window.location.href,
      title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollSize: { width: document.body.scrollWidth, height: document.body.scrollHeight },
      devicePixelRatio: window.devicePixelRatio,
      colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      totalDOMElements: document.querySelectorAll('*').length,
    };
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  window.__inspector = {
    // Core traversal
    traverseFullPage,
    traverseSection,
    extractElement,
    // Section discovery
    discoverAllSections,
    findSection,
    // Component detection
    detectComponents,
    // Metadata
    getPageMeta,
    getPageStructure,
    // Utilities
    isVisible,
    getCSSSelector,
  };

  console.log('[DashboardInspector] Loaded — ready to inspect.');
})();
