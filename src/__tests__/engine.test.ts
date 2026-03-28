import { describe, it, expect, beforeAll } from 'vitest';
import { lintMathML, initAdapters } from '../core/engine.js';

beforeAll(async () => {
  await initAdapters();
});

// ── Parse errors ──────────────────────────────────────────────────────────────

describe('L001 — parse error', () => {
  it('returns L001 for mismatched tags', async () => {
    const result = await lintMathML('<math><mi>x</math>');
    expect(result.findings.map((f) => f.code)).toContain('L001');
  });
});

// ── Tag validation ────────────────────────────────────────────────────────────

describe('L010/L011/L012 — tag rules', () => {
  it('clean simple expression produces no errors', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>');
    expect(result.findings.filter((f) => f.severity === 'error')).toHaveLength(0);
  });

  it('unknown tag emits L010', async () => {
    const result = await lintMathML('<math><mfoo>x</mfoo></math>');
    expect(result.findings.map((f) => f.code)).toContain('L010');
  });

  it('deprecated <mfenced> emits L011', async () => {
    const result = await lintMathML('<math><mfenced><mi>x</mi></mfenced></math>');
    expect(result.findings.map((f) => f.code)).toContain('L011');
  });

  it('deprecated <mstyle> emits L011', async () => {
    const result = await lintMathML('<math><mstyle><mi>x</mi></mstyle></math>');
    expect(result.findings.map((f) => f.code)).toContain('L011');
  });
});

// ── Arity ─────────────────────────────────────────────────────────────────────

