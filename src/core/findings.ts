/**
 * core/findings.ts
 * Shared helpers for creating and deduplicating LintMessage objects.
 */

import type { LintMessage, LintReference, OverlayRule, Severity } from '../types.js';

const SPEC_LINKS = {
  core: 'https://w3c.github.io/mathml-core/',
  intent: 'https://w3c.github.io/mathml/#intent-expressions',
  presentation: 'https://w3c.github.io/mathml/#presentation-markup',
  syntax: 'https://w3c.github.io/mathml/#fundamentals',
  spacingWarning: 'https://www.w3.org/TR/MathML/chapter3.html#id.3.3.6.5',
  daisy: 'https://www.daisy.org/z3986/structure/SG-DAISY3/part2-math.html',
};

export { SPEC_LINKS };

/** Per-code default reference lists (supplemental to the primary reference URL) */
const DEFAULT_FINDING_REFERENCES = new Map<string, LintReference[]>([
  ['L033', [{ label: 'MathML spacing warning', url: SPEC_LINKS.spacingWarning, type: 'spec' }]],
  ['L034', [{ label: 'MathML spacing warning', url: SPEC_LINKS.spacingWarning, type: 'spec' }]],
  ['L036', [{ label: 'DAISY guidance (invisible times)', url: SPEC_LINKS.daisy, type: 'spec' }, { label: 'MathML Core operators', url: SPEC_LINKS.core, type: 'spec' }]],
  ['L037', [{ label: 'DAISY guidance (invisible separator)', url: SPEC_LINKS.daisy, type: 'spec' }, { label: 'MathML Core operators', url: SPEC_LINKS.core, type: 'spec' }]],
  ['L038', [{ label: 'DAISY guidance (implicit addition)', url: SPEC_LINKS.daisy, type: 'spec' }, { label: 'MathML Core operators', url: SPEC_LINKS.core, type: 'spec' }]],
  ['L070', [{ label: 'MathML Core', url: SPEC_LINKS.core, type: 'spec' }]],
  ['L071', [{ label: 'MathML Core', url: SPEC_LINKS.core, type: 'spec' }]],
  ['L072', [{ label: 'MathML Core', url: SPEC_LINKS.core, type: 'spec' }]],
  ['L073', [{ label: 'MathML Core', url: SPEC_LINKS.core, type: 'spec' }]],
]);

function normalizeReferences(code: string, reference: string | LintReference[]): LintReference[] {
  const out: LintReference[] = [];
  if (Array.isArray(reference)) {
    for (const entry of reference) {
      if (entry?.url) out.push(entry);
    }
  } else if (typeof reference === 'string' && reference.trim()) {
    out.push({ label: 'Spec reference', url: reference.trim(), type: 'spec' });
  }
  const defaults = DEFAULT_FINDING_REFERENCES.get(code) ?? [];
  for (const entry of defaults) {
    if (entry?.url && !out.some((r) => r.url === entry.url)) {
      out.push(entry);
    }
  }
  return out;
}

export function makeFinding(
  severity: Severity,
  code: string,
  title: string,
  message: string,
  reference: string | LintReference[],
): LintMessage {
  const references = normalizeReferences(code, reference);
  return {
    severity,
    code,
    title,
    message,
    reference: references[0]?.url ?? '',
    references,
  };
}

export function dedupeFindings(findings: LintMessage[]): LintMessage[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.severity}|${f.code}|${f.title}|${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Apply overlay rules to a finding list.
 * Overlays can disable a rule ("off") or change its severity.
 */
export function applyOverlays(findings: LintMessage[], overlays: OverlayRule[]): LintMessage[] {
  if (!overlays.length) return findings;
  const overrideMap = new Map(overlays.map((o) => [o.code, o.severity]));
  return findings.flatMap((f) => {
    const override = overrideMap.get(f.code);
    if (!override) return [f];
    if (override === 'off') return [];
    return [{ ...f, severity: override }];
  });
}
