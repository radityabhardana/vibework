import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { House, FolderPlus } from '@phosphor-icons/react/dist/ssr';
import ProjectCardClient from './ProjectCardClient';

export default async function ProjectsListPage() {
  const allProjects = await db.select().from(projects).orderBy(desc(projects.createdAt));

  return (
    <div className="w-full h-full flex flex-col bg-[#e5e5f7] overflow-auto">
      {/* Header */}
      <header className="h-20 w-full border-b-4 border-brutal-black bg-brutal-white flex items-center px-6 justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-sans font-black text-2xl uppercase tracking-tight">My Projects</h1>
        </div>
        <Link href="/">
          <Button variant="secondary" size="sm" className="flex items-center gap-2">
            <House weight="bold" />
            Back to Dashboard
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-6xl w-full mx-auto flex flex-col gap-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {allProjects.map((p) => (
            <ProjectCardClient key={p.id} project={p} />
          ))}
          
          <Link href="/engine">
            <Card bg="yellow" className="p-6 cursor-pointer hover:-translate-y-2 hover:shadow-brutal transition-all h-full min-h-[200px] flex flex-col items-center justify-center border-dashed">
              <FolderPlus weight="bold" className="w-12 h-12 mb-2" />
              <h3 className="font-sans font-black text-xl uppercase">New Project</h3>
            </Card>
          </Link>
        </div>

      </main>
    </div>
  );
}