describe('L040/L041 — arity', () => {
  it('mfrac with one child emits L040', async () => {
    const result = await lintMathML('<math><mfrac><mi>a</mi></mfrac></math>');
    expect(result.findings.map((f) => f.code)).toContain('L040');
  });

  it('mfrac with three children emits L040', async () => {
    const result = await lintMathML('<math><mfrac><mi>a</mi><mi>b</mi><mi>c</mi></mfrac></math>');
    expect(result.findings.map((f) => f.code)).toContain('L040');
  });

  it('mfrac with two children is clean', async () => {
    const result = await lintMathML('<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).not.toContain('L040');
    expect(codes).not.toContain('L041');
  });

  it('msup with two children is clean', async () => {
    const result = await lintMathML('<math><msup><mi>x</mi><mn>2</mn></msup></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).not.toContain('L040');
  });

  it('msup with one child emits L040', async () => {
    const result = await lintMathML('<math><msup><mi>x</mi></msup></math>');
    expect(result.findings.map((f) => f.code)).toContain('L040');
  });
});

// ── Attribute validation ──────────────────────────────────────────────────────

describe('L020/L021 — attribute rules', () => {
  it('unknown attribute emits L020', async () => {
    const result = await lintMathML('<math><mi banana="yes">x</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L020');
  });

  it('invalid display value emits L021', async () => {
    const result = await lintMathML('<math display="center"><mi>x</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L021');
  });

  it('valid display="block" is clean', async () => {
    const result = await lintMathML('<math display="block"><mi>x</mi></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L021');
  });

  it('data-* attributes are silently ignored', async () => {
    const result = await lintMathML('<math><mi data-custom="yes">x</mi></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L020');
  });

  it('deprecated "mode" attribute on <math> emits L032', async () => {
    const result = await lintMathML('<math mode="display"><mi>x</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L032');
  });
});

// ── Token rules ───────────────────────────────────────────────────────────────

describe('L024 — split mi run', () => {
  it('consecutive single-char <mi> spelling "sin" emits L024', async () => {
    const result = await lintMathML('<math><mrow><mi>s</mi><mi>i</mi><mi>n</mi></mrow></math>');
    expect(result.findings.map((f) => f.code)).toContain('L024');
  });

  it('three consecutive <mi> spelling "lim" emits L024', async () => {
    const result = await lintMathML('<math><mrow><mi>l</mi><mi>i</mi><mi>m</mi></mrow></math>');
    expect(result.findings.map((f) => f.code)).toContain('L024');
  });

  it('single <mi>x</mi> does not emit L024', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L024');
  });
});

describe('L026 — large operator in mi', () => {
  it('∑ in <mi> emits L026', async () => {
    const result = await lintMathML('<math><mi>∑</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L026');
  });

  it('∫ in <mi> emits L026', async () => {
    const result = await lintMathML('<math><mi>∫</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L026');
  });

  it('∑ in <mo> does not emit L026', async () => {
    const result = await lintMathML('<math><mo>∑</mo></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L026');
  });
});

describe('L027 — numeric in wrong token', () => {
  it('number in <mi> emits L027', async () => {
    const result = await lintMathML('<math><mi>42</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L027');
  });

  it('number in <mn> does not emit L027', async () => {
    const result = await lintMathML('<math><mn>42</mn></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L027');
  });
});

describe('L028 — fence in wrong token', () => {
  it(') in <mi> emits L028', async () => {
    const result = await lintMathML('<math><mi>)</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L028');
  });

  it(') in <mo> does not emit L028', async () => {
    const result = await lintMathML('<math><mo>)</mo></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L028');
  });
});

describe('L029 — empty token', () => {
  it('empty <mi> emits L029', async () => {
    const result = await lintMathML('<math><mi></mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L029');
  });

  it('empty <mn> emits L029', async () => {
    const result = await lintMathML('<math><mn></mn></math>');
    expect(result.findings.map((f) => f.code)).toContain('L029');
  });

  it('<mo> empty is allowed (intentional invisible operators)', async () => {
    const result = await lintMathML('<math><mo></mo></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L029');
  });
});

// ── Function application ──────────────────────────────────────────────────────

describe('L031 — missing function application', () => {
  it('sin followed by mrow without U+2061 emits L031 (mathml4 profile)', async () => {
    const result = await lintMathML(
      '<math><mrow><mi>sin</mi><mrow><mi>x</mi></mrow></mrow></math>',
      { profile: 'presentation-mathml4' }
    );
    expect(result.findings.map((f) => f.code)).toContain('L031');
  });

  it('sin with U+2061 does not emit L031', async () => {
    const result = await lintMathML(
      '<math><mrow><mi>sin</mi><mo>&#x2061;</mo><mrow><mi>x</mi></mrow></mrow></math>',
      { profile: 'presentation-mathml4' }
    );
    expect(result.findings.map((f) => f.code)).not.toContain('L031');
  });

  it('L031 does not fire on mathml3 profile (showSemanticsHints=false)', async () => {
    const result = await lintMathML(
      '<math><mrow><mi>sin</mi><mrow><mi>x</mi></mrow></mrow></math>',
      { profile: 'presentation-mathml3' }
    );
    expect(result.findings.map((f) => f.code)).not.toContain('L031');
  });
});

// ── L031/L035 overlap ─────────────────────────────────────────────────────────

describe('L031/L035 do not double-fire on function application', () => {
  it('sin+mrow fires L031 but not L035', async () => {
    const result = await lintMathML(
      '<math><mrow><mi>sin</mi><mrow><mi>x</mi></mrow></mrow></math>',
      { profile: 'presentation-mathml4' }
    );
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L031');
    expect(codes).not.toContain('L035');
  });

  it('x followed by mrow still fires L035 (non-function mi)', async () => {
    const result = await lintMathML(
      '<math><mrow><mi>x</mi><mrow><mi>y</mi></mrow></mrow></math>',
      { profile: 'presentation-mathml4' }
    );
    expect(result.findings.map((f) => f.code)).toContain('L035');
  });
});

// ── Invisible operator misuse ─────────────────────────────────────────────────

describe('L036/L037/L038 — invisible operator usage', () => {
  it('U+2062 in msup context emits L036', async () => {
    const result = await lintMathML(
      '<math><msup><mi>x</mi><mo>&#x2062;</mo></msup></math>'
    );
    expect(result.findings.map((f) => f.code)).toContain('L036');
  });

  it('U+2062 in mrow context does not emit L036', async () => {
    const result = await lintMathML(
      '<math><mrow><mi>x</mi><mo>&#x2062;</mo><mi>y</mi></mrow></math>'
    );
    expect(result.findings.map((f) => f.code)).not.toContain('L036');
  });

  it('U+2061 as first child emits L038', async () => {
    const result = await lintMathML(
      '<math><mrow><mo>&#x2061;</mo><mi>x</mi></mrow></math>'
    );
    expect(result.findings.map((f) => f.code)).toContain('L038');
  });

  it('U+2061 after <mi>sin</mi> does not emit L038', async () => {
    const result = await lintMathML(
      '<math><mrow><mi>sin</mi><mo>&#x2061;</mo><mi>x</mi></mrow></math>'
    );
    expect(result.findings.map((f) => f.code)).not.toContain('L038');
  });
});

// ── Negative spacing ──────────────────────────────────────────────────────────

describe('L033/L034 — negative spacing', () => {
  it('negative mspace width emits L033', async () => {
    const result = await lintMathML('<math><mspace width="-1em"/></math>');
    expect(result.findings.map((f) => f.code)).toContain('L033');
  });

  it('positive mspace width is clean', async () => {
    const result = await lintMathML('<math><mspace width="1em"/></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L033');
  });

  it('mpadded with negative width emits L034', async () => {
    const result = await lintMathML('<math><mpadded width="-1em"><mi>x</mi></mpadded></math>');
    expect(result.findings.map((f) => f.code)).toContain('L034');
  });
});

// ── Core compat ───────────────────────────────────────────────────────────────

describe('L070/L071/L072 — MathML Core compat', () => {
  it('<semantics> in core profile does NOT emit L070 (semantics is in Core)', async () => {
    const result = await lintMathML(
      '<math><semantics><mi>x</mi><annotation encoding="application/x-tex">x</annotation></semantics></math>',
      { profile: 'core-mathml3' }
    );
    expect(result.findings.map((f) => f.code)).not.toContain('L070');
  });

  it('<menclose> in core profile emits L070', async () => {
    const result = await lintMathML(
      '<math><menclose notation="box"><mi>x</mi></menclose></math>',
      { profile: 'core-mathml3' }
    );
    expect(result.findings.map((f) => f.code)).toContain('L070');
  });

  it('<maction> in core profile emits L070', async () => {
    const result = await lintMathML(
      '<math><maction actiontype="toggle"><mi>x</mi></maction></math>',
      { profile: 'core-mathml3' }
    );
    expect(result.findings.map((f) => f.code)).toContain('L070');
  });

  it('<mfenced> in core profile emits L070', async () => {
    const result = await lintMathML(
      '<math><mfenced><mi>x</mi></mfenced></math>',
      { profile: 'core-mathml3' }
    );
    expect(result.findings.map((f) => f.code)).toContain('L070');
  });

  it('<mfenced> in presentation profile does not emit L070', async () => {
    const result = await lintMathML(
      '<math><mfenced><mi>x</mi></mfenced></math>',
      { profile: 'presentation-mathml3' }
    );
    expect(result.findings.map((f) => f.code)).not.toContain('L070');
  });

  it('bevelled attribute in core profile emits L072', async () => {
    const result = await lintMathML(
      '<math><mfrac bevelled="true"><mi>a</mi><mi>b</mi></mfrac></math>',
      { profile: 'core-mathml3' }
    );
    expect(result.findings.map((f) => f.code)).toContain('L072');
  });
});

// ── Intent / arg hints ────────────────────────────────────────────────────────

describe('L061/L062 — intent and arg', () => {
  it('empty intent attribute emits L061', async () => {
    const result = await lintMathML('<math><mi intent="">x</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L061');
  });

  it('unmatched parentheses in intent emits L061', async () => {
    const result = await lintMathML('<math><mi intent="foo(bar">x</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L061');
  });

  it('well-formed intent is clean', async () => {
    const result = await lintMathML('<math><mi intent="power($base,$exp)">x</mi></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L061');
  });

  it('arg without ancestor intent emits L062', async () => {
    const result = await lintMathML('<math><mi arg="base">x</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L062');
  });

  it('arg matching ancestor intent is clean', async () => {
    const result = await lintMathML(
      '<math><msup intent="power($base,$exp)"><mi arg="base">x</mi><mn arg="exp">2</mn></msup></math>'
    );
    expect(result.findings.map((f) => f.code)).not.toContain('L062');
  });
});

// ── W3C MathML Safe List ──────────────────────────────────────────────────────

describe('L080–L084 — W3C MathML Safe List', () => {
  it('<menclose> emits L080 (not on safe list)', async () => {
    const result = await lintMathML('<math><menclose notation="box"><mi>x</mi></menclose></math>');
    expect(result.findings.map((f) => f.code)).toContain('L080');
  });

  it('<mfenced> emits L080 (not on safe list)', async () => {
    const result = await lintMathML('<math><mfenced><mi>x</mi></mfenced></math>');
    expect(result.findings.map((f) => f.code)).toContain('L080');
  });

  it('<mfrac> does NOT emit L080 (is on safe list)', async () => {
    const result = await lintMathML('<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L080');
  });

  it('<maction> emits L081 (special treatment, not L080)', async () => {
    const result = await lintMathML('<math><maction actiontype="toggle"><mi>x</mi></maction></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L081');
    expect(codes).not.toContain('L080');
  });

  it('<mphantom> emits L081', async () => {
    const result = await lintMathML('<math><mphantom><mi>x</mi></mphantom></math>');
    expect(result.findings.map((f) => f.code)).toContain('L081');
  });

  it('<annotation> emits L081', async () => {
    const result = await lintMathML(
      '<math><semantics><mi>x</mi><annotation encoding="application/x-tex">x</annotation></semantics></math>'
    );
    expect(result.findings.map((f) => f.code)).toContain('L081');
  });

  it('href on <annotation> emits L082', async () => {
    const result = await lintMathML(
      '<math><semantics><mi>x</mi><annotation href="http://example.com" encoding="text/plain">x</annotation></semantics></math>'
    );
    expect(result.findings.map((f) => f.code)).toContain('L082');
  });

  it('annotation without href does NOT emit L082', async () => {
    const result = await lintMathML(
      '<math><semantics><mi>x</mi><annotation encoding="application/x-tex">x</annotation></semantics></math>'
    );
    expect(result.findings.map((f) => f.code)).not.toContain('L082');
  });

  it('mathvariant on <mi> emits L083', async () => {
    const result = await lintMathML('<math><mi mathvariant="bold">x</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L083');
  });

  it('lquote on <ms> emits L084', async () => {
    const result = await lintMathML('<math><ms lquote="[">hello</ms></math>');
    expect(result.findings.map((f) => f.code)).toContain('L084');
  });

  it('href on <mrow> emits L084', async () => {
    const result = await lintMathML('<math><mrow href="http://example.com"><mi>x</mi></mrow></math>');
    expect(result.findings.map((f) => f.code)).toContain('L084');
  });
});

// ── Summary and overlays ──────────────────────────────────────────────────────

describe('summary counts', () => {
  it('totals match findings length', async () => {
    const result = await lintMathML('<math><mfoo>x</mfoo><mi banana="y">a</mi></math>');
    const { findings, summary } = result;
    expect(summary.total).toBe(findings.length);
    expect(summary.errors + summary.warnings + summary.infos).toBe(findings.length);
  });
});

describe('overlays', () => {
  it('"off" suppresses a rule', async () => {
    const result = await lintMathML('<math><mfoo>x</mfoo></math>', {
      overlays: [{ code: 'L010', severity: 'off' }],
    });
    expect(result.findings.map((f) => f.code)).not.toContain('L010');
  });

  it('severity override is applied', async () => {
    const result = await lintMathML('<math><mfoo>x</mfoo></math>', {
      overlays: [{ code: 'L010', severity: 'info' }],
    });
    const f = result.findings.find((f) => f.code === 'L010');
    expect(f?.severity).toBe('info');
  });
});

// ── Platform compatibility (L090–L094) ────────────────────────────────────────

describe('L090 — missing alttext on <math>', () => {
  it('fires on <math> without alttext (unconditional)', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>');
    expect(result.findings.map((f) => f.code)).toContain('L090');
  });

  it('does not fire when alttext is present', async () => {
    const result = await lintMathML('<math alttext="x"><mi>x</mi></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L090');
  });

  it('L090 is info severity', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>');
    const f = result.findings.find((f) => f.code === 'L090');
    expect(f?.severity).toBe('info');
  });

  it('fires on <math> but not on its children', async () => {
    // L090 is a per-<math> rule; children (mrow, mi, mo) must not trigger it
    const result = await lintMathML(
      '<math><mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow></math>',
    );
    const l090 = result.findings.filter((f) => f.code === 'L090');
    // Exactly one finding — from the <math> element, not from any child
    expect(l090.length).toBe(1);
    expect(l090[0]?.message).toContain('<math>');
  });
});

