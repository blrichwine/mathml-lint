#!/usr/bin/env python3
"""
Build a demo EPUB3 with MathML examples from Calculus I, Calculus II,
and Finite Mathematics courses.

Each chapter contains well-formed MathML demonstrating rich features, and
clearly-labelled "poor MathML" sections with valid-XML-but-semantically-wrong
markup that exercises mathml-lint rules.

Usage:
    python3 build-demo-epub.py [output.epub]
"""

import sys
import zipfile

OUTPUT = sys.argv[1] if len(sys.argv) > 1 else 'math-courses-demo.epub'

# ── Infrastructure ─────────────────────────────────────────────────────────────

CONTAINER_XML = '''\
<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf"
              media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>'''

CONTENT_OPF = '''\
<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">urn:uuid:demo-math-courses-mathml-lint-2026</dc:identifier>
    <dc:title>Mathematics Course Examples: Calculus I, II, and Finite Math</dc:title>
    <dc:creator>mathml-lint demo</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">2026-03-29T00:00:00Z</meta>
  </metadata>
  <manifest>
    <item id="nav"  href="nav.xhtml"
          media-type="application/xhtml+xml" properties="nav"/>
    <item id="css"  href="css/style.css"     media-type="text/css"/>
    <item id="ch01" href="ch01-calc1-limits.xhtml"
          media-type="application/xhtml+xml" properties="mathml"/>
    <item id="ch02" href="ch02-calc1-integration.xhtml"
          media-type="application/xhtml+xml" properties="mathml"/>
    <item id="ch03" href="ch03-calc2-series.xhtml"
          media-type="application/xhtml+xml" properties="mathml"/>
    <item id="ch04" href="ch04-finite-matrices.xhtml"
          media-type="application/xhtml+xml" properties="mathml"/>
    <item id="ch05" href="ch05-finite-probability.xhtml"
          media-type="application/xhtml+xml" properties="mathml"/>
  </manifest>
  <spine>
    <itemref idref="nav" linear="no"/>
    <itemref idref="ch01"/>
    <itemref idref="ch02"/>
    <itemref idref="ch03"/>
    <itemref idref="ch04"/>
    <itemref idref="ch05"/>
  </spine>
</package>'''

NAV_XHTML = '''\
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Table of Contents</title>
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Contents</h1>
    <ol>
      <li><a href="ch01-calc1-limits.xhtml">Chapter 1 &#x2014; Calculus I: Limits and Derivatives</a></li>
      <li><a href="ch02-calc1-integration.xhtml">Chapter 2 &#x2014; Calculus I: Integration</a></li>
      <li><a href="ch03-calc2-series.xhtml">Chapter 3 &#x2014; Calculus II: Sequences and Series</a></li>
      <li><a href="ch04-finite-matrices.xhtml">Chapter 4 &#x2014; Finite Math: Matrices and Linear Systems</a></li>
      <li><a href="ch05-finite-probability.xhtml">Chapter 5 &#x2014; Finite Math: Probability</a></li>
    </ol>
  </nav>
</body>
</html>'''

CSS = '''\
body {
  font-family: Georgia, "Times New Roman", serif;
  max-width: 780px;
  margin: 0 auto;
  padding: 1em 2em;
  line-height: 1.7;
  color: #1a1a1a;
}
h1 { font-size: 1.55em; border-bottom: 2px solid #333; padding-bottom: 0.3em; margin-top: 1.6em; }
h2 { font-size: 1.25em; color: #2a2a2a; margin-top: 1.4em; }
h3 { font-size: 1.05em; margin-top: 1em; }
p  { margin: 0.5em 0; }
.math-block { margin: 1.2em 2em; }
.poor {
  margin: 1.4em 0;
  padding: 0.8em 1.1em 0.8em 1em;
  background: #fff8f0;
  border-left: 4px solid #c86000;
  border-radius: 0 4px 4px 0;
}
.poor h3 { color: #a04000; margin-top: 0; }
.note { font-style: italic; color: #555; font-size: 0.9em; margin-top: 0.4em; }
'''

# ── Helper ────────────────────────────────────────────────────────────────────

def page(title, body):
    return '''\
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>''' + title + '''</title>
  <link rel="stylesheet" type="text/css" href="css/style.css"/>
</head>
<body>
''' + body + '''
</body>
</html>'''

def mblock(mathml):
    return '<div class="math-block">\n' + mathml + '\n</div>'

def poor(heading, note, mathml):
    return (
        '<div class="poor">\n'
        '<h3>Poor MathML Example: ' + heading + '</h3>\n'
        + mblock(mathml) + '\n'
        '<p class="note">Expected lint finding: ' + note + '</p>\n'
        '</div>'
    )

# ── MathML — well-formed expressions ─────────────────────────────────────────

# lim_{x→a} f(x) = L
M_LIMIT_BASIC = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <munder>
      <mo movablelimits="true">lim</mo>
      <mrow>
        <mi>x</mi>
        <mo>&#x2192;</mo>
        <mi>a</mi>
      </mrow>
    </munder>
    <mi>f</mi>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
    <mo>=</mo>
    <mi>L</mi>
  </mrow>
