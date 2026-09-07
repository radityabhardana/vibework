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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
      <div className="bg-[#08080a] border border-white/15 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-[#030303] border-b border-white/10 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            <h2 className="font-mono font-bold text-sm text-white">{title}</h2>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" size="sm" onClick={handleCopy} className="text-xs gap-1.5 !py-2 !px-3">
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
            <button 
              onClick={onClose} 
              className="p-1.5 text-zinc-400 hover:text-white rounded-md hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X weight="bold" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto font-mono text-xs leading-relaxed bg-[#040405] text-zinc-300 flex-1 selection:bg-white selection:text-black">
          <pre className="whitespace-pre-wrap">{content}</pre>
        </div>
      </div>
    </div>
  );
}

export const StatusNode = ({ data }: { data: any }) => {
  return (
    <div
      className={`bg-[#08080a] border border-white/15 rounded-xl shadow-2xl p-4 w-64 backdrop-blur-md transition-all duration-300 ${
        data.onView ? 'cursor-pointer hover:border-white/40 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]' : ''
      }`}
      onClick={data.onView}
    >
      <Handle type="target" position={Position.Top} className="!bg-black !border-2 !border-white !w-3 !h-3 rounded-full" />
      <div className="font-mono font-semibold text-center text-xs text-white uppercase tracking-tight flex items-center justify-center gap-2">
        {data.label}
      </div>
      {data.onView && (
        <div className="text-center text-[10px] font-mono text-zinc-400 mt-1.5">
          (Click to View)
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-black !border-2 !border-white !w-3 !h-3 rounded-full" />
    </div>
  );
};

export const ActionNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-[#08080a] border border-white/20 rounded-xl shadow-2xl p-4 w-64 flex flex-col gap-3 backdrop-blur-md">
      <Handle type="target" position={Position.Top} className="!bg-black !border-2 !border-white !w-3 !h-3 rounded-full" />
      <div className="font-mono font-semibold text-center text-xs text-zinc-200 uppercase tracking-wider">
        {data.label}
      </div>
      <div className="relative w-full">
        <Button
          variant="primary"
          size="sm"
          onClick={data.onAction}
          disabled={data.isLoading || data.disabled}
          className="w-full relative overflow-hidden text-xs !py-2.5"
        >
          {data.isLoading && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-zinc-300 transition-all duration-300 ease-out"
              style={{ width: `${data.progress}%` }}
            />
          )}
          <span className="relative z-10 font-mono font-medium">
            {data.isLoading ? `Generating... ${Math.round(data.progress)}%` : data.buttonText}
          </span>
        </Button>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-black !border-2 !border-white !w-3 !h-3 rounded-full" />
    </div>
  );
};

export const PromptNode = ({ data }: { data: any }) => {
  return (
    <div
      className={`bg-[#08080a] border border-white/15 rounded-xl shadow-xl p-3 w-56 backdrop-blur-md transition-all duration-300 ${
        data.onView ? 'cursor-pointer hover:border-white/40 hover:bg-white/[0.05] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]' : ''
      }`}
      onClick={data.onView}
    >
      <Handle type="target" position={Position.Top} id="top" className="!bg-black !border-2 !border-white !w-2.5 !h-2.5 rounded-full" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-black !border-2 !border-white !w-2.5 !h-2.5 rounded-full" />
      <div className="font-mono font-medium text-center text-xs text-zinc-200">
        {data.label}
      </div>
      {data.onView && (
        <div className="text-center text-[10px] font-mono text-zinc-400 mt-1">
          (Click to View)
        </div>
      )}
      <Handle type="source" position={Position.Right} id="right" className="!bg-black !border-2 !border-white !w-2.5 !h-2.5 rounded-full" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-black !border-2 !border-white !w-2.5 !h-2.5 rounded-full" />
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
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: '#52525b', strokeWidth: 1.5 }} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: '#0a0a0c',
              color: '#ffffff',
              padding: '3px 8px',
              borderRadius: 6,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: 10,
              fontWeight: 500,
              fontFamily: 'monospace',
              pointerEvents: 'all',
              boxShadow: '0 4px 12px rgba(0,0,0,0.8)',
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
