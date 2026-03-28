/** rules/attribute.ts — L020–L025, L032–L033: attribute validation, mathvariant, spacing */

import type { LintContext, LintMessage } from '../types.js';
import { makeFinding, SPEC_LINKS } from '../core/findings.js';
import { normalizeTagName, childElements, normalize, getEffectiveTagRule, shouldSkipSchemaChecks } from './shared.js';

const GLOBAL_ATTRIBUTES = new Set([
  'class', 'style', 'id', 'display', 'mathsize', 'mathcolor',
  'dir', 'href', 'intent', 'arg', 'data-*',
]);

const COMMON_MATHVARIANT_VALUES = new Set([
  'normal', 'bold', 'italic', 'bold-italic', 'double-struck',
  'script', 'fraktur', 'sans-serif', 'monospace',
]);

const KNOWN_MATHVARIANT_VALUES = new Set([
  ...COMMON_MATHVARIANT_VALUES,
  'bold-fraktur', 'sans-serif-italic', 'sans-serif-bold-italic',
  'bold-sans-serif', 'bold-script', 'initial', 'tailed', 'looped', 'stretched',
]);

const DEPRECATED_MATH_ATTRIBUTES = new Map([
  ['macros', { replacement: 'none', note: 'External macro definition files are not part of MathML.' }],
  ['mode', { replacement: 'display', note: 'Use the MathML "display" attribute instead.' }],
]);

const ATTRIBUTE_VALUE_RULES: Array<{
  attr: string;
  tags: Set<string> | null;
  expected: string;
  validate: (v: string) => boolean;
}> = [
  { attr: 'display', tags: new Set(['math']), expected: '"block" or "inline"', validate: (v) => v === 'block' || v === 'inline' },
  { attr: 'dir', tags: null, expected: '"ltr", "rtl", or "auto"', validate: (v) => ['ltr', 'rtl', 'auto'].includes(v) },
  { attr: 'form', tags: new Set(['mo']), expected: '"prefix", "infix", or "postfix"', validate: (v) => ['prefix', 'infix', 'postfix'].includes(v) },
  { attr: 'fence', tags: new Set(['mo']), expected: '"true" or "false"', validate: (v) => v === 'true' || v === 'false' },
  { attr: 'separator', tags: new Set(['mo']), expected: '"true" or "false"', validate: (v) => v === 'true' || v === 'false' },
  { attr: 'stretchy', tags: new Set(['mo']), expected: '"true" or "false"', validate: (v) => v === 'true' || v === 'false' },
  { attr: 'symmetric', tags: new Set(['mo']), expected: '"true" or "false"', validate: (v) => v === 'true' || v === 'false' },
  { attr: 'bevelled', tags: new Set(['mfrac']), expected: '"true" or "false"', validate: (v) => v === 'true' || v === 'false' },
  { attr: 'displaystyle', tags: new Set(['mstyle']), expected: '"true" or "false"', validate: (v) => v === 'true' || v === 'false' },
  {
    attr: 'columnalign', tags: new Set(['mtable']),
    expected: 'space-separated values from "left", "center", "right", "decimalpoint"',
    validate: (v) => v.split(/\s+/).filter(Boolean).every((t) => ['left', 'center', 'right', 'decimalpoint'].includes(t)),
  },
  {
    attr: 'rowalign', tags: new Set(['mtable']),
    expected: 'space-separated values from "top", "bottom", "center", "baseline", "axis"',
    validate: (v) => v.split(/\s+/).filter(Boolean).every((t) => ['top', 'bottom', 'center', 'baseline', 'axis'].includes(t)),
  },
  { attr: 'mathvariant', tags: null, expected: 'a recognized MathML mathvariant token', validate: (v) => KNOWN_MATHVARIANT_VALUES.has(v) },
];

