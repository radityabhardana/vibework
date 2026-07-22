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

// Custom Section Milestone Node (Spine Center)
const SectionMilestoneNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-brutal-yellow border-4 border-brutal-black shadow-brutal px-6 py-3 min-w-[280px] text-center font-sans font-black text-lg uppercase tracking-tight text-brutal-black">
      <Handle type="target" position={Position.Top} className="!bg-brutal-black !w-3 !h-3" />
      {data.label}
      <Handle type="source" position={Position.Bottom} className="!bg-brutal-black !w-3 !h-3" />
    </div>
  );
};

// Custom Topic Group Box Node (Left / Right Cards)
const TopicGroupNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-brutal-white border-4 border-brutal-black shadow-brutal p-4 w-80 flex flex-col gap-3">
      <Handle
        type="target"
        position={data.side === 'left' ? Position.Right : Position.Left}
        className="!bg-brutal-black !w-3 !h-3"
      />

      {/* Group Title Header */}
      <div className="border-b-2 border-brutal-black pb-2 flex justify-between items-center">
        <h4 className="font-sans font-black text-sm uppercase text-brutal-black tracking-tight">
          {data.groupName}
        </h4>
        <span className="font-mono text-[10px] font-bold uppercase opacity-60">
          {data.topics.filter((t: any) => t.status === 'mastered').length}/{data.topics.length} Done
        </span>
      </div>

      {/* List of Topic Pills */}
      <div className="flex flex-col gap-2">
        {data.topics.map((topic: any) => {
          const isMastered = topic.status === 'mastered';
          const isUnlocked = topic.status === 'unlocked';
          const isLocked = topic.status === 'locked';

          let pillStyle = 'bg-gray-100 border-gray-300 text-gray-500 opacity-70 cursor-not-allowed';
          let badge = '🔒';

          if (isMastered) {
            pillStyle = 'bg-green-100 border-green-600 font-bold text-green-950 hover:bg-green-200 cursor-pointer shadow-sm';
            badge = '✅';
          } else if (isUnlocked) {
            pillStyle = 'bg-brutal-yellow border-brutal-black font-bold text-brutal-black hover:scale-[1.02] cursor-pointer shadow-brutal-sm';
            badge = '⚡';
          }

          return (
            <div
              key={topic.nodeId}
              onClick={() => {
                data.onTopicClick(topic);
              }}
              className={`p-2.5 border-2 flex items-center justify-between text-xs font-mono transition-all ${pillStyle}`}
            >
              <div className="flex items-center gap-2 line-clamp-1">
                <span>{badge}</span>
                <span className="font-bold">{topic.title}</span>
              </div>
              <span className="text-[10px] opacity-70 shrink-0 ml-1">
                {isMastered ? 'Mastered' : isUnlocked ? 'Learn' : 'Locked'}
              </span>
            </div>
          );
        })}
      </div>

      <Handle
        type="source"
        position={data.side === 'left' ? Position.Right : Position.Left}
        className="!bg-brutal-black !w-3 !h-3"
      />
    </div>
  );
};

// Fallback Flat Node
const FlatNodeComponent = ({ data }: { data: any }) => {
  const isMastered = data.status === 'mastered';
  const isUnlocked = data.status === 'unlocked';
  const isLocked = data.status === 'locked';

  let borderStyle = 'border-gray-400 bg-gray-100 opacity-70';
  let badgeColor = 'bg-gray-300 text-gray-700';

  if (isMastered) {
    borderStyle = 'border-green-600 bg-green-50 shadow-brutal hover:bg-green-100 cursor-pointer';
    badgeColor = 'bg-green-400 text-black';
  } else if (isUnlocked) {
    borderStyle = 'border-brutal-black bg-brutal-yellow shadow-brutal hover:scale-105 transition-transform cursor-pointer';
    badgeColor = 'bg-brutal-black text-white';
  }

  return (
    <div
      onClick={data.onClick}
      className={`border-4 p-4 w-72 transition-all ${borderStyle}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-brutal-black !w-3 !h-3" />
      <div className="flex justify-between items-center mb-2">
        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border border-brutal-black ${badgeColor}`}>
          {isMastered ? '✅ MASTERED' : isUnlocked ? '⚡ UNLOCKED' : '🔒 LOCKED'}
        </span>
      </div>

      <h3 className="font-sans font-black text-base uppercase leading-tight mb-1 text-brutal-black">
        {data.title}
      </h3>
      <p className="font-mono text-xs text-gray-700 line-clamp-2">{data.description}</p>

      <div className="mt-3 text-[10px] font-mono font-bold uppercase text-right opacity-70">
        {isLocked ? 'Complete Prereqs' : 'Click to Learn & Quiz →'}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-brutal-black !w-3 !h-3" />
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
            style: { strokeWidth: 4, stroke: '#050505' },
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
            style: { strokeWidth: 3, stroke: '#3b82f6', strokeDasharray: '5,5' },
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
          style: { strokeWidth: 3, stroke: n.status === 'mastered' ? '#16a34a' : '#050505' },
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
    <div className="flex-1 w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.15}
      >
        <Controls className="!border-4 !border-brutal-black !shadow-brutal-sm !bg-brutal-white" />
        <MiniMap className="!border-4 !border-brutal-black !shadow-brutal-sm !bg-brutal-white" nodeColor="#050505" />
        <Background gap={24} size={2} color="#050505" />
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
