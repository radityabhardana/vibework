'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { Trash } from '@phosphor-icons/react';
import { deleteProjectAction } from './actions';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string | null;
}

export default function ProjectCardClient({ project }: { project: Project }) {
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? This will also delete all associated PRDs and ADRs.')) {
      await deleteProjectAction(project.id);
    }
  };

  return (
    <Card 
      bg="white" 
      className="p-6 cursor-pointer hover:-translate-y-2 hover:shadow-brutal transition-all h-full flex flex-col justify-between"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <div>
        <h3 className="font-sans font-black text-xl uppercase mb-2 truncate">{project.name}</h3>
        <p className="font-mono text-sm opacity-80 line-clamp-3">
          {project.description || 'No description provided.'}
        </p>
      </div>
      <div className="mt-4 pt-4 border-t-2 border-brutal-black/20 flex justify-between items-center">
        <span className="font-mono text-xs font-bold uppercase px-2 py-1 bg-brutal-yellow border-2 border-brutal-black">
          {project.status || 'draft'}
        </span>
        <Button 
          variant="danger" 
          size="sm" 
          onClick={handleDelete}
          className="px-3 py-1 flex items-center justify-center border-2 border-brutal-black"
          title="Delete Project"
        >
          <Trash weight="bold" size={18} />
        </Button>
      </div>
    </Card>
  );
}
