/** rules/arity.ts — L040: wrong arity (exact), L041: too few children (min) */

import type { LintContext, LintMessage } from '../types.js';
import { makeFinding, SPEC_LINKS } from '../core/findings.js';
import { normalizeTagName, childElements, getEffectiveTagRule, shouldSkipSchemaChecks } from './shared.js';

export function validateArity(node: Element, ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  const findings: LintMessage[] = [];
  const rule = getEffectiveTagRule(tag, ctx.profile);
  if (shouldSkipSchemaChecks(node, ctx, rule)) return findings;
  if (!rule?.arity) return findings;

  const childCount = childElements(node).length;

  if (typeof rule.arity.exact === 'number') {
    if (childCount !== rule.arity.exact) {
      findings.push(makeFinding('error', 'L040', 'Wrong number of children',
        `<${tag}> requires exactly ${rule.arity.exact} child element(s), but has ${childCount}.`,
        SPEC_LINKS.presentation));
    }
    return findings;
  }

  if (typeof rule.arity.min === 'number' && childCount < rule.arity.min) {
    findings.push(makeFinding('warn', 'L041', 'Too few children',
      `<${tag}> requires at least ${rule.arity.min} child element(s), but has ${childCount}.`,
      SPEC_LINKS.presentation));
  }

  return findings;
}
