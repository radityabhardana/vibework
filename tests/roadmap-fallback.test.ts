import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoadmapSlug, isMachineLearningTopic } from '../src/lib/engine/prompt-chaining';

test('does not classify markup formats as machine learning', () => {
  for (const topic of ['HTML', 'XML', 'YAML']) {
    assert.equal(isMachineLearningTopic(topic), false, topic);
  }
});

test('recognizes explicit machine-learning topics', () => {
  for (const topic of ['ML', 'Machine Learning', 'machine-learning', 'Data Science', 'MLOps']) {
    assert.equal(isMachineLearningTopic(topic), true, topic);
  }
});

test('caps fallback slugs so generated node IDs stay within their contract', () => {
  const slug = createRoadmapSlug('a'.repeat(120));
  assert.equal(slug.length, 80);
  assert.ok(`${slug}_foundations`.length <= 100);
});
