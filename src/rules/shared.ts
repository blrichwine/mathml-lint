/**
 * rules/shared.ts
 * Shared constants and utilities used across rule modules.
 */

import type { LintContext } from '../types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

export const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';

export const TOKEN_ELEMENTS = new Set(['mi', 'mn', 'mo', 'mtext', 'ms']);
export const DEPRECATED_TAGS = new Set(['mfenced', 'mstyle']);
export const SCRIPT_BASE_TAGS = new Set(['msup', 'msub', 'msubsup', 'mover', 'munder', 'munderover', 'mmultiscripts']);
export const CLOSING_FENCE_TOKENS = new Set([')', ']', '}', '\u27e9', '\u27eb', '\u3009', '\u300b', '\u300d', '\u300f', '\u3011', '\u3015', '\u3017', '\u3019', '\u301b']);

export const LARGE_OPERATOR_SYMBOLS = new Set(['∑', '∏', '∫', '∮', '⋃', '⋂']);
export const LARGE_OPERATOR_WORDS = new Set(['lim']);

export const LATEX_BUILTIN_FUNCTION_NAMES = new Set([
  'cos', 'sin', 'tan', 'csc', 'sec', 'cot',
  'cosh', 'sinh', 'tanh', 'coth',
  'arccos', 'arcsin', 'arctan',
  'log', 'ln', 'lg', 'exp',
  'lim', 'liminf', 'limsup',
  'min', 'max', 'sup', 'inf',
]);

export const OPERATORNAME_FUNCTION_NAMES = new Set([
  'sech', 'csch',
  'arsinh', 'arcsinh',
  'arcosh', 'arccosh',
  'artanh', 'arctanh',
]);

export const LIKELY_PLAIN_TEXT_WORDS = new Set([
  'and', 'but', 'all', 'the', 'for', 'with',
  'from', 'into', 'over', 'under', 'time', 'distance', 'velocity',
]);

export const IMPLICIT_MULTIPLICATION_SEQUENCE_CONTEXTS = new Set([
  'math', 'mrow', 'msqrt', 'menclose', 'mstyle', 'merror', 'mpadded', 'mphantom', 'mtd',
]);
export const IMPLICIT_MULTIPLICATION_OPERAND_TAGS = new Set([
  'mi', 'mn',
  'mrow', 'msup', 'msub', 'msubsup', 'mfrac', 'msqrt', 'mroot',
  'mfenced', 'mover', 'munder', 'munderover', 'mmultiscripts',
]);
export const INDEX_SEQUENCE_TOKEN_TAGS = new Set(['mi', 'mn']);

/**
 * Safe childElements — @xmldom/xmldom may return null for element.children
 * on token elements. Filter childNodes by nodeType === 1 instead.
 */
export function childElements(node: Element | Node): Element[] {
  const result: Element[] = [];
  const nodes = node.childNodes;
  if (!nodes) return result;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes.item(i);
    if (n && n.nodeType === 1) result.push(n as Element);
  }
  return result;
}

export function normalizeTagName(value: string): string {
  const lower = value.toLowerCase();
  return lower.includes(':') ? lower.split(':').pop()! : lower;
}

export function normalize(value: string | null | undefined): string {
  return String(value ?? '').toLowerCase();
}

export function isApplyFunctionMo(node: Element): boolean {
  return normalizeTagName(node.tagName) === 'mo' && node.textContent?.trim() === '\u2061';
}

export function isInvisibleSeparatorMo(node: Element): boolean {
  return normalizeTagName(node.tagName) === 'mo' && node.textContent?.trim() === '\u2063';
}

export function isInsideAnnotation(node: Node): boolean {
  let parent = (node as Element).parentElement;
  while (parent) {
    const tag = normalizeTagName(parent.tagName);
    if (tag === 'annotation' || tag === 'annotation-xml') return true;
    parent = parent.parentElement;
  }
  return false;
}