describe('L091 — WordPress/Pressbooks wp_kses stripping', () => {
  it('fires on <math> when platform=wordpress', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', { platforms: 'wordpress' });
    expect(result.findings.map((f) => f.code)).toContain('L091');
  });

  it('fires on <math> when platform=pressbooks', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', { platforms: 'pressbooks' });
    expect(result.findings.map((f) => f.code)).toContain('L091');
  });

  it('does NOT fire without platform option', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>');
    expect(result.findings.map((f) => f.code)).not.toContain('L091');
  });

  it('does NOT fire for unrelated platform', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', { platforms: 'moodle' });
    expect(result.findings.map((f) => f.code)).not.toContain('L091');
  });

  it('fires only on <math> element, not on children', async () => {
    const result = await lintMathML(
      '<math><mrow><mi>x</mi></mrow></math>',
      { platforms: 'wordpress' },
    );
    const l091 = result.findings.filter((f) => f.code === 'L091');
    expect(l091.length).toBe(1);
  });

  it('L091 is warn severity', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', { platforms: 'wordpress' });
    const f = result.findings.find((f) => f.code === 'L091');
    expect(f?.severity).toBe('warn');
  });

  it('accepts comma-separated platform list', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', {
      platforms: 'wordpress,canvas',
    });
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L091');
    // canvas fires L094 if there were blocked elements, but no blocked elements here
  });
});

