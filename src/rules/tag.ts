/** rules/tag.ts — L010, L011, L012: unknown tag, deprecated, profile mismatch */

import type { LintContext, LintMessage } from '../types.js';
import { makeFinding, SPEC_LINKS } from '../core/findings.js';
import { normalizeTagName, DEPRECATED_TAGS, getEffectiveTagRule, isTagAllowedInProfile, shouldSkipSchemaChecks } from './shared.js';

function profileLabel(profile: LintContext['profile']): string {
  return `${profile.subset} ${profile.version}`.toUpperCase();
}

export function validateTag(node: Element, ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  const rule = getEffectiveTagRule(tag, ctx.profile);
  const findings: LintMessage[] = [];

  if (shouldSkipSchemaChecks(node, ctx, rule)) return findings;

  if (!rule) {
    findings.push(makeFinding('warn', 'L010', 'Unknown tag',
      `Element <${tag}> is not recognized in the current lint profile.`,
      SPEC_LINKS.core));
    return findings;
  }

  if (ctx.profile.warnForProfileBoundary && !isTagAllowedInProfile(tag, ctx.profile)) {
    findings.push(makeFinding('warn', 'L012', 'Outside selected lint profile',
      `<${tag}> is not included in the selected profile (${profileLabel(ctx.profile)}).`,
      SPEC_LINKS.core));
  }

  if (DEPRECATED_TAGS.has(tag)) {
    const severity = ctx.profile.subset === 'core' ? 'error' : 'warn';
    findings.push(makeFinding(severity, 'L011', 'Deprecated pattern',
      `Element <${tag}> is legacy in many workflows. Prefer modern structure where possible.`,
      SPEC_LINKS.presentation));
  }

  return findings;
}