export function shouldSkipSchemaChecks(node: Element, ctx: LintContext, effectiveRule: AnyRecord | null): boolean {
  if (effectiveRule) return false;
  const tag = normalizeTagName(node.tagName);
  const schemaAdapter = getSchemaAdapterForProfile(ctx.profile);
  return Boolean(ctx.profile.allowContentInAnnotations && schemaAdapter.contentTags.has(tag) && isInsideAnnotation(node));
}

export function isIndexLikeContainer(node: Element): boolean {
  const parent = node.parentElement;
  if (!parent) return false;
  const parentTag = normalizeTagName(parent.tagName);
  const children = childElements(parent);
  const childIndex = children.indexOf(node);
  if (childIndex < 0) return false;
  if (parentTag === 'msub' && childIndex === 1) return true;
  if (parentTag === 'msubsup' && childIndex === 1) return true;
  if (parentTag === 'mmultiscripts' && childIndex > 0) {
    const hasPrescriptsBefore = children.slice(1, childIndex).some((c) => normalizeTagName(c.tagName) === 'mprescripts');
    if (!hasPrescriptsBefore) return childIndex % 2 === 1;
    const markerIdx = children.findIndex((c) => normalizeTagName(c.tagName) === 'mprescripts');
    return markerIdx >= 0 && childIndex === markerIdx + 1;
  }
  return false;
}

export function isLargeOperatorTokenNode(node: Element): boolean {
  const tag = normalizeTagName(node.tagName);
  if (tag !== 'mo' && tag !== 'mi' && tag !== 'mtext') return false;
  const token = node.textContent?.trim() ?? '';
  if (!token) return false;
  return LARGE_OPERATOR_SYMBOLS.has(token) || LARGE_OPERATOR_WORDS.has(token.toLowerCase());
}

export function isLargeOperatorConstruct(node: Element): boolean {
  if (isLargeOperatorTokenNode(node)) return true;
  const tag = normalizeTagName(node.tagName);
  if (['munderover', 'munder', 'mover', 'msubsup', 'msub', 'msup'].includes(tag)) {
    const base = childElements(node)[0] as Element | undefined;
    return Boolean(base && isLargeOperatorTokenNode(base));
  }
  return false;
}

export function collectLowercaseMiRuns(children: Element[]): Array<{ word: string; length: number; startIndex: number; endIndex: number }> {
  const runs: Array<{ word: string; length: number; startIndex: number; endIndex: number }> = [];
  let currentChars: string[] = [];
  let currentStart = -1;

  function flush(endIndex: number) {
    if (!currentChars.length) return;
    runs.push({ word: currentChars.join(''), length: currentChars.length, startIndex: currentStart, endIndex });
    currentChars = [];
    currentStart = -1;
  }

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const tag = normalizeTagName(child.tagName);
    if (tag !== 'mi') { flush(i - 1); continue; }
    const token = child.textContent?.trim() ?? '';
    if (/^[a-z]$/.test(token)) {
      if (!currentChars.length) currentStart = i;
      currentChars.push(token);
    } else {
      flush(i - 1);
    }
  }
  flush(children.length - 1);
  return runs;
}

export function isLikelyMixedFractionPair(left: Element, right: Element): boolean {
  if (normalizeTagName(left.tagName) !== 'mn' || normalizeTagName(right.tagName) !== 'mfrac') return false;
  return /^\d+$/.test(left.textContent?.trim() ?? '');
}

export function isLikelyWordRunPair(children: Element[], leftIdx: number, rightIdx: number): boolean {
  const left = children[leftIdx];
  const right = children[rightIdx];
  if (!left || !right) return false;
  if (normalizeTagName(left.tagName) !== 'mi' || normalizeTagName(right.tagName) !== 'mi') return false;
  if (!/^[a-z]$/.test(left.textContent?.trim() ?? '') || !/^[a-z]$/.test(right.textContent?.trim() ?? '')) return false;
  let start = leftIdx;
  while (start > 0) {
    const prev = children[start - 1];
    if (normalizeTagName(prev.tagName) !== 'mi' || !/^[a-z]$/.test(prev.textContent?.trim() ?? '')) break;
    start--;
  }
  let end = rightIdx;
  while (end < children.length - 1) {
    const next = children[end + 1];
    if (normalizeTagName(next.tagName) !== 'mi' || !/^[a-z]$/.test(next.textContent?.trim() ?? '')) break;
    end++;
  }
  return end - start + 1 >= 3;
}