</math>'''

# lim_{x→0} sin(x)/x = 1
M_LIMIT_SINC = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <munder>
      <mo movablelimits="true">lim</mo>
      <mrow>
        <mi>x</mi>
        <mo>&#x2192;</mo>
        <mn>0</mn>
      </mrow>
    </munder>
    <mfrac>
      <mrow>
        <mi>sin</mi>
        <mo>&#x2061;</mo>
        <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
      </mrow>
      <mi>x</mi>
    </mfrac>
    <mo>=</mo>
    <mn>1</mn>
  </mrow>
</math>'''

# f'(x) = lim_{h→0} [f(x+h)−f(x)]/h
M_DERIV_DEF = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msup><mi>f</mi><mo>&#x2032;</mo></msup>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
    <mo>=</mo>
    <munder>
      <mo movablelimits="true">lim</mo>
      <mrow><mi>h</mi><mo>&#x2192;</mo><mn>0</mn></mrow>
    </munder>
    <mfrac>
      <mrow>
        <mi>f</mi>
        <mo>&#x2061;</mo>
        <mrow>
          <mo>(</mo>
          <mrow><mi>x</mi><mo>+</mo><mi>h</mi></mrow>
          <mo>)</mo>
        </mrow>
        <mo>&#x2212;</mo>
        <mi>f</mi>
        <mo>&#x2061;</mo>
        <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
      </mrow>
      <mi>h</mi>
    </mfrac>
  </mrow>
</math>'''

# Power rule: d/dx[x^n] = nx^{n−1}
M_POWER_RULE = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mfrac>
      <mi>d</mi>
      <mrow><mi>d</mi><mi>x</mi></mrow>
    </mfrac>
    <mrow>
      <mo>[</mo>
      <msup><mi>x</mi><mi>n</mi></msup>
      <mo>]</mo>
    </mrow>
    <mo>=</mo>
    <mi>n</mi>
    <mo>&#x2062;</mo>
    <msup>
      <mi>x</mi>
      <mrow><mi>n</mi><mo>&#x2212;</mo><mn>1</mn></mrow>
    </msup>
  </mrow>
</math>'''

# Product rule: [fg]' = f'g + fg'
M_PRODUCT_RULE = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msup>
      <mrow>
        <mo>[</mo>
        <mi>f</mi>
        <mo>&#x2062;</mo>
        <mi>g</mi>
        <mo>]</mo>
      </mrow>
      <mo>&#x2032;</mo>
    </msup>
    <mo>=</mo>
    <msup><mi>f</mi><mo>&#x2032;</mo></msup>
    <mo>&#x2062;</mo>
    <mi>g</mi>
    <mo>+</mo>
    <mi>f</mi>
    <mo>&#x2062;</mo>
    <msup><mi>g</mi><mo>&#x2032;</mo></msup>
  </mrow>
</math>'''

# Quotient rule: [f/g]' = (f'g − fg') / g²
M_QUOTIENT_RULE = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msup>
      <mrow>
        <mo>[</mo>
        <mfrac><mi>f</mi><mi>g</mi></mfrac>
        <mo>]</mo>
      </mrow>
      <mo>&#x2032;</mo>
    </msup>
    <mo>=</mo>
    <mfrac>
      <mrow>
        <msup><mi>f</mi><mo>&#x2032;</mo></msup>
        <mo>&#x2062;</mo>
        <mi>g</mi>
        <mo>&#x2212;</mo>
        <mi>f</mi>
        <mo>&#x2062;</mo>
        <msup><mi>g</mi><mo>&#x2032;</mo></msup>
      </mrow>
      <msup><mi>g</mi><mn>2</mn></msup>
    </mfrac>
  </mrow>
</math>'''

# Chain rule: d/dx[f(g(x))] = f'(g(x))·g'(x)
M_CHAIN_RULE = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mfrac>
      <mi>d</mi>
      <mrow><mi>d</mi><mi>x</mi></mrow>
    </mfrac>
    <mrow>
      <mo>[</mo>
      <mi>f</mi>
      <mo>&#x2061;</mo>
      <mrow>
        <mo>(</mo>
        <mi>g</mi>
        <mo>&#x2061;</mo>
        <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
        <mo>)</mo>
      </mrow>
      <mo>]</mo>
    </mrow>
    <mo>=</mo>
    <msup><mi>f</mi><mo>&#x2032;</mo></msup>
    <mo>&#x2061;</mo>
    <mrow>
      <mo>(</mo>
      <mi>g</mi>
      <mo>&#x2061;</mo>
      <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
      <mo>)</mo>
    </mrow>
    <mo>&#x2062;</mo>
    <msup><mi>g</mi><mo>&#x2032;</mo></msup>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
  </mrow>
</math>'''

# ∫x^n dx = x^{n+1}/(n+1) + C
M_ANTIDERIV_POWER = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mo>&#x222B;</mo>
    <msup><mi>x</mi><mi>n</mi></msup>
    <mspace width="0.167em"/>
    <mi>d</mi>
    <mi>x</mi>
    <mo>=</mo>
    <mfrac>
      <msup>
        <mi>x</mi>
        <mrow><mi>n</mi><mo>+</mo><mn>1</mn></mrow>
      </msup>
      <mrow><mi>n</mi><mo>+</mo><mn>1</mn></mrow>
    </mfrac>
    <mo>+</mo>
    <mi>C</mi>
    <mo>,</mo>
    <mspace width="1em"/>
    <mi>n</mi>
    <mo>&#x2260;</mo>
    <mo>&#x2212;</mo>
    <mn>1</mn>
  </mrow>
</math>'''

