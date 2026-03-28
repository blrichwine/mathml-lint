/**
 * MathML Linter Data Structures - MathML Version 4
 *
 * Key changes from MathML3:
 *  - intent and arg are new universal attributes (§2.1.6)
 *  - fence and separator removed from <mo> (§3.2.5, moved to legacy schema)
 *  - mfenced removed (§3.3.8, legacy; use mrow + mo)
 *  - mglyph removed (§3.2.9, legacy; use HTML img or CSS)
 *  - malignmark / maligngroup removed (§3.5.5/6, legacy)
 *  - mlabeledtr removed (§3.5.3, legacy)
 *  - none element removed; use empty mrow in mmultiscripts (§3.4.9)
 *  - maction deprecated (§3.7.1, legacy; use CSS or data attributes)
 *  - menclose deprecated (§3.3.9, presentation only; use CSS)
 *  - Legacy font attributes (fontfamily, fontweight, fontstyle, fontsize, color,
 *    background) are removed; they were already deprecated in MathML3
 *  - groupalign, alignmentscope removed from table elements (§3.5.1–3.5.4)
 *  - side and minlabelspacing removed from mtable (§3.5.1)
 *  - numalign, denomalign, bevelled on mfrac remain valid but are coreno
 *    (not in MathML Core; §3.3.2)
 *  - accent on <mo> is coreno (not in MathML Core; §3.2.5)
 *  - All MathML3 table layout attributes (align, rowalign, columnalign,
 *    columnwidth, rowspacing, columnspacing, rowlines, columnlines, frame,
 *    framespacing, equalrows, equalcolumns) remain valid but are coreno
 *  - mo linebreaking/indentation attributes are coreno
 *  - definitionURL removed from content elements (§4.x)
 *
 * Reference: https://w3c.github.io/mathml/
 */

const SpecLevel = {
  MATHML_CORE: 'mathml-core',
  PRESENTATION: 'presentation',
  CONTENT: 'content'
};

const ChildCount = {
  ZERO: { min: 0, max: 0 },
  ZERO_OR_MORE: { min: 0, max: Infinity },
  ONE: { min: 1, max: 1 },
  ONE_OR_MORE: { min: 1, max: Infinity },
  TWO_OR_MORE: { min: 2, max: Infinity },
  ONE_INFERRED: { min: 0, max: Infinity, inferredMrow: true },
  TWO: { min: 2, max: 2 },
  THREE: { min: 3, max: 3 },
  THREE_OR_MORE: { min: 3, max: Infinity },
  CUSTOM: 'custom'
};

// MathML4 flow content — mglyph, malignmark, mfenced removed vs MathML3
const FLOW_CONTENT = [
  'mi', 'mn', 'mo', 'mtext', 'mspace', 'ms', 'mrow', 'mfrac', 'msqrt',
  'mroot', 'mstyle', 'merror', 'mpadded', 'mphantom', 'menclose',
  'msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover', 'mmultiscripts',
  'mtable', 'maction', 'semantics', 'a'
];

/**
 * Attribute Definitions
 */
