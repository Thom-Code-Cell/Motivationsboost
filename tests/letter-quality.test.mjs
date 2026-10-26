import test from 'node:test';
import assert from 'node:assert/strict';
import { checkLetterQuality } from '../src/lib/letter-quality.ts';

test('empty text asks for content', () => {
  assert.deepEqual(checkLetterQuality(' ').map(x => x.code), ['EMPTY']);
});

test('common generic openings are flagged', () => {
  assert.ok(checkLetterQuality('Hiermit bewerbe ich mich um die Stelle.').some(x => x.code === 'GENERIC'));
});

test('unsupported-looking numeric figures trigger a human fact-check reminder', () => {
  assert.ok(checkLetterQuality('Ich erhöhte den Umsatz um 35 Prozent.').some(x => x.code === 'UNVERIFIED_FIGURES'));
});

test('a natural text with no obvious boilerplate or figures is not flagged as AI', () => {
  const words = Array(18).fill('Ich organisierte die Warenannahme zusammen mit dem Team und löste dabei ein konkretes Problem.').join(' ');
  assert.equal(checkLetterQuality(words).some(x => x.code === 'GENERIC'), false);
});

test('very long cover letters receive a length hint', () => {
  const findings = checkLetterQuality(Array(355).fill('Beispiel').join(' '));
  assert.ok(findings.some(x => x.code === 'LONG'));
});
