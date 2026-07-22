import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { House, ChatCircle } from '@phosphor-icons/react/dist/ssr';
import { ProjectWorkspace } from '@/components/ui/ProjectWorkspace';
import { db } from '@/lib/db';
import { projects, prds, adrs, schemas, atomicPrompts, appFlowcharts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function fetchProjectData(id: string) {
  const project = await db.select().from(projects).where(eq(projects.id, id)).get();

  if (!project) return null;

  const prd = await db.select().from(prds).where(eq(prds.projectId, id)).get();
  const adr = await db.select().from(adrs).where(eq(adrs.projectId, id)).get();
  const schemaObj = await db.select().from(schemas).where(eq(schemas.projectId, id)).get();
  const prompts = await db.select().from(atomicPrompts).where(eq(atomicPrompts.projectId, id)).orderBy(atomicPrompts.executionOrder).all();
  const appFlowchart = await db.select().from(appFlowcharts).where(eq(appFlowcharts.projectId, id)).get();

  return { project, prd, adr, schema: schemaObj, prompts, appFlowchart };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await fetchProjectData(id);

  if (!data) {
    return (
      <div className="flex-1 w-full flex overflow-hidden items-center justify-center bg-[#e5e5f7]">
        <div className="font-mono text-xl">Project Not Found</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-brutal-white overflow-hidden">
      {/* Header */}
      <header className="h-20 w-full border-b-4 border-brutal-black bg-brutal-white flex items-center px-6 justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-sans font-black text-2xl uppercase tracking-tight">{data.project.name}</h1>
          <span className="font-mono text-xs font-bold uppercase px-2 py-1 bg-brutal-yellow border-2 border-brutal-black">
            {data.project.status}
          </span>
        </div>
        <div className="flex gap-4">
          <Link href="/projects">
            <Button variant="secondary" size="sm" className="flex items-center gap-2">
              <House weight="bold" />
              All Projects
            </Button>
          </Link>
          <Link href={`/engine?projectId=${id}`}>
            <Button variant="primary" size="sm" className="flex items-center gap-2">
              <ChatCircle weight="bold" />
              Go to Grill
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Workspace (ReactFlow) */}
      <div className="flex-1 w-full overflow-hidden bg-[#e5e5f7]">
        <ProjectWorkspace project={data.project} prd={data.prd} adr={data.adr} schema={data.schema} prompts={data.prompts} appFlowchart={data.appFlowchart} />
      </div>
    </div>
  );
}
