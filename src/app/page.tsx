'use client';

import React, { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const initialNodes: Node[] = [
  { id: '1', position: { x: 50, y: 50 }, data: { label: '1. Ideation & PRD' }, type: 'default' },
  { id: '2', position: { x: 50, y: 200 }, data: { label: '2. Tech Stack & ADR' }, type: 'default' },
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
];

export default function BuilderPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const addPromptNode = () => {
    const newNode: Node = {
      id: crypto.randomUUID(),
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label: 'New Prompt Node' },
      type: 'default',
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const addSchemaNode = () => {
    const newNode: Node = {
      id: crypto.randomUUID(),
      position: { x: Math.random() * 200 + 100, y: Math.random() * 200 + 100 },
      data: { label: 'New Schema Node' },
      type: 'default',
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-brutal-white overflow-hidden">
      {/* Header */}
      <header className="h-20 w-full border-b-4 border-brutal-black bg-brutal-white flex items-center px-6 justify-between z-10 relative">
        <div className="flex items-center gap-4">
          <h1 className="font-sans font-black text-2xl uppercase tracking-tight">Vibework Builder</h1>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary" size="sm" onClick={() => alert('Export functionality to be implemented')}>Export Config</Button>
          <Button variant="primary" size="sm" onClick={() => alert('Pipeline execution to be implemented')}>Run Pipeline</Button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 w-full flex">
        {/* Sidebar */}
        <aside className="w-80 h-full border-r-4 border-brutal-black bg-gray-100 flex flex-col z-10 relative">
          <div className="p-6 border-b-4 border-brutal-black bg-brutal-yellow">
            <h2 className="font-mono font-bold text-xl uppercase text-brutal-black">Components</h2>
          </div>
          <div className="p-6 flex flex-col gap-4 overflow-y-auto">
            <div onClick={addPromptNode}>
              <Card bg="white" className="cursor-pointer hover:-translate-y-1 hover:shadow-brutal transition-all !p-4">
                <p className="font-mono font-bold text-center">New Prompt Node</p>
              </Card>
            </div>
            <div onClick={addSchemaNode}>
              <Card bg="black" className="cursor-pointer hover:-translate-y-1 hover:shadow-brutal transition-all !p-4">
                <p className="font-mono font-bold text-center">New Schema Node</p>
              </Card>
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 relative bg-[#e5e5f7]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Controls className="!border-4 !border-brutal-black !shadow-brutal-sm !bg-brutal-white [&>button]:!border-b-4 [&>button]:!border-brutal-black [&>button:last-child]:!border-b-0" />
            <MiniMap className="!border-4 !border-brutal-black !shadow-brutal-sm !bg-brutal-white mask-none" nodeColor="#050505" />
            <Background gap={24} size={2} color="#050505" />
          </ReactFlow>
        </main>
      </div>
    </div>
  );
}
