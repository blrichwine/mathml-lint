/**
 * rules/platform-compat.ts — L090–L094: LMS / CMS platform compatibility
 *
 * These rules fire when one or more target platforms are set via the
 * `platforms` option.  They cover server-side content sanitization and
 * editor-level stripping that happens *before* the W3C client-side safe-list
 * concerns covered by L080–L084.
 *
 * Platform summary
 * ────────────────
 * wordpress  — wp_kses() strips every HTML element not explicitly allowlisted,
 *              including all MathML.  This is server-side stripping at post-save
 *              time, unrelated to what browsers or DOMPurify accept.
 *              Reference: https://developer.wordpress.org/reference/functions/wp_kses/
 *
 * pressbooks — Built on WordPress multisite; inherits wp_kses concerns plus its
 *              own EPUB-export sanitization layer.
 *              Reference: https://pressbooks.org/user-guide/
 *
 * moodle     — HTML Purifier (the Moodle content filter) does not know about
 *              MathML by default and strips all math elements.  Raw MathML in
 *              Moodle content must be stored via a dedicated filter or plugin
 *              (e.g. the MathJax filter, which stores LaTeX, not MathML).
 *              Reference: https://docs.moodle.org/en/HTML_purifier
 *
 * canvas     — Instructure Canvas sanitizes user-submitted HTML with a Ruby
 *              Loofah/SafeListSanitizer allowlist that closely tracks the W3C
 *              MathML safe list but excludes a small number of elements (notably
 *              mfenced, menclose, mglyph, maction, mlabeledtr, maligngroup,
 *              malignmark).  The Canvas equation editor generates MathML using
 *              only core elements, so raw pasted MathML with legacy elements
 *              will be silently stripped.
 *              Reference: https://github.com/instructure/canvas-lms
 *                         (see app/models/sanitize_field.rb allowlist)
 *
 * tinymce    — TinyMCE's default valid_elements configuration does not include
 *              any MathML tags.  Without an explicit extended_valid_elements
 *              setting or a MathML-aware plugin (MathType/Wiris, Tiny's own
 *              equation plugin), MathML inserted into a TinyMCE editor will be
 *              stripped on the first save.
 *              Reference: https://www.tiny.cloud/docs/configure/content-filtering/
 */

import type { LintContext, LintMessage, LintPlatform } from '../types.js';
import { makeFinding } from '../core/findings.js';
import { normalizeTagName } from './shared.js';

// ── Reference URLs ─────────────────────────────────────────────────────────────

const REF_WP     = 'https://developer.wordpress.org/reference/functions/wp_kses/';
const REF_MOODLE = 'https://docs.moodle.org/en/HTML_purifier';
const REF_CANVAS = 'https://github.com/instructure/canvas-lms';
const REF_TINYMCE = 'https://www.tiny.cloud/docs/configure/content-filtering/';

// ── Canvas element allowlist ───────────────────────────────────────────────────
//
// Canvas (canvas-lms SanitizeField) permits elements that overlap with the
// W3C MathML safe list.  The following elements are NOT permitted by Canvas
// and will be silently stripped when MathML is saved through the Canvas UI.
// Source: canvas-lms source code; known accurate as of early 2025.
// Confirm against your Canvas version for critical deployments.

const CANVAS_BLOCKED_ELEMENTS = new Set([
  'mfenced',        // deprecated; Canvas equation editor never generates this
  'menclose',       // not in Canvas allowlist
  'maction',        // not in Canvas allowlist (and deprecated in MathML4)
  'mglyph',         // not in Canvas allowlist (legacy MathML3)
  'mlabeledtr',     // not in Canvas allowlist
  'maligngroup',    // not in Canvas allowlist
  'malignmark',     // not in Canvas allowlist
]);

// ── L090: Missing alttext on <math> ───────────────────────────────────────────

/**
 * L090 — <math> missing alttext attribute.
 *
 * Fires unconditionally (no platform required).  When a platform strips or
 * fails to render MathML, an alttext attribute provides the only accessible
 * fallback text.  It is also used by screen readers that do not support MathML
 * and by EPUB reading systems that fall back from MathML to SVG/image.
 */
