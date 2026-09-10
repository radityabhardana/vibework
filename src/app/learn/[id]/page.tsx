import React from 'react';
import { db } from '@/lib/db';
import { learningRoadmaps, roadmapNodes } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { RoadmapWorkspace } from '@/components/learn/RoadmapWorkspace';
import { RoadmapDetailHeader } from '@/components/learn/RoadmapDetailHeader';
import { LearningNotFound } from '@/components/learn/LearningNotFound';

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
    return <LearningNotFound />;
  }

  const totalNodes = data.nodes.length;
  const masteredNodes = data.nodes.filter(n => n.status === 'mastered').length;

  return (
    <div className="w-full h-screen flex flex-col bg-[#030303] text-white overflow-hidden">
      {/* Header with Language Switcher */}
      <RoadmapDetailHeader
        topic={data.roadmap.topic}
        title={data.roadmap.title}
        masteredNodes={masteredNodes}
        totalNodes={totalNodes}
      />

      {/* Main Workspace (ReactFlow) */}
      <div className="flex-1 w-full overflow-hidden bg-[#030303] relative">
        <RoadmapWorkspace roadmap={data.roadmap} initialNodes={data.nodes} />
      </div>
    </div>
  );
}
