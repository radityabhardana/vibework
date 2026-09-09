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
    <div className="w-full h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <header className="z-10 flex min-h-16 w-full shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link href="/" className="font-mono text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Dashboard
          </Link>
          <div className="h-4 w-[1px] bg-white/10" />
          <h1 className="truncate font-sans text-base font-bold text-zinc-100 sm:text-lg">{data.project.name}</h1>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 font-mono text-[11px] font-medium text-zinc-300">
            {data.project.status}
          </span>
        </div>
        <Link href={data.chatSession ? `/engine/${data.chatSession.id}` : '/engine'}>
          <Button variant="secondary" size="sm" className="flex shrink-0 items-center gap-2 text-xs">
            <ChatCircle weight="bold" />
            <span className="hidden sm:inline">Edit di Studio</span>
            <span className="sm:hidden">Studio</span>
          </Button>
        </Link>
      </header>

      {/* Main Workspace (ReactFlow & Tabs) */}
      <div className="flex-1 w-full overflow-hidden bg-background relative">
        <ProjectWorkspace project={data.project} prd={data.prd} adr={data.adr} schema={data.schema} prompts={data.prompts} appFlowchart={data.appFlowchart} />
      </div>
    </div>
  );
}
