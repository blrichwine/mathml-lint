/** rules/hints.ts — L060–L062: semantic/intent authoring hints; L090: alttext warning */

import type { LintContext, LintMessage } from '../types.js';
import { makeFinding, SPEC_LINKS } from '../core/findings.js';
import {
  normalizeTagName,
  childElements,
  isLargeOperatorConstruct,
  SCRIPT_BASE_TAGS,
} from './shared.js';

/**
 * L060 — Ambiguous construct that would benefit from intent/arg annotation.
 * Fires on script elements whose base is a single <mi> that could be ambiguous
 * (e.g., x^2 could be power, but C^n_k is binomial coefficient, T^* is adjoint, etc.)
 * This is an info-level hint, not an error.
 */
export function validateIntentHint(node: Element, ctx: LintContext): LintMessage[] {
  if (!ctx.profile.showSemanticsHints) return [];

  const tag = normalizeTagName(node.tagName);
  if (!SCRIPT_BASE_TAGS.has(tag)) return [];

  const base = childElements(node)[0] as Element | undefined;
  if (!base) return [];

  // Only hint on constructs whose base is a large-operator (likely needs intent for AT)
  if (!isLargeOperatorConstruct(base)) return [];

  // Check that no intent attribute is present
  if (node.hasAttribute('intent')) return [];

  return [makeFinding('info', 'L060', 'Consider adding intent annotation',
    `<${tag}> with a large-operator base may be ambiguous for assistive technology. ` +
    `Consider adding an intent attribute (e.g., intent="sum-over($index, $lower, $upper, $body)") ` +
    `to make the construct unambiguous.`,
    SPEC_LINKS.intent)];
}

/**
 * L061 — intent attribute present but malformed (missing $-prefixed arg references or
 * unmatched parentheses).
 * This is a lightweight syntactic check; full intent grammar validation is out of scope.
 */
export function validateIntentSyntax(node: Element, _ctx: LintContext): LintMessage[] {
  if (!node.hasAttribute('intent')) return [];

  const value = node.getAttribute('intent')?.trim() ?? '';
  if (!value) {
    return [makeFinding('warn', 'L061', 'Empty intent attribute',
      `The "intent" attribute is present but empty. Either provide a valid intent expression or remove the attribute.`,
      SPEC_LINKS.intent)];
  }

  // Check for unmatched parentheses
  let depth = 0;
  for (const ch of value) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (depth < 0) break;
  }
  if (depth !== 0) {
    return [makeFinding('warn', 'L061', 'Malformed intent expression',
      `The intent value "${value}" has unmatched parentheses. Check the intent expression syntax.`,
      SPEC_LINKS.intent)];
  }

  return [];
}

/**
 * L062 — arg attribute present on an element that has no ancestor with a matching
 * intent $arg reference (detached arg).
 * This is heuristic — we only check that an ancestor has an intent attribute at all.
 */
export function validateDetachedArg(node: Element, _ctx: LintContext): LintMessage[] {
  if (!node.hasAttribute('arg')) return [];

  const argValue = node.getAttribute('arg')?.trim() ?? '';
  if (!argValue) {
    return [makeFinding('warn', 'L062', 'Empty arg attribute',
      `The "arg" attribute is present but empty. Provide a name matching a $arg reference in an ancestor's intent expression.`,
      SPEC_LINKS.intent)];
  }

  // Walk up to find an ancestor with an intent attribute
  let ancestor = node.parentElement;
  while (ancestor) {
    if (ancestor.hasAttribute('intent')) {
      const intent = ancestor.getAttribute('intent') ?? '';
      // Check if the intent references this arg name
      if (intent.includes(`$${argValue}`)) return [];
      // intent present but doesn't reference this arg
      return [makeFinding('info', 'L062', 'arg not referenced in ancestor intent',
        `arg="${argValue}" on <${normalizeTagName(node.tagName)}> is not referenced (as $${argValue}) ` +
        `in the nearest ancestor's intent expression.`,
        SPEC_LINKS.intent)];
    }
    ancestor = ancestor.parentElement;
  }

  return [makeFinding('warn', 'L062', 'arg attribute without ancestor intent',
    `arg="${argValue}" on <${normalizeTagName(node.tagName)}> has no ancestor with an intent attribute. ` +
    `The arg attribute is only meaningful when an ancestor specifies an intent expression referencing it.`,
    SPEC_LINKS.intent)];
}

/**
 * L090 — alttext attribute present on <math>.
 *
 * The alttext attribute was intended as an accessible fallback but current
 * assistive technology implementations handle it inconsistently: some AT
 * ignores the MathML entirely when alttext is present and reads only the
 * fallback text, bypassing native MathML accessibility. The DAISY best
 * practices guide explicitly recommends NOT using alttext.
 *
 * Reference: https://daisy.github.io/transitiontoepub/best-practices/mathML/mathMLBestPractices.html
 */
export function validateAlttext(node: Element, _ctx: LintContext): LintMessage[] {
  if (normalizeTagName(node.tagName) !== 'math') return [];
  if (!node.hasAttribute('alttext')) return [];

  return [makeFinding('warn', 'L090', 'alttext attribute may suppress MathML accessibility',
    `The alttext attribute on <math> can cause some assistive technologies to ignore the ` +
    `MathML entirely and read only the fallback text. Per DAISY best practices, remove ` +
    `alttext and rely on native MathML accessibility instead.`,
    [{ label: 'DAISY MathML Best Practices', url: 'https://daisy.github.io/transitiontoepub/best-practices/mathML/mathMLBestPractices.html', type: 'guide' }])];
}
