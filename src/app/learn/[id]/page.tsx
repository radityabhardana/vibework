import React from 'react';
import { db } from '@/lib/db';
import { learningRoadmaps, roadmapNodes } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { RoadmapWorkspace } from '@/components/learn/RoadmapWorkspace';
import { RoadmapDetailHeader } from '@/components/learn/RoadmapDetailHeader';

async function fetchRoadmapData(id: string) {
  const roadmap = await db.select().from(learningRoadmaps).where(eq(learningRoadmaps.id, id)).get();
  if (!roadmap) return null;

  const nodes = await db.select().from(roadmapNodes).where(eq(roadmapNodes.roadmapId, id)).orderBy(asc(roadmapNodes.orderIndex)).all();
  return { roadmap, nodes };
}

export default async function LearningRoadmapDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchRoadmapData(id);

  if (!data) {
    return (
      <div className="flex-1 w-full flex overflow-hidden items-center justify-center bg-[#e5e5f7]">
        <div className="font-mono text-xl">Learning Roadmap Not Found</div>
      </div>
    );
  }

  const totalNodes = data.nodes.length;
  const masteredNodes = data.nodes.filter(n => n.status === 'mastered').length;

  return (
    <div className="w-full h-full flex flex-col bg-brutal-white overflow-hidden">
      {/* Header with Language Switcher */}
      <RoadmapDetailHeader
        topic={data.roadmap.topic}
        title={data.roadmap.title}
        masteredNodes={masteredNodes}
        totalNodes={totalNodes}
      />

      {/* Main Workspace (ReactFlow) */}
      <div className="flex-1 w-full overflow-hidden bg-[#e5e5f7]">
        <RoadmapWorkspace roadmap={data.roadmap} initialNodes={data.nodes} />
      </div>
    </div>
  );
}
