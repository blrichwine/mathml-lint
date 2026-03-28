/**
 * rules/safety.ts — L080–L083: W3C MathML Safe List sanitization warnings
 *
 * Reference: https://w3c.github.io/mathml-docs/mathml-safe-list
 *
 * The W3C MathML Safe List defines what sanitizers (e.g. DOMPurify) should
 * allow when processing MathML. Elements or attributes absent from the list
 * will be silently stripped, breaking rendering for end users.
 */

import type { LintContext, LintMessage } from '../types.js';
import { makeFinding } from '../core/findings.js';
import { normalizeTagName } from './shared.js';

const SAFE_LIST_URL = 'https://w3c.github.io/mathml-docs/mathml-safe-list';

/**
 * Elements listed as safe "as-is" in the W3C MathML Safe List.
 * Sanitizers should pass these through unchanged.
 */
const SAFE_LIST_ELEMENTS = new Set([
  'math', 'merror', 'mfrac', 'mi', 'mmultiscripts', 'mn', 'mo', 'mover',
  'mpadded', 'mprescripts', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt',
  'mstyle', 'msub', 'msubsup', 'msup', 'mtable', 'mtd', 'mtext', 'mtr',
  'munder', 'munderover', 'semantics',
]);

/**
 * Elements that require special handling by sanitizers rather than
 * unconditional pass-through. They may be transformed or conditionally removed.
 *   - mphantom: replace with empty mspace or remove
 *   - maction: replace with mrow of same children, or use children only
 *   - annotation / annotation-xml: remove if encoding is absent or untrustworthy,
 *     or if an href attribute is present
 */
const SPECIAL_TREATMENT_ELEMENTS = new Set([
  'mphantom', 'maction', 'annotation', 'annotation-xml',
]);

/**
 * Attributes listed as universally safe in the W3C MathML Safe List.
 */
const SAFE_LIST_ATTRIBUTES = new Set([
  // Universal math attributes
  'dir', 'displaystyle', 'mathbackground', 'mathcolor', 'mathsize',
  'scriptlevel', 'encoding', 'display', 'linethickness', 'intent', 'arg',
  // mo
  'form', 'fence', 'separator', 'lspace', 'rspace',
  'stretchy', 'symmetric', 'maxsize', 'minsize', 'largeop', 'movablelimits',
  // mpadded / mspace
  'width', 'height', 'depth', 'voffset',
  // mover / munder / munderover
  'accent', 'accentunder',
  // mtd
  'columnspan', 'rowspan',
  // HTML-derived attributes that sanitizers handle via their own HTML rules
  'id', 'class', 'style', 'data-*', 'autofocus', 'tabindex', 'nonce',
  // xmlns is an XML namespace declaration, not a sanitization concern
  'xmlns',
]);

/**
 * L080 — Element not on the W3C MathML Safe List.
 * Sanitizers that implement the safe list will strip this element and its
 * subtree entirely, silently breaking rendering.
 */
export function validateSafeListElement(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);

  if (SAFE_LIST_ELEMENTS.has(tag) || SPECIAL_TREATMENT_ELEMENTS.has(tag)) return [];

  return [makeFinding('warn', 'L080', 'Element not on W3C MathML Safe List',
    `<${tag}> is not included in the W3C MathML Safe List. Sanitizers that implement ` +
    `the safe list (e.g. DOMPurify with MathML config) will strip this element and its ` +
    `subtree, silently breaking rendering. Consider using a safe alternative.`,
    [{ label: 'W3C MathML Safe List', url: SAFE_LIST_URL, type: 'spec' }])];
}

/**
 * L081 — Element requiring special sanitizer treatment.
 * These elements may be transformed or conditionally removed by sanitizers;
 * their presence may produce unexpected output.
 */
export function validateSafeListSpecialElement(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  if (!SPECIAL_TREATMENT_ELEMENTS.has(tag)) return [];

  const notes: Record<string, string> = {
    mphantom: 'Sanitizers may replace <mphantom> with an empty <mspace> or remove it.',
    maction: 'Sanitizers may replace <maction> with an <mrow> containing the same children, or keep only the first child.',
    annotation: 'Sanitizers may remove <annotation> if the encoding attribute is absent, untrustworthy, or if an href attribute is present.',
    'annotation-xml': 'Sanitizers may remove <annotation-xml> if the encoding attribute is absent, untrustworthy, or if an href attribute is present.',
  };

  return [makeFinding('info', 'L081', 'Element requires special sanitizer handling',
    `<${tag}> is on the W3C MathML Safe List but requires special treatment. ` +
    `${notes[tag] ?? ''} Verify rendering in your target environment.`,
    [{ label: 'W3C MathML Safe List', url: SAFE_LIST_URL, type: 'spec' }])];
}

