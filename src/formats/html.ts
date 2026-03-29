/**
 * formats/html.ts
 * Extract <math> blocks from an HTML document and lint each one.
 * Returns per-block results with sourceFile set to identify context.
 */

import type { LintOptions, LintResult } from '../types.js';
import { lintMathML } from '../core/engine.js';

/** A single math block found in an HTML source file. */
export interface HtmlMathBlock {
  index: number;
  source: string;
  result: LintResult;
}

export interface HtmlLintResult {
  sourceFile: string;
  blocks: HtmlMathBlock[];
  totalFindings: number;
}

const MATHML_NS = 'http://www.w3.org/1998/Math/MathML';

/**
 * If a math block uses a namespace prefix (e.g. <m:math>) but was extracted
 * without its xmlns declaration (which lives on an ancestor element), inject
 * the declaration so the XML parser can resolve the prefix.
 */
function ensureMathNs(block: string): string {
  const prefixMatch = /^<([\w]+):math[\s>]/i.exec(block);
  if (!prefixMatch) return block; // unprefixed — nothing to do
  const prefix = prefixMatch[1];
  const nsAttr = `xmlns:${prefix}="${MATHML_NS}"`;
  if (block.includes(nsAttr)) return block; // already has it
  // Insert the xmlns declaration into the opening tag
  return block.replace(/^(<[\w]+:math)(\s|>)/, `$1 ${nsAttr}$2`);
}

/**
 * Extract all <math>...</math> blocks from an HTML/XML string using a simple
 * regex approach (adequate for lint purposes; not a full HTML parser).
 * Handles namespace-prefixed elements (e.g. <m:math> in DTBook/NIMAS).
 */
function extractMathBlocks(html: string): string[] {
  const blocks: string[] = [];
  // Match <math> or namespace-prefixed <m:math> etc. (non-greedy, case-insensitive, multiline)
  const mathRe = /<(?:[\w]+:)?math(?:\s[^>]*)?>[\s\S]*?<\/(?:[\w]+:)?math>/gi;
  let m: RegExpExecArray | null;
  while ((m = mathRe.exec(html)) !== null) {
    blocks.push(ensureMathNs(m[0]));
  }
  return blocks;
}

export async function lintHtmlFile(
  content: string,
  sourceFile: string,
  options: LintOptions = {},
): Promise<HtmlLintResult> {
  const blocks = extractMathBlocks(content);
  const results: HtmlMathBlock[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const source = blocks[i];
    const result = await lintMathML(source, { ...options, sourceFile: `${sourceFile}#math[${i + 1}]` });
    results.push({ index: i + 1, source, result });
  }

  const totalFindings = results.reduce((sum, b) => sum + b.result.summary.total, 0);
  return { sourceFile, blocks: results, totalFindings };
}
