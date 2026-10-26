// Lossless-in-meaning conversion for common OCR LaTeX. Unknown commands stay
// visible and are rejected by validation; never erase an unfamiliar expression.
const symbols = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', theta: 'θ', lambda: 'λ', mu: 'μ',
  pi: 'π', sigma: 'σ', phi: 'φ', omega: 'ω', Delta: 'Δ', Theta: 'Θ', Pi: 'Π',
  land: '∧', wedge: '∧', lor: '∨', vee: '∨', neg: '¬', lnot: '¬', sim: '~',
  to: '→', rightarrow: '→', implies: '⇒', Rightarrow: '⇒', leftarrow: '←',
  leftrightarrow: '↔', iff: '⇔', Leftrightarrow: '⇔', equiv: '≡',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈',
  pm: '±', mp: '∓', times: '×', cdot: '·', div: '÷', infty: '∞',
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', cup: '∪', cap: '∩',
  emptyset: '∅', forall: '∀', exists: '∃', partial: '∂', nabla: '∇',
  sum: '∑', prod: '∏', int: '∫', oint: '∮', angle: '∠', triangle: '△',
  perp: '⊥', parallel: '∥', degree: '°', circ: '∘', prime: '′',
  ldots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱', lvert: '|', rvert: '|',
  sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
  cosec: 'cosec', log: 'log', ln: 'ln', lim: 'lim', det: 'det',
  quad: ' ', qquad: ' '
};

export function readableMath(source) {
  if (typeof source !== 'string') return source;
  let text = source.replace(/^\s*#{1,6}\s+/gm, '');
  text = text.replace(/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g,
    (_, display, bracket, inline) => readableMath(display ?? bracket ?? inline));
  // Dollar amounts ($5 and $10) must not be interpreted as math delimiters.
  text = text.replace(/\$([^$\n]+)\$(?!\d)/g, (whole, inside) =>
    /^\d/.test(inside) && /\s(?:and|or|each|costs?)\b/i.test(inside) ? whole : readableMath(inside));
  text = text.replace(/\\begin\{(bmatrix|pmatrix|matrix|vmatrix)\}([\s\S]*?)\\end\{\1\}/g,
    (_, kind, body) => {
      const rows = body.split(/\\\\/).map(row => `[${row.split('&').map(cell => readableMath(cell.trim())).join(', ')}]`).join(', ');
      return kind === 'vmatrix' ? `det([${rows}])` : `[${rows}]`;
    });
  let index = 0;
  function group() {
    while (/\s/.test(text[index] || '') && index < text.length) index++;
    if (text[index] !== '{') return null;
    let depth = 1;
    const start = ++index;
    while (index < text.length && depth) {
      if (text[index] === '{') depth++;
      if (text[index] === '}') depth--;
      index++;
    }
    return depth ? null : readableMath(text.slice(start, index - 1));
  }
  let output = '';
  while (index < text.length) {
    const start = index;
    if (text[index] === '\\') {
      const match = text.slice(index).match(/^\\([a-zA-Z]+|[,;! {}])/);
      if (!match) { output += text[index++]; continue; }
      const command = match[1];
      index += match[0].length;
      if (['frac', 'dfrac', 'tfrac'].includes(command)) {
        const numerator = group(), denominator = group();
        if (numerator !== null && denominator !== null) { output += `(${numerator})/(${denominator})`; continue; }
      } else if (command === 'sqrt') {
        let degree = '';
        if (text[index] === '[') {
          const end = text.indexOf(']', index);
          if (end >= 0) { degree = text.slice(index + 1, end); index = end + 1; }
        }
        const radicand = group();
        if (radicand !== null) { output += degree ? `root[${degree}](${radicand})` : `√(${radicand})`; continue; }
      } else if (['text', 'mathrm', 'operatorname', 'mathbf', 'mathit'].includes(command)) {
        const value = group();
        if (value !== null) { output += value; continue; }
      } else if (command === 'mathbb') {
        const value = group();
        const sets = { R: 'ℝ', Z: 'ℤ', N: 'ℕ', Q: 'ℚ', C: 'ℂ' };
        if (sets[value]) { output += sets[value]; continue; }
      } else if (['left', 'right'].includes(command)) {
        if (text[index] === '.') index++;
        continue;
      } else if (Object.hasOwn(symbols, command)) { output += symbols[command]; continue; }
      else if ([',', ';', '!', ' '].includes(command)) { output += ' '; continue; }
      else if (['{', '}'].includes(command)) { output += command; continue; }
      output += text.slice(start, index);
      continue;
    }
    if (['^', '_'].includes(text[index]) && text[index + 1] === '{') {
      const marker = text[index++];
      const value = group();
      output += value === null ? text.slice(start, index) : `${marker}(${value})`;
      continue;
    }
    output += text[index++];
  }
  return output;
}

export function normalizeReadableItems(value) {
  if (!value || !Array.isArray(value.items)) return value;
  return { ...value, items: value.items.map(item => !item ? item : ({ ...item, text: reconcileLogic(item.text, item.latex),
    options: Array.isArray(item.options) ? item.options.map(option => !option ? option : ({ ...option, text: reconcileLogic(option.text, option.latex) })) : item.options
  })) };
}

function reconcileLogic(text, latex) {
  const readable = readableMath(text);
  if (typeof readable !== 'string' || typeof latex !== 'string' || !/\\(?:lor|vee|land|wedge|equiv)\b/.test(latex)) return readable;
  const candidate = readableMath(latex);
  if (/\\|\$/.test(candidate)) return readable;
  if (readable.replace(/\s+/g, '') === candidate.replace(/\s+/g, '')) return readable;
  // Only reconcile equivalent glyph spellings when both representations have
  // the SAME expression. Never globally replace the variable v or exponent ^.
  const comparable = value => value.replace(/<->/g, '↔').replace(/->/g, '→')
    .replace(/\bv\b/g, '∨').replace(/\^/g, '∧').replace(/≡/g, '=')
    .replace(/\s+/g, '');
  return comparable(readable) === comparable(candidate) ? candidate : readable;
}