export function validateAttributes(node: Element, ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  const findings: LintMessage[] = [];
  const rule = getEffectiveTagRule(tag, ctx.profile);
  if (shouldSkipSchemaChecks(node, ctx, rule)) return findings;

  const allowed = new Set([...(rule?.attributes ?? []), ...GLOBAL_ATTRIBUTES]);

  for (const attr of Array.from(node.attributes)) {
    const attrName = attr.name;
    const normalizedAttrName = normalize(attrName);

    if (/^xmlns(?::|$)/i.test(attrName)) continue;

    if (tag === 'math' && DEPRECATED_MATH_ATTRIBUTES.has(normalizedAttrName)) {
      const meta = DEPRECATED_MATH_ATTRIBUTES.get(normalizedAttrName)!;
      const replacement = meta.replacement === 'none' ? 'This attribute should be removed.' : `Use "${meta.replacement}" instead.`;
      findings.push(makeFinding('warn', 'L032', 'Deprecated attribute on <math>',
        `Attribute "${attrName}" on <math> is deprecated. ${replacement} ${meta.note}`,
        SPEC_LINKS.presentation));
      continue;
    }

    if (/^data-mjx/i.test(attrName)) {
      if (ctx.ignoreDataMjxAttributes) continue;
      findings.push(makeFinding('warn', 'L020', 'Unknown attribute',
        `Attribute "${attrName}" is not recognized on <${tag}>.`,
        SPEC_LINKS.presentation));
      continue;
    }

    if (attrName.startsWith('data-')) continue;

    if (!allowed.has(attrName)) {
      findings.push(makeFinding('warn', 'L020', 'Unknown attribute',
        `Attribute "${attrName}" is not recognized on <${tag}>.`,
        SPEC_LINKS.presentation));
    }
  }

  return findings;
}

export function validateAttributeValues(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  const findings: LintMessage[] = [];

  for (const attr of Array.from(node.attributes)) {
    const attrName = normalize(attr.name);
    const value = attr.value.trim();
    const rules = ATTRIBUTE_VALUE_RULES.filter((r) => r.attr === attrName && (!r.tags || r.tags.has(tag)));
    for (const rule of rules) {
      if (!value) {
        findings.push(makeFinding('warn', 'L021', 'Invalid attribute value',
          `Attribute "${attr.name}" on <${tag}> should be ${rule.expected}, but it is empty.`,
          SPEC_LINKS.presentation));
        continue;
      }
      if (!rule.validate(normalize(value))) {
        findings.push(makeFinding('warn', 'L021', 'Invalid attribute value',
          `Attribute "${attr.name}" on <${tag}> has value "${attr.value}". Expected ${rule.expected}.`,
          SPEC_LINKS.presentation));
      }
    }
  }

  return findings;
}

export function validateMathvariantUsage(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  const findings: LintMessage[] = [];
  if (!node.hasAttribute('mathvariant')) return findings;

  const rawValue = node.getAttribute('mathvariant')?.trim() ?? '';
  const value = normalize(rawValue);

  if (tag !== 'mi') {
    findings.push(makeFinding('warn', 'L022', 'mathvariant usage warning',
      `Attribute "mathvariant" on <${tag}> is discouraged in modern MathML Core workflows; prefer direct Unicode character mapping when possible.`,
      SPEC_LINKS.core));
  }

  if (value && KNOWN_MATHVARIANT_VALUES.has(value) && !COMMON_MATHVARIANT_VALUES.has(value)) {
    findings.push(makeFinding('info', 'L023', 'Uncommon mathvariant value',
      `mathvariant="${rawValue}" is recognized but uncommon. Common values include normal, bold, italic, bold-italic, double-struck, script, fraktur, sans-serif, and monospace.`,
      SPEC_LINKS.presentation));
  }

  return findings;
}

function isNegativeLength(value: string | null): boolean {
  return /^-/.test(value?.trim() ?? '');
}

export function validateNegativeSpacingPatterns(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  const findings: LintMessage[] = [];

  if (tag === 'mspace' && isNegativeLength(node.getAttribute('width'))) {
    findings.push(makeFinding('warn', 'L033', 'Negative spacing pattern',
      'Negative <mspace width> is strongly discouraged for constructing symbols or conveying meaning through spacing.',
      SPEC_LINKS.presentation));
    return findings;
  }

  if (tag === 'mpadded' && isPotentialOverstrikeMpadded(node)) {
    findings.push(makeFinding('warn', 'L034', 'Potential overstruck spacing construct',
      '<mpadded> appears to be used with negative spacing to visually combine symbols. Prefer a standard symbol encoding instead of spacing-based symbol construction.',
      SPEC_LINKS.presentation));
  }

  return findings;
}

function isPotentialOverstrikeMpadded(node: Element): boolean {
  const attrs = ['width', 'lspace', 'height', 'depth', 'voffset'];
  if (attrs.some((a) => isNegativeLength(node.getAttribute(a)))) return true;
  const children = childElements(node);
  const hasNegMspace = children.some((c) => normalizeTagName(c.tagName) === 'mspace' && isNegativeLength(c.getAttribute('width')));
  const hasVisible = children.some((c) => ['mtext', 'mi', 'mo'].includes(normalizeTagName(c.tagName)));
  return hasNegMspace && hasVisible;
}