/**
 * L082 — href or src attribute on annotation / annotation-xml.
 * The W3C MathML Safe List explicitly states that sanitizers should remove
 * annotation and annotation-xml elements that carry an href attribute.
 * src attributes introduce external resource loading.
 */
export function validateAnnotationHref(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  if (tag !== 'annotation' && tag !== 'annotation-xml') return [];

  const findings: LintMessage[] = [];

  if (node.hasAttribute('href')) {
    findings.push(makeFinding('warn', 'L082', 'href on annotation triggers sanitizer removal',
      `<${tag}> has an href attribute. The W3C MathML Safe List specifies that sanitizers ` +
      `must remove annotation elements carrying href. This element will be stripped in ` +
      `sanitized contexts, taking its semantic annotation with it.`,
      [{ label: 'W3C MathML Safe List', url: SAFE_LIST_URL, type: 'spec' }]));
  }

  if (node.hasAttribute('src')) {
    findings.push(makeFinding('warn', 'L082', 'src on annotation may trigger sanitizer removal',
      `<${tag}> has a src attribute referencing an external resource. Many sanitizers will ` +
      `remove this to prevent external resource loading. Inline the annotation content instead.`,
      [{ label: 'W3C MathML Safe List', url: SAFE_LIST_URL, type: 'spec' }]));
  }

  return findings;
}

/**
 * L083 — mathvariant attribute not on the W3C MathML Safe List.
 * Despite being widely used, mathvariant is absent from the safe list.
 * Strict sanitizers will strip it, which silently changes the rendering of
 * identifiers (e.g. bold, italic, double-struck variants).
 */
export function validateMathvariantSafety(node: Element, _ctx: LintContext): LintMessage[] {
  if (!node.hasAttribute('mathvariant')) return [];

  return [makeFinding('info', 'L083', 'mathvariant not on W3C MathML Safe List',
    `The mathvariant attribute is not included in the W3C MathML Safe List. ` +
    `Sanitizers that implement the safe list strictly will strip it, silently ` +
    `changing the visual rendering of this element. Prefer direct Unicode character ` +
    `encoding (e.g. U+1D400 MATHEMATICAL BOLD CAPITAL A) where possible.`,
    [{ label: 'W3C MathML Safe List', url: SAFE_LIST_URL, type: 'spec' }])];
}

/**
 * L084 — Attribute not on the W3C MathML Safe List on a safe-list element.
 * Fires for attributes that sanitizers will strip, but only for the most
 * commonly used ones that would visibly affect rendering or semantics.
 * (Exhaustively flagging all missing table/linebreak attributes would be
 * too noisy; those are documented separately.)
 */

const HIGH_IMPACT_UNSAFE_ATTRS = new Set([
  // Script positioning — affects layout in MathML3 renderers
  'subscriptshift', 'superscriptshift',
  // ms quoting — changes visual output
  'lquote', 'rquote',
  // href on non-annotation elements — links that sanitizers will strip
  'href',
]);

export function validateUnsafeAttribute(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);

  // Only check elements that are on the safe list (others already flagged by L080)
  if (!SAFE_LIST_ELEMENTS.has(tag)) return [];

  const findings: LintMessage[] = [];

  for (const attr of Array.from(node.attributes)) {
    const name = attr.name.toLowerCase();

    if (SAFE_LIST_ATTRIBUTES.has(name)) continue;
    if (/^data-/.test(name)) continue;
    if (/^on/.test(name)) continue; // handled by HTML sanitizers

    if (HIGH_IMPACT_UNSAFE_ATTRS.has(name)) {
      findings.push(makeFinding('info', 'L084', 'Attribute not on W3C MathML Safe List',
        `Attribute "${attr.name}" on <${tag}> is not included in the W3C MathML Safe List ` +
        `and will be stripped by compliant sanitizers. This may silently affect rendering.`,
        [{ label: 'W3C MathML Safe List', url: SAFE_LIST_URL, type: 'spec' }]));
    }
  }

  return findings;
}
