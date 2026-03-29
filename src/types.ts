export type Severity = 'error' | 'warn' | 'info' | 'ok';

export interface Location {
  line: number;
  col: number;
  /** XPath to the offending node — included in JSON output, omitted from CLI text output */
  xpath?: string;
  /** Source file path within an EPUB or multi-file input */
  sourceFile?: string;
}

export interface LintReference {
  label: string;
  url: string;
  type: 'spec' | 'compat' | 'project-note';
}

export interface LintMessage {
  severity: Severity;
  /** Stable rule identifier, e.g. "L028". Public API — never changes once published. */
  code: string;
  title: string;
  message: string;
  reference?: string;
  references?: LintReference[];
  location?: Location;
}

export interface LintSummary {
  errors: number;
  warnings: number;
  infos: number;
  total: number;
}

export interface LintResult {
  findings: LintMessage[];
  summary: LintSummary;
  profile: LintProfile;
}

export interface LintProfile {
  id: string;
  subset: 'core' | 'presentation';
  version: 'mathml3' | 'mathml4';
  warnForProfileBoundary: boolean;
  allowContentInAnnotations: boolean;
}

export interface OverlayRule {
  /** Rule code to override, e.g. "L036" */
  code: string;
  /** New severity, or "off" to disable */
  severity: Severity | 'off';
}

export interface LintOptions {
  profile?: string | LintProfile;
  overlays?: OverlayRule[];
  maxFindings?: number;
  /** When true, suppress data-mjx-* attribute warnings (default: true) */
  ignoreDataMjxAttributes?: boolean;
  /** Source file name for EPUB/multi-file input */
  sourceFile?: string;
}

export interface LintContext {
  doc: Document;
  locate: (node: Node) => Location | undefined;
  profile: LintProfile;
  overlays: OverlayRule[];
  ignoreDataMjxAttributes: boolean;
}