# Fundamental Theorem: ∫_a^b f(x)dx = F(b) − F(a)
M_FTC = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msubsup>
      <mo>&#x222B;</mo>
      <mi>a</mi>
      <mi>b</mi>
    </msubsup>
    <mi>f</mi>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
    <mspace width="0.167em"/>
    <mi>d</mi>
    <mi>x</mi>
    <mo>=</mo>
    <mi>F</mi>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>b</mi><mo>)</mo></mrow>
    <mo>&#x2212;</mo>
    <mi>F</mi>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>a</mi><mo>)</mo></mrow>
  </mrow>
</math>'''

# Integration by parts: ∫u dv = uv − ∫v du
M_IBP = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mo>&#x222B;</mo>
    <mi>u</mi>
    <mspace width="0.167em"/>
    <mi>d</mi>
    <mi>v</mi>
    <mo>=</mo>
    <mi>u</mi>
    <mo>&#x2062;</mo>
    <mi>v</mi>
    <mo>&#x2212;</mo>
    <mo>&#x222B;</mo>
    <mi>v</mi>
    <mspace width="0.167em"/>
    <mi>d</mi>
    <mi>u</mi>
  </mrow>
</math>'''

# ∫sin(x)dx = −cos(x) + C
M_ANTIDERIV_SIN = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mo>&#x222B;</mo>
    <mi>sin</mi>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
    <mspace width="0.167em"/>
    <mi>d</mi>
    <mi>x</mi>
    <mo>=</mo>
    <mo>&#x2212;</mo>
    <mi>cos</mi>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
    <mo>+</mo>
    <mi>C</mi>
  </mrow>
</math>'''

# ∫e^x dx = e^x + C
M_ANTIDERIV_EXP = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mo>&#x222B;</mo>
    <msup><mi>e</mi><mi>x</mi></msup>
    <mspace width="0.167em"/>
    <mi>d</mi>
    <mi>x</mi>
    <mo>=</mo>
    <msup><mi>e</mi><mi>x</mi></msup>
    <mo>+</mo>
    <mi>C</mi>
  </mrow>
</math>'''

# Geometric series: ∑_{n=0}^∞ ar^n = a/(1−r), |r| < 1
M_GEO_SERIES = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <munderover>
      <mo>&#x2211;</mo>
      <mrow><mi>n</mi><mo>=</mo><mn>0</mn></mrow>
      <mo>&#x221E;</mo>
    </munderover>
    <mi>a</mi>
    <mo>&#x2062;</mo>
    <msup><mi>r</mi><mi>n</mi></msup>
    <mo>=</mo>
    <mfrac>
      <mi>a</mi>
      <mrow><mn>1</mn><mo>&#x2212;</mo><mi>r</mi></mrow>
    </mfrac>
    <mo>,</mo>
    <mspace width="1em"/>
    <mrow>
      <mo>|</mo>
      <mi>r</mi>
      <mo>|</mo>
    </mrow>
    <mo>&lt;</mo>
    <mn>1</mn>
  </mrow>
</math>'''

# Taylor series: f(x) = ∑ f^(n)(a)/n! (x−a)^n
M_TAYLOR = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>f</mi>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
    <mo>=</mo>
    <munderover>
      <mo>&#x2211;</mo>
      <mrow><mi>n</mi><mo>=</mo><mn>0</mn></mrow>
      <mo>&#x221E;</mo>
    </munderover>
    <mfrac>
      <mrow>
        <msup>
          <mi>f</mi>
          <mrow><mo>(</mo><mi>n</mi><mo>)</mo></mrow>
        </msup>
        <mo>&#x2061;</mo>
        <mrow><mo>(</mo><mi>a</mi><mo>)</mo></mrow>
      </mrow>
      <mrow><mi>n</mi><mo>!</mo></mrow>
    </mfrac>
    <mo>&#x2062;</mo>
    <msup>
      <mrow>
        <mo>(</mo>
        <mi>x</mi>
        <mo>&#x2212;</mo>
        <mi>a</mi>
        <mo>)</mo>
      </mrow>
      <mi>n</mi>
    </msup>
  </mrow>
</math>'''

# e^x Maclaurin series
M_EXP_SERIES = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msup><mi>e</mi><mi>x</mi></msup>
    <mo>=</mo>
    <munderover>
      <mo>&#x2211;</mo>
      <mrow><mi>n</mi><mo>=</mo><mn>0</mn></mrow>
      <mo>&#x221E;</mo>
    </munderover>
    <mfrac>
      <msup><mi>x</mi><mi>n</mi></msup>
      <mrow><mi>n</mi><mo>!</mo></mrow>
    </mfrac>
    <mo>=</mo>
    <mn>1</mn>
    <mo>+</mo>
    <mi>x</mi>
    <mo>+</mo>
    <mfrac>
      <msup><mi>x</mi><mn>2</mn></msup>
      <mrow><mn>2</mn><mo>!</mo></mrow>
    </mfrac>
    <mo>+</mo>
    <mfrac>
      <msup><mi>x</mi><mn>3</mn></msup>
      <mrow><mn>3</mn><mo>!</mo></mrow>
    </mfrac>
    <mo>+</mo>
    <mo>&#x2026;</mo>
  </mrow>