describe('L092 — Moodle HTML Purifier stripping', () => {
  it('fires on <math> when platform=moodle', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', { platforms: 'moodle' });
    expect(result.findings.map((f) => f.code)).toContain('L092');
  });

  it('does NOT fire without moodle platform', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', { platforms: 'canvas' });
    expect(result.findings.map((f) => f.code)).not.toContain('L092');
  });

  it('L092 is warn severity', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', { platforms: 'moodle' });
    const f = result.findings.find((f) => f.code === 'L092');
    expect(f?.severity).toBe('warn');
  });
});

describe('L093 — Canvas LMS blocked elements', () => {
  it('fires on <menclose> when platform=canvas', async () => {
    const result = await lintMathML(
      '<math><menclose notation="box"><mi>x</mi></menclose></math>',
      { platforms: 'canvas' },
    );
    expect(result.findings.map((f) => f.code)).toContain('L093');
  });

  it('fires on <maction> when platform=canvas', async () => {
    const result = await lintMathML(
      '<math><maction actiontype="toggle"><mi>x</mi><mi>y</mi></maction></math>',
      { platforms: 'canvas' },
    );
    expect(result.findings.map((f) => f.code)).toContain('L093');
  });

  it('fires on <mfenced> when platform=canvas', async () => {
    const result = await lintMathML(
      '<math><mfenced><mi>x</mi></mfenced></math>',
      { platforms: 'canvas' },
    );
    expect(result.findings.map((f) => f.code)).toContain('L093');
  });

  it('does NOT fire on safe elements (mrow, mi, mfrac) for canvas', async () => {
    const result = await lintMathML(
      '<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>',
      { platforms: 'canvas' },
    );
    expect(result.findings.map((f) => f.code)).not.toContain('L093');
  });

  it('does NOT fire without canvas platform', async () => {
    const result = await lintMathML(
      '<math><menclose notation="box"><mi>x</mi></menclose></math>',
    );
    expect(result.findings.map((f) => f.code)).not.toContain('L093');
  });

  it('L093 is warn severity', async () => {
    const result = await lintMathML(
      '<math><menclose notation="box"><mi>x</mi></menclose></math>',
      { platforms: 'canvas' },
    );
    const f = result.findings.find((f) => f.code === 'L093');
    expect(f?.severity).toBe('warn');
  });
});

