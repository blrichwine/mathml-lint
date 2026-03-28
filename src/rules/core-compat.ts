/** rules/core-compat.ts — L070–L073: MathML Core compatibility checks */

import type { LintContext, LintMessage } from '../types.js';
import { makeFinding, SPEC_LINKS } from '../core/findings.js';
import { normalizeTagName } from './shared.js';

/**
 * Elements that are in Presentation MathML but not in MathML Core.
 * Sources: https://w3c.github.io/mathml-core/ (§1.3 and element index)
 */
// Elements present in MathML Presentation but NOT in MathML Core.
// semantics/annotation/annotation-xml ARE in MathML Core — do not include them here.
const NOT_IN_CORE = new Set([
  'mfenced', 'mstyle', 'menclose', 'maction', 'mlabeledtr',
  'mglyph', 'malignmark', 'maligngroup',
]);

/**
 * Elements present in MathML Core but marked as "at risk" (may be dropped).
 */
const AT_RISK_IN_CORE = new Set([
  'ms', 'mphantom',
]);

/**
 * Attributes allowed by MathML Core (compact list; additional allowed on specific elements).
 * Used to flag presentation-only attributes that are unknown to Core browsers.
 */
const CORE_ONLY_BLOCKED_ATTRIBUTES = new Set([
  'bevelled',      // mfrac — not in Core
  'actiontype',    // maction — not in Core
  'selection',     // maction — not in Core
  'notation',      // menclose — not in Core
  'open',          // mfenced — not in Core
  'close',         // mfenced — not in Core
  'separators',    // mfenced — not in Core
  'lquote',        // ms — at risk
  'rquote',        // ms — at risk
]);

/**
 * L070 — Element not present in MathML Core.
 */
export function validateCoreElementSupport(node: Element, ctx: LintContext): LintMessage[] {
  if (ctx.profile.subset !== 'core') return [];

  const tag = normalizeTagName(node.tagName);
  if (!NOT_IN_CORE.has(tag)) return [];

  return [makeFinding('warn', 'L070', 'Element not in MathML Core',
    `<${tag}> is not part of MathML Core. It will not be rendered by Core-only implementations. ` +
    `Rewrite without this element for maximum compatibility.`,
    SPEC_LINKS.core)];
}

/**
 * L071 — Element marked "at risk" in MathML Core spec.
 */
export function validateCoreAtRiskElement(node: Element, ctx: LintContext): LintMessage[] {
  if (ctx.profile.subset !== 'core') return [];

  const tag = normalizeTagName(node.tagName);
  if (!AT_RISK_IN_CORE.has(tag)) return [];

  return [makeFinding('info', 'L071', 'At-risk MathML Core element',
    `<${tag}> is present in MathML Core but was marked "at risk" during spec development. ` +
    `Support may vary across implementations.`,
    SPEC_LINKS.core)];
}

/**
 * L072 — Attribute not supported in MathML Core.
 */
export function validateCoreAttributeSupport(node: Element, ctx: LintContext): LintMessage[] {
  if (ctx.profile.subset !== 'core') return [];

  const findings: LintMessage[] = [];
  const tag = normalizeTagName(node.tagName);

  for (const attr of Array.from(node.attributes)) {
    if (CORE_ONLY_BLOCKED_ATTRIBUTES.has(attr.name)) {
      findings.push(makeFinding('warn', 'L072', 'Attribute not in MathML Core',
        `Attribute "${attr.name}" on <${tag}> is not supported in MathML Core. ` +
        `It will be ignored by Core-only implementations.`,
        SPEC_LINKS.core));
    }
  }

  return findings;
}

/**
 * L073 — mathsize / mathcolor used directly on token elements.
 * These are presentation-layer attributes not in MathML Core (styling should use CSS).
 */
export function validateCoreStylingAttributes(node: Element, ctx: LintContext): LintMessage[] {
  if (ctx.profile.subset !== 'core') return [];

  const findings: LintMessage[] = [];
  const tag = normalizeTagName(node.tagName);

  for (const attr of ['mathsize', 'mathcolor', 'mathbackground']) {
    if (node.hasAttribute(attr)) {
      findings.push(makeFinding('info', 'L073', 'Presentation styling attribute in Core context',
        `Attribute "${attr}" on <${tag}> is a presentation-layer styling attribute. ` +
        `MathML Core recommends using CSS for styling instead.`,
        SPEC_LINKS.core));
    }
  }

  return findings;
}
