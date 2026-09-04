'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Robot, GraduationCap, Waveform, WarningCircle } from '@phosphor-icons/react';
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Link href="/engine">
              <Card bg="yellow" className="p-6 cursor-pointer hover:-translate-y-2 hover:shadow-brutal transition-all h-full flex flex-col justify-between border-4 border-brutal-black">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Robot weight="bold" className="w-8 h-8" />
                    <h3 className="font-sans font-black text-xl uppercase">
                      {t('The Grill: Mesin Proyek', 'The Grill: Project Engine')}
                    </h3>
                  </div>
                  <p className="font-mono font-bold opacity-80 text-sm">
                    {t(
                      'Mulai proyek baru atau lanjutkan proyek dan histori sebelumnya. Semua tersimpan bersama di The Grill.',
                      'Start a new project or continue a previous project and its history. Everything lives together in The Grill.'
                    )}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="primary" size="sm">
                    {t('Buka The Grill →', 'Open The Grill →')}
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

            <Link href="/voice" className="md:col-span-2 xl:col-span-1">
              <Card bg="blue" className="p-6 cursor-pointer hover:-translate-y-2 hover:shadow-brutal transition-all h-full flex flex-col justify-between border-4 border-brutal-black relative">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-3">
                      <Waveform weight="bold" className="w-8 h-8" />
                      <h3 className="font-sans font-black text-xl uppercase">
                        {t('Gudang & Studio Suara', 'Voice Warehouse & Studio')}
                      </h3>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] sm:text-xs font-black uppercase px-2.5 py-1 bg-brutal-red text-brutal-white border-2 border-brutal-black shadow-[2px_2px_0px_0px_rgba(5,5,5,1)] flex items-center gap-1.5">
                      <WarningCircle weight="fill" className="w-4 h-4 text-brutal-white shrink-0" />
                      <span>UNDER CONSTRUCTION</span>
                    </span>
                  </div>

                  <div className="mb-4 p-3 bg-brutal-red text-brutal-white border-2 border-brutal-black font-mono text-xs font-bold flex items-start gap-2 shadow-[2px_2px_0px_0px_rgba(5,5,5,1)]">
                    <WarningCircle weight="bold" className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {t(
                        'Peringatan: Modul studio suara masih dalam tahap pengembangan (Under Construction).',
                        'Warning: Voice studio module is currently under construction.'
                      )}
                    </span>
                  </div>

                  <p className="font-mono font-bold opacity-80 text-sm">
                    {t(
                      'Pilih voice dari gudang suara, tulis teks, lalu generate narasi dengan karakter suara yang konsisten.',
                      'Choose a voice from the warehouse, enter text, and generate narration with a consistent voice character.'
                    )}
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="secondary" size="sm">
                    {t('Buka Studio →', 'Open Studio →')}
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