describe('L094 — TinyMCE default config strips MathML', () => {
  it('fires on <math> when platform=tinymce', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', { platforms: 'tinymce' });
    expect(result.findings.map((f) => f.code)).toContain('L094');
  });

  it('does NOT fire without tinymce platform', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', { platforms: 'canvas' });
    expect(result.findings.map((f) => f.code)).not.toContain('L094');
  });

  it('fires once per <math> block, not on children', async () => {
    const result = await lintMathML(
      '<math><mrow><mi>x</mi><mo>+</mo><mi>y</mi></mrow></math>',
      { platforms: 'tinymce' },
    );
    const l094 = result.findings.filter((f) => f.code === 'L094');
    expect(l094.length).toBe(1);
  });

  it('L094 is warn severity', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', { platforms: 'tinymce' });
    const f = result.findings.find((f) => f.code === 'L094');
    expect(f?.severity).toBe('warn');
  });
});

describe('platform — multi-platform and platform array API', () => {
  it('multiple platforms fire multiple rules', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', {
      platforms: ['wordpress', 'moodle', 'tinymce'],
    });
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L091');
    expect(codes).toContain('L092');
    expect(codes).toContain('L094');
  });

  it('invalid platform ID is silently ignored', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>', {
      platforms: 'notaplatform' as never,
    });
    // No platform rules should fire
    const codes = result.findings.map((f) => f.code);
    expect(codes).not.toContain('L091');
    expect(codes).not.toContain('L092');
    expect(codes).not.toContain('L093');
    expect(codes).not.toContain('L094');
  });
});

// ── Location ──────────────────────────────────────────────────────────────────

describe('location', () => {
  it('findings include line/col location', async () => {
    const result = await lintMathML('<math><mfoo>x</mfoo></math>');
    const f = result.findings.find((f) => f.code === 'L010');
    expect(f?.location).toBeDefined();
    expect(f?.location?.line).toBeGreaterThan(0);
  });

  it('findings include xpath in location', async () => {
    const result = await lintMathML('<math><mfoo>x</mfoo></math>');
    const f = result.findings.find((f) => f.code === 'L010');
    expect(f?.location?.xpath).toBeDefined();
  });
});
