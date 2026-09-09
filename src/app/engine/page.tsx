import React from 'react';
import { IdeaStudio } from '@/components/ui/IdeaStudio';

export default async function EnginePage({
  searchParams,
}: {
  searchParams?: Promise<{ idea?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <IdeaStudio initialIdea={params?.idea || ''} />
    </div>
  );
}

