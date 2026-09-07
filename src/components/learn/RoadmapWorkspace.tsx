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
  Handle,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { LearningDrawer } from '@/components/learn/LearningDrawer';
import { useRouter } from 'next/navigation';
import { CheckCircle, Lightning, LockSimple } from '@phosphor-icons/react';

// Custom Section Milestone Node (Spine Center)
const SectionMilestoneNode = ({ data }: { data: any }) => {
  return (
    <div className="group relative">
      <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 via-white/10 to-white/20 rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition duration-300" />
      <div className="relative bg-[#0d0d12] border border-white/15 px-8 py-3.5 min-w-[280px] rounded-xl shadow-2xl text-center flex items-center justify-center gap-2.5">
        <Handle type="target" position={Position.Top} className="!bg-zinc-400 !w-2.5 !h-2.5 !border-none" />
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-semibold text-sm uppercase tracking-wider text-white">
          {data.label}
        </span>
        <Handle type="source" position={Position.Bottom} className="!bg-zinc-400 !w-2.5 !h-2.5 !border-none" />
      </div>
    </div>
  );
};

// Custom Topic Group Box Node (Left / Right Cards)
const TopicGroupNode = ({ data }: { data: any }) => {
  const masteredCount = data.topics.filter((t: any) => t.status === 'mastered').length;
  const isAllMastered = masteredCount === data.topics.length && data.topics.length > 0;

  return (
    <div className="w-80 rounded-2xl bg-zinc-900/60 p-0.5 ring-1 ring-white/10 shadow-2xl backdrop-blur-md">
      <div className="bg-[#09090c]/95 rounded-[14px] p-4 flex flex-col gap-3 border border-white/5">
        <Handle
          type="target"
          position={data.side === 'left' ? Position.Right : Position.Left}
          className="!bg-zinc-400 !w-2.5 !h-2.5 !border-none"
        />

        {/* Group Title Header */}
        <div className="border-b border-white/10 pb-2.5 flex justify-between items-center">
          <h4 className="font-medium text-xs text-zinc-200 tracking-wide uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            {data.groupName}
          </h4>
          <span className={`font-mono text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            isAllMastered
              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20'
              : 'bg-white/5 text-zinc-400 border-white/10'
          }`}>
            {masteredCount}/{data.topics.length} Done
          </span>
        </div>

        {/* List of Topic Pills */}
        <div className="flex flex-col gap-1.5">
          {data.topics.map((topic: any) => {
            const isMastered = topic.status === 'mastered';
            const isUnlocked = topic.status === 'unlocked';
            const isLocked = topic.status === 'locked';

            let pillStyle = 'bg-white/[0.02] border-white/5 text-zinc-500 opacity-60 cursor-not-allowed';
            let icon = <LockSimple weight="bold" className="w-3.5 h-3.5 text-zinc-600 shrink-0" />;

            if (isMastered) {
              pillStyle = 'bg-emerald-950/25 border-emerald-500/25 text-emerald-300 hover:bg-emerald-950/40 hover:border-emerald-500/40 cursor-pointer shadow-sm';
              icon = <CheckCircle weight="fill" className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
            } else if (isUnlocked) {
              pillStyle = 'bg-white/[0.06] border-white/20 text-white hover:bg-white/[0.12] hover:border-white/30 cursor-pointer shadow-sm';
              icon = <Lightning weight="fill" className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
            }

            return (
              <div
                key={topic.nodeId}
                onClick={() => {
                  data.onTopicClick(topic);
                }}
                className={`p-2.5 rounded-lg border flex items-center justify-between text-xs transition-all ${pillStyle}`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  {icon}
                  <span className="font-medium truncate">{topic.title}</span>
                </div>
                <span className="text-[10px] font-mono opacity-60 shrink-0 ml-1">
                  {isMastered ? 'Mastered' : isUnlocked ? 'Learn' : 'Locked'}
                </span>
              </div>
            );
          })}
        </div>

        <Handle
          type="source"
          position={data.side === 'left' ? Position.Right : Position.Left}
          className="!bg-zinc-400 !w-2.5 !h-2.5 !border-none"
        />
      </div>
    </div>
  );
};

// Fallback Flat Node
const FlatNodeComponent = ({ data }: { data: any }) => {
  const isMastered = data.status === 'mastered';
  const isUnlocked = data.status === 'unlocked';
  const isLocked = data.status === 'locked';

  let borderStyle = 'border-white/10 bg-[#09090c]/90 opacity-60';
  let badgeStyle = 'bg-white/5 text-zinc-500 border-white/10';

  if (isMastered) {
    borderStyle = 'border-emerald-500/30 bg-[#09090c] hover:border-emerald-500/50 cursor-pointer shadow-lg';
    badgeStyle = 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30';
  } else if (isUnlocked) {
    borderStyle = 'border-white/25 bg-[#0e0e13] hover:border-white/40 cursor-pointer shadow-xl';
    badgeStyle = 'bg-white/10 text-white border-white/20';
  }

  return (
    <div
      onClick={data.onClick}
      className={`rounded-xl border p-4 w-72 transition-all backdrop-blur-md ${borderStyle}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-400 !w-2.5 !h-2.5 !border-none" />
      <div className="flex justify-between items-center mb-2">
        <span className={`text-[10px] font-mono font-medium uppercase px-2 py-0.5 rounded-full border ${badgeStyle}`}>
          {isMastered ? '✓ MASTERED' : isUnlocked ? '⚡ UNLOCKED' : '🔒 LOCKED'}
        </span>
      </div>

      <h3 className="font-semibold text-sm text-white tracking-tight mb-1">
        {data.title}
      </h3>
      <p className="font-mono text-xs text-zinc-400 line-clamp-2">{data.description}</p>

      <div className="mt-3 text-[10px] font-mono font-medium uppercase text-right text-zinc-400">
        {isLocked ? 'Complete Prereqs' : 'Click to Learn & Quiz →'}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-400 !w-2.5 !h-2.5 !border-none" />
    </div>
  );
};

const nodeTypes = {
  sectionMilestone: SectionMilestoneNode,
  topicGroup: TopicGroupNode,
  flatNode: FlatNodeComponent,
};

export function RoadmapWorkspace({ roadmap, initialNodes }: { roadmap: any; initialNodes: any[] }) {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const layoutRoadmapSh = (dbNodes: any[]) => {
    // Check if nodes contain category JSON metadata for section & group
    let hasSections = false;
    const sectionMap = new Map<string, Map<string, { side: string; topics: any[] }>>();

    dbNodes.forEach(n => {
      let meta: any = null;
      try {
        if (n.category && typeof n.category === 'string' && n.category.startsWith('{')) {
          meta = JSON.parse(n.category);
        }
      } catch (e) {}

      if (meta && meta.sectionName) {
        hasSections = true;
        const secName = meta.sectionName;
        const grpName = meta.groupName || 'General Topics';
        const side = meta.side || 'left';

        if (!sectionMap.has(secName)) {
          sectionMap.set(secName, new Map());
        }

        const grpMap = sectionMap.get(secName)!;
        if (!grpMap.has(grpName)) {
          grpMap.set(grpName, { side, topics: [] });
        }

        grpMap.get(grpName)!.topics.push({
          dbNodeId: n.id,
          nodeId: n.nodeId,
          title: n.title,
          description: n.description,
          category: meta.category || 'required',
          status: n.status,
          contentMarkdown: n.contentMarkdown,
          quizData: n.quizData,
          prerequisites: n.prerequisites,
        });
      }
    });

    if (hasSections) {
      // Build roadmap.sh layout with central spine and left/right branching groups
      const formattedNodes: Node[] = [];
      const formattedEdges: Edge[] = [];

      let currentY = 50;
      let prevSectionNodeId: string | null = null;
      let secCounter = 0;

      sectionMap.forEach((groupsMap, secName) => {
        secCounter++;
        const secNodeId = `section-${secCounter}`;

        // 1. Add Section Milestone Node on Central Spine (x: 0)
        formattedNodes.push({
          id: secNodeId,
          position: { x: 0, y: currentY },
          type: 'sectionMilestone',
          data: { label: secName },
        });

        if (prevSectionNodeId) {
          formattedEdges.push({
            id: `edge-spine-${prevSectionNodeId}-${secNodeId}`,
            source: prevSectionNodeId,
            target: secNodeId,
            type: 'default',
            style: { strokeWidth: 2, stroke: '#52525b' },
          });
        }
        prevSectionNodeId = secNodeId;

        // 2. Add Group Nodes to Left (x: -420) and Right (x: 420)
        let grpCounter = 0;
        let leftY = currentY + 80;
        let rightY = currentY + 80;

        groupsMap.forEach((grpData, grpName) => {
          grpCounter++;
          const grpNodeId = `group-${secCounter}-${grpCounter}`;
          const isLeft = grpData.side === 'left' || grpCounter % 2 === 1;
          const posX = isLeft ? -440 : 440;
          const posY = isLeft ? leftY : rightY;

          if (isLeft) leftY += 240 + grpData.topics.length * 35;
          else rightY += 240 + grpData.topics.length * 35;

          formattedNodes.push({
            id: grpNodeId,
            position: { x: posX, y: posY },
            type: 'topicGroup',
            data: {
              groupName: grpName,
              side: isLeft ? 'left' : 'right',
              topics: grpData.topics,
              onTopicClick: (topic: any) => setSelectedNode(topic),
            },
          });

          // Connect group node to Section Milestone
          formattedEdges.push({
            id: `edge-group-${secNodeId}-${grpNodeId}`,
            source: secNodeId,
            target: grpNodeId,
            type: 'default',
            style: { strokeWidth: 1.5, stroke: '#6366f1', strokeDasharray: '4,4' },
          });
        });

        currentY = Math.max(leftY, rightY) + 100;
      });

      setNodes(formattedNodes);
      setEdges(formattedEdges);
      return;
    }

    // Fallback: Dagre Graph Layout for flat list of nodes
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', ranksep: 120, nodesep: 80 });
    g.setDefaultEdgeLabel(() => ({}));

    dbNodes.forEach(n => {
      g.setNode(n.nodeId, { width: 300, height: 120 });
    });

    dbNodes.forEach(n => {
      const prereqs = (n.prerequisites as string[]) || [];
      prereqs.forEach(p => {
        g.setEdge(p, n.nodeId);
      });
    });

    dagre.layout(g);

    const formattedNodes: Node[] = dbNodes.map(n => {
      const dagreNode = g.node(n.nodeId);
      return {
        id: n.nodeId,
        position: { x: (dagreNode?.x || 0) - 150, y: dagreNode?.y || 0 },
        type: 'flatNode',
        data: {
          title: n.title,
          description: n.description,
          status: n.status,
          onClick: () => setSelectedNode({
            dbNodeId: n.id,
            nodeId: n.nodeId,
            title: n.title,
            description: n.description,
            category: n.category,
            status: n.status,
            contentMarkdown: n.contentMarkdown,
            quizData: n.quizData,
          }),
        },
      };
    });

    const formattedEdges: Edge[] = [];
    dbNodes.forEach(n => {
      const prereqs = (n.prerequisites as string[]) || [];
      prereqs.forEach((p, idx) => {
        formattedEdges.push({
          id: `edge-${p}-${n.nodeId}-${idx}`,
          source: p,
          target: n.nodeId,
          type: 'default',
          style: { strokeWidth: 2, stroke: n.status === 'mastered' ? '#10b981' : '#3f3f46' },
        });
      });
    });

    setNodes(formattedNodes);
    setEdges(formattedEdges);
  };

  useEffect(() => {
    layoutRoadmapSh(initialNodes);
  }, [initialNodes]);

  return (
    <div className="flex-1 w-full h-full relative bg-[#030303]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.15}
      >
        <Controls className="!border !border-white/10 !rounded-xl !bg-[#0b0b0e] !shadow-2xl overflow-hidden [&_button]:!bg-[#0b0b0e] [&_button]:!border-b [&_button]:!border-white/10 [&_button]:!fill-zinc-300 [&_button]:!text-zinc-300 hover:[&_button]:!bg-white/10" />
        <MiniMap className="!border !border-white/10 !rounded-xl !bg-[#08080b]/90 !shadow-2xl overflow-hidden" nodeColor="#3f3f46" maskColor="rgba(3, 3, 3, 0.75)" />
        <Background gap={24} size={1.5} color="#ffffff15" />
      </ReactFlow>

      {selectedNode && (
        <LearningDrawer
          node={selectedNode}
          roadmapId={roadmap.id}
          onClose={() => setSelectedNode(null)}
          onQuizCompleted={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
