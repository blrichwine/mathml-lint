# mathml-lint

A spec-aligned heuristic linter for MathML authoring. Catches semantic errors that XML schema validators miss — split identifiers, missing invisible operators, ambiguous large-operator grouping, sanitization hazards, and more.

Designed for:
- EPUB3 / NIMAS / HTML publishing pipelines
- LaTeX-to-MathML converter validation
- Accessibility certification workflows (Benetech, APH, Bookshare)
- MathML Core targeting and sanitizer safety checks

```
npm install -g mathml-lint
mathml-lint file.mathml
mathml-lint book.epub --profile core-mathml4 --format json
```

---

## Installation

```bash
npm install mathml-lint          # library
npm install -g mathml-lint       # global CLI
```

---

## CLI Usage

```
mathml-lint [options] <files...>

Arguments:
  files         MathML (.mathml, .xml), HTML/XHTML, NIMAS, or EPUB3 files
                Glob patterns are accepted: "src/**/*.html"

Options:
  -p, --profile <id>       Lint profile (default: presentation-mathml3)
                           presentation-mathml3 | presentation-mathml4
                           core-mathml3 | core-mathml4
  -f, --format <fmt>       Output format: text (default) | json
  --overlay <path>         JSON file with per-rule severity overrides
  --ignore-data-mjx        Suppress warnings for data-mjx-* attributes
  --max-findings <n>       Stop after N findings per file (default: 500)
  --platform <ids>         Target platform(s) for LMS/CMS compatibility checks (L090+)
                           Comma-separated: wordpress | pressbooks | moodle | canvas | tinymce
  -V, --version            Print version
  -h, --help               Show help
```

### Exit codes

| Code | Meaning |
|------|---------|
| 0 | No findings |
| 1 | One or more findings |
| 2 | Invocation error or file not found |

### Examples

```bash
# Check a single MathML file
mathml-lint expression.mathml

# Check all HTML files in a directory
mathml-lint "content/**/*.html"

# Target MathML Core with JSON output
mathml-lint book.epub --profile core-mathml4 --format json > report.json

# Suppress mathvariant safe-list warnings with an overlay
mathml-lint file.html --overlay my-overlays.json

# Check content destined for Canvas LMS
mathml-lint chapter.html --platform canvas

# Check WordPress content with multiple platform concerns
mathml-lint post.html --platform wordpress,tinymce
```

---

## Profiles

| Profile | Use when |
|---------|---------|
| `presentation-mathml3` | General MathML3 authoring (default) |
| `presentation-mathml4` | MathML4 authoring; enables intent/arg hints |
| `core-mathml3` | Targeting MathML Core renderers (browsers, EPUB RS) |
| `core-mathml4` | Core + MathML4 intent/arg authoring |

---

## Platform Targets

The `--platform` flag enables LMS/CMS-specific compatibility checks (L090+). These rules fire for server-side sanitization and editor-level stripping that would silently destroy MathML content in common authoring environments.

| Platform | What it checks |
|----------|---------------|
| `wordpress` | `wp_kses()` strips all MathML unless allowlisted via filter |
| `pressbooks` | WordPress multisite (`wp_kses`) + EPUB export sanitization |
| `moodle` | HTML Purifier default config strips all MathML |
| `canvas` | Canvas LMS allowlist blocks `mfenced`, `menclose`, `maction`, etc. |
| `tinymce` | TinyMCE default `valid_elements` strips all MathML without a plugin |

Multiple platforms can be specified comma-separated:

```bash
mathml-lint content.html --platform canvas,tinymce
```

### Platform targets in the library

```typescript
import { lintMathML } from 'mathml-lint';

const result = await lintMathML(source, {
  profile: 'presentation-mathml3',
  platforms: ['canvas', 'tinymce'],   // array or comma string
});
```

---

## Library Usage

```typescript
import { lintMathML } from 'mathml-lint';

const result = await lintMathML('<math><mi>sin</mi><mrow><mi>x</mi></mrow></math>', {
  profile: 'presentation-mathml4',
});

for (const finding of result.findings) {
  console.log(`[${finding.severity}] ${finding.code}: ${finding.message}`);
  if (finding.location) {
    console.log(`  at line ${finding.location.line}, col ${finding.location.col}`);
    console.log(`  xpath: ${finding.location.xpath}`);
  }
}

console.log(result.summary); // { errors, warnings, infos, total }
```

### HTML files

```typescript
import { lintHtmlFile } from 'mathml-lint/formats/html';

const result = await lintHtmlFile(htmlString, 'page.html', { profile: 'core-mathml3' });
for (const block of result.blocks) {
  console.log(`math[${block.index}]:`, block.result.summary);
}
```

### EPUB files (Node.js only)

```typescript
import { lintEpubFile } from 'mathml-lint/formats/epub';

const result = await lintEpubFile('book.epub', { profile: 'presentation-mathml3' });
console.log(`Total findings: ${result.totalFindings}`);
```

### Overlay rules

```typescript
import { lintMathML } from 'mathml-lint';

const result = await lintMathML(source, {
  overlays: [
    { code: 'L083', severity: 'off' },   // suppress mathvariant safe-list hint
    { code: 'L035', severity: 'warn' },  // escalate implicit multiplication to warn
  ],
});
```

---

## Overlay Rules (JSON)

Create a JSON file and pass it with `--overlay`:

```json
[
  { "code": "L011", "severity": "error" },
  { "code": "L083", "severity": "off" },
  { "code": "L035", "severity": "warn" }
]
```

Valid severity values: `"error"` | `"warn"` | `"info"` | `"off"`

---

## Rule Reference

See [RULES.md](RULES.md) for the complete rule reference including rationale, trigger conditions, and recommendations for every rule code.

### Quick summary

| Range | Category |
|-------|---------|
| L001 | Parse error |
| L010–L012 | Tag validation (unknown, deprecated, profile boundary) |
| L020–L023 | Attribute validation (unknown, invalid value, mathvariant) |
| L024–L029 | Token element semantics (split mi, wrong element type, empty) |
| L030–L034 | Children and spacing (invalid child, function application, negative spacing) |
| L035–L039 | Semantic operators (invisible times/separator/apply-function) |
| L040–L041 | Arity (wrong child count) |
| L050 | Index sequence hints |
| L060–L062 | Intent/arg authoring hints (MathML4) |
| L070–L073 | MathML Core compatibility |
| L080–L084 | W3C MathML Safe List / sanitization warnings |
| L090–L094 | LMS/CMS platform compatibility (WordPress, Moodle, Canvas, TinyMCE) |

---

## What this linter does NOT do

- **Schema validation** — use a RelaxNG validator for structural schema conformance
- **Content MathML validation** — only Presentation MathML is checked
- **Operator dictionary coverage** — `<mo>` content is not checked against the full MathML operator dictionary
- **Rendering correctness** — linting cannot substitute for visual review in target renderers

---

## License

MIT
