import assert from 'node:assert/strict';
import test from 'node:test';
import { extractMaxLimit } from '../src/components/ui/ChatComponents';

test('extractMaxLimit correctly handles maximum limits', () => {
  assert.equal(extractMaxLimit('Pilih maksimal 3 fitur'), 3);
  assert.equal(extractMaxLimit('Pilih hingga 4 opsi'), 4);
  assert.equal(extractMaxLimit('Pilih tepat 1 opsi'), 1);
  assert.equal(extractMaxLimit('Pilih tepat dua opsi'), 2);
});

test('extractMaxLimit does NOT treat open-ended choices as max limit 1', () => {
  // 'Pilih 1 atau lebih' should allow multi-select, not lock to 1
  assert.equal(extractMaxLimit('Pilih 1 atau lebih fitur utama di bawah ini:'), null);
  assert.equal(extractMaxLimit('Pilih satu atau lebih fitur untuk MVP:'), null);
  assert.equal(extractMaxLimit('Silakan pilih minimal 1 opsi'), null);
});
