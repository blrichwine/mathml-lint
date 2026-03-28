/**
 * core/engine.ts
 * Main lint engine. Initialises schema adapters, traverses the DOM, applies all rules,
 * and returns a LintResult.
 */

import type { LintMessage, LintResult, LintOptions, LintContext, LintProfile } from '../types.js';
import { parseXML } from './parser.js';
import { dedupeFindings, applyOverlays } from './findings.js';
import { initSchemaAdapters, childElements } from '../rules/shared.js';

// Rule modules
import { validateTag } from '../rules/tag.js';
import { validateAttributes, validateAttributeValues, validateMathvariantUsage, validateNegativeSpacingPatterns } from '../rules/attribute.js';
import { validateChildren, validateFunctionApplication } from '../rules/children.js';
import { validateArity } from '../rules/arity.js';
import { validateSplitMi, validateMiPlainText, validateLargeOperatorInMi, validateNumericInWrongToken, validateFenceInWrongToken, validateEmptyToken, validateIndexSequence } from '../rules/token.js';
import { validateImplicitMultiplication, validateInvisibleTimesUsage, validateInvisibleSeparatorUsage, validateApplyFunctionUsage, validateSemanticsStructure } from '../rules/semantic.js';
import { validateCoreElementSupport, validateCoreAtRiskElement, validateCoreAttributeSupport, validateCoreStylingAttributes } from '../rules/core-compat.js';
import { validateIntentHint, validateIntentSyntax, validateDetachedArg, validateAlttext } from '../rules/hints.js';
import { validateSafeListElement, validateSafeListSpecialElement, validateAnnotationHref, validateMathvariantSafety, validateUnsafeAttribute } from '../rules/safety.js';

// ── Schema adapter initialisation ─────────────────────────────────────────────

let _adaptersInitialized = false;

async function ensureAdapters(): Promise<void> {
  if (_adaptersInitialized) return;
  // Dynamic import — works in both Node and browser (bundled by tsup)
  const adapterModule = await import('../data/mathml-schema-adapter.js') as {
    createMathMLSchemaAdapter: (data: unknown) => unknown;
  };
  const datav3Module = await import('../data/mathml-data-v3.js') as {
    default?: unknown;
    presentationElements?: unknown;
    attributeDefinitions?: unknown;
    universalAttributes?: unknown;
    SpecLevel?: unknown;
  };
  const datav4Module = await import('../data/mathml-data-v4.js') as {
    default?: unknown;
    presentationElements?: unknown;
    attributeDefinitions?: unknown;
    universalAttributes?: unknown;
    SpecLevel?: unknown;
  };

  const adapterV3 = adapterModule.createMathMLSchemaAdapter(datav3Module.default ?? datav3Module);
  const adapterV4 = adapterModule.createMathMLSchemaAdapter(datav4Module.default ?? datav4Module);

  initSchemaAdapters({ mathml3: adapterV3, mathml4: adapterV4 });
  _adaptersInitialized = true;
}

// ── Profile presets ────────────────────────────────────────────────────────────

const PROFILE_PRESETS: Record<string, LintProfile> = {
  'presentation-mathml3': {
    id: 'presentation-mathml3',
    subset: 'presentation',
    version: 'mathml3',
    showSemanticsHints: false,
    warnForProfileBoundary: false,
    allowContentInAnnotations: true,
  },
  'presentation-mathml4': {
    id: 'presentation-mathml4',
    subset: 'presentation',
    version: 'mathml4',
    showSemanticsHints: true,
    warnForProfileBoundary: false,
    allowContentInAnnotations: true,
  },
  'core-mathml3': {
    id: 'core-mathml3',
    subset: 'core',
    version: 'mathml3',
    showSemanticsHints: false,
    warnForProfileBoundary: true,
    allowContentInAnnotations: false,
  },
  'core-mathml4': {
    id: 'core-mathml4',
    subset: 'core',
    version: 'mathml4',
    showSemanticsHints: true,
    warnForProfileBoundary: true,
    allowContentInAnnotations: false,
  },
};

export function resolveProfile(profileId?: string): LintProfile {
  if (!profileId) return PROFILE_PRESETS['presentation-mathml3'];
  return PROFILE_PRESETS[profileId] ?? PROFILE_PRESETS['presentation-mathml3'];
}

// ── Per-node rule runners ─────────────────────────────────────────────────────

type NodeRule = (node: Element, ctx: LintContext) => LintMessage[];

const NODE_RULES: NodeRule[] = [
  // Tag-level
  validateTag,
  // Attribute-level
  validateAttributes,
  validateAttributeValues,
  validateMathvariantUsage,
  validateNegativeSpacingPatterns,
  // Children / arity
  validateChildren,
  validateFunctionApplication,
  validateArity,
  // Token semantics
  validateSplitMi,
  validateMiPlainText,
  validateLargeOperatorInMi,
  validateNumericInWrongToken,
  validateFenceInWrongToken,
  validateEmptyToken,
  validateIndexSequence,
  // Operator semantics
  validateImplicitMultiplication,
  validateInvisibleTimesUsage,
  validateInvisibleSeparatorUsage,
  validateApplyFunctionUsage,
  validateSemanticsStructure,
  // Core compat
  validateCoreElementSupport,
  validateCoreAtRiskElement,
  validateCoreAttributeSupport,
  validateCoreStylingAttributes,
  // Intent / arg hints
  validateIntentHint,
  validateIntentSyntax,
  validateDetachedArg,
  // Accessibility authoring
  validateAlttext,
  // W3C MathML Safe List — sanitization warnings
  validateSafeListElement,
  validateSafeListSpecialElement,
  validateAnnotationHref,
  validateMathvariantSafety,
  validateUnsafeAttribute,
];

