/**
 * mathml-lint — Public library entry point.
 * Re-exports the public API surface.
 */

export { lintMathML, lintMathMLSync, initAdapters, resolveProfile } from './core/engine.js';
export { parseXML, getXPath } from './core/parser.js';
export { makeFinding, dedupeFindings, applyOverlays, SPEC_LINKS } from './core/findings.js';

export type {
  Severity,
  Location,
  LintMessage,
  LintSummary,
  LintResult,
  LintProfile,
  OverlayRule,
  LintOptions,
  LintContext,
  LintReference,
} from './types.js';
