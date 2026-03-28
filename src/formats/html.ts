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

/**
 * Extract all <math>...</math> blocks from an HTML string using a simple
 * regex approach (adequate for lint purposes; not a full HTML parser).
 */
function extractMathBlocks(html: string): string[] {
  const blocks: string[] = [];
  // Match <math ...> ... </math> (non-greedy, case-insensitive, allow multiline)
  const mathRe = /<math(?:\s[^>]*)?>[\s\S]*?<\/math>/gi;
  let m: RegExpExecArray | null;
  while ((m = mathRe.exec(html)) !== null) {
    blocks.push(m[0]);
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
