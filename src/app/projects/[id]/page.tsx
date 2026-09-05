import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ChatCircle } from '@phosphor-icons/react/dist/ssr';
import { ProjectWorkspace } from '@/components/ui/ProjectWorkspace';
import { db } from '@/lib/db';
import { projects, prds, adrs, schemas, atomicPrompts, appFlowcharts, chatSessions } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import { isRenderableAppFlowchart } from '@/lib/flowchart';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function fetchProjectData(id: string) {
  const project = await db.select().from(projects).where(eq(projects.id, id)).get();

  if (!project) return null;

  const prd = await db.select().from(prds).where(eq(prds.projectId, id)).get();
  const adr = await db.select().from(adrs).where(eq(adrs.projectId, id)).get();
  const schemaObj = await db.select().from(schemas).where(eq(schemas.projectId, id)).get();
  const prompts = await db.select().from(atomicPrompts).where(eq(atomicPrompts.projectId, id)).orderBy(atomicPrompts.executionOrder).all();
  const storedAppFlowchart = await db.select().from(appFlowcharts).where(eq(appFlowcharts.projectId, id)).get();
  const appFlowchart = isRenderableAppFlowchart(storedAppFlowchart)
    ? { nodes: storedAppFlowchart.nodes, edges: storedAppFlowchart.edges }
    : undefined;
  const chatSession = await db.select().from(chatSessions).where(eq(chatSessions.projectId, id)).orderBy(desc(chatSessions.updatedAt)).get();

  return { project, prd, adr, schema: schemaObj, prompts, appFlowchart, chatSession };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connection();
  if (!UUID_PATTERN.test(id)) notFound();

  const data = await fetchProjectData(id);

  if (!data) notFound();

  return (
    <div className="w-full h-full flex flex-col bg-brutal-white overflow-hidden">
      {/* Header */}
      <header className="z-10 flex min-h-20 w-full shrink-0 items-center justify-between gap-3 border-b-4 border-brutal-black bg-brutal-white px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-4">
          <h1 className="truncate font-sans text-lg font-black uppercase tracking-tight sm:text-2xl">{data.project.name}</h1>
          <span className="font-mono text-xs font-bold uppercase px-2 py-1 bg-brutal-yellow border-2 border-brutal-black">
            {data.project.status}
          </span>
        </div>
        <Link href={data.chatSession ? `/engine/${data.chatSession.id}` : '/engine'}>
          <Button variant="primary" size="sm" className="flex shrink-0 items-center gap-2 !px-3 sm:!px-4">
            <ChatCircle weight="bold" />
            <span className="hidden sm:inline">Edit Ide di Studio</span>
            <span className="sm:hidden">Studio</span>
          </Button>
        </Link>
      </header>

      {/* Main Workspace (ReactFlow) */}
      <div className="flex-1 w-full overflow-hidden bg-[#e5e5f7]">
        <ProjectWorkspace project={data.project} prd={data.prd} adr={data.adr} schema={data.schema} prompts={data.prompts} appFlowchart={data.appFlowchart} />
      </div>
    </div>
  );
}
