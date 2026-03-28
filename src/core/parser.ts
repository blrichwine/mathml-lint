/**
 * core/parser.ts
 *
 * Environment-agnostic XML parser that:
 *  1. Parses source with @xmldom/xmldom (same DOMParser API everywhere)
 *  2. Builds a per-node position map via a sax second pass (element order correlation)
 *  3. Returns a locate() function and the parsed Document
 *
 * Spike notes (design doc requirement):
 *  - @xmldom/xmldom's internal locator is a mutable object updated during SAX events.
 *    Capturing it reliably per-node requires hooking SAX events, which is not exposed
 *    publicly. Two-pass (DOM + sax) is the reliable alternative.
 *  - Element order from doc.getElementsByTagName('*') matches sax opentag event order
 *    for well-formed XML (both are pre-order depth-first). This correlation is
 *    deterministic and safe.
 *  - If the sax pass throws (malformed XML that @xmldom/xmldom accepted), positions are
 *    partially populated — locate() returns undefined for unmatched nodes.
 *  - Fallback: if sax is unavailable (edge case), locate() returns undefined for all nodes.
 */

import { DOMParser } from '@xmldom/xmldom';
import sax from 'sax';
import type { Location } from '../types.js';

export interface ParseResult {
  doc: Document;
  locate: (node: Node) => Location | undefined;
  /** Present when XML is not well-formed */
  parseError?: string;
}

/** Generate an XPath-like string for a node, e.g. /math/mrow/mi[2] */
export function getXPath(node: Node): string {
  const parts: string[] = [];
  let current: Node | null = node;
  while (current && current.nodeType === 1 /* ELEMENT_NODE */) {
    const el = current as Element;
    const tag = el.tagName.toLowerCase().replace(/^[^:]+:/, ''); // strip namespace prefix
    const parent = el.parentElement;
    if (parent) {
      // Count siblings with the same local tag name (ignore namespace prefix)
      // Use childNodes filter instead of .children (xmldom compat)
      const siblings: Element[] = [];
      const childNodes = parent.childNodes;
      for (let i = 0; childNodes && i < childNodes.length; i++) {
        const n = childNodes.item(i);
        if (n && n.nodeType === 1 &&
            (n as Element).tagName.toLowerCase().replace(/^[^:]+:/, '') === tag) {
          siblings.push(n as Element);
        }
      }
      const idx = siblings.indexOf(el) + 1;
      parts.unshift(siblings.length > 1 ? `${tag}[${idx}]` : tag);
    } else {
      parts.unshift(tag);
    }
    current = el.parentElement;
  }
  return '/' + parts.join('/');
}

export function parseXML(source: string, sourceFile?: string): ParseResult {
  // ── Step 1: DOM parse with @xmldom/xmldom ──────────────────────────────────
  let parseError: string | undefined;
  // @xmldom/xmldom ^0.9 uses a single-function errorHandler signature:
  // (level: 'error' | 'warning' | 'fatalError', msg: string, context: unknown) => void
  const errorHandler = (level: string, msg: string) => {
    if (level !== 'warning' && !parseError) parseError = msg;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parser = new DOMParser({ errorHandler } as any);

  // @xmldom/xmldom may throw on fatal errors even with a custom errorHandler.
  // Wrap in try/catch and fall back to a minimal document so the rest of the
  // pipeline can still produce an L001 finding.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let doc: Document;
  try {
    doc = parser.parseFromString(source, 'application/xml') as unknown as Document;
  } catch (e) {
    if (!parseError) parseError = (e as Error).message;
    doc = parser.parseFromString('<math/>', 'application/xml') as unknown as Document;
  }

  // @xmldom/xmldom may also insert a <parsererror> element for fatal errors
  const parseerrorEl = (doc as unknown as { querySelector?: (s: string) => Element | null })
    .querySelector?.('parsererror');
  if (!parseError && parseerrorEl) {
    parseError = parseerrorEl.textContent || 'Invalid XML';
  }

  // ── Step 2: Position map via sax second pass ───────────────────────────────
  const positionsByIndex: Array<{ line: number; col: number }> = [];

  try {
    const saxParser = sax.parser(true /* strict */, {});
    saxParser.onopentag = () => {
      // sax line/column: both are 0-indexed → normalise to 1-indexed
      positionsByIndex.push({ line: saxParser.line + 1, col: saxParser.column + 1 });
    };
    saxParser.write(source).close();
  } catch {
    // Malformed XML: partial positions are fine; locate() returns undefined for gaps
  }

  // ── Step 3: Correlate DOM elements with sax positions ─────────────────────
  // Both use pre-order (document-order) traversal, so index N in each matches.
  const positionMap = new WeakMap<Node, Location>();
  const allElements = Array.from(
    (doc as unknown as { getElementsByTagName: (s: string) => ArrayLike<Element> })
      .getElementsByTagName('*'),
  );

  for (let i = 0; i < allElements.length; i++) {
    const pos = positionsByIndex[i];
    if (!pos) break;
    const loc: Location = { ...pos };
    if (sourceFile) loc.sourceFile = sourceFile;
    positionMap.set(allElements[i] as unknown as Node, loc);
  }

  function locate(node: Node): Location | undefined {
    const base = positionMap.get(node);
    if (!base) return undefined;
    return { ...base, xpath: getXPath(node) };
  }

  return { doc, locate, parseError };
}
