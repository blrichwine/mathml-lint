/** rules/semantic.ts — L035–L038: invisible operators, implicit multiplication, semantics AT */

import type { LintContext, LintMessage } from '../types.js';
import { makeFinding, SPEC_LINKS } from '../core/findings.js';
import {
  normalizeTagName,
  childElements,
  isApplyFunctionMo,
  isInvisibleSeparatorMo,
  isLargeOperatorConstruct,
  isLikelyMixedFractionPair,
  isLikelyWordRunPair,
  IMPLICIT_MULTIPLICATION_SEQUENCE_CONTEXTS,
  IMPLICIT_MULTIPLICATION_OPERAND_TAGS,
  LATEX_BUILTIN_FUNCTION_NAMES,
  OPERATORNAME_FUNCTION_NAMES,
} from './shared.js';

const ALL_FUNCTION_NAMES = new Set([...LATEX_BUILTIN_FUNCTION_NAMES, ...OPERATORNAME_FUNCTION_NAMES]);

/**
 * L035 — Missing invisible times (U+2062) between implicit multiplication operands.
 * Fires on adjacent math operands (mi/mn/mrow/...) inside mrow/math/mtd without any operator.
 */
export function validateImplicitMultiplication(node: Element, ctx: LintContext): LintMessage[] {

  const tag = normalizeTagName(node.tagName);
  if (!IMPLICIT_MULTIPLICATION_SEQUENCE_CONTEXTS.has(tag)) return [];

  const children = childElements(node);
  const findings: LintMessage[] = [];

  for (let i = 0; i < children.length - 1; i++) {
    const left = children[i];
    const right = children[i + 1];
    const leftTag = normalizeTagName(left.tagName);
    const rightTag = normalizeTagName(right.tagName);

    if (!IMPLICIT_MULTIPLICATION_OPERAND_TAGS.has(leftTag)) continue;
    if (!IMPLICIT_MULTIPLICATION_OPERAND_TAGS.has(rightTag)) continue;

    // Skip if either side is a large-operator construct (those need invisible-times suppressed)
    if (isLargeOperatorConstruct(left) || isLargeOperatorConstruct(right)) continue;

    // Skip mixed-fraction patterns (whole-number + mfrac): e.g. 3½
    if (isLikelyMixedFractionPair(left, right)) continue;

    // Skip if it looks like a multi-letter word run
    if (isLikelyWordRunPair(children, i, i + 1)) continue;

    // Skip if left is a function-name <mi> — L031 handles that case
    if (leftTag === 'mi' && ALL_FUNCTION_NAMES.has(left.textContent?.trim() ?? '')) continue;

    findings.push(makeFinding('info', 'L035', 'Missing invisible times operator',
      `Adjacent <${leftTag}> and <${rightTag}> may represent implicit multiplication. ` +
      `Add <mo>&#x2062;</mo> (U+2062 INVISIBLE TIMES) between them to make the multiplication explicit.`,
      SPEC_LINKS.presentation));

    i++; // one finding per gap
  }

  return findings;
}

/**
 * L036 — Invisible times used outside an implicit-multiplication context.
 * U+2062 in a non-mrow/math context is suspicious.
 */
export function validateInvisibleTimesUsage(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  if (tag !== 'mo') return [];

  const token = node.textContent?.trim() ?? '';
  if (token !== '\u2062') return [];

  const parent = node.parentElement;
  if (!parent) return [];
  const parentTag = normalizeTagName(parent.tagName);

  if (!IMPLICIT_MULTIPLICATION_SEQUENCE_CONTEXTS.has(parentTag)) {
    return [makeFinding('warn', 'L036', 'Invisible times in unexpected context',
      `U+2062 INVISIBLE TIMES appears inside <${parentTag}>, which is not a typical multiplication context. ` +
      `Verify this is intentional.`,
      SPEC_LINKS.presentation)];
  }

  return [];
}

/**
 * L037 — Invisible separator (U+2063) used outside a comma-separated list context.
 */
export function validateInvisibleSeparatorUsage(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  if (tag !== 'mo') return [];

  const token = node.textContent?.trim() ?? '';
  if (token !== '\u2063') return [];

  const parent = node.parentElement;
  if (!parent) return [];

  // Invisible separator is most appropriate between terms in a list
  const parentTag = normalizeTagName(parent.tagName);
  const siblings = childElements(parent);
  const idx = siblings.indexOf(node);

  const hasMnNeighbor =
    (idx > 0 && ['mi', 'mn'].includes(normalizeTagName(siblings[idx - 1].tagName))) ||
    (idx < siblings.length - 1 && ['mi', 'mn'].includes(normalizeTagName(siblings[idx + 1].tagName)));

  if (!hasMnNeighbor) {
    return [makeFinding('info', 'L037', 'Invisible separator in unexpected context',
      `U+2063 INVISIBLE SEPARATOR inside <${parentTag}> is not adjacent to <mi>/<mn> elements. ` +
      `This operator typically separates items in a list of numbers or variables.`,
      SPEC_LINKS.presentation)];
  }

  return [];
}

/**
 * L038 — Apply-function operator (U+2061) used without a preceding function-name token.
 */
export function validateApplyFunctionUsage(node: Element, _ctx: LintContext): LintMessage[] {
  if (!isApplyFunctionMo(node)) return [];

  const parent = node.parentElement;
  if (!parent) return [];

  const siblings = childElements(parent);
  const idx = siblings.indexOf(node);

  if (idx === 0) {
    return [makeFinding('warn', 'L038', 'Apply-function without preceding function name',
      `U+2061 APPLY FUNCTION appears as the first child of <${normalizeTagName(parent.tagName)}>. ` +
      `It should follow a function-name token such as <mi>sin</mi>.`,
      SPEC_LINKS.presentation)];
  }

  const prev = siblings[idx - 1];
  const prevTag = normalizeTagName(prev.tagName);
  if (prevTag !== 'mi') {
    return [makeFinding('warn', 'L038', 'Apply-function not preceded by <mi>',
      `U+2061 APPLY FUNCTION follows a <${prevTag}>, not an <mi>. ` +
      `It should follow a function-name <mi> token.`,
      SPEC_LINKS.presentation)];
  }

  return [];
}

/**
 * L039 — <semantics> element present but missing an annotation or annotation-xml child.
 * A <semantics> element without any annotation is usually an authoring mistake.
 */
export function validateSemanticsStructure(node: Element, ctx: LintContext): LintMessage[] {

  const tag = normalizeTagName(node.tagName);
  if (tag !== 'semantics') return [];

  const children = childElements(node);
  const hasAnnotation = children.some((c) => {
    const ct = normalizeTagName(c.tagName);
    return ct === 'annotation' || ct === 'annotation-xml';
  });

  if (!hasAnnotation) {
    return [makeFinding('info', 'L039', '<semantics> without annotation',
      `<semantics> has no <annotation> or <annotation-xml> child. ` +
      `Add at least one annotation (e.g., LaTeX source or Content MathML) to make the element useful.`,
      SPEC_LINKS.presentation)];
  }

  const mathChild = childElements(node)[0];
  if (!mathChild) {
    return [makeFinding('warn', 'L039', '<semantics> missing presentation child',
      `<semantics> has no presentation MathML child as its first element.`,
      SPEC_LINKS.presentation)];
  }

  return [];
}

/**
 * Helper re-export for engine convenience.
 */
export { isInvisibleSeparatorMo };