</math>'''

# sin(x) Maclaurin series
M_SIN_SERIES = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>sin</mi>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
    <mo>=</mo>
    <mi>x</mi>
    <mo>&#x2212;</mo>
    <mfrac>
      <msup><mi>x</mi><mn>3</mn></msup>
      <mrow><mn>3</mn><mo>!</mo></mrow>
    </mfrac>
    <mo>+</mo>
    <mfrac>
      <msup><mi>x</mi><mn>5</mn></msup>
      <mrow><mn>5</mn><mo>!</mo></mrow>
    </mfrac>
    <mo>&#x2212;</mo>
    <mo>&#x2026;</mo>
    <mo>=</mo>
    <munderover>
      <mo>&#x2211;</mo>
      <mrow><mi>n</mi><mo>=</mo><mn>0</mn></mrow>
      <mo>&#x221E;</mo>
    </munderover>
    <mfrac>
      <mrow>
        <msup>
          <mrow><mo>(</mo><mo>&#x2212;</mo><mn>1</mn><mo>)</mo></mrow>
          <mi>n</mi>
        </msup>
        <msup><mi>x</mi>
          <mrow><mn>2</mn><mi>n</mi><mo>+</mo><mn>1</mn></mrow>
        </msup>
      </mrow>
      <mrow>
        <mrow><mo>(</mo><mn>2</mn><mi>n</mi><mo>+</mo><mn>1</mn><mo>)</mo></mrow>
        <mo>!</mo>
      </mrow>
    </mfrac>
  </mrow>
</math>'''

# Ratio test: lim |a_{n+1}/a_n| < 1 ⟹ convergent
M_RATIO_TEST = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <munder>
      <mo movablelimits="true">lim</mo>
      <mrow><mi>n</mi><mo>&#x2192;</mo><mo>&#x221E;</mo></mrow>
    </munder>
    <mrow>
      <mo>|</mo>
      <mfrac>
        <msub><mi>a</mi><mrow><mi>n</mi><mo>+</mo><mn>1</mn></mrow></msub>
        <msub><mi>a</mi><mi>n</mi></msub>
      </mfrac>
      <mo>|</mo>
    </mrow>
    <mo>&lt;</mo>
    <mn>1</mn>
    <mspace width="1em"/>
    <mo>&#x27F9;</mo>
    <mspace width="1em"/>
    <mtext>series&#xA0;converges</mtext>
  </mrow>
</math>'''

# 2×2 matrix A
M_MATRIX_2X2 = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>A</mi>
    <mo>=</mo>
    <mrow>
      <mo>[</mo>
      <mtable>
        <mtr>
          <mtd><msub><mi>a</mi><mn>11</mn></msub></mtd>
          <mtd><msub><mi>a</mi><mn>12</mn></msub></mtd>
        </mtr>
        <mtr>
          <mtd><msub><mi>a</mi><mn>21</mn></msub></mtd>
          <mtd><msub><mi>a</mi><mn>22</mn></msub></mtd>
        </mtr>
      </mtable>
      <mo>]</mo>
    </mrow>
  </mrow>
</math>'''

# 3×3 matrix multiplication note: (AB)_{ij} = ∑_k a_{ik}b_{kj}
M_MATMUL = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msub>
      <mrow><mo>(</mo><mi>A</mi><mi>B</mi><mo>)</mo></mrow>
      <mrow><mi>i</mi><mi>j</mi></mrow>
    </msub>
    <mo>=</mo>
    <munderover>
      <mo>&#x2211;</mo>
      <mrow><mi>k</mi><mo>=</mo><mn>1</mn></mrow>
      <mi>n</mi>
    </munderover>
    <msub><mi>a</mi><mrow><mi>i</mi><mi>k</mi></mrow></msub>
    <mo>&#x2062;</mo>
    <msub><mi>b</mi><mrow><mi>k</mi><mi>j</mi></mrow></msub>
  </mrow>
</math>'''

# Determinant: det([a,b;c,d]) = ad − bc
M_DET_2X2 = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>det</mi>
    <mo>&#x2061;</mo>
    <mrow>
      <mo>(</mo>
      <mtable>
        <mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr>
        <mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr>
      </mtable>
      <mo>)</mo>
    </mrow>
    <mo>=</mo>
    <mi>a</mi>
    <mo>&#x2062;</mo>
    <mi>d</mi>
    <mo>&#x2212;</mo>
    <mi>b</mi>
    <mo>&#x2062;</mo>
    <mi>c</mi>
  </mrow>
</math>'''

# Cramer's rule: x_i = det(A_i)/det(A)
M_CRAMER = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msub><mi>x</mi><mi>i</mi></msub>
    <mo>=</mo>
    <mfrac>
      <mrow>
        <mi>det</mi>
        <mo>&#x2061;</mo>
        <mrow><mo>(</mo><msub><mi>A</mi><mi>i</mi></msub><mo>)</mo></mrow>
      </mrow>
      <mrow>
        <mi>det</mi>
        <mo>&#x2061;</mo>
        <mrow><mo>(</mo><mi>A</mi><mo>)</mo></mrow>
      </mrow>
    </mfrac>
  </mrow>