const attributeDefinitions = {
  // Universal HTML-compatible attributes (valid on all MathML elements)
  'id': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'class': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'style': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'data-*': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    pattern: /^data-/
  },
  'href': {
    type: 'uri',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'autofocus': {
    type: 'boolean',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'tabindex': {
    type: 'integer',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'nonce': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'on*': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    pattern: /^on/
  },

  // MathML4 new universal attributes
  'intent': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'arg': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },

  // Math-specific universal attributes
  'dir': {
    type: 'enum',
    values: ['ltr', 'rtl', 'auto'],
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'mathcolor': {
    type: 'color',
    specs: [SpecLevel.PRESENTATION]
  },
  'mathbackground': {
    type: 'color',
    specs: [SpecLevel.PRESENTATION]
  },
  'mathsize': {
    type: 'length-or-keyword',
    values: ['small', 'normal', 'big'],
    specs: [SpecLevel.PRESENTATION]
  },
  'mathvariant': {
    type: 'enum',
    values: ['normal', 'bold', 'italic', 'bold-italic', 'double-struck',
             'bold-fraktur', 'script', 'bold-script', 'fraktur', 'sans-serif',
             'bold-sans-serif', 'sans-serif-italic', 'sans-serif-bold-italic',
             'monospace', 'initial', 'tailed', 'looped', 'stretched'],
    specs: [SpecLevel.PRESENTATION]
  },
  'displaystyle': {
    type: 'boolean',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'scriptlevel': {
    type: 'integer-or-signed',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },

  // math element attributes
  'display': {
    type: 'enum',
    values: ['block', 'inline'],
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'alttext': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'xmlns': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },

  // mo element attributes
  'form': {
    type: 'enum',
    values: ['prefix', 'infix', 'postfix'],
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  // fence and separator removed from MathML4 mo (moved to legacy schema)
  'lspace': {
    type: 'length',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'rspace': {
    type: 'length',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'stretchy': {
    type: 'boolean',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'symmetric': {
    type: 'boolean',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'maxsize': {
    type: 'length-or-keyword',
    values: ['infinity'],
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'minsize': {
    type: 'length',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'largeop': {
    type: 'boolean',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'movablelimits': {
    type: 'boolean',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  // accent on mo is coreno in MathML4 — valid in Full, not in Core
  'accent': {
    type: 'boolean',
    specs: [SpecLevel.PRESENTATION]
  },

  // mspace/mpadded attributes
  'width': {
    type: 'length',
    specs: [SpecLevel.PRESENTATION]
  },
  'height': {
    type: 'length',
    specs: [SpecLevel.PRESENTATION]
  },
  'depth': {
    type: 'length',
    specs: [SpecLevel.PRESENTATION]
  },

  // mfrac attributes
  'linethickness': {
    type: 'length-or-keyword',
    values: ['thin', 'medium', 'thick'],
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  // numalign, denomalign, bevelled are coreno in MathML4
  'numalign': {
    type: 'enum',
    values: ['left', 'center', 'right'],
    specs: [SpecLevel.PRESENTATION]
  },
  'denomalign': {
    type: 'enum',
    values: ['left', 'center', 'right'],
    specs: [SpecLevel.PRESENTATION]
  },
  'bevelled': {
    type: 'boolean',
    specs: [SpecLevel.PRESENTATION]
  },

  // mpadded attributes
  'voffset': {
    type: 'length-or-pseudo',
    specs: [SpecLevel.PRESENTATION]
  },

  // ms attributes
  'lquote': {
    type: 'string',
    specs: [SpecLevel.PRESENTATION]
  },
  'rquote': {
    type: 'string',
    specs: [SpecLevel.PRESENTATION]
  },

  // menclose attributes (menclose is deprecated in MathML4, presentation only)
  'notation': {
    type: 'string-list',
    specs: [SpecLevel.PRESENTATION]
  },

  // munder/mover attributes
  'accentunder': {
    type: 'boolean',
    specs: [SpecLevel.PRESENTATION]
  },

  // msub/msup/msubsup attributes
  'subscriptshift': {
    type: 'length',
    specs: [SpecLevel.PRESENTATION]
  },
  'superscriptshift': {
    type: 'length',
    specs: [SpecLevel.PRESENTATION]
  },

  // mo/mspace linebreaking attributes (coreno in MathML4 — §3.2.5 / §3.2.7)
  'linebreak': {
    type: 'enum',
    values: ['auto', 'newline', 'nobreak', 'goodbreak', 'badbreak'],
    specs: [SpecLevel.PRESENTATION]
  },
  'linebreakstyle': {
    type: 'enum',
    values: ['before', 'after', 'duplicate', 'infixlinebreakstyle'],
    specs: [SpecLevel.PRESENTATION]
  },
  'linebreakmultchar': {
    type: 'string',
    specs: [SpecLevel.PRESENTATION]
  },
  'lineleading': {
    type: 'length',
    specs: [SpecLevel.PRESENTATION]
  },
  'indentshift': {
    type: 'length',
    specs: [SpecLevel.PRESENTATION]
  },
  'indentshiftfirst': {
    type: 'length-or-keyword',
    values: ['indent'],
    specs: [SpecLevel.PRESENTATION]
  },
  'indentshiftlast': {
    type: 'length-or-keyword',
    values: ['indent'],
    specs: [SpecLevel.PRESENTATION]
  },
  'indentalign': {
    type: 'enum',
    values: ['left', 'center', 'right', 'auto', 'id'],
    specs: [SpecLevel.PRESENTATION]
  },
  'indentalignfirst': {
    type: 'enum',
    values: ['left', 'center', 'right', 'auto', 'id', 'indentalign'],
    specs: [SpecLevel.PRESENTATION]
  },
  'indentalignlast': {
    type: 'enum',
    values: ['left', 'center', 'right', 'auto', 'id', 'indentalign'],
    specs: [SpecLevel.PRESENTATION]
  },
  'indenttarget': {
    type: 'string',
    specs: [SpecLevel.PRESENTATION]
  },

  // mtable attributes — all layout attrs are coreno in MathML4
  'align': {
    type: 'enum',
    values: ['top', 'bottom', 'center', 'baseline', 'axis'],
    specs: [SpecLevel.PRESENTATION]
  },
  'rowalign': {
    type: 'string-list',
    values: ['top', 'bottom', 'center', 'baseline', 'axis'],
    specs: [SpecLevel.PRESENTATION]
  },
  'columnalign': {
    type: 'string-list',
    values: ['left', 'center', 'right', 'decimalpoint'],
    specs: [SpecLevel.PRESENTATION]
  },
  // groupalign removed from MathML4 (was §3.5.1–3.5.4)
  'columnwidth': {
    type: 'string-list',
    specs: [SpecLevel.PRESENTATION]
  },
  'rowspacing': {
    type: 'string-list',
    specs: [SpecLevel.PRESENTATION]
  },
  'columnspacing': {
    type: 'string-list',
    specs: [SpecLevel.PRESENTATION]
  },
  'rowlines': {
    type: 'string-list',
    values: ['none', 'solid', 'dashed'],
    specs: [SpecLevel.PRESENTATION]
  },
  'columnlines': {
    type: 'string-list',
    values: ['none', 'solid', 'dashed'],
    specs: [SpecLevel.PRESENTATION]
  },
  'frame': {
    type: 'enum',
    values: ['none', 'solid', 'dashed'],
    specs: [SpecLevel.PRESENTATION]
  },
  'framespacing': {
    type: 'string',
    specs: [SpecLevel.PRESENTATION]
  },
  'equalrows': {
    type: 'boolean',
    specs: [SpecLevel.PRESENTATION]
  },
  'equalcolumns': {
    type: 'boolean',
    specs: [SpecLevel.PRESENTATION]
  },
  // side and minlabelspacing removed (were for mlabeledtr support)

  // mtd attributes
  'rowspan': {
    type: 'positive-integer',
    specs: [SpecLevel.PRESENTATION]
  },
  'columnspan': {
    type: 'positive-integer',
    specs: [SpecLevel.PRESENTATION]
  },

  // maction attributes (maction deprecated in MathML4)
  'actiontype': {
    type: 'string',
    specs: [SpecLevel.PRESENTATION]
  },
  'selection': {
    type: 'positive-integer',
    specs: [SpecLevel.PRESENTATION]
  },

  // semantics / annotation attributes
  'encoding': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  },
  'cd': {
    type: 'string',
    specs: [SpecLevel.PRESENTATION]
  },
  'name': {
    type: 'string',
    specs: [SpecLevel.PRESENTATION]
  },

  // Link attributes
  'target': {
    type: 'string',
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION]
  }
};

/**
 * Universal attributes valid on ALL MathML4 elements.
 * intent and arg are new in MathML4.
 */
const universalAttributes = [
  'id', 'class', 'style', 'data-*', 'href',
  'autofocus', 'tabindex', 'nonce', 'on*',
  'intent', 'arg'
];

/**
 * Element Definitions (Presentation MathML4)
 */
const presentationElements = {
  'math': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ONE_INFERRED,
    allowedChildren: FLOW_CONTENT,
    category: 'root',
    allowedAttributes: [
      ...universalAttributes,
      'display', 'alttext', 'xmlns',
      'dir', 'mathcolor', 'mathbackground', 'mathsize', 'mathvariant',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mi': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['text'],
    category: 'token',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize', 'mathvariant',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mn': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['text'],
    category: 'token',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize', 'mathvariant',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mo': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['text'],
    category: 'token',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize', 'mathvariant',
      'displaystyle', 'scriptlevel',
      'form', 'lspace', 'rspace',
      'stretchy', 'symmetric', 'maxsize', 'minsize',
      'largeop', 'movablelimits', 'accent',
      // linebreaking/indentation: coreno (valid in Full, not Core)
      'linebreak', 'linebreakstyle', 'linebreakmultchar', 'lineleading',
      'indentshift', 'indentshiftfirst', 'indentshiftlast',
      'indentalign', 'indentalignfirst', 'indentalignlast', 'indenttarget'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mtext': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['text', 'html-phrasing'],
    category: 'token',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize', 'mathvariant',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mspace': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO,
    allowedChildren: [],
    category: 'token',
    emptyElement: true,
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize', 'mathvariant',
      'displaystyle', 'scriptlevel',
      'width', 'height', 'depth',
      'linebreak', 'indentshift', 'indentshiftfirst', 'indentshiftlast',
      'indentalign', 'indentalignfirst', 'indentalignlast', 'indenttarget'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'ms': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['text'],
    category: 'token',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize', 'mathvariant',
      'displaystyle', 'scriptlevel',
      'lquote', 'rquote'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mrow': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: FLOW_CONTENT,
    category: 'layout',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mfrac': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.TWO,
    allowedChildren: FLOW_CONTENT,
    childRoles: ['numerator', 'denominator'],
    category: 'layout',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'linethickness',
      // numalign, denomalign, bevelled: coreno (not in MathML Core)
      'numalign', 'denomalign', 'bevelled'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'msqrt': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ONE_INFERRED,
    allowedChildren: FLOW_CONTENT,
    category: 'layout',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mroot': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.TWO,
    allowedChildren: FLOW_CONTENT,
    childRoles: ['base', 'index'],
    category: 'layout',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mstyle': {
    specs: [SpecLevel.PRESENTATION],
    childCount: ChildCount.ONE_INFERRED,
    allowedChildren: FLOW_CONTENT,
    category: 'layout',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize', 'mathvariant',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'merror': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ONE_INFERRED,
    allowedChildren: FLOW_CONTENT,
    category: 'layout',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mpadded': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ONE_INFERRED,
    allowedChildren: FLOW_CONTENT,
    category: 'layout',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'width', 'height', 'depth', 'lspace', 'voffset'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mphantom': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ONE_INFERRED,
    allowedChildren: FLOW_CONTENT,
    category: 'layout',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  // menclose is deprecated in MathML4 (use CSS instead); not in MathML Core
  'menclose': {
    specs: [SpecLevel.PRESENTATION],
    childCount: ChildCount.ONE_INFERRED,
    allowedChildren: FLOW_CONTENT,
    category: 'layout',
    deprecated: true,
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'notation'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'msub': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.TWO,
    allowedChildren: FLOW_CONTENT,
    childRoles: ['base', 'subscript'],
    category: 'script',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'subscriptshift'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'msup': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.TWO,
    allowedChildren: FLOW_CONTENT,
    childRoles: ['base', 'superscript'],
    category: 'script',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'superscriptshift'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'msubsup': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.THREE,
    allowedChildren: FLOW_CONTENT,
    childRoles: ['base', 'subscript', 'superscript'],
    category: 'script',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'subscriptshift', 'superscriptshift'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'munder': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.TWO,
    allowedChildren: FLOW_CONTENT,
    childRoles: ['base', 'underscript'],
    category: 'script',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'accentunder'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mover': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.TWO,
    allowedChildren: FLOW_CONTENT,
    childRoles: ['base', 'overscript'],
    category: 'script',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'accent'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'munderover': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.THREE,
    allowedChildren: FLOW_CONTENT,
    childRoles: ['base', 'underscript', 'overscript'],
    category: 'script',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'accent', 'accentunder'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mmultiscripts': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.CUSTOM,
    // none element removed in MathML4; use empty mrow instead
    allowedChildren: [...FLOW_CONTENT, 'mprescripts'],
    category: 'script',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mprescripts': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO,
    allowedChildren: [],
    category: 'special',
    emptyElement: true,
    onlyValidIn: ['mmultiscripts'],
    allowedAttributes: universalAttributes,
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mtable': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO_OR_MORE,
    // mlabeledtr removed in MathML4
    allowedChildren: ['mtr'],
    category: 'table',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      // All layout attrs are coreno in MathML4
      'align', 'rowalign', 'columnalign',
      'columnwidth', 'width', 'rowspacing', 'columnspacing',
      'rowlines', 'columnlines', 'frame', 'framespacing',
      'equalrows', 'equalcolumns'
      // groupalign, side, minlabelspacing removed
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mtr': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['mtd'],
    category: 'table',
    onlyValidIn: ['mtable'],
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'rowalign', 'columnalign'
      // groupalign removed
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'mtd': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ONE_INFERRED,
    allowedChildren: FLOW_CONTENT,
    category: 'table',
    onlyValidIn: ['mtr'],
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'rowspan', 'columnspan', 'rowalign', 'columnalign'
      // groupalign removed
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  // maction is deprecated in MathML4; authors should use CSS or data attributes
  'maction': {
    specs: [SpecLevel.PRESENTATION],
    childCount: ChildCount.ONE_OR_MORE,
    allowedChildren: FLOW_CONTENT,
    category: 'enlivening',
    deprecated: true,
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'actiontype', 'selection'
    ],
    requiredAttributes: [],
    deprecatedAttributes: ['actiontype', 'selection']
  },

  'semantics': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ONE_OR_MORE,
    allowedChildren: [...FLOW_CONTENT, 'annotation', 'annotation-xml'],
    category: 'semantic',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'annotation': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['text'],
    category: 'semantic',
    onlyValidIn: ['semantics'],
    allowedAttributes: [
      ...universalAttributes,
      'encoding', 'cd', 'name'
      // src removed (was MathML3 only; external ref loading)
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'annotation-xml': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: 'any-xml',
    category: 'semantic',
    onlyValidIn: ['semantics'],
    allowedAttributes: [
      ...universalAttributes,
      'encoding', 'cd', 'name'
      // src removed
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  },

  'a': {
    specs: [SpecLevel.MATHML_CORE, SpecLevel.PRESENTATION],
    childCount: ChildCount.ONE_OR_MORE,
    allowedChildren: FLOW_CONTENT,
    category: 'link',
    allowedAttributes: [
      ...universalAttributes,
      'dir', 'mathcolor', 'mathbackground', 'mathsize',
      'displaystyle', 'scriptlevel',
      'href', 'target'
    ],
    requiredAttributes: [],
    deprecatedAttributes: []
  }
};


/**
 * Universal attributes for Content MathML
 */
const contentUniversalAttributes = [
  'id', 'class', 'style', 'data-*', 'href',
  'autofocus', 'tabindex', 'nonce', 'on*'
];

/**
 * Content MathML Attribute Definitions (MathML4)
 * definitionURL removed per MathML4 spec (§4)
 */
const contentAttributeDefinitions = {
  'type': {
    type: 'string',
    specs: [SpecLevel.CONTENT]
  },
  'base': {
    type: 'integer',
    specs: [SpecLevel.CONTENT]
  },
  'cd': {
    type: 'string',
    specs: [SpecLevel.CONTENT]
  },
  'name': {
    type: 'string',
    specs: [SpecLevel.CONTENT]
  },
  'src': {
    type: 'uri',
    specs: [SpecLevel.CONTENT]
  },
  'encoding': {
    type: 'string',
    specs: [SpecLevel.CONTENT]
  },
  'closure': {
    type: 'enum',
    values: ['open', 'closed', 'open-closed', 'closed-open'],
    specs: [SpecLevel.CONTENT]
  }
  // scope, nargs, occurrence (declare attrs) removed — declare element is removed
  // definitionURL removed in MathML4
};

/**
 * Content MathML Elements (MathML4)
 * reln, declare, fn removed from MathML4
 */
const contentElements = {
  // Token Elements
  'ci': {
    specs: [SpecLevel.CONTENT],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['text', 'mi', 'semantics'],
    category: 'token',
    allowedAttributes: [...contentUniversalAttributes, 'type', 'cd', 'name']
  },
  'cn': {
    specs: [SpecLevel.CONTENT],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['text', 'sep'],
    category: 'token',
    allowedAttributes: [...contentUniversalAttributes, 'type', 'base']
  },
  'csymbol': {
    specs: [SpecLevel.CONTENT],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['text'],
    category: 'token',
    allowedAttributes: [...contentUniversalAttributes, 'type', 'cd', 'name']
  },
  // Structural Elements
  'apply': {
    specs: [SpecLevel.CONTENT],
    childCount: ChildCount.ONE_OR_MORE,
    allowedChildren: 'any-content',
    category: 'structural',
    allowedAttributes: contentUniversalAttributes
  },
  'bind': {
    specs: [SpecLevel.CONTENT],
    childCount: ChildCount.TWO_OR_MORE,
    allowedChildren: 'any-content',
    category: 'structural',
    allowedAttributes: contentUniversalAttributes
  },
  'share': {
    specs: [SpecLevel.CONTENT],
    childCount: ChildCount.ZERO,
    allowedChildren: [],
    category: 'structural',
    emptyElement: true,
    allowedAttributes: [...contentUniversalAttributes, 'src']
  },
  'cerror': {
    specs: [SpecLevel.CONTENT],
    childCount: ChildCount.ONE_OR_MORE,
    allowedChildren: 'any-content',
    category: 'structural',
    allowedAttributes: contentUniversalAttributes
  },
  'cbytes': {
    specs: [SpecLevel.CONTENT],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['text'],
    category: 'token',
    allowedAttributes: [...contentUniversalAttributes, 'encoding']
  },
  'cs': {
    specs: [SpecLevel.CONTENT],
    childCount: ChildCount.ZERO_OR_MORE,
    allowedChildren: ['text'],
    category: 'token',
    allowedAttributes: contentUniversalAttributes
  }
};

export default {
  presentationElements,
  attributeDefinitions,
  universalAttributes,
  contentElements,
  contentAttributeDefinitions,
  contentUniversalAttributes,
  SpecLevel
};
