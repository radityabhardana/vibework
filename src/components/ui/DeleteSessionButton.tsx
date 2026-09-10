'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Trash, Warning } from '@phosphor-icons/react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';

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
  const { t } = useLanguage();
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
        throw new Error(t('Gagal menghapus sesi', 'Failed to delete the session'));
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
        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-rose-500/50 cursor-pointer"
        title={t('Hapus Histori Sesi', 'Delete session history')}
        aria-label={t('Hapus histori sesi', 'Delete session history')}
      >
        <Trash weight="bold" className="w-3.5 h-3.5" />
      </button>

      {isOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-zinc-900 border border-white/10 shadow-2xl rounded-xl max-w-md w-full flex flex-col animate-in zoom-in-95 duration-150 overflow-hidden text-zinc-100"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`delete-title-${sessionId}`}
          >
            {/* Modal Header */}
            <div className="bg-zinc-950/70 border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Warning weight="fill" className="w-4 h-4" />
                </div>
                <h3 id={`delete-title-${sessionId}`} className="font-sans font-semibold text-base text-zinc-100">
                  {t('Hapus Histori Proyek', 'Delete Project History')}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isDeleting}
                className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                title={t('Tutup', 'Close')}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col gap-4">
              <p className="font-sans text-sm leading-relaxed text-zinc-300">
                {t('Apakah Anda yakin ingin menghapus histori', 'Are you sure you want to delete the history for')} <strong>The Grill</strong> {t('ini? Sesi dan data terkait akan dihapus secara permanen.', 'This session and related data will be permanently deleted.')}
              </p>

              {sessionTitle && (
                <div className="border border-white/10 bg-zinc-950/60 rounded-lg p-3 font-mono text-xs">
                  <span className="font-semibold block text-[10px] uppercase text-zinc-500 mb-1">{t('Target Proyek:', 'Project Target:')}</span>
                  <span className="font-medium text-sm text-zinc-200 break-words line-clamp-2">
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
                >
                  {t('Batal', 'Cancel')}
                </Button>
                <Button 
                  type="button" 
                  variant="danger" 
                  size="sm" 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="gap-2"
                >
                  <Trash weight="bold" />
                  {isDeleting ? t('Menghapus...', 'Deleting...') : t('Ya, Hapus', 'Yes, delete')}
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
