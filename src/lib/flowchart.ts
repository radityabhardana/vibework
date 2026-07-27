export type FlowchartNode = {
  id: string;
  label: string;
  description: string;
};

export type FlowchartEdge = {
  source: string;
  target: string;
  label: string;
};

export type AppFlowchart = {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isRenderableAppFlowchart(value: unknown): value is AppFlowchart {
  if (!isRecord(value) || !Array.isArray(value.nodes) || value.nodes.length === 0 || !Array.isArray(value.edges)) {
    return false;
  }

  if (!value.nodes.every(node =>
    isRecord(node)
    && isNonEmptyString(node.id)
    && isNonEmptyString(node.label)
    && typeof node.description === 'string'
  )) {
    return false;
  }

  const nodeIds = new Set(value.nodes.map(node => node.id));
  if (nodeIds.size !== value.nodes.length) return false;

  return value.edges.every(edge =>
    isRecord(edge)
    && isNonEmptyString(edge.source)
    && isNonEmptyString(edge.target)
    && typeof edge.label === 'string'
    && nodeIds.has(edge.source)
    && nodeIds.has(edge.target)
  );
}

export function isValidAppFlowchart(value: unknown): value is AppFlowchart {
  if (!isRenderableAppFlowchart(value)
    || !value.nodes.every(node => isNonEmptyString(node.description))
    || !value.edges.every(edge => isNonEmptyString(edge.label))) {
    return false;
  }

  const nodeIds = new Set(value.nodes.map(node => node.id));
  const adjacency = new Map([...nodeIds].map(id => [id, new Set<string>()]));
  const edgeIds = new Set<string>();
  for (const edge of value.edges) {
    const edgeId = `${edge.source}\0${edge.target}\0${edge.label}`;
    if (edgeIds.has(edgeId)) return false;
    edgeIds.add(edgeId);
    adjacency.get(edge.source)?.add(edge.target);
  }

  if (value.nodes.length === 1) return value.edges.length === 0;
  if (value.edges.length === 0) return false;

  const visited = new Set<string>();
  const pending = [value.nodes[0].id];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    adjacency.get(current)?.forEach(neighbor => pending.push(neighbor));
  }

  return visited.size === nodeIds.size;
}
