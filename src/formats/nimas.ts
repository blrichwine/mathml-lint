/**
 * formats/nimas.ts
 * Unzip a NIMAS package (.zip), locate the OPF manifest, extract spine
 * content documents, and lint all MathML <math> blocks found in them.
 *
 * NIMAS packages (NIMAS 1.1 / OEB 1.2) differ from EPUB in that:
 *  - There is no META-INF/container.xml; the OPF is found by scanning for *.opf
 *  - Content documents are DTBook XML (application/x-dtbook+xml) rather than XHTML
 *  - The overall ZIP may contain a PDF and images alongside the XML — those are skipped
 */

import AdmZip from 'adm-zip';
import type { LintOptions } from '../types.js';
import { lintHtmlFile, type HtmlLintResult } from './html.js';

export interface NimasLintResult {
  sourceFile: string;
  contentItems: HtmlLintResult[];
  totalFindings: number;
}

/** Media types that may contain lintable MathML. */
const LINTABLE_TYPES = new Set([
  'application/x-dtbook+xml',
  'application/xhtml+xml',
  'text/html',
  'application/xml',
  'text/xml',
]);

/** Extensions to lint even when no media-type info is available. */
const LINTABLE_EXTS = new Set(['.xml', '.xhtml', '.htm', '.html']);

function isLintable(href: string, mediaType: string): boolean {
  if (LINTABLE_TYPES.has(mediaType.toLowerCase().split(';')[0].trim())) return true;
  const ext = href.slice(href.lastIndexOf('.')).toLowerCase();
  return LINTABLE_EXTS.has(ext);
}

/**
 * Build a map of id → { href, mediaType } from the OPF manifest,
 * then return hrefs in spine order, resolved relative to opfDir.
 */
function parseNimasSpine(opfContent: string, opfDir: string): Array<{ href: string; mediaType: string }> {
  const itemRe = /<item\s+(?:[^>]*\s+)?id="([^"]+)"[^>]*href="([^"]+)"[^>]*media-type="([^"]+)"/gi;
  const idToItem = new Map<string, { href: string; mediaType: string }>();
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(opfContent)) !== null) {
    const [, id, href, mediaType] = m;
    idToItem.set(id, { href, mediaType });
  }

  // Also catch items where media-type comes before href
  const itemRe2 = /<item\s+(?:[^>]*\s+)?id="([^"]+)"[^>]*media-type="([^"]+)"[^>]*href="([^"]+)"/gi;
  while ((m = itemRe2.exec(opfContent)) !== null) {
    const [, id, mediaType, href] = m;
    if (!idToItem.has(id)) idToItem.set(id, { href, mediaType });
  }

  const idrefRe = /<itemref\s+(?:[^>]*\s+)?idref="([^"]+)"/gi;
  const results: Array<{ href: string; mediaType: string }> = [];

  while ((m = idrefRe.exec(opfContent)) !== null) {
    const item = idToItem.get(m[1]);
    if (!item) continue;
    const resolvedHref = opfDir ? `${opfDir}/${item.href}` : item.href;
    results.push({ href: resolvedHref.replace(/\/\//g, '/'), mediaType: item.mediaType });
  }

  return results;
}

export async function lintNimasFile(
  zipPath: string,
  options: LintOptions = {},
): Promise<NimasLintResult> {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  const entryMap = new Map(entries.map((e) => [e.entryName, e]));

  // Find the OPF file — scan all entries for *.opf
  const opfEntry = entries.find((e) => e.entryName.toLowerCase().endsWith('.opf'));
  if (!opfEntry) {
    throw new Error(`${zipPath}: no OPF file found — is this a valid NIMAS package?`);
  }

  const opfPath = opfEntry.entryName;
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';
  const opfContent = opfEntry.getData().toString('utf8');

  const spineItems = parseNimasSpine(opfContent, opfDir);

  const contentResults: HtmlLintResult[] = [];

  for (const { href, mediaType } of spineItems) {
    if (!isLintable(href, mediaType)) continue;

    const contentEntry = entryMap.get(href);
    if (!contentEntry) continue;

    const content = contentEntry.getData().toString('utf8');
    const result = await lintHtmlFile(content, `${zipPath}!${href}`, options);
    if (result.blocks.length > 0) {
      contentResults.push(result);
    }
  }

  const totalFindings = contentResults.reduce((sum, r) => sum + r.totalFindings, 0);
  return { sourceFile: zipPath, contentItems: contentResults, totalFindings };
}
