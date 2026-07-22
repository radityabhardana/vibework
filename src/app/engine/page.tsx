'use client';

import React from 'react';
import { InterviewChat } from '@/components/ui/InterviewChat';

export default function EnginePage() {
  return (
    <div className="w-full h-full flex flex-col bg-brutal-white overflow-hidden">
      <div className="flex-1 w-full flex overflow-hidden">
        <div className="flex-1 flex justify-center items-center bg-brutal-white">
          <InterviewChat />
        </div>
      </div>
    </div>
  );
}