</math>'''

# Combinations: C(n,r) = n! / (r!(n−r)!)
M_COMBINATIONS = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mrow>
      <mo>(</mo>
      <mtable>
        <mtr><mtd><mi>n</mi></mtd></mtr>
        <mtr><mtd><mi>r</mi></mtd></mtr>
      </mtable>
      <mo>)</mo>
    </mrow>
    <mo>=</mo>
    <mi>C</mi>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>n</mi><mo>,</mo><mi>r</mi><mo>)</mo></mrow>
    <mo>=</mo>
    <mfrac>
      <mrow><mi>n</mi><mo>!</mo></mrow>
      <mrow>
        <mi>r</mi>
        <mo>!</mo>
        <mo>&#x2062;</mo>
        <mrow>
          <mo>(</mo>
          <mi>n</mi><mo>&#x2212;</mo><mi>r</mi>
          <mo>)</mo>
        </mrow>
        <mo>!</mo>
      </mrow>
    </mfrac>
  </mrow>
</math>'''

# Permutations: P(n,r) = n!/(n−r)!
M_PERMUTATIONS = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>P</mi>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>n</mi><mo>,</mo><mi>r</mi><mo>)</mo></mrow>
    <mo>=</mo>
    <mfrac>
      <mrow><mi>n</mi><mo>!</mo></mrow>
      <mrow>
        <mo>(</mo>
        <mi>n</mi><mo>&#x2212;</mo><mi>r</mi>
        <mo>)</mo>
        <mo>!</mo>
      </mrow>
    </mfrac>
  </mrow>
</math>'''

# Binomial distribution: P(X=k) = C(n,k) p^k (1−p)^{n−k}
M_BINOMIAL = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>P</mi>
    <mo>&#x2061;</mo>
    <mrow>
      <mo>(</mo>
      <mi>X</mi><mo>=</mo><mi>k</mi>
      <mo>)</mo>
    </mrow>
    <mo>=</mo>
    <mrow>
      <mo>(</mo>
      <mtable>
        <mtr><mtd><mi>n</mi></mtd></mtr>
        <mtr><mtd><mi>k</mi></mtd></mtr>
      </mtable>
      <mo>)</mo>
    </mrow>
    <msup><mi>p</mi><mi>k</mi></msup>
    <mo>&#x2062;</mo>
    <msup>
      <mrow>
        <mo>(</mo>
        <mn>1</mn><mo>&#x2212;</mo><mi>p</mi>
        <mo>)</mo>
      </mrow>
      <mrow><mi>n</mi><mo>&#x2212;</mo><mi>k</mi></mrow>
    </msup>
  </mrow>
</math>'''

# Expected value: E[X] = ∑ x_i P(X = x_i)
M_EXPECTED = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>E</mi>
    <mrow><mo>[</mo><mi>X</mi><mo>]</mo></mrow>
    <mo>=</mo>
    <munderover>
      <mo>&#x2211;</mo>
      <mrow><mi>i</mi><mo>=</mo><mn>1</mn></mrow>
      <mi>n</mi>
    </munderover>
    <msub><mi>x</mi><mi>i</mi></msub>
    <mo>&#x2062;</mo>
    <mi>P</mi>
    <mo>&#x2061;</mo>
    <mrow>
      <mo>(</mo>
      <mi>X</mi><mo>=</mo><msub><mi>x</mi><mi>i</mi></msub>
      <mo>)</mo>
    </mrow>
  </mrow>
</math>'''

# Variance: σ² = E[X²] − (E[X])²
M_VARIANCE = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <msup><mi>&#x03C3;</mi><mn>2</mn></msup>
    <mo>=</mo>
    <mi>E</mi>
    <mrow><mo>[</mo><msup><mi>X</mi><mn>2</mn></msup><mo>]</mo></mrow>
    <mo>&#x2212;</mo>
    <msup>
      <mrow>
        <mo>(</mo>
        <mi>E</mi>
        <mrow><mo>[</mo><mi>X</mi><mo>]</mo></mrow>
        <mo>)</mo>
      </mrow>
      <mn>2</mn>
    </msup>
  </mrow>
</math>'''

# ── MathML — intentionally poor (valid XML, bad semantics) ────────────────────

# L024 — split mi: <mi>l</mi><mi>i</mi><mi>m</mi> instead of <mi>lim</mi>
POOR_SPLIT_MI = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <munder>
      <mrow>
        <mi>l</mi><mi>i</mi><mi>m</mi>
      </mrow>
      <mrow><mi>x</mi><mo>&#x2192;</mo><mn>0</mn></mrow>
    </munder>
    <mi>f</mi>
    <mo>&#x2061;</mo>
    <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
  </mrow>
</math>'''

# L031 — missing apply-function between sin and argument
POOR_MISSING_APPLY = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>sin</mi>
    <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
    <mo>+</mo>
    <mi>cos</mi>
    <mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
  </mrow>
</math>'''

# L090 — alttext present on <math> (may suppress AT reading MathML)
POOR_ALTTEXT = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML"
      display="block"
      alttext="the derivative of x squared is 2x">
  <mrow>
    <mfrac>
      <mi>d</mi>
      <mrow><mi>d</mi><mi>x</mi></mrow>
    </mfrac>
    <mrow>
      <mo>[</mo><msup><mi>x</mi><mn>2</mn></msup><mo>]</mo>
    </mrow>
    <mo>=</mo>
    <mn>2</mn><mi>x</mi>
  </mrow>
</math>'''

# L011 / L080 — deprecated <mfenced> instead of explicit mo fences
POOR_MFENCED = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mo>&#x222B;</mo>
    <mfenced open="(" close=")">
      <mrow>
        <msup><mi>x</mi><mn>2</mn></msup>
        <mo>+</mo>
        <mn>1</mn>
      </mrow>
    </mfenced>
    <mspace width="0.167em"/>
    <mi>d</mi><mi>x</mi>
  </mrow>
</math>'''

