import React from 'react';
import { IdeaStudio } from '@/components/ui/IdeaStudio';
import { db } from '@/lib/db';
import { chatSessions, chatMessages, projects, prds, adrs, appFlowcharts } from '@/lib/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { EngineNotFound } from '@/components/ui/EngineNotFound';

async function fetchSessionData(id: string) {
  const session = await db.select().from(chatSessions).where(eq(chatSessions.id, id)).get();
  
  if (!session) {
    return null;
  }

  const messages = await db.select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .orderBy(asc(chatMessages.createdAt), sql`rowid`);

  let specSummary = null;
  if (session.projectId) {
    const project = await db.select().from(projects).where(eq(projects.id, session.projectId)).get();
    if (project) {
      const prd = await db.select().from(prds).where(eq(prds.projectId, project.id)).get() || null;
      const adr = await db.select().from(adrs).where(eq(adrs.projectId, project.id)).get() || null;
      const flowchart = await db.select().from(appFlowcharts).where(eq(appFlowcharts.projectId, project.id)).get() || null;

      let nodes: Array<{ id: string; label?: string; title?: string; description?: string }> = [];
      if (flowchart?.nodes) {
        try {
          nodes = typeof flowchart.nodes === 'string' ? JSON.parse(flowchart.nodes) : (flowchart.nodes as typeof nodes);
        } catch {
          nodes = [];
        }
      }

      specSummary = {
        projectId: project.id,
        projectName: project.name,
        projectDescription: project.description,
        nodes: Array.isArray(nodes) ? nodes : [],
        prd: prd ? {
          targetUser: prd.targetUser,
          coreFeatures: prd.coreFeatures,
          mvpConstraints: prd.mvpConstraints,
        } : null,
        adr: adr ? {
          frontendStack: adr.frontendStack,
          backendStack: adr.backendStack,
          database: adr.database,
        } : null,
      };
    }
  }

  return { session, messages, specSummary };
}

export default async function EngineHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchSessionData(id);

  if (!data) {
    return <EngineNotFound />;
  }

  const initialIdea = data.messages.find(m => m.role === 'user')?.content || '';

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <IdeaStudio
        initialSessionId={id}
        initialIdea={initialIdea}
        initialProjectId={data.session.projectId}
        initialSpecSummary={data.specSummary}
      />
    </div>
  );
}