export function looksLikeNumericLiteral(value: string): boolean {
  const text = value.trim();
  if (!text) return false;
  return /^[+-]?(?:\d+|\d+\.\d+|\d+,\d+|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+e[+-]?\d+)$/i.test(text);
}

// ── Schema adapter helpers ────────────────────────────────────────────────────
// These wrap the JS schema adapter (mathml-schema-adapter.js) for typed access.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _schemaAdapters: Record<string, any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSchemaAdapters(): Record<string, any> {
  if (_schemaAdapters) return _schemaAdapters;
  // Dynamic import not available synchronously; we use a workaround:
  // schemaAdapters are initialised once in engine.ts and injected here.
  throw new Error('Schema adapters not initialized. Call initSchemaAdapters() first.');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function initSchemaAdapters(adapters: Record<string, any>): void {
  _schemaAdapters = adapters;
}

import type { LintProfile } from '../types.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSchemaAdapterForProfile(profile: LintProfile): any {
  const adapters = getSchemaAdapters();
  const version = normalize(profile?.version ?? 'mathml3');
  return adapters[version] ?? adapters['mathml3'];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEffectiveTagRule(tag: string, profile: LintProfile): any | null {
  const schemaAdapter = getSchemaAdapterForProfile(profile);
  const schemaRule = schemaAdapter.presentationRules[tag] ?? null;
  const localRule = TAG_RULES[tag] ?? null;
  if (!schemaRule && !localRule) return null;
  const mergedAttributes = dedupeArray([...(schemaRule?.attributes ?? []), ...(localRule?.attributes ?? [])]);
  const mergedChildren = mergeChildren(schemaRule?.children, localRule?.children);
  return { children: mergedChildren, attributes: mergedAttributes, arity: localRule?.arity ?? schemaRule?.arity ?? null };
}

function mergeChildren(schemaChildren: string[] | undefined, localChildren: string[] | undefined): string[] {
  const left = Array.isArray(schemaChildren) ? schemaChildren : [];
  const right = Array.isArray(localChildren) ? localChildren : [];
  if (left.includes('any') || right.includes('any')) return ['any'];
  return dedupeArray([...left, ...right]);
}

function dedupeArray<T>(values: T[]): T[] {
  return values.filter((v, i, arr) => arr.indexOf(v) === i);
}

function isTagAllowedInProfile(tag: string, profile: LintProfile): boolean {
  const schemaAdapter = getSchemaAdapterForProfile(profile);
  const specs = schemaAdapter.specsByTag.get(tag) as Set<string> | undefined;
  if (!specs?.size) return true;
  const expectedSpec = profile.subset === 'core' ? 'mathml-core' : 'presentation';
  return specs.has(expectedSpec);
}

export { isTagAllowedInProfile };

// ── TAG_RULES ─────────────────────────────────────────────────────────────────
// Local overlay rules merged with schema-derived rules in getEffectiveTagRule.
const CHILDREN_PRESENTATION = [
  'mrow', 'mi', 'mn', 'mo', 'mtext', 'ms', 'mspace',
  'mfrac', 'msup', 'msub', 'msubsup', 'mmultiscripts', 'mover', 'munder', 'munderover',
  'msqrt', 'mroot', 'mtable', 'semantics',
  'mstyle', 'merror', 'mpadded', 'mphantom', 'menclose', 'maction',
];

