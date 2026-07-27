import assert from 'node:assert/strict';
import test from 'node:test';
import { isRenderableAppFlowchart, isValidAppFlowchart } from '../src/lib/flowchart';

const validFlowchart = {
  nodes: [
    { id: 'start', label: 'Start', description: 'Start here' },
    { id: 'left', label: 'Left', description: 'Left branch' },
    { id: 'right', label: 'Right', description: 'Right branch' },
  ],
  edges: [
    { source: 'start', target: 'left', label: 'Choose left' },
    { source: 'start', target: 'right', label: 'Choose right' },
  ],
};

test('accepts a connected branching flowchart', () => {
  assert.equal(isValidAppFlowchart(validFlowchart), true);
});

test('rejects duplicate node IDs', () => {
  assert.equal(isValidAppFlowchart({
    nodes: [...validFlowchart.nodes, { id: 'left', label: 'Duplicate', description: 'Duplicate' }],
    edges: validFlowchart.edges,
  }), false);
});

test('rejects disconnected nodes', () => {
  assert.equal(isValidAppFlowchart({
    nodes: validFlowchart.nodes,
    edges: [validFlowchart.edges[0]],
  }), false);
});

test('rejects graphs whose nodes are not reachable in edge direction', () => {
  assert.equal(isValidAppFlowchart({
    nodes: validFlowchart.nodes,
    edges: [
      { source: 'left', target: 'start', label: 'Backwards' },
      { source: 'right', target: 'left', label: 'Backwards again' },
    ],
  }), false);
});

test('accepts self loops in an otherwise connected generated flowchart', () => {
  assert.equal(isValidAppFlowchart({
    nodes: validFlowchart.nodes.slice(0, 2),
    edges: [validFlowchart.edges[0], { source: 'left', target: 'left', label: 'Try again' }],
  }), true);
});

test('rejects duplicate edges', () => {
  assert.equal(isValidAppFlowchart({
    nodes: validFlowchart.nodes.slice(0, 2),
    edges: [validFlowchart.edges[0], validFlowchart.edges[0]],
  }), false);
});

test('loads a legacy stored flowchart even when it contains disconnected and self-loop nodes', () => {
  assert.equal(isRenderableAppFlowchart({
    nodes: validFlowchart.nodes,
    edges: [
      { source: 'start', target: 'left', label: 'Continue' },
      { source: 'left', target: 'left', label: 'Validation error' },
    ],
  }), true);
});
