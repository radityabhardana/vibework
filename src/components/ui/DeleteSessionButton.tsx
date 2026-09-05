'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Trash, Warning } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';

const emptySubscribe = () => () => {};

export function DeleteSessionButton({ 
  sessionId, 
  sessionTitle,
  onDeleted,
}: { 
  sessionId: string; 
  sessionTitle?: string;
  onDeleted?: (id: string) => void;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting]);

  const handleOpenModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const handleCloseModal = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isDeleting) return;
    setIsOpen(false);
  };

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/chat/session/${sessionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Gagal menghapus sesi');
      }

      setIsOpen(false);
      // Immediately remove from client UI state
      onDeleted?.(sessionId);

      // Navigate to /engine without creating dirty browser history entry
      if (typeof window !== 'undefined' && window.location.pathname === `/engine/${sessionId}`) {
        router.replace('/engine');
      }
      router.refresh();
    } catch (err) {
      console.error('Failed to delete session', err);
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button 
        type="button"
        onClick={handleOpenModal}
        className="p-1 hover:bg-brutal-red hover:text-brutal-white rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brutal-black cursor-pointer"
        title="Hapus Histori Sesi"
        aria-label="Hapus histori sesi"
      >
        <Trash weight="bold" />
      </button>

      {isOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center bg-brutal-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-brutal-white border-4 border-brutal-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden text-brutal-black"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${sessionId}`}
          >
            {/* Modal Header */}
            <div className="bg-brutal-red text-brutal-white border-b-4 border-brutal-black p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warning weight="fill" className="w-5 h-5 text-brutal-white" />
                <h3 id={`delete-title-${sessionId}`} className="font-sans font-black text-lg uppercase tracking-wide">
                  Peringatan Hapus
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isDeleting}
                className="font-mono font-bold text-xs px-2.5 py-1 bg-brutal-white text-brutal-black border-2 border-brutal-black hover:bg-gray-100 disabled:opacity-50 cursor-pointer"
                title="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-4">
              <p className="font-mono text-sm leading-relaxed text-brutal-black">
                Apakah Anda yakin ingin menghapus histori <strong>The Grill</strong> ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
              </p>

              {sessionTitle && (
                <div className="border-2 border-brutal-black bg-brutal-yellow/20 p-3 font-mono text-xs">
                  <span className="font-bold block text-[10px] uppercase opacity-70 mb-1">Target Histori:</span>
                  <span className="font-bold text-sm text-brutal-black break-words line-clamp-2">
                    {sessionTitle}
                  </span>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex gap-3 justify-end pt-2">
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleCloseModal}
                  disabled={isDeleting}
                  className="!border-2 !shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  Batal
                </Button>
                <Button 
                  type="button" 
                  variant="danger" 
                  size="sm" 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="gap-2 !border-2 !shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                  <Trash weight="bold" />
                  {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
