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
