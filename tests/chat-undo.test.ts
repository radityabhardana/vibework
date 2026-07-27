import assert from 'node:assert/strict';
import test from 'node:test';
import { getUndoMessageIds } from '../src/lib/chat-undo';

const messages = [
  { id: 'u1', role: 'user' },
  { id: 'a1', role: 'assistant' },
  { id: 'u2', role: 'user' },
  { id: 'a2', role: 'assistant' },
];

test('derives the undo suffix from server-ordered messages', () => {
  assert.deepEqual(getUndoMessageIds(messages, 'u2'), ['u2', 'a2']);
});

test('rejects an older user message as a stale undo target', () => {
  assert.equal(getUndoMessageIds(messages, 'u1'), null);
});
