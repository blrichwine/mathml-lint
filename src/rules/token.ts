/** rules/token.ts — L024–L029, L050: token element semantic checks */

import type { LintContext, LintMessage } from '../types.js';
import { makeFinding, SPEC_LINKS } from '../core/findings.js';
import {
  normalizeTagName,
  childElements,
  TOKEN_ELEMENTS,
  LATEX_BUILTIN_FUNCTION_NAMES,
  OPERATORNAME_FUNCTION_NAMES,
  LIKELY_PLAIN_TEXT_WORDS,
  LARGE_OPERATOR_SYMBOLS,
  LARGE_OPERATOR_WORDS,
  CLOSING_FENCE_TOKENS,
  collectLowercaseMiRuns,
  isIndexLikeContainer,
  looksLikeNumericLiteral,
} from './shared.js';

const ALL_FUNCTION_NAMES = new Set([...LATEX_BUILTIN_FUNCTION_NAMES, ...OPERATORNAME_FUNCTION_NAMES]);

/**
 * L024 — Split <mi> identifier run.
 * Consecutive single-char lowercase <mi> elements spelling a known word or function name
 * should be a single <mi> (or <mi mathvariant="normal"> for function names).
 */
export function validateSplitMi(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  if (!['math', 'mrow', 'mtd', 'msqrt', 'merror', 'mpadded', 'mphantom', 'menclose', 'mstyle'].includes(tag)) return [];

  const children = childElements(node);
  const runs = collectLowercaseMiRuns(children);
  const findings: LintMessage[] = [];

  for (const run of runs) {
    if (run.length < 2) continue;
    const word = run.word;
    if (ALL_FUNCTION_NAMES.has(word) || LIKELY_PLAIN_TEXT_WORDS.has(word)) {
      findings.push(makeFinding('warn', 'L024', 'Split identifier run',
        `${run.length} consecutive single-character <mi> elements spell "${word}". ` +
        `Use a single <mi>${word}</mi>${ALL_FUNCTION_NAMES.has(word) ? ' (with mathvariant="normal" if needed)' : ''} instead.`,
        SPEC_LINKS.presentation));
    } else if (run.length >= 3) {
      findings.push(makeFinding('info', 'L024', 'Possible split identifier run',
        `${run.length} consecutive single-character <mi> elements may represent the identifier "${word}". ` +
        `If this is a multi-character identifier, use a single <mi>${word}</mi>.`,
        SPEC_LINKS.presentation));
    }
  }

  return findings;
}

/**
 * L025 — Plain-text word in <mi>.
 * Multi-character <mi> that looks like a prose word suggests <mtext> should be used.
 */
export function validateMiPlainText(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  if (tag !== 'mi') return [];

  const token = node.textContent?.trim() ?? '';
  if (token.length < 2) return [];

  // Looks like a known plain-text word and has no mathvariant override
  if (LIKELY_PLAIN_TEXT_WORDS.has(token.toLowerCase()) && !node.hasAttribute('mathvariant')) {
    return [makeFinding('info', 'L025', 'Prose word in <mi>',
      `<mi>${token}</mi> looks like a prose word. Use <mtext>${token}</mtext> for non-mathematical text.`,
      SPEC_LINKS.presentation)];
  }

  return [];
}

/**
 * L026 — Large operator in <mi> instead of <mo>.
 * Symbols like ∑ ∏ ∫ and words like "lim" should be in <mo>.
 */
export function validateLargeOperatorInMi(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  if (tag !== 'mi') return [];

  const token = node.textContent?.trim() ?? '';
  if (!token) return [];

  if (LARGE_OPERATOR_SYMBOLS.has(token) || LARGE_OPERATOR_WORDS.has(token.toLowerCase())) {
    return [makeFinding('warn', 'L026', 'Large operator in <mi>',
      `"${token}" is a large operator and should be encoded as <mo>${token}</mo>, not <mi>.`,
      SPEC_LINKS.presentation)];
  }

  return [];
}

/**
 * L027 — Numeric literal in <mi> or <mo>.
 * Numbers belong in <mn>.
 */
export function validateNumericInWrongToken(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  if (tag !== 'mi' && tag !== 'mo') return [];

  const token = node.textContent?.trim() ?? '';
  if (!token) return [];

  if (looksLikeNumericLiteral(token)) {
    return [makeFinding('warn', 'L027', 'Number in non-<mn> element',
      `"${token}" looks like a numeric literal but is inside <${tag}>. Use <mn>${token}</mn> instead.`,
      SPEC_LINKS.presentation)];
  }

  return [];
}

/**
 * L028 — Closing fence in <mi> or <mn>.
 * Closing brackets/fences should be <mo>.
 */
export function validateFenceInWrongToken(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  if (tag !== 'mi' && tag !== 'mn') return [];

  const token = node.textContent?.trim() ?? '';
  if (CLOSING_FENCE_TOKENS.has(token)) {
    return [makeFinding('warn', 'L028', 'Fence character in non-<mo>',
      `"${token}" is a closing fence and should be encoded as <mo>${token}</mo>, not <${tag}>.`,
      SPEC_LINKS.presentation)];
  }

  return [];
}

/**
 * L029 — Empty token element.
 * Token elements (mi, mn, mo, mtext, ms) with no text content are almost always errors.
 */
export function validateEmptyToken(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  if (!TOKEN_ELEMENTS.has(tag)) return [];

  // mo can be intentionally empty (e.g., invisible operators added via attribute)
  if (tag === 'mo') return [];

  const text = node.textContent?.trim() ?? '';
  if (!text) {
    return [makeFinding('warn', 'L029', 'Empty token element',
      `<${tag}> has no text content. Token elements should contain a character or text string.`,
      SPEC_LINKS.presentation)];
  }

  return [];
}

/**
 * L050 — Subscript/superscript base is a single lowercase letter followed by an index
 * that looks like a numeric run — likely should use a cleaner encoding.
 * Also: <mn> in index position with value > 9 may indicate an error.
 */
export function validateIndexSequence(node: Element, _ctx: LintContext): LintMessage[] {
  const tag = normalizeTagName(node.tagName);
  if (tag !== 'mn') return [];

  const token = node.textContent?.trim() ?? '';
  if (!token) return [];

  // Only flag multi-digit numbers used as subscript indices (common mistake from bad converters)
  if (!/^\d{2,}$/.test(token)) return [];
  if (!isIndexLikeContainer(node)) return [];

  return [makeFinding('info', 'L050', 'Multi-digit subscript index',
    `<mn>${token}</mn> is used as a subscript index. If this represents a sequence index (e.g., x_12 meaning x₁₂), ` +
    `consider whether the intended encoding is x_{12} (a two-digit index) or separate terms.`,
    SPEC_LINKS.presentation)];
}
