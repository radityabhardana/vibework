import assert from 'node:assert/strict';
import test from 'node:test';
import { assignMessagePhases, getMaxMessagePhase } from '../src/lib/chat-phases';

test('keeps repeated explicit phase-one responses in phase one', () => {
  const messages = [
    { id: 'u1', role: 'user', content: 'Build a marketplace' },
    { id: 'a1', role: 'assistant', content: '[FASE: 1/5]\nWho is it for?' },
    { id: 'u2', role: 'user', content: 'Small shops' },
    { id: 'a2', role: 'assistant', content: '[FASE: 1/5]\nWhich shops?' },
  ];

  assert.deepEqual(assignMessagePhases(messages).map(message => message.phase), [1, 1, 1, 1]);
  assert.equal(getMaxMessagePhase(messages), 1);
});

test('moves to a new phase only when a valid explicit tag does', () => {
  const messages = [
    { role: 'assistant', content: '[FASE: 1/5]\nQuestion' },
    { role: 'user', content: 'Answer' },
    { role: 'assistant', content: '[FASE: 2/5]\nQuestion' },
  ];

  assert.deepEqual(assignMessagePhases(messages).map(message => message.phase), [1, 1, 2]);
});

test('uses assistant order only for legacy conversations without valid tags', () => {
  const messages = [
    { role: 'assistant', content: 'First legacy question' },
    { role: 'user', content: 'Answer' },
    { role: 'assistant', content: 'Second legacy question' },
  ];

  assert.deepEqual(assignMessagePhases(messages).map(message => message.phase), [1, 1, 2]);
});

test('correctly reduces max phase when conversation is undone', () => {
  const messages = [
    { role: 'assistant', content: '[FASE: 1/5]\nQuestion 1' },
    { role: 'user', content: 'Answer 1' },
    { role: 'assistant', content: '[FASE: 2/5]\nQuestion 2' },
    { role: 'user', content: 'Answer 2' },
    { role: 'assistant', content: '[FASE: 3/5]\nQuestion 3' },
  ];

  assert.equal(getMaxMessagePhase(messages), 3);

  // User undid back to Phase 1
  const rolledBack = messages.slice(0, 2);
  assert.equal(getMaxMessagePhase(rolledBack), 1);
});
