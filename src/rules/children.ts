/** rules/children.ts — L030: invalid child element, L031: missing function application */

import type { LintContext, LintMessage } from '../types.js';
import { makeFinding, SPEC_LINKS } from '../core/findings.js';
import {
  normalizeTagName,
  childElements,
  getEffectiveTagRule,
  shouldSkipSchemaChecks,
  isApplyFunctionMo,
  isInsideAnnotation,
  LATEX_BUILTIN_FUNCTION_NAMES,
  OPERATORNAME_FUNCTION_NAMES,
} from './shared.js';

export function validateChildren(node: Element, ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  const findings: LintMessage[] = [];
  const rule = getEffectiveTagRule(tag, ctx.profile);
  if (shouldSkipSchemaChecks(node, ctx, rule)) return findings;
  if (!rule) return findings;

  const allowedChildren: string[] = rule.children ?? [];
  if (allowedChildren.includes('any')) return findings;

  for (const child of childElements(node)) {
    const childTag = normalizeTagName(child.tagName);

    // xmlns-prefixed or annotation content — skip
    if (/^xmlns(?::|$)/i.test(child.tagName)) continue;
    if (isInsideAnnotation(child)) continue;

    if (!allowedChildren.includes(childTag)) {
      findings.push(makeFinding('warn', 'L030', 'Invalid child element',
        `Element <${childTag}> is not a recognized child of <${tag}>.`,
        SPEC_LINKS.presentation));
    }
  }

  return findings;
}

const FUNCTION_NAMES = new Set([...LATEX_BUILTIN_FUNCTION_NAMES, ...OPERATORNAME_FUNCTION_NAMES]);

/**
 * L031 — Missing invisible function application operator.
 * Fires when a function-name <mi> (e.g. <mi>sin</mi>) is immediately followed by
 * its argument without an U+2061 APPLY FUNCTION <mo> between them.
 */
export function validateFunctionApplication(node: Element, ctx: LintContext): LintMessage[] {
  if (!ctx.profile.showSemanticsHints) return [];

  const tag = normalizeTagName(node.tagName);
  if (!['math', 'mrow', 'mtd'].includes(tag)) return [];

  const findings: LintMessage[] = [];
  const children = childElements(node);

  for (let i = 0; i < children.length - 1; i++) {
    const child = children[i];
    const childTag = normalizeTagName(child.tagName);

    if (childTag !== 'mi') continue;

    const token = child.textContent?.trim() ?? '';
    if (!FUNCTION_NAMES.has(token)) continue;

    const next = children[i + 1];
    if (!next) continue;

    // If the very next sibling is an apply-function mo, we're fine
    if (isApplyFunctionMo(next)) continue;

    const nextTag = normalizeTagName(next.tagName);
    // Only flag if next sibling looks like an argument (parenthesized group, mrow, or token)
    const argumentLike = ['mrow', 'mfenced', 'mi', 'mn', 'ms', 'msup', 'msub', 'msubsup', 'mroot', 'msqrt', 'mfrac'];
    if (!argumentLike.includes(nextTag)) continue;

    findings.push(makeFinding('warn', 'L031', 'Missing function application operator',
      `Function-name <mi>${token}</mi> is followed by <${nextTag}> without an invisible apply-function operator (U+2061) between them. ` +
      `Add <mo>&#x2061;</mo> to mark the function application semantically.`,
      SPEC_LINKS.presentation));

    i++; // skip next — one finding per function token
  }

  return findings;
}