export function validateAlttext(node: Element, _ctx: LintContext): LintMessage[] {
  if (normalizeTagName(node.tagName) !== 'math') return [];
  if (node.hasAttribute('alttext')) return [];

  return [makeFinding('info', 'L090', 'Missing alttext on <math>',
    `<math> has no alttext attribute. When MathML is stripped or cannot be rendered ` +
    `by the target environment, there is no accessible text fallback. ` +
    `Add alttext with a plain-text representation of the expression ` +
    `(e.g. alttext="x squared plus y squared equals r squared").`,
    [{ label: 'MathML alttext attribute', url: 'https://w3c.github.io/mathml/#interf_att', type: 'spec' }])];
}

// ── L091: WordPress / Pressbooks wp_kses stripping ───────────────────────────

/**
 * L091 — MathML stripped by WordPress wp_kses().
 *
 * WordPress runs all saved post/page content through wp_kses(), which removes
 * every HTML element not on an explicit allowlist.  MathML elements are not
 * on the default allowlist, so the entire <math> subtree is silently removed
 * when content is saved.  This is server-side stripping — it occurs regardless
 * of what the browser or DOMPurify would accept.
 *
 * To preserve MathML in WordPress:
 *   1. Use a plugin that stores LaTeX and renders client-side (WP QuickLaTeX,
 *      MathJax-LaTeX, Jetpack Beautiful Math) — the plugin intercepts content
 *      before wp_kses runs or stores shortcodes instead of raw MathML.
 *   2. Add MathML elements to the allowlist via the wp_kses_allowed_html filter
 *      in your theme's functions.php or a custom plugin.
 *
 * Fires once per <math> block when platform includes 'wordpress' or 'pressbooks'.
 */
export function validateWordPressKses(node: Element, ctx: LintContext): LintMessage[] {
  if (!ctx.platforms.has('wordpress') && !ctx.platforms.has('pressbooks')) return [];
  if (normalizeTagName(node.tagName) !== 'math') return [];

  const platform = ctx.platforms.has('pressbooks') && !ctx.platforms.has('wordpress')
    ? 'Pressbooks (WordPress multisite)'
    : 'WordPress';

  const ref = ctx.platforms.has('pressbooks')
    ? [
        { label: 'wp_kses reference', url: REF_WP, type: 'compat' as const },
        { label: 'Pressbooks user guide', url: 'https://pressbooks.org/user-guide/', type: 'compat' as const },
      ]
    : [{ label: 'wp_kses reference', url: REF_WP, type: 'compat' as const }];

  return [makeFinding('warn', 'L091', `MathML stripped by ${platform} wp_kses()`,
    `${platform} runs all saved content through wp_kses(), which strips every HTML ` +
    `element not on an explicit server-side allowlist. MathML elements are NOT on ` +
    `the default allowlist and will be silently removed when this content is saved. ` +
    `Use a MathML-aware plugin (WP QuickLaTeX, MathJax-LaTeX) that stores LaTeX ` +
    `shortcodes rather than raw MathML, or add MathML elements to your ` +
    `wp_kses_allowed_html filter.`,
    ref)];
}

// ── L092: Moodle HTML Purifier stripping ─────────────────────────────────────

/**
 * L092 — MathML stripped by Moodle HTML Purifier.
 *
 * Moodle filters all user-supplied HTML through HTML Purifier.  The default
 * HTML Purifier configuration does not include a MathML schema, so all MathML
 * elements are stripped from stored content.
 *
 * Moodle's MathJax filter plugin renders mathematics by detecting LaTeX
 * delimiters ($$…$$ or \(…\)) — it does not preserve raw MathML.  To store
 * MathML directly, the site administrator must:
 *   1. Install/configure a MathML-aware content filter, or
 *   2. Extend HTML Purifier with a MathML element schema (advanced; requires
 *      a custom Moodle plugin).
 *
 * Fires once per <math> block when platform includes 'moodle'.
 */
