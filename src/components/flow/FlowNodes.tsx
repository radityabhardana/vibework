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

export function ViewerModal({ title, content, onClose }: { title: string; content: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brutal-black/70 backdrop-blur-sm p-4 md:p-8">
      <div className="bg-brutal-white border-4 border-brutal-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] w-full max-w-5xl max-h-full flex flex-col animate-in zoom-in-95 duration-200">
        <div className="bg-brutal-yellow border-b-4 border-brutal-black p-4 flex justify-between items-center shrink-0">
          <h2 className="font-sans font-black text-xl uppercase">{title}</h2>
          <div className="flex gap-4">
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
            <Button variant="primary" size="sm" onClick={onClose} className="!bg-brutal-red text-white">
              Close
            </Button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto font-mono text-sm leading-relaxed bg-[#f8f9fa] flex-1">
          <pre className="whitespace-pre-wrap">{content}</pre>
        </div>
      </div>
    </div>
  );
}

export const StatusNode = ({ data }: { data: any }) => {
  return (
    <div
      className={`bg-brutal-white border-4 border-brutal-black shadow-brutal p-4 w-64 ${data.onView ? 'cursor-pointer hover:bg-brutal-yellow transition-colors' : ''}`}
      onClick={data.onView}
    >
      <Handle type="target" position={Position.Top} className="!bg-brutal-black !w-3 !h-3 !border-2 !border-brutal-white" />
      <div className="font-sans font-black text-center text-lg uppercase flex items-center justify-center gap-2">
        {data.label}
      </div>
      {data.onView && (
        <div className="text-center text-xs font-mono font-bold uppercase mt-2 opacity-60">
          (Click to View)
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-brutal-black !w-3 !h-3 !border-2 !border-brutal-white" />
    </div>
  );
};

export const ActionNode = ({ data }: { data: any }) => {
  return (
    <div className="bg-brutal-yellow border-4 border-brutal-black shadow-brutal p-4 w-64 flex flex-col gap-3">
      <Handle type="target" position={Position.Top} className="!bg-brutal-black !w-3 !h-3 !border-2 !border-brutal-white" />
      <div className="font-sans font-black text-center text-sm uppercase">
        {data.label}
      </div>
      <div className="relative w-full">
        <Button
          variant="primary"
          size="sm"
          onClick={data.onAction}
          disabled={data.isLoading || data.disabled}
          className={`w-full relative overflow-hidden ${data.isLoading ? '!bg-brutal-white' : ''}`}
        >
          {data.isLoading && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-brutal-blue transition-all duration-300 ease-out"
              style={{ width: `${data.progress}%` }}
            />
          )}
          <span className="relative z-10 mix-blend-difference text-white">
            {data.isLoading ? `Generating... ${Math.round(data.progress)}%` : data.buttonText}
          </span>
        </Button>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-brutal-black !w-3 !h-3 !border-2 !border-brutal-white" />
    </div>
  );
};

export const PromptNode = ({ data }: { data: any }) => {
  return (
    <div
      className={`bg-brutal-white border-2 border-brutal-black shadow-brutal-sm p-3 w-56 ${data.onView ? 'cursor-pointer hover:bg-brutal-yellow transition-colors' : ''}`}
      onClick={data.onView}
    >
      <Handle type="target" position={Position.Top} id="top" className="!bg-brutal-black !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-brutal-black !w-2 !h-2" />
      <div className="font-sans font-bold text-center text-sm uppercase">
        {data.label}
      </div>
      {data.onView && (
        <div className="text-center text-[10px] font-mono mt-1 opacity-60">
          (Click to View)
        </div>
      )}
      <Handle type="source" position={Position.Right} id="right" className="!bg-brutal-black !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-brutal-black !w-2 !h-2" />
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
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: '#fff',
              padding: '4px 8px',
              borderRadius: 4,
              border: '2px solid #000',
              fontSize: 10,
              fontWeight: 700,
              fontFamily: 'monospace',
              pointerEvents: 'all',
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
