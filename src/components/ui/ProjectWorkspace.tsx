'use client';

import React, { useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter } from 'next/navigation';
import dagre from 'dagre';
import { nodeTypes, edgeTypes, ViewerModal } from '@/components/flow/FlowNodes';

export function ProjectWorkspace({ project, prd, adr, schema, prompts = [], appFlowchart }: { project: any, prd: any, adr?: any, schema?: any, prompts?: any[], appFlowchart?: any }) {
  const router = useRouter();

  const [loadingFlowchart, setLoadingFlowchart] = useState(false);
  const [loadingAdr, setLoadingAdr] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewerData, setViewerData] = useState<{title: string, content: string} | null>(null);

  const layoutAppFlowchartDagre = (flowchart: any) => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', ranksep: 200, nodesep: 100 });
    g.setDefaultEdgeLabel(() => ({}));

    (flowchart.nodes || []).forEach((n: any) => {
      g.setNode(`appflow-${n.id}`, { width: 320, height: 100 });
    });

    (flowchart.edges || []).forEach((e: any) => {
      g.setEdge(`appflow-${e.source}`, `appflow-${e.target}`);
    });

    dagre.layout(g);
    return g;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loadingFlowchart || loadingAdr || loadingSchema || loadingPrompts) {
      setGenerationProgress(0);
      interval = setInterval(() => {
        setGenerationProgress(p => {
          if (p < 60) return p + Math.random() * 8;
          if (p < 85) return p + Math.random() * 3;
          if (p < 95) return p + 0.5;
          if (p < 99) return p + 0.1;
          return p;
        });
      }, 500);
    } else {
      setGenerationProgress(0);
    }
    return () => clearInterval(interval);
  }, [loadingFlowchart, loadingAdr, loadingSchema, loadingPrompts]);

  const generateFlowchart = async () => {
    setLoadingFlowchart(true);
    setError(null);
    try {
      const res = await fetch('/api/projects/generate-flowchart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingFlowchart(false);
    }
  };

  const generateADR = async () => {
    setLoadingAdr(true);
    setError(null);
    try {
      const res = await fetch('/api/projects/generate-adr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingAdr(false);
    }
  };

  const generateSchema = async () => {
    setLoadingSchema(true);
    setError(null);
    try {
      const res = await fetch('/api/projects/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingSchema(false);
    }
  };

  const generatePrompts = async () => {
    setLoadingPrompts(true);
    setError(null);
    try {
      const res = await fetch('/api/projects/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const newNodes: Node[] = [
      {
        id: '1',
        position: { x: 50, y: 50 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: prd ? `✅ PRD` : `PRD: Pending`,
          onView: prd ? () => setViewerData({ title: 'Product Requirements Document', content: prd.documentContent }) : undefined
        }
      }
    ];

    if (appFlowchart) {
      newNodes.push({
        id: '1.5',
        position: { x: 50, y: 200 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: '✅ App Flowchart',
          onView: () => setViewerData({ title: 'Application Flowchart', content: JSON.stringify(appFlowchart.nodes, null, 2) })
        }
      });
    } else {
      newNodes.push({
        id: '1.5',
        position: { x: 50, y: 200 },
        type: 'actionNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: 'Flowchart Not Generated',
          buttonText: 'Generate Flowchart',
          onAction: generateFlowchart,
          isLoading: loadingFlowchart,
          progress: generationProgress,
          disabled: !prd
        }
      });
    }

    if (adr) {
      newNodes.push({
        id: '2',
        position: { x: 50, y: 350 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: '✅ ADR',
          onView: () => setViewerData({ title: 'Architecture Decision Record', content: adr.adrDocument })
        }
      });
    } else {
      newNodes.push({
        id: '2',
        position: { x: 50, y: 350 },
        type: 'actionNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: 'Architecture Not Generated',
          buttonText: 'Generate ADR',
          onAction: generateADR,
          isLoading: loadingAdr,
          progress: generationProgress,
          disabled: !appFlowchart
        }
      });
    }

    if (schema) {
      newNodes.push({
        id: '3',
        position: { x: 50, y: 500 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: '✅ Schema & API',
          onView: () => setViewerData({
            title: 'Database Schema & API Contract',
            content: `### Database Schema\n\n${schema.dbSchema}\n\n### API Contract\n\n${JSON.stringify(schema.apiContract, null, 2)}`
          })
        }
      });
    } else {
      newNodes.push({
        id: '3',
        position: { x: 50, y: 500 },
        type: 'actionNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: 'Database Schema Not Generated',
          buttonText: 'Generate Schema',
          onAction: generateSchema,
          isLoading: loadingSchema,
          progress: generationProgress,
          disabled: !adr
        }
      });
    }

    if (prompts && prompts.length > 0) {
      newNodes.push({
        id: '4',
        position: { x: 50, y: 650 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: `✅ ${prompts.length} Prompts Generated`,
          onView: () => {
            const content = prompts.map((p: any) =>
`================================================================================
# PROMPT ${p.executionOrder}: ${p.title}
================================================================================
**Context**: ${p.context}
**Task**: ${p.task}
**Constraints**: ${p.constraints}
**Format**: ${p.format}
**Dependencies**: ${(p.dependencies || []).join(', ')}
`).join('\n\n');
            setViewerData({ title: 'AI Atomic Prompts', content });
          }
        }
      });
    } else {
      newNodes.push({
        id: '4',
        position: { x: 50, y: 650 },
        type: 'actionNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: 'AI Prompts Not Generated',
          buttonText: 'Generate Prompts',
          onAction: generatePrompts,
          isLoading: loadingPrompts,
          progress: generationProgress,
          disabled: !schema
        }
      });
    }

    setNodes(newNodes);

    const newEdges: Edge[] = [
      { id: 'e1-1.5', source: '1', target: '1.5', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
      { id: 'e1.5-2', source: '1.5', target: '2', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
      { id: 'e2-3', source: '2', target: '3', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
      { id: 'e3-4', source: '3', target: '4', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
    ];

    if (appFlowchart && appFlowchart.nodes) {
      const dagreGraph = layoutAppFlowchartDagre(appFlowchart);
      const startX = 600;
      const startY = 50;

      (appFlowchart.nodes || []).forEach((n: any) => {
        const nodeId = `appflow-${n.id}`;
        const dagreNode = dagreGraph.node(nodeId);

        newNodes.push({
          id: nodeId,
          position: { x: startX + dagreNode.x - 160, y: startY + dagreNode.y },
          type: 'promptNode',
          data: {
            label: n.label,
            onView: () => {
              const content = `Node: ${n.label}\nDescription: ${n.description || 'No description provided.'}`;
              setViewerData({ title: n.label, content });
            }
          }
        });
      });

      (appFlowchart.edges || []).forEach((e: any, idx: number) => {
        const sourceNode = dagreGraph.node(`appflow-${e.source}`);
        const targetNode = dagreGraph.node(`appflow-${e.target}`);

        let sourceHandle = 'right';
        let targetHandle = 'left';

        if (sourceNode && targetNode && sourceNode.x >= targetNode.x) {
          sourceHandle = 'bottom';
          targetHandle = 'bottom';
        }

        newEdges.push({
          id: `e-appflow-${e.source}-${e.target}-${idx}`,
          source: `appflow-${e.source}`,
          target: `appflow-${e.target}`,
          sourceHandle,
          targetHandle,
          type: 'appFlowEdge',
          label: e.label || '',
          style: { strokeWidth: 2, stroke: '#050505', strokeDasharray: '4,4' }
        });
      });

      const targetNodes = new Set((appFlowchart.edges || []).map((e: any) => e.target));
      const rootNodes = (appFlowchart.nodes || []).filter((n: any) => !targetNodes.has(n.id));

      rootNodes.forEach((root: any) => {
        newEdges.push({
          id: `e-connect-${root.id}`,
          source: '1.5',
          target: `appflow-${root.id}`,
          type: 'default',
          style: { strokeWidth: 2, stroke: '#e8be17' }
        });
      });

      setNodes([...newNodes]);
    }

    setEdges(newEdges);
  }, [project, prd, adr, schema, prompts, appFlowchart, loadingFlowchart, loadingAdr, loadingSchema, loadingPrompts, generationProgress]);

  return (
    <div className="flex-1 w-full h-full relative">
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-brutal-red text-brutal-white font-mono font-bold px-4 py-2 border-4 border-brutal-black shadow-brutal">
          Error: {error}
        </div>
      )}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        minZoom={0.1}
        attributionPosition="bottom-right"
      >
        <Controls className="!border-4 !border-brutal-black !shadow-brutal-sm !bg-brutal-white [&>button]:!border-b-4 [&>button]:!border-brutal-black [&>button:last-child]:!border-b-0" />
        <MiniMap className="!border-4 !border-brutal-black !shadow-brutal-sm !bg-brutal-white mask-none" nodeColor="#050505" />
        <Background gap={24} size={2} color="#050505" />
      </ReactFlow>

      {viewerData && (
        <ViewerModal
          title={viewerData.title}
          content={viewerData.content}
          onClose={() => setViewerData(null)}
        />
      )}
    </div>
  );
}
