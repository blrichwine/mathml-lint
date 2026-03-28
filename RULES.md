# mathml-lint Rule Reference

This document describes every lint rule, its code, default severity, what triggers it, and the rationale behind it.

Rules are grouped by category. Severity levels: **error** | **warn** | **info**

Severity can be overridden or disabled via [overlay rules](README.md#overlay-rules).

---

## L001 — Parse Error

| Code | Severity | Profile |
|------|----------|---------|
| L001 | error | all |

The MathML source is not well-formed XML. The document cannot be linted reliably when parsing fails. All subsequent findings may be incomplete.

**Rationale:** Malformed XML is rejected by browsers and AT. This is always an error.

---

## L010–L012 — Tag Validation

### L010 — Unknown tag

| Code | Severity | Profile |
|------|----------|---------|
| L010 | warn | all |

An element name is not recognized in the active lint profile. This catches typos, custom elements accidentally placed inside MathML, and tags from other namespaces.

**Rationale:** Unknown elements are either silently ignored or cause rendering errors. Early detection prevents silent failures.

### L011 — Deprecated element

| Code | Severity | Profile |
|------|----------|---------|
| L011 | error (core), warn (presentation) | all |

Element is legacy and should be avoided in new content:
- `<mfenced>` — equivalent to `<mrow>` with `<mo>` fences; the expansion is well-defined and authors should write it explicitly
- `<mstyle>` — CSS and `displaystyle`/`scriptlevel` attributes on individual elements replace it

**Rationale:** These elements are absent from MathML Core and may be removed from future specs. Content using them will break in Core-only renderers.

### L012 — Outside selected profile

| Code | Severity | Profile |
|------|----------|---------|
| L012 | warn | profiles with `warnForProfileBoundary: true` (core-*) |

Element exists in MathML but is not part of the selected profile subset (e.g., a Presentation element used while targeting MathML Core).

**Rationale:** Helps authors targeting specific deployment environments (EPUB3 reading systems, browser Core implementations) stay within the supported element set.

---

## L020–L023 — Attribute Validation

### L020 — Unknown attribute

| Code | Severity | Profile |
|------|----------|---------|
| L020 | warn | all |

An attribute is not recognized for the element in the active profile. `data-*` attributes and `xmlns` declarations are always allowed and never flagged. `data-mjx-*` attributes can be suppressed with `--ignore-data-mjx`.

**Rationale:** Unknown attributes are silently ignored by renderers. This catches typos (e.g. `mathVariant`) and attributes placed on the wrong element.

### L021 — Invalid attribute value

| Code | Severity | Profile |
|------|----------|---------|
| L021 | warn | all |

An attribute has a value outside its defined enumeration. Checked attributes include:
- `display` on `<math>`: `"block"` or `"inline"`
- `dir`: `"ltr"`, `"rtl"`, or `"auto"`
- `form` on `<mo>`: `"prefix"`, `"infix"`, or `"postfix"`
- `fence`, `separator`, `stretchy`, `symmetric`, `bevelled`, `displaystyle`: `"true"` or `"false"`
- `columnalign`: space-separated list of `"left"`, `"center"`, `"right"`, `"decimalpoint"`
- `rowalign`: space-separated list of `"top"`, `"bottom"`, `"center"`, `"baseline"`, `"axis"`
- `mathvariant`: recognized MathML mathvariant token

**Rationale:** Invalid values fall back to element defaults silently, making it hard to diagnose rendering differences between renderers.

### L022 — mathvariant on non-`<mi>`

| Code | Severity | Profile |
|------|----------|---------|
| L022 | warn | all |

`mathvariant` is used on an element other than `<mi>`. In modern MathML Core workflows, `mathvariant` is meaningful primarily on `<mi>` to select italic/upright rendering. On other elements, direct Unicode character encoding is strongly preferred.

**Rationale:** `mathvariant` on non-`<mi>` elements is not reliably implemented across renderers and is not part of MathML Core.

### L023 — Uncommon mathvariant value

| Code | Severity | Profile |
|------|----------|---------|
| L023 | info | all |

A valid but uncommon `mathvariant` value is used (`bold-fraktur`, `sans-serif-italic`, `sans-serif-bold-italic`, `bold-sans-serif`, `bold-script`, `initial`, `tailed`, `looped`, `stretched`). Common values are `normal`, `bold`, `italic`, `bold-italic`, `double-struck`, `script`, `fraktur`, `sans-serif`, `monospace`.

**Rationale:** Uncommon variants have poor AT support and inconsistent renderer coverage. Authors should verify their target environment supports these.

---

## L024–L029 — Token Element Rules

### L024 — Split identifier run

| Code | Severity | Profile |
|------|----------|---------|
| L024 | warn | all |

Multiple consecutive single-character `<mi>` elements spelling a known function name (e.g. `s`, `i`, `n`) or a known plain-text word. These should be a single `<mi>` element (with `mathvariant="normal"` if appropriate for function names).

**Common cause:** LaTeX-to-MathML converters that incorrectly break multi-character identifiers into per-character tokens.

**Rationale:** Split identifiers are rendered as a sequence of italic single-letter variables, not as a function name. This is both visually wrong and semantically incorrect for AT.

### L025 — Prose word in `<mi>`

| Code | Severity | Profile |
|------|----------|---------|
| L025 | info | all |

A multi-character `<mi>` contains a word that looks like prose text (`and`, `the`, `for`, etc.). Prose text in math should use `<mtext>`.

**Rationale:** `<mi>` is for identifiers; `<mtext>` is for prose. AT reads them differently, and renderers apply different styling (italic vs. upright).

### L026 — Large operator in `<mi>`

| Code | Severity | Profile |
|------|----------|---------|
| L026 | warn | all |

A large operator symbol (∑ ∏ ∫ ∮ ⋃ ⋂) or operator word (`lim`) is encoded as `<mi>` instead of `<mo>`. Large operators must be `<mo>` to participate in correct `largeop` / `movablelimits` rendering and to receive proper spacing.

**Rationale:** Renderers use the `<mo>` operator dictionary to determine spacing and stretching. An `<mi>` is treated as an identifier and receives no operator properties.

### L027 — Number in non-`<mn>`

| Code | Severity | Profile |
|------|----------|---------|
| L027 | warn | all |

A numeric literal is encoded inside `<mi>` or `<mo>`. Numbers belong in `<mn>`.

**Rationale:** `<mn>` carries semantic information that AT uses to identify quantities. Renderers may also apply number-specific styling.

### L028 — Fence character in non-`<mo>`

| Code | Severity | Profile |
|------|----------|---------|
| L028 | warn | all |

A closing bracket or fence character (`)`, `]`, `}`, `⟩`, `⟫`, etc.) is encoded in `<mi>` or `<mn>`. Fence characters must be `<mo>` to receive the `fence="true"` operator property and correct spacing from the operator dictionary.

**Rationale:** Fences encoded as identifiers receive no spacing adjustments and break `<mfenced>`-equivalent `<mrow>` patterns.

### L029 — Empty token element

| Code | Severity | Profile |
|------|----------|---------|
| L029 | warn | all |

A token element (`<mi>`, `<mn>`, `<mtext>`, `<ms>`) has no text content. Empty token elements are almost always authoring errors. (`<mo>` is exempt because invisible operators U+2061–U+2064 may be encoded as empty `<mo>` elements by some tools.)

**Rationale:** Empty tokens render as nothing and provide no semantic value. AT will either skip them or produce confusing output.

---

## L030–L034 — Children and Spacing

### L030 — Invalid child element

| Code | Severity | Profile |
|------|----------|---------|
| L030 | warn | all |

A child element is not permitted inside the parent by the MathML schema. For example, placing `<mtr>` directly inside `<math>` without an enclosing `<mtable>`.

**Rationale:** Invalid child structure causes unpredictable rendering and may cause AT to misinterpret the expression structure.

### L031 — Missing function application operator

| Code | Severity | Profile |
|------|----------|---------|
| L031 | warn | profiles with `showSemanticsHints: true` (mathml4, semhints) |

A recognized function-name `<mi>` (e.g. `sin`, `cos`, `log`, `lim`) is directly followed by its argument without an invisible function application operator `<mo>&#x2061;</mo>` (U+2061) between them.

**Rationale:** Without U+2061, AT cannot reliably distinguish `f(x)` (function application) from `f · (x)` (multiplication). The MathML spec and DAISY guidelines require this operator for accessible math.

### L032 — Deprecated attribute on `<math>`

| Code | Severity | Profile |
|------|----------|---------|
| L032 | warn | all |

A deprecated attribute is present on the `<math>` root element:
- `macros` — external macro definition files are not part of MathML
- `mode` — use the `display` attribute instead

**Rationale:** Deprecated attributes are ignored by modern renderers and may indicate content generated by very old tools that should be re-processed.

### L033 — Negative `<mspace>` width

| Code | Severity | Profile |
|------|----------|---------|
| L033 | warn | all |

`<mspace>` has a negative `width` attribute. Negative spacing is strongly discouraged for constructing symbols or conveying meaning through spacing hacks.

**Rationale:** Negative spacing is a legacy technique for overlapping glyphs to simulate symbols that should instead be encoded as single Unicode characters. AT cannot interpret such constructs.

### L034 — Potential overstruck spacing construct

| Code | Severity | Profile |
|------|----------|---------|
| L034 | warn | all |

`<mpadded>` appears to be used with negative spacing attributes (negative `width`, `lspace`, `height`, `depth`, or `voffset`) or contains an `<mspace>` with negative width alongside visible token elements. This is a pattern for visually combining glyphs.

**Rationale:** Same as L033 — spacing-based symbol construction is inaccessible. Use a standard Unicode character or a properly encoded semantic construct.

---

## L035–L039 — Semantic Operator Rules

### L035 — Missing invisible times

| Code | Severity | Profile |
|------|----------|---------|
| L035 | info | profiles with `showSemanticsHints: true` |

Two adjacent operand elements (e.g. `<mi>x</mi><mi>y</mi>`) appear inside a multiplication context without an invisible times operator `<mo>&#x2062;</mo>` (U+2062) between them.

Does not fire when the left operand is a function-name `<mi>` (L031 covers that case), when the pair looks like a mixed fraction, or when it's part of a multi-letter word run.

**Rationale:** Without U+2062, AT cannot reliably determine whether adjacent terms represent multiplication, juxtaposition, or something else. DAISY and MathML accessibility guidelines require explicit invisible operators.

### L036 — Invisible times in unexpected context

| Code | Severity | Profile |
|------|----------|---------|
| L036 | warn | all |

U+2062 INVISIBLE TIMES appears inside an element that is not a typical multiplication sequence context (e.g. inside `<msup>` rather than `<mrow>`).

**Rationale:** Invisible operators placed in structurally incorrect positions may confuse AT and renderers.

### L037 — Invisible separator in unexpected context

| Code | Severity | Profile |
|------|----------|---------|
| L037 | info | all |

U+2063 INVISIBLE SEPARATOR appears in a context where it is not adjacent to `<mi>` or `<mn>` elements — i.e., not between terms in a list.

**Rationale:** The invisible separator is intended to separate items in a comma-free list (e.g. matrix entries). Use in other contexts is likely an error.

### L038 — Apply-function without preceding function name

| Code | Severity | Profile |
|------|----------|---------|
| L038 | warn | all |

U+2061 APPLY FUNCTION appears as the first child of its parent, or follows a non-`<mi>` sibling. The apply-function operator must follow a function-name token.

**Rationale:** The apply-function operator is meaningless without a function name preceding it and will confuse AT.

### L039 — `<semantics>` without annotation

| Code | Severity | Profile |
|------|----------|---------|
| L039 | info | profiles with `showSemanticsHints: true` |

A `<semantics>` element has no `<annotation>` or `<annotation-xml>` child. A `<semantics>` wrapper without any annotation provides no benefit over a plain `<mrow>`.

**Rationale:** Authors may add `<semantics>` as boilerplate without completing the annotation. This hint reminds them to add meaningful annotations (LaTeX source, Content MathML, or intent expressions).

---

## L040–L041 — Arity Rules

### L040 — Wrong number of children (exact arity)

| Code | Severity | Profile |
|------|----------|---------|
| L040 | error | all |

An element that requires an exact number of children has the wrong count:

| Element | Required children |
|---------|-------------------|
| `<mfrac>` | exactly 2 (numerator, denominator) |
| `<msqrt>` | at least 1 |
| `<mroot>` | exactly 2 (base, index) |
| `<msub>` | exactly 2 (base, subscript) |
| `<msup>` | exactly 2 (base, superscript) |
| `<msubsup>` | exactly 3 (base, subscript, superscript) |
| `<munder>` | exactly 2 (base, underscript) |
| `<mover>` | exactly 2 (base, overscript) |
| `<munderover>` | exactly 3 (base, underscript, overscript) |

**Rationale:** These elements have fixed child role semantics. An `<mfrac>` with one child has no denominator; renderers will either error or produce garbage output.

### L041 — Too few children (minimum arity)

| Code | Severity | Profile |
|------|----------|---------|
| L041 | warn | all |

An element requires at least N children but has fewer. Applies to `<math>`, `<mrow>` variants, and table elements with a non-zero minimum.

**Rationale:** Signals incomplete or truncated content that will render as empty or malformed.

---

## L050 — Multi-digit Subscript Index

| Code | Severity | Profile |
|------|----------|---------|
| L050 | info | all |

A `<mn>` element with a multi-digit value is used as a subscript index. This may indicate ambiguity between a two-digit index (x₁₂, meaning the 12th element) and two separate single-digit indices that were concatenated.

**Rationale:** Helps authors verify intended encoding for indexed sequences, which is a common source of ambiguity in converter output.

---

## L060–L062 — Intent and Arg Authoring Hints

> These rules only fire on profiles with `showSemanticsHints: true` (mathml4 profiles) or when explicitly enabled.

### L060 — Consider adding intent annotation

| Code | Severity | Profile |
|------|----------|---------|
| L060 | info | profiles with `showSemanticsHints: true` |

A script element (`<msup>`, `<munder>`, etc.) whose base is a large operator (∑, ∏, ∫, `lim`) does not have an `intent` attribute. Large operator constructs frequently encode concepts (sum-over, integral, limit) that are ambiguous without explicit annotation.

**Rationale:** AT uses `intent` to generate natural-language speech for complex expressions. Without it, large operator constructs are spoken by structural description ("sum with subscript...") rather than as their mathematical meaning ("sum from n equals 1 to infinity of").

### L061 — Malformed intent expression

| Code | Severity | Profile |
|------|----------|---------|
| L061 | warn | all |

An `intent` attribute is present but either empty or has unmatched parentheses. The intent expression syntax requires balanced parentheses for argument lists.

**Rationale:** A malformed intent attribute will be ignored by AT, providing no accessibility benefit.

### L062 — arg attribute without matching intent

| Code | Severity | Profile |
|------|----------|---------|
| L062 | warn | all |

An `arg` attribute is present on an element but either:
- No ancestor has an `intent` attribute at all, or
- The nearest ancestor's `intent` expression does not reference `$argname`

**Rationale:** The `arg` attribute is only meaningful as a target for `$argname` references in an ancestor `intent` expression. A detached `arg` provides no semantic value and signals an incomplete intent annotation.

---

## L070–L073 — MathML Core Compatibility

> These rules only fire when the active profile is `core-mathml3` or `core-mathml4`.

### L070 — Element not in MathML Core

| Code | Severity | Profile |
|------|----------|---------|
| L070 | warn | core-* profiles |

Element is not part of the MathML Core specification. Core-only implementations (browsers using the native MathML Core renderer) will not render it. Elements flagged: `mfenced`, `mstyle`, `menclose`, `maction`, `mlabeledtr`, `mglyph`, `malignmark`, `maligngroup`.

**Rationale:** EPUB3 reading systems and modern browsers increasingly rely on MathML Core. Content targeting these environments must avoid presentation-only elements.

### L071 — At-risk MathML Core element

| Code | Severity | Profile |
|------|----------|---------|
| L071 | info | core-* profiles |

Element is present in MathML Core but was marked "at risk" during spec development. Support may vary: `<ms>`, `<mphantom>`.

**Rationale:** At-risk elements may behave differently across implementations or be removed in future Core revisions.

### L072 — Attribute not in MathML Core

| Code | Severity | Profile |
|------|----------|---------|
| L072 | warn | core-* profiles |

An attribute is not supported in MathML Core and will be ignored by Core-only implementations. Flagged attributes: `bevelled`, `actiontype`, `selection`, `notation`, `open`, `close`, `separators`, `lquote`, `rquote`.

**Rationale:** Same as L070 — helps authors targeting Core-only environments identify attributes that have no effect.

### L073 — Presentation styling attribute in Core context

| Code | Severity | Profile |
|------|----------|---------|
| L073 | info | core-* profiles |

Attributes `mathsize`, `mathcolor`, or `mathbackground` are used in a Core context. MathML Core recommends CSS for styling rather than these presentation-layer attributes.

**Rationale:** Encourages modern CSS-based styling patterns that are more consistent with how HTML content is styled.

---

## L080–L084 — W3C MathML Safe List (Sanitization)

> Reference: [W3C MathML Safe List](https://w3c.github.io/mathml-docs/mathml-safe-list)
>
> These rules help publishers whose content passes through HTML sanitizers (DOMPurify, browser Sanitizer API). Elements and attributes absent from the safe list are silently stripped, breaking rendering without any error.

### L080 — Element not on W3C MathML Safe List

| Code | Severity | Profile |
|------|----------|---------|
| L080 | warn | all |

Element is absent from the W3C MathML Safe List and will be stripped (along with its entire subtree) by compliant sanitizers. Affected elements: `mfenced`, `menclose`, `mglyph`, `maligngroup`, `malignmark`, `mlabeledtr`, `<a>`.

**Note:** `mfenced` triggers both L011 (deprecated) and L080 (unsafe). `menclose` is valid MathML3 but absent from the safe list — its use in sanitized environments (e.g. web apps) should be reconsidered.

**Rationale:** Publishers creating MathML for web delivery or EPUB (which is rendered in a browser context) need to know when their content will silently disappear in sanitized environments.

### L081 — Element requiring special sanitizer handling

| Code | Severity | Profile |
|------|----------|---------|
| L081 | info | all |

Element is on the W3C MathML Safe List but requires special treatment rather than unconditional pass-through. Sanitizers may transform these:

| Element | Sanitizer behavior |
|---------|-------------------|
| `<mphantom>` | Replace with empty `<mspace>` or remove |
| `<maction>` | Replace with `<mrow>` of same children, or keep only first child |
| `<annotation>` | Remove if encoding is absent, untrustworthy, or if `href` is present |
| `<annotation-xml>` | Same as `<annotation>` |

**Rationale:** Even "safe" elements may be transformed in ways that change visual output or drop semantic annotations. Authors should verify rendered output in target environments.

### L082 — href or src on annotation triggers sanitizer removal

| Code | Severity | Profile |
|------|----------|---------|
| L082 | warn | all |

The W3C MathML Safe List explicitly requires sanitizers to remove `<annotation>` and `<annotation-xml>` elements that carry an `href` attribute. A `src` attribute introducing external resource loading is similarly problematic.

**Rationale:** An annotation carrying `href` could be a vector for phishing or content injection. The safe list treats this as a removal trigger, meaning the annotation and its semantic content will be silently dropped.

### L083 — mathvariant not on W3C MathML Safe List

| Code | Severity | Profile |
|------|----------|---------|
| L083 | info | all |

Despite being widely used, `mathvariant` is not included in the W3C MathML Safe List. Strict sanitizers will strip it, which changes the visual rendering of identifiers (e.g. bold, double-struck variants used in set notation ℝ, ℕ, ℤ).

**Recommendation:** Where possible, use direct Unicode character encoding (e.g. `<mi>ℝ</mi>` instead of `<mi mathvariant="double-struck">R</mi>`). This is more robust across sanitizers, renderers, and AT.

**Rationale:** `mathvariant` is a very common source of silent sanitizer stripping, particularly for mathematical notation that relies on styled Latin letters (blackboard bold, script, fraktur).

### L084 — High-impact attribute not on W3C MathML Safe List

| Code | Severity | Profile |
|------|----------|---------|
| L084 | info | all |

An attribute that would visibly affect rendering or semantics is not on the W3C MathML Safe List and will be stripped by compliant sanitizers. Flagged attributes:

| Attribute | Element | Impact of stripping |
|-----------|---------|---------------------|
| `subscriptshift` | `msub`, `msubsup` | Subscript vertical position reverts to default |
| `superscriptshift` | `msup`, `msubsup` | Superscript vertical position reverts to default |
| `lquote` / `rquote` | `ms` | Custom string delimiters replaced with default `"` |
| `href` | any safe-list element | Link removed silently |

**Note:** Many other MathML3 attributes (table layout, linebreaking) are also absent from the safe list but are not flagged here to avoid noise. The safe list is intentionally minimal; authors targeting sanitized environments should test rendering end-to-end.

---

## Profile Summary

| Profile ID | Subset | Version | Semantics hints | Profile boundary | Core compat rules |
|-----------|--------|---------|-----------------|-----------------|-------------------|
| `presentation-mathml3` | presentation | MathML 3 | off | off | off |
| `presentation-mathml4` | presentation | MathML 4 | **on** | off | off |
| `core-mathml3` | core | MathML 3 | off | **on** | **on** |
| `core-mathml4` | core | MathML 4 | **on** | **on** | **on** |

Default profile: `presentation-mathml3`

---

## Overlay Rules

Severity can be overridden per rule code in a JSON overlay file:

```json
[
  { "code": "L083", "severity": "off" },
  { "code": "L035", "severity": "warn" },
  { "code": "L011", "severity": "error" }
]
```

Valid severity values: `"error"` | `"warn"` | `"info"` | `"off"`

Pass the overlay file to the CLI with `--overlay path/to/overlays.json`.

---

## Rule Code Lifecycle

Rule codes are stable public API. Once assigned, a code is never reused. If a rule is split into more specific variants, the original code is deprecated (marked `off` by default) and new codes are assigned. This ensures overlay configurations remain valid across versions.

Reserved ranges:
- L001: parse infrastructure
- L010–L019: tag-level rules
- L020–L029: attribute and token rules
- L030–L039: children, arity, and operator semantics
- L040–L049: arity (exact/min child counts)
- L050–L059: index and sequence rules
- L060–L069: intent/arg authoring hints
- L070–L079: MathML Core compatibility
- L080–L089: W3C MathML Safe List / sanitization
- L090–L099: reserved for platform whitelist rules (future)
