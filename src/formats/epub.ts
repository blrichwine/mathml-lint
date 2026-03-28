/**
 * formats/epub.ts
 * Unzip an EPUB3 file, locate spine HTML/XHTML documents, extract and lint
 * all MathML <math> blocks. Node.js only (uses 'node:fs' and 'adm-zip').
 *
 * adm-zip is an optional peer dependency; if absent at runtime the function
 * throws a helpful error.
 */

import type { LintOptions, LintResult } from '../types.js';
import { lintHtmlFile, type HtmlLintResult } from './html.js';

export interface EpubLintResult {
  sourceFile: string;
  spineItems: HtmlLintResult[];
  totalFindings: number;
}

async function loadAdmZip(): Promise<new (path: string) => {
  getEntries(): Array<{ entryName: string; getData(): Buffer }>;
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = await import('adm-zip') as any;
    return mod.default ?? mod;
  } catch {
    throw new Error(
      'adm-zip is required for EPUB linting. Install it: npm install adm-zip'
    );
  }
}

/** Parse the OPF manifest to get spine item hrefs (XHTML documents). */
function parseSpineHrefs(opfContent: string, opfDir: string): string[] {
  const idrefRe = /<itemref\s+(?:[^>]*\s+)?idref="([^"]+)"/gi;
  const itemRe = /<item\s+(?:[^>]*\s+)?id="([^"]+)"[^>]*href="([^"]+)"/gi;

  // Build id→href map
  const idToHref = new Map<string, string>();
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(opfContent)) !== null) {
    const [, id, href] = m;
    idToHref.set(id, href);
  }

  const hrefs: string[] = [];
  while ((m = idrefRe.exec(opfContent)) !== null) {
    const href = idToHref.get(m[1]);
    if (href) {
      // Resolve relative to OPF directory
      const resolved = opfDir ? `${opfDir}/${href}` : href;
      hrefs.push(resolved.replace(/\/\//g, '/'));
    }
  }
  return hrefs;
}

/** Find the OPF path from META-INF/container.xml. */
function parseContainerXml(containerXml: string): string {
  const m = /full-path="([^"]+\.opf)"/i.exec(containerXml);
  return m ? m[1] : '';
}

export async function lintEpubFile(
  epubPath: string,
  options: LintOptions = {},
): Promise<EpubLintResult> {
  const AdmZip = await loadAdmZip();
  const zip = new AdmZip(epubPath);

  const entries = zip.getEntries();
  const entryMap = new Map(entries.map((e) => [e.entryName, e]));

  const containerEntry = entryMap.get('META-INF/container.xml');
  if (!containerEntry) {
    throw new Error(`${epubPath}: missing META-INF/container.xml`);
  }

  const containerXml = containerEntry.getData().toString('utf8');
  const opfPath = parseContainerXml(containerXml);
  if (!opfPath) {
    throw new Error(`${epubPath}: could not find OPF path in container.xml`);
  }

  const opfEntry = entryMap.get(opfPath);
  if (!opfEntry) {
    throw new Error(`${epubPath}: OPF file not found at ${opfPath}`);
  }

  const opfContent = opfEntry.getData().toString('utf8');
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';
  const spineHrefs = parseSpineHrefs(opfContent, opfDir);

  const spineResults: HtmlLintResult[] = [];

  for (const href of spineHrefs) {
    const spineEntry = entryMap.get(href);
    if (!spineEntry) continue;

    const content = spineEntry.getData().toString('utf8');
    const result = await lintHtmlFile(content, `${epubPath}!${href}`, options);
    if (result.blocks.length > 0) {
      spineResults.push(result);
    }
  }

  const totalFindings = spineResults.reduce((sum, r) => sum + r.totalFindings, 0);
  return { sourceFile: epubPath, spineItems: spineResults, totalFindings };
}
