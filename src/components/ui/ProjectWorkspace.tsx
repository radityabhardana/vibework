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
import { useLanguage } from '@/context/LanguageContext';
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

const hasMeaningfulText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const getGenerationErrorMessage = async (res: Response, fallback: string, timeoutMessage: string) => {
  if (res.status === 504) {
    return timeoutMessage;
  }

  const body: unknown = await res.json().catch(() => null);
  if (
    typeof body === 'object'
    && body !== null
    && 'error' in body
    && typeof body.error === 'string'
    && body.error.trim().length > 0
  ) {
    return body.error;
  }

  return fallback;
};

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
  const { t } = useLanguage();

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
  const [promptsInvalidatedBySchema, setPromptsInvalidatedBySchema] = useState(false);

  const schemaReady = hasMeaningfulText(schema?.dbSchema);
  const schemaContent = schemaReady ? schema.dbSchema.trim() : '';
  const hasAtomicPrompts = Array.isArray(prompts) && prompts.length > 0;
  const promptsReady = schemaReady && hasAtomicPrompts && !loadingSchema && !promptsInvalidatedBySchema;
  const schemaOrPromptsBusy = loadingSchema || loadingPrompts;

  useEffect(() => {
    if (promptsInvalidatedBySchema && prompts.length === 0) {
      setPromptsInvalidatedBySchema(false);
    }
  }, [prompts.length, promptsInvalidatedBySchema]);

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
    if (schemaOrPromptsBusy) return;

    setLoadingSchema(true);
    setError(null);
    try {
      const res = await fetch('/api/projects/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (!res.ok) {
        throw new Error(await getGenerationErrorMessage(res, t('Schema gagal dibuat. Silakan coba lagi.', 'Unable to generate the schema. Please try again.'), t('Generasi timeout. Silakan coba lagi.', 'Generation timed out. Please try again.')));
      }
      setPromptsInvalidatedBySchema(true);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingSchema(false);
    }
  };

  const generatePrompts = async () => {
    if (schemaOrPromptsBusy) return;

    setLoadingPrompts(true);
    setError(null);
    try {
      const res = await fetch('/api/projects/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      if (!res.ok) {
        throw new Error(await getGenerationErrorMessage(res, t('Prompt gagal dibuat. Silakan coba lagi.', 'Unable to generate prompts. Please try again.'), t('Generasi timeout. Silakan coba lagi.', 'Generation timed out. Please try again.')));
      }
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
  const generatedPromptMd = hasAtomicPrompts
      ? prompts
          .map(
            (p: any) =>
              `# PROMPT ${p.executionOrder}: ${p.title}\n\n**Context:** ${p.context}\n**Task:** ${p.task}\n**Constraints:** ${p.constraints}\n**Format:** ${p.format}\n**Dependencies:** ${(p.dependencies || []).join(', ')}\n`
          )
          .join('\n---\n\n')
      : '';
  const effectivePromptMd = promptsReady
    ? (hasMeaningfulText(project.promptDocument) ? project.promptDocument : generatedPromptMd)
    : '';

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

    if (schemaReady) {
      bundle += `\n\n==================================================\n# 4. DATABASE SCHEMA & API CONTRACT\n==================================================\n\n${schemaContent}\n`;
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
          label: prd ? `✅ PRD` : `PRD: ${t('Menunggu', 'Pending')}`,
          onView: prd
            ? () => setViewerData({ title: t('Product Requirements Document', 'Product Requirements Document'), content: prd.documentContent })
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
              title: t('Application Tree Flowchart', 'Application Tree Flowchart'),
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
          label: t('Tree Not Generated', 'Tree Not Generated'),
          buttonText: t('Generate Tree', 'Generate Tree'),
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
              title: t('AGENTS.md Directive & Rules', 'AGENTS.md Directive & Rules'),
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
            setViewerData({ title: t('Architecture Decision Record', 'Architecture Decision Record'), content: adr.adrDocument }),
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
          label: t('Architecture Not Generated', 'Architecture Not Generated'),
          buttonText: t('Generate ADR', 'Generate ADR'),
          onAction: generateADR,
          isLoading: loadingAdr,
          progress: generationProgress,
          disabled: !prd,
        },
      });
    }

    if (schemaReady) {
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
              title: t('Database Schema & API Contract', 'Database Schema & API Contract'),
              content: `### Database Schema\n\n${schemaContent}\n\n### API Contract\n\n${JSON.stringify(schema.apiContract, null, 2)}`,
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
          label: t('Database Schema Not Generated', 'Database Schema Not Generated'),
          buttonText: t('Generate Schema', 'Generate Schema'),
          onAction: generateSchema,
          isLoading: loadingSchema,
          progress: generationProgress,
          disabled: !adr || schemaOrPromptsBusy,
        },
      });
    }

    if (promptsReady) {
      newNodes.push({
        id: '4',
        position: { x: 50, y: 650 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: `✅ ${prompts.length} ${t('Atomic Prompts', 'Atomic Prompts')}`,
          onView: () =>
            setViewerData({
              title: t('AI Atomic Prompts', 'AI Atomic Prompts'),
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
          label: t('AI Prompts Not Generated', 'AI Prompts Not Generated'),
          buttonText: t('Generate Prompts', 'Generate Prompts'),
          onAction: generatePrompts,
          isLoading: loadingPrompts,
          progress: generationProgress,
          disabled: !schemaReady || schemaOrPromptsBusy,
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
        style: { strokeWidth: 2, stroke: 'rgba(255, 255, 255, 0.5)' },
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
              const content = `${t('Node:', 'Node:')} ${n.label}\n${t('Description:', 'Description:')} ${n.description || t('No description provided.', 'No description provided.')}`;
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
          style: { strokeWidth: 2, stroke: 'rgba(255, 255, 255, 0.4)' },
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
    schemaReady,
    schemaContent,
    promptsReady,
    schemaOrPromptsBusy,
    t,
  ]);

  // Artifact tabs — numbering (01–05) replaces per-type color coding
  const TABS: { id: WorkspaceTab; num: string; label: string; icon: typeof TreeStructure; ready: boolean }[] = [
    { id: 'tree', num: '01', label: t('Interactive Tree', 'Interactive Tree'), icon: TreeStructure, ready: !!appFlowchart },
    { id: 'prd', num: '02', label: t('PRD', 'PRD'), icon: Article, ready: !!prd },
    { id: 'agents', num: '03', label: t('AGENTS.md', 'AGENTS.md'), icon: Robot, ready: !!project.agentsDocument },
    { id: 'architecture', num: '04', label: t('Arsitektur & Schema', 'Architecture & Schema'), icon: Cpu, ready: !!adr && schemaReady },
    { id: 'prompts', num: '05', label: t('Prompt.md', 'Prompt.md'), icon: Lightning, ready: promptsReady },
  ];

  return (
    <div className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[#0b0d0f] text-white relative">
      {/* Top Workspace Tab Switcher Bar */}
      <div className="bg-[#0f1314] border-b border-white/[0.08] px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        <div className="hidden xl:block min-w-0 pr-3">
          <p className="truncate font-sans text-sm font-semibold text-white">{project.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{TABS.filter(tab => tab.ready).length}/5 {project.status || t('Workspace', 'Workspace')}</p>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
          {TABS.map(({ id, num, label, icon: TabIcon, ready }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs font-medium border transition-all duration-300 cursor-pointer ${
                activeTab === id
                  ? 'bg-[var(--accent)] text-[#102016] border-transparent shadow-sm'
                  : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.04] border-transparent'
              }`}
            >
              <TabIcon weight="bold" className="w-4 h-4" />
              <span className="hidden lg:inline">{num}</span>
              <span>{label}</span>
              {ready && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === id ? 'bg-black/10 text-black' : 'bg-white/10 text-white'}`}>✓</span>
              )}
            </button>
          ))}
        </div>

        {/* Global Export Button */}
        <button
          type="button"
          onClick={handleExportAll}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04] ring ring-white/30 hover:bg-white/10 text-white font-mono text-xs font-medium rounded-lg transition-all duration-300 cursor-pointer shrink-0"
          title={t('Download semua spesifikasi menjadi file Markdown lengkap', 'Download all specifications as a complete Markdown file')}
        >
          <DownloadSimple weight="bold" className="w-3.5 h-3.5" />
          <span>{t('Export All Specs (.md)', 'Export All Specs (.md)')}</span>
        </button>
      </div>

      {/* Global Error Notice */}
      {error && (
        <div className="bg-rose-950/80 text-rose-200 border-b border-rose-500/30 font-sans text-xs p-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <WarningCircle weight="bold" className="w-4 h-4 text-rose-400" />
            <span>{t('Error:', 'Error:')} {error}</span>
          </div>
          <button type="button" onClick={() => setError(null)} className="underline uppercase text-[10px] font-semibold text-rose-300 hover:text-rose-100">
            {t('Tutup', 'Dismiss')}
          </button>
        </div>
      )}

      {/* Main Tab Content Area */}
      <div className="flex-1 w-full h-full overflow-hidden relative">
        {/* TAB 1: INTERACTIVE TREE */}
        {activeTab === 'tree' && (
          <div className="w-full h-full relative bg-background bg-dot-grid">
            {!appFlowchart && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#14191a]/95 border border-white/15 p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-[calc(100%-2rem)]">
                <div>
                  <p className="font-sans font-semibold text-sm text-zinc-100">{t('Interactive Tree Belum Digenerate', 'Interactive Tree Not Generated')}</p>
                  <p className="font-sans text-xs text-zinc-400">{t('Klik tombol untuk memetakan alur screen dan modul aplikasi.', 'Click the button to map application screens and modules.')}</p>
                  {!prd && <p className="mt-1 font-mono text-[10px] text-amber-200">{t('PRD perlu dibuat lebih dulu untuk membuka langkah ini.', 'The PRD must be created first to unlock this step.')}</p>}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={generateFlowchart}
                  disabled={loadingFlowchart}
                >
                  {loadingFlowchart ? `${t('Membuat Tree', 'Creating Tree')} (${Math.round(generationProgress)}%)...` : t('Generate Tree Sekarang', 'Generate Tree Now')}
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
              <Controls className="!border !border-white/10 !rounded-lg !shadow-xl !bg-zinc-900/90 !text-zinc-200 [&>button]:!border-b [&>button]:!border-white/10 [&>button]:!bg-transparent [&>button]:hover:!bg-white/[0.08] [&>button]:!text-zinc-200 [&>button:last-child]:!border-b-0" />
              <MiniMap className="!border !border-white/10 !rounded-lg !shadow-xl !bg-zinc-900/90" nodeColor="#3f3f46" maskColor="rgba(9, 9, 11, 0.7)" />
              <Background gap={24} size={1.5} color="rgba(255, 255, 255, 0.08)" />
            </ReactFlow>
          </div>
        )}

        {/* TAB 2: PRD */}
        {activeTab === 'prd' && (
          <div className="w-full h-full overflow-y-auto bg-background p-4 md:p-6 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-4">
              <div className="bg-zinc-900/80 border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-sans font-bold text-xl text-zinc-100">
                    {t('Product Requirements Document (PRD)', 'Product Requirements Document (PRD)')}
                  </h2>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    {t('Target:', 'Target:')} {prd?.targetUser || t('General User', 'General User')} &bull; {t('Monetisasi:', 'Monetization:')} {prd?.monetizationModel || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(prd?.documentContent || '', 'prd')}
                    className="gap-1.5 text-xs"
                  >
                    {copiedKey === 'prd' ? <Check weight="bold" className="text-emerald-400" /> : <Copy weight="bold" />}
                    <span>{copiedKey === 'prd' ? t('Tersalin!', 'Copied!') : t('Copy PRD', 'Copy PRD')}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadFile(prd?.documentContent || '', `${project.name}_PRD.md`)}
                    className="gap-1.5 text-xs"
                  >
                    <DownloadSimple weight="bold" />
                    <span>{t('Download PRD.md', 'Download PRD.md')}</span>
                  </Button>
                </div>
              </div>

              <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {prd?.documentContent || t('PRD belum digenerate.', 'PRD has not been generated yet.')}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AGENTS.MD */}
        {activeTab === 'agents' && (
          <div className="w-full h-full overflow-y-auto bg-background p-4 md:p-6 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-4">
              <div className="bg-zinc-900/80 border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-white/5 text-zinc-400 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] rounded-full border border-white/10">
                      {t('AI Pair Programmer Directive', 'AI Pair Programmer Directive')}
                    </span>
                  </div>
                  <h2 className="font-sans font-bold text-xl text-zinc-100">
                    {t('AGENTS.md (Pedoman & Guardrails)', 'AGENTS.md (Guidelines & Guardrails)')}
                  </h2>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    {t('Petunjuk operasional coding untuk Cursor, Windsurf, Claude Code, Antigravity, dan Copilot.', 'Operational coding guidance for Cursor, Windsurf, Claude Code, Antigravity, and Copilot.')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generateAgents}
                    disabled={loadingAgents}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowClockwise weight="bold" className={loadingAgents ? 'animate-spin' : ''} />
                    <span>{loadingAgents ? t('Merumuskan AGENTS.md...', 'Drafting AGENTS.md...') : project.agentsDocument ? t('Regenerate AGENTS.md', 'Regenerate AGENTS.md') : t('Generate AGENTS.md', 'Generate AGENTS.md')}</span>
                  </Button>
                  {project.agentsDocument && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(project.agentsDocument, 'agents')}
                        className="gap-1.5 text-xs"
                      >
                        {copiedKey === 'agents' ? <Check weight="bold" className="text-emerald-400" /> : <Copy weight="bold" />}
                        <span>{copiedKey === 'agents' ? t('Tersalin!', 'Copied!') : t('Copy AGENTS.md', 'Copy AGENTS.md')}</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadFile(project.agentsDocument, 'AGENTS.md')}
                        className="gap-1.5 text-xs"
                      >
                        <DownloadSimple weight="bold" />
                        <span>{t('Download AGENTS.md', 'Download AGENTS.md')}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {project.agentsDocument ? (
                <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {project.agentsDocument}
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-dashed border-white/10 rounded-2xl p-6 text-center flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
                    <Robot weight="duotone" className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-lg text-zinc-100">{t('AGENTS.md Belum Dibuat', 'AGENTS.md Has Not Been Created')}</h3>
                    <p className="font-sans text-xs text-zinc-400 max-w-md mt-1">
                      {t('Buat aturan standar coding, pencegah halusinasi, dan guardrails teknis untuk coding agent kamu.', 'Create standard coding rules, hallucination prevention, and technical guardrails for your coding agent.')}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generateAgents}
                    disabled={loadingAgents}
                  >
                    {loadingAgents ? `${t('Generating AGENTS.md', 'Generating AGENTS.md')} (${Math.round(generationProgress)}%)...` : t('Buat AGENTS.md Sekarang', 'Create AGENTS.md Now')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ARCHITECTURE & SCHEMA */}
        {activeTab === 'architecture' && (
          <div className="w-full h-full overflow-y-auto bg-background p-4 md:p-6 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-4">
              {/* Architecture Decision Record Header */}
              <div className="bg-zinc-900/80 border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-sans font-bold text-xl text-zinc-100">
                    {t('Architecture & Tech Stack (ADR)', 'Architecture & Tech Stack (ADR)')}
                  </h2>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    {t('Stack:', 'Stack:')} {adr?.frontendStack || 'Next.js'} &bull; {t('Backend:', 'Backend:')} {adr?.backendStack || 'Node.js'} &bull; {t('DB:', 'DB:')} {adr?.database || 'SQLite / PostgreSQL'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generateADR}
                    disabled={loadingAdr}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowClockwise weight="bold" className={loadingAdr ? 'animate-spin' : ''} />
                    <span>{loadingAdr ? t('Merancang ADR...', 'Designing ADR...') : adr ? t('Regenerate ADR', 'Regenerate ADR') : t('Generate ADR', 'Generate ADR')}</span>
                  </Button>
                  {adr?.adrDocument && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(adr.adrDocument, 'adr')}
                      className="gap-1.5 text-xs"
                    >
                      {copiedKey === 'adr' ? <Check weight="bold" className="text-emerald-400" /> : <Copy weight="bold" />}
                      <span>{copiedKey === 'adr' ? t('Tersalin!', 'Copied!') : t('Copy ADR', 'Copy ADR')}</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* ADR Markdown */}
              {adr?.adrDocument && (
                <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {adr.adrDocument}
                </div>
              )}

              {/* Database Schema & API Contract Section */}
              <div className="bg-zinc-900/80 border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-sans font-bold text-lg text-zinc-100">
                    {t('Database Schema & API Contract', 'Database Schema & API Contract')}
                  </h3>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    {t('Struktur tabel relasional dan spesifikasi endpoint API.', 'Relational table structure and API endpoint specifications.')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generateSchema}
                    disabled={schemaOrPromptsBusy || !adr}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowClockwise weight="bold" className={loadingSchema ? 'animate-spin' : ''} />
                    <span>{loadingSchema ? t('Merancang Schema...', 'Designing Schema...') : schemaReady ? t('Regenerate Schema', 'Regenerate Schema') : t('Generate Schema', 'Generate Schema')}</span>
                  </Button>
                  {schemaReady && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(schemaContent, 'schema')}
                      className="gap-1.5 text-xs"
                    >
                      {copiedKey === 'schema' ? <Check weight="bold" className="text-emerald-400" /> : <Copy weight="bold" />}
                      <span>{copiedKey === 'schema' ? t('Tersalin!', 'Copied!') : t('Copy Schema', 'Copy Schema')}</span>
                    </Button>
                  )}
                </div>
              </div>

              {schemaReady ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {schemaContent}
                  </div>
                  {schema.apiContract && (
                    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto">
                      <pre>{JSON.stringify(schema.apiContract, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-dashed border-white/10 rounded-2xl p-6 text-center font-sans text-xs text-zinc-500">
                  {t('Database Schema & API Contract belum digenerate.', 'Database Schema & API Contract has not been generated yet.')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PROMPT.MD */}
        {activeTab === 'prompts' && (
          <div className="w-full h-full overflow-y-auto bg-background p-4 md:p-6 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-4">
              <div className="bg-zinc-900/80 border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-white/5 text-zinc-400 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] rounded-full border border-white/10">
                      {t('Sequential Coding Plan', 'Sequential Coding Plan')}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">
                      {promptsReady ? `${prompts.length} ${t('Langkah Atomik', 'Atomic Steps')}` : t('Mode Master Prompt', 'Master Prompt Mode')}
                    </span>
                  </div>
                  <h2 className="font-sans font-bold text-xl text-zinc-100">
                    {t('Master Prompt.md', 'Master Prompt.md')}
                  </h2>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    {t('Prompt step-by-step siap di-copy langsung ke terminal atau editor AI untuk eksekusi kode.', 'Step-by-step prompts ready to copy into a terminal or AI editor for code execution.')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generatePrompts}
                    disabled={schemaOrPromptsBusy || !schemaReady}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowClockwise weight="bold" className={loadingPrompts ? 'animate-spin' : ''} />
                    <span>{loadingPrompts ? t('Membuat Atomic Prompts...', 'Creating Atomic Prompts...') : promptsReady ? t('Regenerate Prompts', 'Regenerate Prompts') : t('Generate Atomic Prompts', 'Generate Atomic Prompts')}</span>
                  </Button>
                  {effectivePromptMd && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(effectivePromptMd, 'prompt')}
                        className="gap-1.5 text-xs"
                      >
                        {copiedKey === 'prompt' ? <Check weight="bold" className="text-emerald-400" /> : <Copy weight="bold" />}
                        <span>{copiedKey === 'prompt' ? t('Tersalin!', 'Copied!') : t('Copy Prompt.md', 'Copy Prompt.md')}</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadFile(effectivePromptMd, 'Prompt.md')}
                        className="gap-1.5 text-xs"
                      >
                        <DownloadSimple weight="bold" />
                        <span>{t('Download Prompt.md', 'Download Prompt.md')}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {effectivePromptMd ? (
                <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {effectivePromptMd}
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-dashed border-white/10 rounded-2xl p-6 text-center flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
                    <Lightning weight="duotone" className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-lg text-zinc-100">{t('Atomic Prompts Belum Dibuat', 'Atomic Prompts Have Not Been Created')}</h3>
                    <p className="font-sans text-xs text-zinc-400 max-w-md mt-1">
                      {t('Pecah implementasi sistem ke dalam rangkaian prompt atomik berurutan untuk AI Coder.', 'Break the system implementation into a sequence of atomic prompts for an AI Coder.')}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generatePrompts}
                    disabled={schemaOrPromptsBusy || !schemaReady}
                  >
                    {loadingPrompts ? `${t('Generating Prompts', 'Generating Prompts')} (${Math.round(generationProgress)}%)...` : t('Buat Atomic Prompts', 'Create Atomic Prompts')}
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
