'use client';

import React, { useState } from 'react';
import {
  Handle,
  Position,
  getBezierPath,
  BaseEdge,
  EdgeLabelRenderer
} from '@xyflow/react';
import { Button } from '@/components/ui/Button';
import { Copy, Check, X } from '@phosphor-icons/react';

export function ViewerModal({ title, content, onClose }: { title: string; content: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-zinc-950/80 border-b border-white/10 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <h2 className="font-sans font-bold text-base text-zinc-100">{title}</h2>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" size="sm" onClick={handleCopy} className="text-xs gap-1.5">
              {copied ? (
                <>
                  <Check weight="bold" className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy weight="bold" className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white">
              <X weight="bold" className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto font-mono text-xs leading-relaxed bg-zinc-950/90 text-zinc-300 flex-1 selection:bg-cyan-500/30">
          <pre className="whitespace-pre-wrap">{content}</pre>
        </div>
      </div>
    </div>
  );
}

export const StatusNode = ({ data }: { data: any }) => {
  return (
    <div
      className={`bg-zinc-900/90 border border-white/10 rounded-xl shadow-lg p-4 w-64 backdrop-blur-md transition-all duration-150 ${
        data.onView ? 'cursor-pointer hover:border-violet-500/60 hover:shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]' : ''
      }`}
      onClick={data.onView}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-950 !border-2 !border-violet-400 !w-3 !h-3 rounded-full" />
      <div className="font-sans font-semibold text-center text-sm text-zinc-100 flex items-center justify-center gap-2">
        {data.label}
      </div>
      {data.onView && (
        <div className="text-center text-[10px] font-mono text-zinc-400 mt-1.5">
          (Click to View)
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-950 !border-2 !border-violet-400 !w-3 !h-3 rounded-full" />
    </div>
  );
};

export const ActionNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-zinc-900/90 border border-cyan-500/30 rounded-xl shadow-[0_0_25px_-5px_rgba(6,182,212,0.15)] p-4 w-64 flex flex-col gap-3 backdrop-blur-md">
      <Handle type="target" position={Position.Top} className="!bg-zinc-950 !border-2 !border-cyan-400 !w-3 !h-3 rounded-full" />
      <div className="font-sans font-semibold text-center text-xs text-zinc-200 uppercase tracking-wider">
        {data.label}
      </div>
      <div className="relative w-full">
        <Button
          variant="primary"
          size="sm"
          onClick={data.onAction}
          disabled={data.isLoading || data.disabled}
          className="w-full relative overflow-hidden text-xs"
        >
          {data.isLoading && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${data.progress}%` }}
            />
          )}
          <span className="relative z-10 font-semibold">
            {data.isLoading ? `Generating... ${Math.round(data.progress)}%` : data.buttonText}
          </span>
        </Button>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-950 !border-2 !border-cyan-400 !w-3 !h-3 rounded-full" />
    </div>
  );
};

export const PromptNode = ({ data }: { data: any }) => {
  return (
    <div
      className={`bg-zinc-900/80 border border-emerald-500/30 rounded-xl shadow-md p-3 w-56 backdrop-blur-md transition-all duration-150 ${
        data.onView ? 'cursor-pointer hover:border-emerald-500/60 hover:shadow-[0_0_20px_-5px_rgba(16,185,129,0.25)]' : ''
      }`}
      onClick={data.onView}
    >
      <Handle type="target" position={Position.Top} id="top" className="!bg-zinc-950 !border-2 !border-emerald-400 !w-2.5 !h-2.5 rounded-full" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-zinc-950 !border-2 !border-emerald-400 !w-2.5 !h-2.5 rounded-full" />
      <div className="font-sans font-medium text-center text-xs text-zinc-200">
        {data.label}
      </div>
      {data.onView && (
        <div className="text-center text-[10px] font-mono text-emerald-400/80 mt-1">
          (Click to View)
        </div>
      )}
      <Handle type="source" position={Position.Right} id="right" className="!bg-zinc-950 !border-2 !border-emerald-400 !w-2.5 !h-2.5 rounded-full" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-zinc-950 !border-2 !border-emerald-400 !w-2.5 !h-2.5 rounded-full" />
    </div>
  );
};

export const AppFlowEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
}: any) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: '#3f3f46', strokeWidth: 2 }} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: '#181b22',
              color: '#e4e4e7',
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: 10,
              fontWeight: 600,
              fontFamily: 'monospace',
              pointerEvents: 'all',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export const nodeTypes = {
  statusNode: StatusNode,
  actionNode: ActionNode,
  promptNode: PromptNode,
};

export const edgeTypes = {
  appFlowEdge: AppFlowEdge,
};
