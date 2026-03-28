import { describe, it, expect, beforeAll } from 'vitest';
import { lintMathML, initAdapters } from '../core/engine.js';

beforeAll(async () => {
  await initAdapters();
});

describe('lintMathML — parse error', () => {
  it('returns L001 for malformed XML', async () => {
    const result = await lintMathML('<math><mi>x</math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L001');
  });
});

describe('lintMathML — tag validation', () => {
  it('clean simple expression produces no errors', async () => {
    const result = await lintMathML('<math><mi>x</mi></math>');
    const errors = result.findings.filter((f) => f.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('unknown tag emits L010', async () => {
    const result = await lintMathML('<math><mfoo>x</mfoo></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L010');
  });

  it('deprecated <mfenced> emits L011', async () => {
    const result = await lintMathML('<math><mfenced><mi>x</mi></mfenced></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L011');
  });
});

describe('lintMathML — arity validation', () => {
  it('mfrac with one child emits L040', async () => {
    const result = await lintMathML('<math><mfrac><mi>a</mi></mfrac></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L040');
  });

  it('mfrac with two children is clean', async () => {
    const result = await lintMathML('<math><mfrac><mi>a</mi><mi>b</mi></mfrac></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).not.toContain('L040');
    expect(codes).not.toContain('L041');
  });
});

describe('lintMathML — attribute validation', () => {
  it('unknown attribute emits L020', async () => {
    const result = await lintMathML('<math><mi banana="yes">x</mi></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L020');
  });

  it('invalid display value emits L021', async () => {
    const result = await lintMathML('<math display="center"><mi>x</mi></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L021');
  });

  it('data-* attributes are silently ignored', async () => {
    const result = await lintMathML('<math><mi data-custom="yes">x</mi></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).not.toContain('L020');
  });
});

describe('lintMathML — token rules', () => {
  it('split mi run spelling "sin" emits L024', async () => {
    const result = await lintMathML('<math><mrow><mi>s</mi><mi>i</mi><mi>n</mi></mrow></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L024');
  });

  it('large operator ∑ in mi emits L026', async () => {
    const result = await lintMathML('<math><mi>∑</mi></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L026');
  });

  it('empty mi emits L029', async () => {
    const result = await lintMathML('<math><mi></mi></math>');
    const codes = result.findings.map((f) => f.code);
    expect(codes).toContain('L029');
  });
});

describe('lintMathML — function application', () => {
  it('sin followed by mrow without U+2061 emits L031', async () => {
    const result = await lintMathML(
      '<math><mrow><mi>sin</mi><mrow><mi>x</mi></mrow></mrow></math>',
      { profile: 'presentation-mathml3' }
    );
    // L031 only fires when showSemanticsHints is true; use mathml4 profile
    const result4 = await lintMathML(
      '<math><mrow><mi>sin</mi><mrow><mi>x</mi></mrow></mrow></math>',
      { profile: 'presentation-mathml4' }
    );
    const codes = result4.findings.map((f) => f.code);
    expect(codes).toContain('L031');
  });

  it('sin with U+2061 is clean', async () => {
    const result = await lintMathML(
      '<math><mrow><mi>sin</mi><mo>&#x2061;</mo><mrow><mi>x</mi></mrow></mrow></math>',
      { profile: 'presentation-mathml4' }
    );
    const codes = result.findings.map((f) => f.code);
    expect(codes).not.toContain('L031');
  });
});

describe('lintMathML — summary counts', () => {
  it('summary totals match findings length', async () => {
    const result = await lintMathML('<math><mfoo>x</mfoo><mi banana="y">a</mi></math>');
    const { findings, summary } = result;
    expect(summary.total).toBe(findings.length);
    expect(summary.errors + summary.warnings + summary.infos).toBe(findings.length);
  });
});

describe('lintMathML — overlays', () => {
  it('overlay "off" suppresses a rule', async () => {
    const result = await lintMathML('<math><mfoo>x</mfoo></math>', {
      overlays: [{ code: 'L010', severity: 'off' }],
    });
    const codes = result.findings.map((f) => f.code);
    expect(codes).not.toContain('L010');
  });

  it('overlay severity change is applied', async () => {
    const result = await lintMathML('<math><mfoo>x</mfoo></math>', {
      overlays: [{ code: 'L010', severity: 'info' }],
    });
    const finding = result.findings.find((f) => f.code === 'L010');
    expect(finding?.severity).toBe('info');
  });
});