# L035 — missing invisible times between adjacent identifiers
POOR_MISSING_IT = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mn>3</mn>
    <mi>x</mi>
    <mi>y</mi>
    <mo>+</mo>
    <mn>2</mn>
    <mi>a</mi>
    <mi>b</mi>
  </mrow>
</math>'''

# L027 — numeric literal in <mi> instead of <mn>
POOR_NUM_IN_MI = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mfrac>
      <mrow><mi>2</mi><mi>x</mi></mrow>
      <mrow><mi>x</mi><mo>+</mo><mi>3</mi></mrow>
    </mfrac>
  </mrow>
</math>'''

# L040 — mfrac with only one child (requires exactly 2)
POOR_FRAC_ARITY = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mfrac>
      <mrow><mi>a</mi><mo>+</mo><mi>b</mi></mrow>
    </mfrac>
  </mrow>
</math>'''

# L091 — wrong xmlns on <math>
POOR_WRONG_XMLNS = '''\
<math xmlns="http://example.com/not-mathml" display="block">
  <mrow>
    <munderover>
      <mo>&#x2211;</mo>
      <mrow><mi>n</mi><mo>=</mo><mn>1</mn></mrow>
      <mo>&#x221E;</mo>
    </munderover>
    <mfrac>
      <mn>1</mn>
      <msup><mi>n</mi><mn>2</mn></msup>
    </mfrac>
    <mo>=</mo>
    <mfrac>
      <msup><mi>&#x03C0;</mi><mn>2</mn></msup>
      <mn>6</mn>
    </mfrac>
  </mrow>
</math>'''

# L032 — deprecated mode attribute on <math>
POOR_MODE_ATTR = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" mode="display">
  <mrow>
    <mi>e</mi>
    <mo>=</mo>
    <munderover>
      <mo>&#x2211;</mo>
      <mrow><mi>n</mi><mo>=</mo><mn>0</mn></mrow>
      <mo>&#x221E;</mo>
    </munderover>
    <mfrac>
      <mn>1</mn>
      <mrow><mi>n</mi><mo>!</mo></mrow>
    </mfrac>
  </mrow>
</math>'''

# L033 — negative mspace width
POOR_NEG_SPACE = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>A</mi>
    <mspace width="-0.5em"/>
    <mi>B</mi>
    <mo>=</mo>
    <mi>C</mi>
  </mrow>
</math>'''

# L020 — unknown attribute on mi
POOR_UNKNOWN_ATTR = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi color="red">x</mi>
    <mo>+</mo>
    <mi emphasis="bold">y</mi>
    <mo>=</mo>
    <mn>1</mn>
  </mrow>
</math>'''

# L026 — large operator ∑ placed in <mi> instead of <mo>
POOR_SIGMA_IN_MI = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>&#x2211;</mi>
    <msub><mi>x</mi><mi>i</mi></msub>
    <mo>=</mo>
    <mi>S</mi>
  </mrow>
</math>'''

# L011 — deprecated <mstyle> wrapper
POOR_MSTYLE = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mstyle displaystyle="true">
    <mrow>
      <mi>P</mi>
      <mo>&#x2061;</mo>
      <mrow><mo>(</mo><mi>A</mi><mo>)</mo></mrow>
      <mo>=</mo>
      <mfrac>
        <mrow><mi>n</mi><mo>(</mo><mi>A</mi><mo>)</mo></mrow>
        <mrow><mi>n</mi><mo>(</mo><mi>S</mi><mo>)</mo></mrow>
      </mfrac>
    </mrow>
  </mstyle>
</math>'''

# L028 — fence character in <mi>
POOR_FENCE_IN_MI = '''\
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mrow>
    <mi>f</mi>
    <mi>(</mi>
    <mi>x</mi>
    <mi>)</mi>
    <mo>=</mo>
    <msup><mi>x</mi><mn>2</mn></msup>
  </mrow>
</math>'''

# ── Chapter content ────────────────────────────────────────────────────────────

CH01 = page('Chapter 1 &#x2014; Calculus I: Limits and Derivatives', '''\
<h1>Chapter 1 &#x2014; Calculus I: Limits and Derivatives</h1>

<h2>1.1 Limits</h2>

<p>The limit of a function <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>f</mi></math> as <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>x</mi></math> approaches <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>a</mi></math> is written:</p>
''' + mblock(M_LIMIT_BASIC) + '''
<p>One of the most important limits in calculus is the sinc limit, which
underlies the derivative of sine:</p>
''' + mblock(M_LIMIT_SINC) + '''
<h2>1.2 The Derivative</h2>

<p>The derivative of a function is defined as the following limit of a
difference quotient:</p>
''' + mblock(M_DERIV_DEF) + '''
<p>The <strong>power rule</strong> gives the derivative of any power of
<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math>:</p>
''' + mblock(M_POWER_RULE) + '''
<p>The <strong>product rule</strong> handles the derivative of a product of
two functions:</p>
''' + mblock(M_PRODUCT_RULE) + '''
<p>The <strong>quotient rule</strong> handles the derivative of a ratio:</p>
''' + mblock(M_QUOTIENT_RULE) + '''
<p>The <strong>chain rule</strong> differentiates a composition of functions:</p>
''' + mblock(M_CHAIN_RULE) + '''

<!-- ── Poor MathML examples ── -->

''' + poor(
    'Split Identifier Run (L024)',
    'L024 &#x2014; consecutive single-character &lt;mi&gt; elements should be combined into one &lt;mi&gt;lim&lt;/mi&gt;',
    POOR_SPLIT_MI
) + '''

''' + poor(
    'Missing Function Application Operator (L031)',
    'L031 &#x2014; &lt;mi&gt;sin&lt;/mi&gt; and &lt;mi&gt;cos&lt;/mi&gt; must each be followed by &lt;mo&gt;&amp;#x2061;&lt;/mo&gt; before their argument',
    POOR_MISSING_APPLY
) + '''

''' + poor(
    'alttext Attribute Present (L090)',
    'L090 &#x2014; the alttext attribute may cause assistive technology to skip the MathML and read only the fallback text',
    POOR_ALTTEXT
) + '''\
''')

