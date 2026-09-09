import React from 'react';
import { db } from '@/lib/db';
import {
  projects,
  chatSessions,
  learningRoadmaps,
  roadmapNodes,
  atomicPrompts,
  prds,
  adrs,
  appFlowcharts,
} from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { DashboardView } from '@/components/dashboard/DashboardView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch all projects
  const allProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      updatedAt: projects.updatedAt,
      createdAt: projects.createdAt,
    })
    .from(projects)
    .orderBy(desc(projects.updatedAt));

  // Fetch all artifacts to compute counts
  const allPrompts = await db
    .select({ id: atomicPrompts.id, projectId: atomicPrompts.projectId })
    .from(atomicPrompts);
  const allPrds = await db.select({ id: prds.id, projectId: prds.projectId }).from(prds);
  const allAdrs = await db.select({ id: adrs.id, projectId: adrs.projectId }).from(adrs);
  const allFlowcharts = await db
    .select({ id: appFlowcharts.id, projectId: appFlowcharts.projectId })
    .from(appFlowcharts);

  // Map counts per project
  const promptCountMap = new Map<string, number>();
  for (const p of allPrompts) {
    if (p.projectId) promptCountMap.set(p.projectId, (promptCountMap.get(p.projectId) || 0) + 1);
  }
  const prdCountMap = new Map<string, number>();
  for (const p of allPrds) {
    if (p.projectId) prdCountMap.set(p.projectId, (prdCountMap.get(p.projectId) || 0) + 1);
  }
  const adrCountMap = new Map<string, number>();
  for (const a of allAdrs) {
    if (a.projectId) adrCountMap.set(a.projectId, (adrCountMap.get(a.projectId) || 0) + 1);
  }
  const flowchartCountMap = new Map<string, number>();
  for (const f of allFlowcharts) {
    if (f.projectId) flowchartCountMap.set(f.projectId, (flowchartCountMap.get(f.projectId) || 0) + 1);
  }

  // Fetch chat sessions
  const sessions = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      projectId: chatSessions.projectId,
      projectName: projects.name,
      updatedAt: chatSessions.updatedAt,
    })
    .from(chatSessions)
    .leftJoin(projects, eq(chatSessions.projectId, projects.id))
    .orderBy(desc(chatSessions.updatedAt));

  const sessionByProjectId = new Map<string, string>();
  for (const s of sessions) {
    if (s.projectId && !sessionByProjectId.has(s.projectId)) {
      sessionByProjectId.set(s.projectId, s.id);
    }
  }

  const projectsData = allProjects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
    promptCount: promptCountMap.get(p.id) || 0,
    prdCount: prdCountMap.get(p.id) || 0,
    adrCount: adrCountMap.get(p.id) || 0,
    flowchartCount: flowchartCountMap.get(p.id) || 0,
    sessionId: sessionByProjectId.get(p.id) || null,
  }));

  // Fetch learning roadmaps with node stats
  const allRoadmaps = await db.select().from(learningRoadmaps).orderBy(desc(learningRoadmaps.createdAt));
  const allNodes = await db
    .select({
      id: roadmapNodes.id,
      roadmapId: roadmapNodes.roadmapId,
      status: roadmapNodes.status,
    })
    .from(roadmapNodes);

  const roadmapNodeMap = new Map<string, { total: number; mastered: number }>();
  for (const n of allNodes) {
    const curr = roadmapNodeMap.get(n.roadmapId) || { total: 0, mastered: 0 };
    curr.total += 1;
    if (n.status === 'mastered') curr.mastered += 1;
    roadmapNodeMap.set(n.roadmapId, curr);
  }

  const roadmapsData = allRoadmaps.map((r) => {
    const rStats = roadmapNodeMap.get(r.id) || { total: 0, mastered: 0 };
    return {
      id: r.id,
      topic: r.topic,
      title: r.title,
      createdAt: r.createdAt,
      totalNodes: rStats.total,
      masteredNodes: rStats.mastered,
    };
  });

  let masteredNodesCount = 0;
  for (const n of allNodes) {
    if (n.status === 'mastered') masteredNodesCount++;
  }

  const stats = {
    totalProjects: allProjects.length,
    totalPrompts: allPrompts.length,
    totalRoadmaps: allRoadmaps.length,
    totalRoadmapNodes: allNodes.length,
    masteredRoadmapNodes: masteredNodesCount,
    totalPrds: allPrds.length,
    totalAdrs: allAdrs.length,
    totalFlowcharts: allFlowcharts.length,
    totalSessions: sessions.length,
  };

  return (
    <DashboardView
      stats={stats}
      projects={projectsData}
      sessions={sessions}
      roadmaps={roadmapsData}
    />
  );
}
