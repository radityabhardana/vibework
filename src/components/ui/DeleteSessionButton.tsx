'use client';

import React from 'react';
import { Trash } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Hapus sesi obrolan ini?')) return;

    try {
      await fetch(`/api/chat/session/${sessionId}`, {
        method: 'DELETE',
      });
      router.refresh();
      // Also navigate to /engine if currently viewing this session
      if (window.location.pathname === `/engine/${sessionId}`) {
        router.push('/engine');
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  return (
    <button 
      onClick={handleDelete}
      className="p-1 hover:bg-brutal-red hover:text-brutal-white rounded transition-colors"
      title="Delete Session"
    >
      <Trash weight="bold" />
    </button>
  );
}