CH02 = page('Chapter 2 &#x2014; Calculus I: Integration', '''\
<h1>Chapter 2 &#x2014; Calculus I: Integration</h1>

<h2>2.1 Antiderivatives</h2>

<p>The <strong>power rule for integration</strong> reverses the power rule
for differentiation:</p>
''' + mblock(M_ANTIDERIV_POWER) + '''
<p>Two important antiderivatives involving transcendental functions:</p>
''' + mblock(M_ANTIDERIV_SIN) + '''
''' + mblock(M_ANTIDERIV_EXP) + '''
<h2>2.2 The Definite Integral</h2>

<p>The <strong>Fundamental Theorem of Calculus</strong> connects differentiation
and integration. If <math xmlns="http://www.w3.org/1998/Math/MathML">
  <msup><mi>F</mi><mo>&#x2032;</mo></msup>
  <mo>=</mo><mi>f</mi></math>, then:</p>
''' + mblock(M_FTC) + '''
<p><strong>Integration by parts</strong> is the integral analogue of the
product rule:</p>
''' + mblock(M_IBP) + '''

<!-- ── Poor MathML examples ── -->

''' + poor(
    'Deprecated &lt;mfenced&gt; Element (L011, L080)',
    'L011, L080 &#x2014; &lt;mfenced&gt; is deprecated; use explicit &lt;mo&gt;(&lt;/mo&gt; and &lt;mo&gt;)&lt;/mo&gt; fences',
    POOR_MFENCED
) + '''

''' + poor(
    'Missing Invisible Times Operator (L035)',
    'L035 &#x2014; adjacent identifiers representing multiplication need &lt;mo&gt;&amp;#x2062;&lt;/mo&gt; between them',
    POOR_MISSING_IT
) + '''

''' + poor(
    'Numeric Literal in &lt;mi&gt; (L027)',
    'L027 &#x2014; numeric literals should be in &lt;mn&gt;, not &lt;mi&gt;',
    POOR_NUM_IN_MI
) + '''\
''')

CH03 = page('Chapter 3 &#x2014; Calculus II: Sequences and Series', '''\
<h1>Chapter 3 &#x2014; Calculus II: Sequences and Series</h1>

<h2>3.1 Infinite Series</h2>

<p>A <strong>geometric series</strong> with first term <math
xmlns="http://www.w3.org/1998/Math/MathML"><mi>a</mi></math> and
common ratio <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>r</mi>
</math> converges when
<math xmlns="http://www.w3.org/1998/Math/MathML">
  <mrow><mo>|</mo><mi>r</mi><mo>|</mo><mo>&lt;</mo><mn>1</mn></mrow>
</math>:</p>
''' + mblock(M_GEO_SERIES) + '''
<p>The <strong>ratio test</strong> determines convergence by examining the
limit of successive term ratios:</p>
''' + mblock(M_RATIO_TEST) + '''
<h2>3.2 Taylor and Maclaurin Series</h2>

<p>A function that is infinitely differentiable near
<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi><mo>=</mo>
<mi>a</mi></math> can be represented as a <strong>Taylor series</strong>:</p>
''' + mblock(M_TAYLOR) + '''
<p>Setting <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>a</mi><mo>=</mo><mn>0</mn></math> gives the
<strong>Maclaurin series</strong> for the exponential function:</p>
''' + mblock(M_EXP_SERIES) + '''
<p>The Maclaurin series for <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>sin</mi><mo>&#x2061;</mo><mrow><mo>(</mo><mi>x</mi><mo>)</mo></mrow>
</math> converges for all real
<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math>:</p>
''' + mblock(M_SIN_SERIES) + '''

<!-- ── Poor MathML examples ── -->

''' + poor(
    '&lt;mfrac&gt; with Wrong Number of Children (L040)',
    'L040 &#x2014; &lt;mfrac&gt; requires exactly 2 child elements; this has only 1',
    POOR_FRAC_ARITY
) + '''

''' + poor(
    'Wrong xmlns on &lt;math&gt; (L091)',
    'L091 &#x2014; the xmlns attribute must be exactly "http://www.w3.org/1998/Math/MathML"',
    POOR_WRONG_XMLNS
) + '''

''' + poor(
    'Deprecated mode Attribute (L032)',
    'L032 &#x2014; the mode attribute on &lt;math&gt; is deprecated; use display="block" or display="inline" instead',
    POOR_MODE_ATTR
) + '''\
''')