export const TAG_RULES: Record<string, { children: string[]; attributes: string[]; arity?: { exact?: number; min?: number } }> = {
  math: { children: [...CHILDREN_PRESENTATION], attributes: ['xmlns', 'display', 'mathvariant', 'intent', 'altimg', 'alttext', 'altimg-width', 'altimg-height', 'altimg-valign'], arity: { min: 1 } },
  mrow: { children: [...CHILDREN_PRESENTATION, 'mrow'], attributes: ['intent'] },
  mi: { children: [], attributes: ['mathvariant', 'intent'] },
  mn: { children: [], attributes: ['mathvariant', 'intent'] },
  mo: { children: [], attributes: ['mathvariant', 'form', 'fence', 'separator', 'stretchy', 'symmetric', 'intent'] },
  mtext: { children: [], attributes: ['mathvariant', 'intent'] },
  ms: { children: [], attributes: ['mathvariant', 'lquote', 'rquote', 'intent'] },
  mspace: { children: [], attributes: ['width', 'height', 'depth'] },
  mfrac: { children: [...CHILDREN_PRESENTATION], attributes: ['linethickness', 'bevelled', 'intent'], arity: { exact: 2 } },
  msup: { children: [...CHILDREN_PRESENTATION], attributes: ['intent'], arity: { exact: 2 } },
  msub: { children: [...CHILDREN_PRESENTATION], attributes: ['intent'], arity: { exact: 2 } },
  msubsup: { children: [...CHILDREN_PRESENTATION], attributes: ['intent'], arity: { exact: 3 } },
  mmultiscripts: { children: [...CHILDREN_PRESENTATION, 'mprescripts', 'none'], attributes: ['intent'], arity: { min: 1 } },
  mprescripts: { children: [], attributes: [] },
  none: { children: [], attributes: [] },
  mover: { children: [...CHILDREN_PRESENTATION], attributes: ['accent', 'intent'], arity: { exact: 2 } },
  munder: { children: [...CHILDREN_PRESENTATION], attributes: ['accentunder', 'intent'], arity: { exact: 2 } },
  munderover: { children: [...CHILDREN_PRESENTATION], attributes: ['accent', 'accentunder', 'intent'], arity: { exact: 3 } },
  msqrt: { children: [...CHILDREN_PRESENTATION], attributes: ['intent'], arity: { min: 1 } },
  mroot: { children: [...CHILDREN_PRESENTATION], attributes: ['intent'], arity: { exact: 2 } },
  mfenced: { children: [...CHILDREN_PRESENTATION], attributes: ['open', 'close', 'separators', 'intent'] },
  menclose: { children: ['any'], attributes: ['notation', 'intent'], arity: { min: 1 } },
  merror: { children: ['any'], attributes: ['intent'], arity: { min: 1 } },
  mpadded: { children: ['any'], attributes: ['width', 'height', 'depth', 'lspace', 'voffset', 'intent'], arity: { min: 1 } },
  mphantom: { children: ['any'], attributes: ['intent'], arity: { min: 1 } },
  maction: { children: ['any'], attributes: ['actiontype', 'selection', 'intent'], arity: { min: 1 } },
  mtable: { children: ['mtr', 'mlabeledtr'], attributes: ['columnalign', 'rowalign', 'intent'] },
  mtr: { children: ['mtd', 'maligngroup'], attributes: ['rowalign', 'columnalign', 'groupalign', 'intent'] },
  mlabeledtr: { children: ['mtd'], attributes: ['rowalign', 'columnalign', 'groupalign', 'intent'], arity: { min: 1 } },
  mtd: { children: [...CHILDREN_PRESENTATION, 'maligngroup'], attributes: ['rowspan', 'columnspan', 'intent'], arity: { min: 1 } },
  semantics: { children: ['mrow', ...CHILDREN_PRESENTATION, 'annotation', 'annotation-xml'], attributes: ['intent'], arity: { min: 1 } },
  annotation: { children: [], attributes: ['encoding', 'src'] },
  'annotation-xml': { children: ['any'], attributes: ['encoding', 'src'] },
  mstyle: { children: ['any'], attributes: ['mathvariant', 'displaystyle', 'scriptlevel'], arity: { min: 1 } },
};