// ── DOM traversal ─────────────────────────────────────────────────────────────

function* walkElements(root: Element): Generator<Element> {
  yield root;
  for (const child of childElements(root)) {
    yield* walkElements(child);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function lintMathML(source: string, options: LintOptions = {}): Promise<LintResult> {
  await ensureAdapters();

  const profile = resolveProfile(options.profile as string | undefined);
  const overlays = options.overlays ?? [];
  const maxFindings = options.maxFindings ?? 500;

  const { doc, locate, parseError } = parseXML(source, options.sourceFile);

  const ctx: LintContext = {
    doc,
    locate,
    profile,
    overlays,
    ignoreDataMjxAttributes: options.ignoreDataMjxAttributes ?? false,
  };

  const rawFindings: LintMessage[] = [];

  if (parseError) {
    rawFindings.push({
      severity: 'error',
      code: 'L001',
      title: 'XML parse error',
      message: `The MathML source is not well-formed XML: ${parseError}`,
      reference: 'https://w3c.github.io/mathml/#fundamentals',
      references: [{ label: 'MathML syntax', url: 'https://w3c.github.io/mathml/#fundamentals', type: 'spec' }],
    });
  }

  // Find all <math> roots and walk their subtrees
  const mathRoots = Array.from(
    (doc as unknown as { getElementsByTagName: (s: string) => ArrayLike<Element> })
      .getElementsByTagName('math'),
  ) as Element[];

  for (const mathRoot of mathRoots) {
    for (const node of walkElements(mathRoot)) {
      for (const rule of NODE_RULES) {
        const found = rule(node, ctx);
        for (const f of found) {
          const location = locate(node);
          rawFindings.push(location ? { ...f, location } : f);
        }
        if (rawFindings.length >= maxFindings) break;
      }
      if (rawFindings.length >= maxFindings) break;
    }
    if (rawFindings.length >= maxFindings) break;
  }

  const dedupedFindings = dedupeFindings(rawFindings);
  const finalFindings = applyOverlays(dedupedFindings, overlays);

  const summary = {
    errors: finalFindings.filter((f) => f.severity === 'error').length,
    warnings: finalFindings.filter((f) => f.severity === 'warn').length,
    infos: finalFindings.filter((f) => f.severity === 'info').length,
    total: finalFindings.length,
  };

  return { findings: finalFindings, summary, profile };
}

/** Synchronous variant for environments where async is not available (e.g., browser inline). */
export function lintMathMLSync(source: string, options: LintOptions = {}): LintResult {
  if (!_adaptersInitialized) {
    throw new Error('Schema adapters not initialized. Call lintMathML() (async) at least once first, or call initAdapters() before using lintMathMLSync().');
  }

  const profile = resolveProfile(options.profile as string | undefined);
  const overlays = options.overlays ?? [];
  const maxFindings = options.maxFindings ?? 500;

  const { doc, locate, parseError } = parseXML(source, options.sourceFile);

  const ctx: LintContext = {
    doc,
    locate,
    profile,
    overlays,
    ignoreDataMjxAttributes: options.ignoreDataMjxAttributes ?? false,
  };

  const rawFindings: LintMessage[] = [];

  if (parseError) {
    rawFindings.push({
      severity: 'error',
      code: 'L001',
      title: 'XML parse error',
      message: `The MathML source is not well-formed XML: ${parseError}`,
      reference: 'https://w3c.github.io/mathml/#fundamentals',
      references: [{ label: 'MathML syntax', url: 'https://w3c.github.io/mathml/#fundamentals', type: 'spec' }],
    });
  }

  const mathRoots = Array.from(
    (doc as unknown as { getElementsByTagName: (s: string) => ArrayLike<Element> })
      .getElementsByTagName('math'),
  ) as Element[];

  for (const mathRoot of mathRoots) {
    for (const node of walkElements(mathRoot)) {
      for (const rule of NODE_RULES) {
        const found = rule(node, ctx);
        for (const f of found) {
          const location = locate(node);
          rawFindings.push(location ? { ...f, location } : f);
        }
        if (rawFindings.length >= maxFindings) break;
      }
      if (rawFindings.length >= maxFindings) break;
    }
    if (rawFindings.length >= maxFindings) break;
  }

  const dedupedFindings = dedupeFindings(rawFindings);
  const finalFindings = applyOverlays(dedupedFindings, overlays);

  const summary = {
    errors: finalFindings.filter((f) => f.severity === 'error').length,
    warnings: finalFindings.filter((f) => f.severity === 'warn').length,
    infos: finalFindings.filter((f) => f.severity === 'info').length,
    total: finalFindings.length,
  };

  return { findings: finalFindings, summary, profile };
}

/** Pre-initialise adapters explicitly (useful for browser bundles). */
export async function initAdapters(): Promise<void> {
  await ensureAdapters();
}