CH04 = page('Chapter 4 &#x2014; Finite Math: Matrices and Linear Systems', '''\
<h1>Chapter 4 &#x2014; Finite Math: Matrices and Linear Systems</h1>

<h2>4.1 Matrices</h2>

<p>A <strong>matrix</strong> is a rectangular array of numbers. The general
form of a 2&#x00D7;2 matrix is:</p>
''' + mblock(M_MATRIX_2X2) + '''
<p><strong>Matrix multiplication</strong> is defined entry-by-entry as the
dot product of rows and columns:</p>
''' + mblock(M_MATMUL) + '''
<h2>4.2 Determinants</h2>

<p>The <strong>determinant</strong> of a 2&#x00D7;2 matrix measures whether the
matrix is invertible:</p>
''' + mblock(M_DET_2X2) + '''
<h2>4.3 Linear Systems and Cramer&#x2019;s Rule</h2>

<p>A system of linear equations can be written as a matrix equation
<math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>A</mi><mi>x</mi><mo>=</mo><mi>b</mi></math>.
<strong>Cramer&#x2019;s rule</strong> expresses each unknown as a ratio
of determinants:</p>
''' + mblock(M_CRAMER) + '''

<!-- ── Poor MathML examples ── -->

''' + poor(
    'Negative mspace Width (L033)',
    'L033 &#x2014; negative spacing is a presentational hack that harms accessibility',
    POOR_NEG_SPACE
) + '''

''' + poor(
    'Unknown Attributes on Token Elements (L020)',
    'L020 &#x2014; "color" and "emphasis" are not valid MathML attributes; use CSS or mathvariant',
    POOR_UNKNOWN_ATTR
) + '''

''' + poor(
    'Large Operator &#x2211; in &lt;mi&gt; (L026)',
    'L026 &#x2014; large operators such as &#x2211; belong in &lt;mo&gt;, not &lt;mi&gt;',
    POOR_SIGMA_IN_MI
) + '''\
''')

CH05 = page('Chapter 5 &#x2014; Finite Math: Probability', '''\
<h1>Chapter 5 &#x2014; Finite Math: Probability</h1>

<h2>5.1 Counting Methods</h2>

<p>The number of ways to choose
<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>r</mi></math> items
from <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>n</mi></math>
without regard to order is given by the <strong>combination</strong>
formula:</p>
''' + mblock(M_COMBINATIONS) + '''
<p><strong>Permutations</strong> count ordered selections:</p>
''' + mblock(M_PERMUTATIONS) + '''
<h2>5.2 Probability Distributions</h2>

<p>The <strong>binomial distribution</strong> gives the probability of
exactly <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>k</mi>
</math> successes in
<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>n</mi></math>
independent Bernoulli trials:</p>
''' + mblock(M_BINOMIAL) + '''
<p>The <strong>expected value</strong> (mean) of a discrete random variable:</p>
''' + mblock(M_EXPECTED) + '''
<p>The <strong>variance</strong> measures spread around the mean:</p>
''' + mblock(M_VARIANCE) + '''

<!-- ── Poor MathML examples ── -->

''' + poor(
    'Deprecated &lt;mstyle&gt; Element (L011)',
    'L011 &#x2014; &lt;mstyle&gt; is deprecated; apply presentational properties through CSS or MathML attributes directly',
    POOR_MSTYLE
) + '''

''' + poor(
    'Fence Character in &lt;mi&gt; (L028)',
    'L028 &#x2014; parentheses and other fence characters must be in &lt;mo&gt;, not &lt;mi&gt;',
    POOR_FENCE_IN_MI
) + '''\
''')

# ── Build EPUB ────────────────────────────────────────────────────────────────

FILES = [
    ('mimetype',                             'application/epub+zip', zipfile.ZIP_STORED),
    ('META-INF/container.xml',               CONTAINER_XML,          zipfile.ZIP_DEFLATED),
    ('OEBPS/content.opf',                    CONTENT_OPF,            zipfile.ZIP_DEFLATED),
    ('OEBPS/nav.xhtml',                      NAV_XHTML,              zipfile.ZIP_DEFLATED),
    ('OEBPS/css/style.css',                  CSS,                    zipfile.ZIP_DEFLATED),
    ('OEBPS/ch01-calc1-limits.xhtml',        CH01,                   zipfile.ZIP_DEFLATED),
    ('OEBPS/ch02-calc1-integration.xhtml',   CH02,                   zipfile.ZIP_DEFLATED),
    ('OEBPS/ch03-calc2-series.xhtml',        CH03,                   zipfile.ZIP_DEFLATED),
    ('OEBPS/ch04-finite-matrices.xhtml',     CH04,                   zipfile.ZIP_DEFLATED),
    ('OEBPS/ch05-finite-probability.xhtml',  CH05,                   zipfile.ZIP_DEFLATED),
]

with zipfile.ZipFile(OUTPUT, 'w', allowZip64=False) as epub:
    for path, content, compression in FILES:
        info = zipfile.ZipInfo(path)
        info.compress_type = compression
        epub.writestr(info, content.encode('utf-8') if isinstance(content, str) else content)

print(f'Created {OUTPUT}')
print(f'  {len(FILES) - 3} content documents')
print(f'  Chapters: Calc I (×2), Calc II, Finite Math (×2)')