export function validateMoodlePurifier(node: Element, ctx: LintContext): LintMessage[] {
  if (!ctx.platforms.has('moodle')) return [];
  if (normalizeTagName(node.tagName) !== 'math') return [];

  return [makeFinding('warn', 'L092', 'MathML stripped by Moodle HTML Purifier',
    `Moodle's HTML Purifier filter strips all MathML from user content by default. ` +
    `The MathJax filter plugin renders $$LaTeX$$ and \\(LaTeX\\) delimiters but does ` +
    `not preserve raw MathML elements in the database. To use MathML in Moodle, ` +
    `either: (a) convert to LaTeX and rely on the MathJax filter, or (b) install a ` +
    `MathML content filter that extends HTML Purifier with a MathML schema.`,
    [{ label: 'Moodle HTML Purifier', url: REF_MOODLE, type: 'compat' }])];
}

// ── L093: Canvas LMS element allowlist ────────────────────────────────────────

/**
 * L093 — Element not in Canvas LMS sanitizer allowlist.
 *
 * Canvas sanitizes submitted HTML with a Ruby Loofah/SafeListSanitizer
 * allowlist that closely tracks the W3C MathML safe list but excludes a
 * small set of elements.  Elements listed here will be stripped (along with
 * their subtrees) when content is saved through the Canvas Rich Content
 * Editor or via the API with html_content.
 *
 * Note: the Canvas equation editor generates MathML using only core elements
 * (mi, mn, mo, mrow, mfrac, msqrt, mroot, msup, msub, msubsup, munder,
 * mover, munderover, mmultiscripts, mtable, mtr, mtd, semantics, …).
 * If you author MathML manually using elements outside this set, they will
 * be stripped.
 *
 * Fires per blocked element when platform includes 'canvas'.
 */
export function validateCanvasAllowlist(node: Element, ctx: LintContext): LintMessage[] {
  if (!ctx.platforms.has('canvas')) return [];
  const tag = normalizeTagName(node.tagName);
  if (!CANVAS_BLOCKED_ELEMENTS.has(tag)) return [];

  return [makeFinding('warn', 'L093', 'Element not in Canvas LMS sanitizer allowlist',
    `<${tag}> is not included in the Canvas LMS sanitizer allowlist and will be ` +
    `stripped (along with its subtree) when content is saved. The Canvas equation ` +
    `editor does not generate this element. Replace with equivalent core MathML: ` +
    `use <mrow>+<mo> instead of <mfenced>, CSS notation instead of <menclose>, ` +
    `omit <mglyph>/<maligngroup>/<malignmark>, and use a plain <mtr> instead of ` +
    `<mlabeledtr>.`,
    [
      { label: 'Canvas LMS source (sanitize_field)', url: REF_CANVAS, type: 'compat' },
      { label: 'W3C MathML Safe List', url: 'https://w3c.github.io/mathml-docs/mathml-safe-list', type: 'spec' },
    ])];
}

// ── L094: TinyMCE default config strips MathML ────────────────────────────────

/**
 * L094 — TinyMCE default valid_elements strips MathML.
 *
 * TinyMCE's default content-filtering configuration (valid_elements) does not
 * include any MathML tags.  When a user edits content containing a <math> block
 * in a TinyMCE instance that has not been configured for MathML, the entire
 * block is stripped on the first save.
 *
 * Solutions:
 *   1. Install MathType by Wiris (mathtype-tinymce5/6) — adds full MathML
 *      support to TinyMCE with a visual equation editor.
 *   2. Install Tiny's built-in Equation plugin (TinyMCE 6+) for LaTeX input.
 *   3. Add MathML to extended_valid_elements in the TinyMCE init config:
 *      extended_valid_elements: "math[*],mrow[*],mi[*],mn[*],mo[*],…"
 *      (must enumerate every element and attribute you want preserved).
 *
 * Fires once per <math> block when platform includes 'tinymce'.
 */
export function validateTinyMCEMathML(node: Element, ctx: LintContext): LintMessage[] {
  if (!ctx.platforms.has('tinymce')) return [];
  if (normalizeTagName(node.tagName) !== 'math') return [];

  return [makeFinding('warn', 'L094', 'TinyMCE default config strips MathML',
    `TinyMCE's default valid_elements configuration does not include MathML tags. ` +
    `Without MathType/Wiris or explicit extended_valid_elements configuration, ` +
    `this <math> block will be stripped the first time the content is saved ` +
    `through a TinyMCE editor. Ensure TinyMCE is configured with MathML support ` +
    `before allowing users to edit this content.`,
    [{ label: 'TinyMCE content filtering', url: REF_TINYMCE, type: 'compat' }])];
}
