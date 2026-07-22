'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Folder, Robot, GraduationCap } from '@phosphor-icons/react';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export default function DashboardPage() {
  const { t } = useLanguage();

  return (
    <div className="w-full h-full flex flex-col bg-[#e5e5f7] overflow-auto">
      {/* Header */}
      <header className="h-20 w-full border-b-4 border-brutal-black bg-brutal-white flex items-center justify-between px-6 z-10 shrink-0">
        <h1 className="font-sans font-black text-2xl uppercase tracking-tight">
          {t('RINGKASAN DASHBOARD', 'DASHBOARD OVERVIEW')}
        </h1>
        <LanguageSwitcher />
      </header>

      {/* Main Content */}
      <main className="p-8 max-w-6xl w-full mx-auto flex flex-col gap-8">
        
        <section>
          <h2 className="font-mono font-bold text-xl uppercase mb-4 text-brutal-black">
            {t('AKSI CEPAT', 'QUICK ACTIONS')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/engine">
              <Card bg="yellow" className="p-6 cursor-pointer hover:-translate-y-2 hover:shadow-brutal transition-all h-full flex flex-col justify-between border-4 border-brutal-black">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Robot weight="bold" className="w-8 h-8" />
                    <h3 className="font-sans font-black text-xl uppercase">
                      {t('Mulai Mesin Proyek', 'Start Project Engine')}
                    </h3>
                  </div>
                  <p className="font-mono font-bold opacity-80 text-sm">
                    {t(
                      'Wawancara AI, kumpulkan kebutuhan, buat PRD, ADR, Skema DB, dan Prompt Atomis secara otomatis.',
                      'Interview AI, gather requirements, generate PRD, ADR, Schema, and Atomic Prompts automatically.'
                    )}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="primary" size="sm">
                    {t('Jalankan Mesin →', 'Launch Engine →')}
                  </Button>
                </div>
              </Card>
            </Link>

            <Link href="/learn">
              <Card bg="white" className="p-6 cursor-pointer hover:-translate-y-2 hover:shadow-brutal transition-all h-full flex flex-col justify-between border-4 border-brutal-black">
                <div>
                  <div className="flex items-center gap-3 mb-4 text-purple-700">
                    <GraduationCap weight="bold" className="w-8 h-8 text-brutal-black" />
                    <h3 className="font-sans font-black text-xl uppercase text-brutal-black">
                      {t('Mesin Pembelajaran AI', 'AI Learning Engine')}
                    </h3>
                  </div>
                  <p className="font-mono font-bold opacity-80 text-sm">
                    {t(
                      'Buat pohon roadmap gaya roadmap.sh interaktif untuk topik apapun dengan materi pelajaran & kuis bertahap.',
                      'Generate roadmap.sh-style interactive trees for any topic with micro-lessons & staged quizzes.'
                    )}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="secondary" size="sm">
                    {t('Pelajari Topik →', 'Learn Topic →')}
                  </Button>
                </div>
              </Card>
            </Link>

            <Link href="/projects">
              <Card bg="white" className="p-6 cursor-pointer hover:-translate-y-2 hover:shadow-brutal transition-all h-full flex flex-col justify-between border-4 border-brutal-black">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Folder weight="bold" className="w-8 h-8" />
                    <h3 className="font-sans font-black text-xl uppercase">
                      {t('Proyek Saya', 'My Projects')}
                    </h3>
                  </div>
                  <p className="font-mono font-bold opacity-80 text-sm">
                    {t(
                      'Lihat semua Proyek, PRD, ADR, Alur sistem, dan Skema database yang tersimpan.',
                      'View all your saved Projects, PRDs, ADRs, Flowcharts, and database schemas.'
                    )}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="secondary" size="sm">
                    {t('Lihat Proyek →', 'View Projects →')}
                  </Button>
                </div>
              </Card>
            </Link>
          </div>
        </section>

      </main>
    </div>
  );
}
