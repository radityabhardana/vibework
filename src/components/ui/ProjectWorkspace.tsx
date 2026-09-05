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
import { Button } from '@/components/ui/Button';
import {
  TreeStructure,
  Article,
  Robot,
  Cpu,
  Lightning,
  Copy,
  Check,
  DownloadSimple,
  ArrowClockwise,
  WarningCircle,
  Code
} from '@phosphor-icons/react';

type WorkspaceTab = 'tree' | 'prd' | 'agents' | 'architecture' | 'prompts';

export function ProjectWorkspace({
  project,
  prd,
  adr,
  schema,
  prompts = [],
  appFlowchart,
}: {
  project: any;
  prd: any;
  adr?: any;
  schema?: any;
  prompts?: any[];
  appFlowchart?: any;
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('tree');
  const [loadingFlowchart, setLoadingFlowchart] = useState(false);
  const [loadingAdr, setLoadingAdr] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewerData, setViewerData] = useState<{ title: string; content: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
    const isLoading =
      loadingFlowchart || loadingAdr || loadingSchema || loadingPrompts || loadingAgents;

    if (isLoading) {
      setGenerationProgress(0);
      interval = setInterval(() => {
        setGenerationProgress((p) => {
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
  }, [loadingFlowchart, loadingAdr, loadingSchema, loadingPrompts, loadingAgents]);

  const generateFlowchart = async () => {
    setLoadingFlowchart(true);
    setError(null);
    try {
      const res = await fetch('/api/projects/generate-flowchart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
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
        body: JSON.stringify({ projectId: project.id }),
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
        body: JSON.stringify({ projectId: project.id }),
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
        body: JSON.stringify({ projectId: project.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const generateAgents = async () => {
    setLoadingAgents(true);
    setError(null);
    try {
      const res = await fetch('/api/projects/generate-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingAgents(false);
    }
  };

  // Build the master prompt fallback if project.promptDocument is not directly stored
  const effectivePromptMd =
    project.promptDocument ||
    (prompts.length > 0
      ? prompts
          .map(
            (p: any) =>
              `# PROMPT ${p.executionOrder}: ${p.title}\n\n**Context:** ${p.context}\n**Task:** ${p.task}\n**Constraints:** ${p.constraints}\n**Format:** ${p.format}\n**Dependencies:** ${(p.dependencies || []).join(', ')}\n`
          )
          .join('\n---\n\n')
      : '');

  // Master export for entire project
  const handleExportAll = () => {
    let bundle = `# ${project.name} - Complete Project Specification Bundle\n\n`;
    bundle += `*Generated by Vibework Studio*\n\n`;

    if (prd?.documentContent) {
      bundle += `\n\n==================================================\n# 1. PRODUCT REQUIREMENTS DOCUMENT (PRD)\n==================================================\n\n${prd.documentContent.trim()}\n`;
    }

    if (project.agentsDocument) {
      bundle += `\n\n==================================================\n# 2. AGENTS.MD (AI RULES & GUARDRAILS)\n==================================================\n\n${project.agentsDocument.trim()}\n`;
    }

    if (adr?.adrDocument) {
      bundle += `\n\n==================================================\n# 3. ARCHITECTURE DECISION RECORD (ADR)\n==================================================\n\n${adr.adrDocument.trim()}\n`;
    }

    if (schema?.dbSchema) {
      bundle += `\n\n==================================================\n# 4. DATABASE SCHEMA & API CONTRACT\n==================================================\n\n${schema.dbSchema.trim()}\n`;
    }

    if (effectivePromptMd) {
      bundle += `\n\n==================================================\n# 5. MASTER PROMPT.MD\n==================================================\n\n${effectivePromptMd.trim()}\n`;
    }

    downloadFile(bundle, `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_full_spec.md`);
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
          onView: prd
            ? () => setViewerData({ title: 'Product Requirements Document', content: prd.documentContent })
            : undefined,
        },
      },
    ];

    if (appFlowchart) {
      newNodes.push({
        id: '1.5',
        position: { x: 50, y: 200 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: '✅ Interactive Tree',
          onView: () =>
            setViewerData({
              title: 'Application Tree Flowchart',
              content: JSON.stringify(appFlowchart.nodes, null, 2),
            }),
        },
      });
    } else {
      newNodes.push({
        id: '1.5',
        position: { x: 50, y: 200 },
        type: 'actionNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: 'Tree Not Generated',
          buttonText: 'Generate Tree',
          onAction: generateFlowchart,
          isLoading: loadingFlowchart,
          progress: generationProgress,
          disabled: !prd,
        },
      });
    }

    if (project.agentsDocument) {
      newNodes.push({
        id: '1.8',
        position: { x: 300, y: 200 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: '✅ AGENTS.md',
          onView: () =>
            setViewerData({
              title: 'AGENTS.md Directive & Rules',
              content: project.agentsDocument,
            }),
        },
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
          label: '✅ Architecture ADR',
          onView: () =>
            setViewerData({ title: 'Architecture Decision Record', content: adr.adrDocument }),
        },
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
          disabled: !prd,
        },
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
          onView: () =>
            setViewerData({
              title: 'Database Schema & API Contract',
              content: `### Database Schema\n\n${schema.dbSchema}\n\n### API Contract\n\n${JSON.stringify(schema.apiContract, null, 2)}`,
            }),
        },
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
          disabled: !adr,
        },
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
          label: `✅ ${prompts.length} Atomic Prompts`,
          onView: () =>
            setViewerData({
              title: 'AI Atomic Prompts',
              content: effectivePromptMd,
            }),
        },
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
          disabled: !schema,
        },
      });
    }

    setNodes(newNodes);

    const newEdges: Edge[] = [
      { id: 'e1-1.5', source: '1', target: '1.5', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
      { id: 'e1.5-2', source: '1.5', target: '2', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
      { id: 'e2-3', source: '2', target: '3', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
      { id: 'e3-4', source: '3', target: '4', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
    ];

    if (project.agentsDocument) {
      newEdges.push({
        id: 'e1-1.8',
        source: '1',
        target: '1.8',
        type: 'default',
        style: { strokeWidth: 2, stroke: '#0000ff' },
      });
    }

    if (appFlowchart && appFlowchart.nodes) {
      const dagreGraph = layoutAppFlowchartDagre(appFlowchart);
      const startX = 600;
      const startY = 50;

      (appFlowchart.nodes || []).forEach((n: any) => {
        const nodeId = `appflow-${n.id}`;
        const dagreNode = dagreGraph.node(nodeId);

        newNodes.push({
          id: nodeId,
          position: { x: startX + (dagreNode?.x || 0) - 160, y: startY + (dagreNode?.y || 0) },
          type: 'promptNode',
          data: {
            label: n.label,
            onView: () => {
              const content = `Node: ${n.label}\nDescription: ${n.description || 'No description provided.'}`;
              setViewerData({ title: n.label, content });
            },
          },
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
          style: { strokeWidth: 2, stroke: '#050505', strokeDasharray: '4,4' },
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
          style: { strokeWidth: 2, stroke: '#e8be17' },
        });
      });

      setNodes([...newNodes]);
    }

    setEdges(newEdges);
  }, [
    project,
    prd,
    adr,
    schema,
    prompts,
    appFlowchart,
    loadingFlowchart,
    loadingAdr,
    loadingSchema,
    loadingPrompts,
    loadingAgents,
    generationProgress,
  ]);

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-brutal-white relative">
      {/* Top Workspace Tab Switcher Bar */}
      <div className="bg-brutal-white border-b-4 border-brutal-black px-3 py-2 sm:px-6 flex flex-wrap items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <button
            type="button"
            onClick={() => setActiveTab('tree')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs md:text-sm font-black uppercase border-2 border-brutal-black shadow-brutal-active transition-all ${
              activeTab === 'tree'
                ? 'bg-brutal-yellow text-brutal-black -translate-y-0.5'
                : 'bg-white hover:bg-gray-100 text-gray-800'
            }`}
          >
            <TreeStructure weight="bold" className="w-4 h-4" />
            <span>Interactive Tree</span>
            {appFlowchart && <span className="text-[10px] bg-brutal-black text-white px-1.5 py-0.2">✓</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prd')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs md:text-sm font-black uppercase border-2 border-brutal-black shadow-brutal-active transition-all ${
              activeTab === 'prd'
                ? 'bg-brutal-yellow text-brutal-black -translate-y-0.5'
                : 'bg-white hover:bg-gray-100 text-gray-800'
            }`}
          >
            <Article weight="bold" className="w-4 h-4" />
            <span>PRD</span>
            {prd && <span className="text-[10px] bg-brutal-black text-white px-1.5 py-0.2">✓</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('agents')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs md:text-sm font-black uppercase border-2 border-brutal-black shadow-brutal-active transition-all ${
              activeTab === 'agents'
                ? 'bg-brutal-yellow text-brutal-black -translate-y-0.5'
                : 'bg-white hover:bg-gray-100 text-gray-800'
            }`}
          >
            <Robot weight="bold" className="w-4 h-4 text-blue-600" />
            <span>AGENTS.md</span>
            {project.agentsDocument && <span className="text-[10px] bg-brutal-blue text-white px-1.5 py-0.2">✓</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs md:text-sm font-black uppercase border-2 border-brutal-black shadow-brutal-active transition-all ${
              activeTab === 'architecture'
                ? 'bg-brutal-yellow text-brutal-black -translate-y-0.5'
                : 'bg-white hover:bg-gray-100 text-gray-800'
            }`}
          >
            <Cpu weight="bold" className="w-4 h-4" />
            <span>Architecture & Schema</span>
            {adr && <span className="text-[10px] bg-brutal-black text-white px-1.5 py-0.2">✓</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('prompts')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs md:text-sm font-black uppercase border-2 border-brutal-black shadow-brutal-active transition-all ${
              activeTab === 'prompts'
                ? 'bg-brutal-yellow text-brutal-black -translate-y-0.5'
                : 'bg-white hover:bg-gray-100 text-gray-800'
            }`}
          >
            <Lightning weight="bold" className="w-4 h-4 text-amber-500" />
            <span>Prompt.md</span>
            {effectivePromptMd && <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.2">✓</span>}
          </button>
        </div>

        {/* Global Export Button */}
        <button
          type="button"
          onClick={handleExportAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brutal-black hover:bg-neutral-800 text-brutal-white font-mono text-xs font-bold uppercase border-2 border-brutal-black shadow-brutal-active transition-all cursor-pointer shrink-0"
          title="Download semua spesifikasi menjadi file Markdown lengkap"
        >
          <DownloadSimple weight="bold" className="w-4 h-4 text-brutal-yellow" />
          <span>Export All Specs (.md)</span>
        </button>
      </div>

      {/* Global Error Notice */}
      {error && (
        <div className="bg-brutal-red text-brutal-white font-mono font-bold text-xs p-3 border-b-4 border-brutal-black flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <WarningCircle weight="bold" className="w-5 h-5" />
            <span>Error: {error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="underline uppercase text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tab Content Area */}
      <div className="flex-1 w-full h-full overflow-hidden relative">
        {/* TAB 1: INTERACTIVE TREE */}
        {activeTab === 'tree' && (
          <div className="w-full h-full relative bg-[#e5e5f7]">
            {!appFlowchart && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-brutal-white border-4 border-brutal-black p-4 shadow-brutal flex items-center gap-4">
                <div>
                  <p className="font-sans font-black text-sm uppercase">Interactive Tree Belum Digenerate</p>
                  <p className="font-mono text-xs text-gray-600">Klik tombol untuk memetakan alur screen dan modul aplikasi.</p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={generateFlowchart}
                  disabled={loadingFlowchart}
                >
                  {loadingFlowchart ? `Membuat Tree (${Math.round(generationProgress)}%)...` : '⚡ Generate Tree Sekarang'}
                </Button>
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
          </div>
        )}

        {/* TAB 2: PRD */}
        {activeTab === 'prd' && (
          <div className="w-full h-full overflow-y-auto bg-[#f4f4f0] p-4 sm:p-6 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-4">
              <div className="bg-brutal-white border-4 border-brutal-black p-4 sm:p-6 shadow-brutal flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-sans font-black text-2xl uppercase tracking-tight text-brutal-black">
                    Product Requirements Document (PRD)
                  </h2>
                  <p className="font-mono text-xs text-gray-600 font-semibold mt-1">
                    Target: {prd?.targetUser || 'General User'} &bull; Monetization: {prd?.monetizationModel || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(prd?.documentContent || '', 'prd')}
                    className="gap-1.5"
                  >
                    {copiedKey === 'prd' ? <Check weight="bold" className="text-emerald-600" /> : <Copy weight="bold" />}
                    <span>{copiedKey === 'prd' ? 'Tersalin!' : 'Copy PRD'}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadFile(prd?.documentContent || '', `${project.name}_PRD.md`)}
                    className="gap-1.5"
                  >
                    <DownloadSimple weight="bold" />
                    <span>Download PRD.md</span>
                  </Button>
                </div>
              </div>

              <div className="bg-brutal-white border-4 border-brutal-black p-6 md:p-8 shadow-brutal font-mono text-sm leading-relaxed whitespace-pre-wrap selection:bg-brutal-yellow">
                {prd?.documentContent || 'PRD belum digenerate.'}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AGENTS.MD */}
        {activeTab === 'agents' && (
          <div className="w-full h-full overflow-y-auto bg-[#f4f4f0] p-4 sm:p-6 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-4">
              <div className="bg-brutal-white border-4 border-brutal-black p-4 sm:p-6 shadow-brutal flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-brutal-blue text-brutal-white px-2 py-0.5 font-mono text-xs font-bold uppercase border-2 border-brutal-black">
                      AI Pair Programmer Directive
                    </span>
                  </div>
                  <h2 className="font-sans font-black text-2xl uppercase tracking-tight text-brutal-black mt-1">
                    AGENTS.md (Pedoman & Guardrails)
                  </h2>
                  <p className="font-mono text-xs text-gray-600 font-semibold mt-0.5">
                    Petunjuk operasional coding untuk Cursor, Windsurf, Claude Code, Antigravity, dan Copilot.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generateAgents}
                    disabled={loadingAgents}
                    className="gap-1.5 !bg-brutal-yellow"
                  >
                    <ArrowClockwise weight="bold" className={loadingAgents ? 'animate-spin' : ''} />
                    <span>{loadingAgents ? 'Merumuskan AGENTS.md...' : project.agentsDocument ? 'Regenerate AGENTS.md' : 'Generate AGENTS.md'}</span>
                  </Button>
                  {project.agentsDocument && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(project.agentsDocument, 'agents')}
                        className="gap-1.5"
                      >
                        {copiedKey === 'agents' ? <Check weight="bold" className="text-emerald-600" /> : <Copy weight="bold" />}
                        <span>{copiedKey === 'agents' ? 'Tersalin!' : 'Copy AGENTS.md'}</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadFile(project.agentsDocument, 'AGENTS.md')}
                        className="gap-1.5"
                      >
                        <DownloadSimple weight="bold" />
                        <span>Download AGENTS.md</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {project.agentsDocument ? (
                <div className="bg-brutal-white border-4 border-brutal-black p-6 md:p-8 shadow-brutal font-mono text-sm leading-relaxed whitespace-pre-wrap selection:bg-brutal-yellow">
                  {project.agentsDocument}
                </div>
              ) : (
                <div className="bg-brutal-white border-4 border-brutal-black p-8 shadow-brutal text-center flex flex-col items-center gap-4">
                  <Robot weight="fill" className="w-16 h-16 text-blue-600 animate-pulse" />
                  <div>
                    <h3 className="font-sans font-black text-xl uppercase">AGENTS.md Belum Dibuat</h3>
                    <p className="font-mono text-sm text-gray-600 max-w-md mt-1">
                      Buat aturan standar coding, pencegah halusinasi, dan guardrails teknis untuk coding agent kamu.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={generateAgents}
                    disabled={loadingAgents}
                    className="!bg-brutal-yellow"
                  >
                    {loadingAgents ? `Generating AGENTS.md (${Math.round(generationProgress)}%)...` : '🤖 Buat AGENTS.md Sekarang'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ARCHITECTURE & SCHEMA */}
        {activeTab === 'architecture' && (
          <div className="w-full h-full overflow-y-auto bg-[#f4f4f0] p-4 sm:p-6 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-6">
              {/* Architecture Decision Record Header */}
              <div className="bg-brutal-white border-4 border-brutal-black p-4 sm:p-6 shadow-brutal flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-sans font-black text-2xl uppercase tracking-tight text-brutal-black">
                    Architecture & Tech Stack (ADR)
                  </h2>
                  <p className="font-mono text-xs text-gray-600 font-semibold mt-1">
                    Stack: {adr?.frontendStack || 'Next.js'} &bull; Backend: {adr?.backendStack || 'Node.js'} &bull; DB: {adr?.database || 'SQLite / PostgreSQL'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generateADR}
                    disabled={loadingAdr}
                    className="gap-1.5 !bg-brutal-yellow"
                  >
                    <ArrowClockwise weight="bold" className={loadingAdr ? 'animate-spin' : ''} />
                    <span>{loadingAdr ? 'Merancang ADR...' : adr ? 'Regenerate ADR' : 'Generate ADR'}</span>
                  </Button>
                  {adr?.adrDocument && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(adr.adrDocument, 'adr')}
                      className="gap-1.5"
                    >
                      {copiedKey === 'adr' ? <Check weight="bold" className="text-emerald-600" /> : <Copy weight="bold" />}
                      <span>{copiedKey === 'adr' ? 'Tersalin!' : 'Copy ADR'}</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* ADR Markdown */}
              {adr?.adrDocument && (
                <div className="bg-brutal-white border-4 border-brutal-black p-6 md:p-8 shadow-brutal font-mono text-sm leading-relaxed whitespace-pre-wrap">
                  {adr.adrDocument}
                </div>
              )}

              {/* Database Schema & API Contract Section */}
              <div className="bg-brutal-white border-4 border-brutal-black p-4 sm:p-6 shadow-brutal flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-sans font-black text-xl uppercase tracking-tight text-brutal-black">
                    Database Schema & API Contract
                  </h3>
                  <p className="font-mono text-xs text-gray-600 font-semibold mt-1">
                    Struktur tabel relasional dan spesifikasi endpoint API.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generateSchema}
                    disabled={loadingSchema || !adr}
                    className="gap-1.5 !bg-brutal-yellow"
                  >
                    <ArrowClockwise weight="bold" className={loadingSchema ? 'animate-spin' : ''} />
                    <span>{loadingSchema ? 'Merancang Schema...' : schema ? 'Regenerate Schema' : 'Generate Schema'}</span>
                  </Button>
                  {schema?.dbSchema && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(schema.dbSchema, 'schema')}
                      className="gap-1.5"
                    >
                      {copiedKey === 'schema' ? <Check weight="bold" className="text-emerald-600" /> : <Copy weight="bold" />}
                      <span>{copiedKey === 'schema' ? 'Tersalin!' : 'Copy Schema'}</span>
                    </Button>
                  )}
                </div>
              </div>

              {schema?.dbSchema ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-brutal-white border-4 border-brutal-black p-6 md:p-8 shadow-brutal font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {schema.dbSchema}
                  </div>
                  {schema.apiContract && (
                    <div className="bg-neutral-900 text-green-400 border-4 border-brutal-black p-6 shadow-brutal font-mono text-xs leading-relaxed overflow-x-auto">
                      <pre>{JSON.stringify(schema.apiContract, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-brutal-white border-4 border-brutal-black p-6 shadow-brutal text-center font-mono text-sm text-gray-500 font-bold">
                  Database Schema & API Contract belum digenerate.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PROMPT.MD */}
        {activeTab === 'prompts' && (
          <div className="w-full h-full overflow-y-auto bg-[#f4f4f0] p-4 sm:p-6 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-4">
              <div className="bg-brutal-white border-4 border-brutal-black p-4 sm:p-6 shadow-brutal flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-600 text-white px-2 py-0.5 font-mono text-xs font-bold uppercase border-2 border-brutal-black">
                      Sequential Coding Plan
                    </span>
                    <span className="font-mono text-xs font-bold text-gray-500">
                      {prompts.length > 0 ? `${prompts.length} Atomic Steps` : 'Master Prompt Mode'}
                    </span>
                  </div>
                  <h2 className="font-sans font-black text-2xl uppercase tracking-tight text-brutal-black mt-1">
                    Master Prompt.md
                  </h2>
                  <p className="font-mono text-xs text-gray-600 font-semibold mt-0.5">
                    Prompt step-by-step siap di-copy langsung ke terminal atau editor AI untuk eksekusi kode.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generatePrompts}
                    disabled={loadingPrompts || !schema}
                    className="gap-1.5 !bg-brutal-yellow"
                  >
                    <ArrowClockwise weight="bold" className={loadingPrompts ? 'animate-spin' : ''} />
                    <span>{loadingPrompts ? 'Membuat Atomic Prompts...' : prompts.length > 0 ? 'Regenerate Prompts' : 'Generate Atomic Prompts'}</span>
                  </Button>
                  {effectivePromptMd && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(effectivePromptMd, 'prompt')}
                        className="gap-1.5"
                      >
                        {copiedKey === 'prompt' ? <Check weight="bold" className="text-emerald-600" /> : <Copy weight="bold" />}
                        <span>{copiedKey === 'prompt' ? 'Tersalin!' : 'Copy Prompt.md'}</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadFile(effectivePromptMd, 'Prompt.md')}
                        className="gap-1.5"
                      >
                        <DownloadSimple weight="bold" />
                        <span>Download Prompt.md</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {effectivePromptMd ? (
                <div className="bg-brutal-white border-4 border-brutal-black p-6 md:p-8 shadow-brutal font-mono text-sm leading-relaxed whitespace-pre-wrap selection:bg-brutal-yellow">
                  {effectivePromptMd}
                </div>
              ) : (
                <div className="bg-brutal-white border-4 border-brutal-black p-8 shadow-brutal text-center flex flex-col items-center gap-4">
                  <Lightning weight="fill" className="w-16 h-16 text-amber-500 animate-bounce" />
                  <div>
                    <h3 className="font-sans font-black text-xl uppercase">Atomic Prompts Belum Dibuat</h3>
                    <p className="font-mono text-sm text-gray-600 max-w-md mt-1">
                      Pecah implementasi sistem ke dalam rangkaian prompt atomik berurutan untuk AI Coder.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={generatePrompts}
                    disabled={loadingPrompts || !schema}
                    className="!bg-brutal-yellow"
                  >
                    {loadingPrompts ? `Generating Prompts (${Math.round(generationProgress)}%)...` : '⚡ Buat Atomic Prompts'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Popup Viewer when clicking nodes in ReactFlow */}
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
