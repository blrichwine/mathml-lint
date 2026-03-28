/**
 * mathml-lint CLI
 * Usage: mathml-lint [options] <file|glob...>
 */

import { program } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createRequire } from 'node:module';
import type { LintOptions, LintResult, LintMessage, OverlayRule } from './types.js';
import { lintMathML } from './core/engine.js';
import { lintHtmlFile } from './formats/html.js';

const _require = createRequire(import.meta.url);
const pkg = _require('../package.json') as { version: string };

// ── Helpers ──────────────────────────────────────────────────────────────────

function severitySymbol(s: LintMessage['severity']): string {
  switch (s) {
    case 'error': return '✗';
    case 'warn':  return '⚠';
    case 'info':  return 'ℹ';
    default:      return '·';
  }
}

function printTextResult(result: LintResult, source: string): void {
  const { findings, summary } = result;
  if (!findings.length) {
    process.stdout.write(`  ✓ ${source} — no findings\n`);
    return;
  }
  process.stdout.write(`  ${source}\n`);
  for (const f of findings) {
    const loc = f.location ? ` (line ${f.location.line}, col ${f.location.col})` : '';
    const xpath = f.location?.xpath ? ` [${f.location.xpath}]` : '';
    process.stdout.write(`    ${severitySymbol(f.severity)} [${f.code}] ${f.title}${loc}${xpath}\n`);
    process.stdout.write(`       ${f.message}\n`);
    if (f.reference) {
      process.stdout.write(`       → ${f.reference}\n`);
    }
  }
  process.stdout.write(`  Summary: ${summary.errors} error(s), ${summary.warnings} warning(s), ${summary.infos} info(s)\n\n`);
}

function loadOverlays(overlayPath: string): OverlayRule[] {
  if (!existsSync(overlayPath)) {
    process.stderr.write(`Warning: overlay file not found: ${overlayPath}\n`);
    return [];
  }
  try {
    const raw = readFileSync(overlayPath, 'utf8');
    return JSON.parse(raw) as OverlayRule[];
  } catch (e) {
    process.stderr.write(`Warning: failed to parse overlay file: ${(e as Error).message}\n`);
    return [];
  }
}

// ── CLI definition ────────────────────────────────────────────────────────────

program
  .name('mathml-lint')
  .description('Spec-aligned heuristic linter for MathML authoring')
  .version(pkg.version)
  .argument('<files...>', 'MathML, HTML, XHTML, NIMAS, or EPUB3 files to lint (globs accepted)')
  .option('-p, --profile <id>', 'Lint profile: presentation-mathml3 (default), presentation-mathml4, core-mathml3, core-mathml4', 'presentation-mathml3')
  .option('-f, --format <fmt>', 'Output format: text (default) or json', 'text')
  .option('--overlay <path>', 'Path to JSON overlay rules file')
  .option('--ignore-data-mjx', 'Suppress warnings for data-mjx-* attributes', false)
  .option('--max-findings <n>', 'Stop after N findings per file', '500')
  .option('--semantics', 'Enable semantics / intent authoring hints (L06x)', false)
  .option('--platform <ids>', 'Target platform(s) for LMS/CMS compatibility checks (L090+).\n' +
    '                           Comma-separated: wordpress,pressbooks,moodle,canvas,tinymce');

program.parse();

const opts = program.opts<{
  profile: string;
  format: string;
  overlay?: string;
  ignoreDataMjx: boolean;
  maxFindings: string;
  semantics: boolean;
  platform?: string;
}>();

const files = program.args;

const overlays: OverlayRule[] = opts.overlay ? loadOverlays(resolve(opts.overlay)) : [];

const lintOptions: LintOptions = {
  profile: opts.profile,
  overlays,
  maxFindings: parseInt(opts.maxFindings, 10),
  ignoreDataMjxAttributes: opts.ignoreDataMjx,
  platforms: opts.platform,
};

// ── Run ───────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  // Expand globs
  let resolvedFiles: string[] = [];
  for (const pattern of files) {
    if (pattern.includes('*')) {
      const { globSync } = await import('glob');
      const matched = globSync(pattern, { absolute: true });
      resolvedFiles = resolvedFiles.concat(matched);
    } else {
      resolvedFiles.push(resolve(pattern));
    }
  }

  if (!resolvedFiles.length) {
    process.stderr.write('No files matched.\n');
    process.exit(2);
  }

  const jsonResults: Array<{ file: string; result: LintResult }> = [];
  let hasFindings = false;
  let hasError = false;

  for (const filePath of resolvedFiles) {
    if (!existsSync(filePath)) {
      process.stderr.write(`File not found: ${filePath}\n`);
      hasError = true;
      continue;
    }

    const ext = extname(filePath).toLowerCase();

    try {
      if (ext === '.epub') {
        const { lintEpubFile } = await import('./formats/epub.js');
        const epubResult = await lintEpubFile(filePath, lintOptions);
        for (const spineItem of epubResult.spineItems) {
          for (const block of spineItem.blocks) {
            if (opts.format === 'json') {
              jsonResults.push({ file: `${filePath}!${spineItem.sourceFile}#${block.index}`, result: block.result });
            } else {
              printTextResult(block.result, `${spineItem.sourceFile}#math[${block.index}]`);
            }
            if (block.result.summary.total > 0) hasFindings = true;
          }
        }
      } else if (['.html', '.xhtml', '.htm', '.nimas'].includes(ext)) {
        const content = readFileSync(filePath, 'utf8');
        const htmlResult = await lintHtmlFile(content, filePath, lintOptions);
        for (const block of htmlResult.blocks) {
          if (opts.format === 'json') {
            jsonResults.push({ file: `${filePath}#math[${block.index}]`, result: block.result });
          } else {
            printTextResult(block.result, `${filePath}#math[${block.index}]`);
          }
          if (block.result.summary.total > 0) hasFindings = true;
        }
        if (htmlResult.blocks.length === 0 && opts.format === 'text') {
          process.stdout.write(`  ${filePath} — no <math> elements found\n`);
        }
      } else {
        // Treat as raw MathML XML
        const source = readFileSync(filePath, 'utf8');
        const result = await lintMathML(source, { ...lintOptions, sourceFile: filePath });
        if (opts.format === 'json') {
          jsonResults.push({ file: filePath, result });
        } else {
          printTextResult(result, filePath);
        }
        if (result.summary.total > 0) hasFindings = true;
      }
    } catch (err) {
      process.stderr.write(`Error processing ${filePath}: ${(err as Error).message}\n`);
      hasError = true;
    }
  }

  if (opts.format === 'json') {
    process.stdout.write(JSON.stringify(jsonResults, null, 2) + '\n');
  }

  process.exit(hasError ? 2 : hasFindings ? 1 : 0);
}

run().catch((err: unknown) => {
  process.stderr.write(`Fatal: ${(err as Error).message}\n`);
  process.exit(2);
});
