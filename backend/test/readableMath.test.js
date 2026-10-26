import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readableMath, normalizeReadableItems } from '../src/utils/readableMath.js';
import { validateTranscript } from '../src/services/ocrFormat.js';

test('nested fractions and radical bounds are preserved', () => {
  assert.equal(readableMath(String.raw`\sqrt{\frac{x(x+y+z)}{yz}}`), '√((x(x+y+z))/(yz))');
  assert.equal(readableMath(String.raw`\frac{\sqrt{x(x+y+z)}}{yz}`), '(√(x(x+y+z)))/(yz)');
  assert.equal(readableMath(String.raw`\sqrt[3]{x^{2}+1}`), 'root[3](x^(2)+1)');
});
test('logical glyphs retain negations and three-stroke equivalence', () => {
  assert.equal(readableMath(String.raw`$\sim[(\sim p \land q)\to\sim p]\equiv$`), '~[(~ p ∧ q)→~ p]≡');
  assert.equal(readableMath('### $p$: Ram is rich'), 'p: Ram is rich');
});
test('matrices preserve rows, negative signs and determinant distinction', () => {
  assert.equal(readableMath(String.raw`\begin{bmatrix}-\frac p2&0\\0&1/q\end{bmatrix}`).includes(String.raw`\frac`), true);
  assert.equal(readableMath(String.raw`\begin{bmatrix}-\frac{p}{2}&0\\0&1/q\end{bmatrix}`), '[[-(p)/(2), 0], [0, 1/q]]');
  assert.equal(readableMath(String.raw`\begin{vmatrix}1&2\\3&4\end{vmatrix}`), 'det([[1, 2], [3, 4]])');
});
test('literal currency is unchanged and unfamiliar notation is never deleted', () => {
  assert.equal(readableMath('Costs $5 and $10 each.'), 'Costs $5 and $10 each.');
  assert.equal(readableMath('Price $5, tax $2.'), 'Price $5, tax $2.');
  assert.equal(readableMath(String.raw`\unknown{x}`), String.raw`\unknown{x}`);
  const value = { title: 'Test', inventory: [], items: [{ kind: 'equation', number: '', text: String.raw`\underline{\quad}`, latex: '', options: [] }], warnings: [] };
  assert.throws(() => validateTranscript(normalizeReadableItems(value)), { code: 'OCR_INVALID_RESPONSE' });
});
test('normalization changes only readable fields and retains LaTeX export', () => {
  const value = { items: [{ text: String.raw`\alpha`, latex: String.raw`\alpha`, options: [{ label: 'A', text: String.raw`\pi`, latex: String.raw`\pi` }] }] };
  const normalized = normalizeReadableItems(value);
  assert.equal(normalized.items[0].text, 'α');
  assert.equal(normalized.items[0].options[0].text, 'π');
  assert.equal(normalized.items[0].latex, String.raw`\alpha`);
  assert.equal(value.items[0].text, String.raw`\alpha`);
});

test('ASCII logic lookalikes agree with corresponding LaTeX without altering variable v', () => {
  const result = normalizeReadableItems({ items: [{ text: '~[(~p ^ q) -> ~p] =', latex: String.raw`\sim[(\sim p\land q)\to\sim p]\equiv`, options: [
    { label: 'A', text: 'p v (~p ∧ q)', latex: String.raw`p\lor(\sim p\land q)` },
    { label: 'B', text: 'v + 2', latex: 'v+2' },
    { label: 'C', text: 'p ∧ r', latex: String.raw`p\land q` }
  ] }] });
  assert.equal(result.items[0].text, '~[(~ p∧ q)→~ p]≡');
  assert.equal(result.items[0].options[0].text, 'p∨(~ p∧ q)');
  assert.equal(result.items[0].options[1].text, 'v + 2');
  assert.equal(result.items[0].options[2].text, 'p ∧ r');
});
