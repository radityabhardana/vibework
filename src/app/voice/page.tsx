'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  DownloadSimple,
  MagicWand,
  MagnifyingGlass,
  Pause,
  Play,
  Plus,
  ShieldCheck,
  SlidersHorizontal,
  SpeakerHigh,
  Stop,
  TextT,
  Trash,
  UploadSimple,
  Waveform,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';
import type { VoiceDesignSettings, VoiceGenerationDto, VoiceProfileDto } from '@/lib/voice/types';

type VoiceEntry = {
  id: string;
  name: string;
  lang: string;
  local: boolean;
  voice: SpeechSynthesisVoice | null;
  source: 'system' | 'provider';
  profile?: VoiceProfileDto;
};

type ProviderStatus = {
  configured: boolean;
  modelStudioConfigured: boolean;
  ossConfigured: boolean;
  region: string;
  cloneModel: string;
  designModel: string;
};

type PlaybackState = 'idle' | 'queued' | 'playing' | 'paused' | 'error';
type LanguageFilter = 'all' | 'id' | 'en';
type AddMode = 'clone' | 'design';

const MAX_TEXT_LENGTH = 3_000;
const MAX_SAMPLE_SIZE = 10 * 1024 * 1024;
const HIDDEN_VOICES_KEY = 'vibework_hidden_system_voices';
const DEFAULT_DESIGN: VoiceDesignSettings = {
  gender: 'neutral',
  age: 'young-adult',
  pitch: 'medium',
  pace: 'medium',
  tone: 'warm',
  texture: 'clear',
  condition: 'healthy',
  intensity: 'moderate',
  useCase: 'narration',
  customInstruction: '',
};

const DESIGN_OPTIONS = {
  gender: ['male', 'female', 'neutral'],
  age: ['child', 'teen', 'young-adult', 'middle-aged', 'senior'],
  pitch: ['very-low', 'low', 'medium', 'high', 'very-high'],
  pace: ['very-slow', 'slow', 'medium', 'fast', 'very-fast'],
  tone: ['warm', 'calm', 'authoritative', 'cheerful', 'dramatic', 'empathetic', 'mysterious'],
  texture: ['clear', 'airy', 'velvety', 'raspy', 'breathy', 'resonant', 'crisp'],
  condition: ['healthy', 'sleepy', 'tired', 'whispered', 'hoarse', 'excited'],
  intensity: ['subtle', 'moderate', 'strong'],
  useCase: ['narration', 'commercial', 'audiobook', 'assistant', 'character', 'education'],
} as const;

function voiceInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'VO';
}

function optionLabel(value: string) {
  return value.replaceAll('-', ' ');
}

async function responseError(response: Response) {
  const data: unknown = await response.json().catch(() => null);
  return typeof data === 'object' && data !== null && 'error' in data
    ? String(data.error)
    : `Request failed (${response.status}).`;
}

export default function VoiceStudioPage() {
  const { language, t } = useLanguage();
  const [systemVoices, setSystemVoices] = useState<VoiceEntry[]>([]);
  const [providerVoices, setProviderVoices] = useState<VoiceEntry[]>([]);
  const [generations, setGenerations] = useState<VoiceGenerationDto[]>([]);
  const [providerStatus, setProviderStatus] = useState<ProviderStatus | null>(null);
  const [hiddenVoiceIds, setHiddenVoiceIds] = useState<string[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [query, setQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>('all');
  const [text, setText] = useState('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showAddVoice, setShowAddVoice] = useState(false);
  const [addMode, setAddMode] = useState<AddMode>('clone');
  const [voiceName, setVoiceName] = useState('');
  const [voiceLang, setVoiceLang] = useState('id-ID');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [design, setDesign] = useState<VoiceDesignSettings>(DEFAULT_DESIGN);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadProviderVoices = async () => {
      try {
        const [voicesResponse, configResponse] = await Promise.all([
          fetch('/api/voices', { cache: 'no-store' }),
          fetch('/api/voices/config', { cache: 'no-store' }),
        ]);
        if (!voicesResponse.ok || !configResponse.ok) throw new Error('Provider warehouse request failed.');
        const voicesData = await voicesResponse.json() as { voices: VoiceProfileDto[]; generations: VoiceGenerationDto[] };
        const configData = await configResponse.json() as ProviderStatus;
        if (cancelled) return;
        const entries = voicesData.voices.map((profile): VoiceEntry => ({
          id: `provider:${profile.id}`,
          name: profile.name,
          lang: profile.language,
          local: false,
          voice: null,
          source: 'provider',
          profile,
        }));
        setProviderVoices(entries);
        setGenerations(voicesData.generations);
        setProviderStatus(configData);
        setSelectedVoiceId(current => current || entries.find(entry => entry.profile?.status === 'ready')?.id || '');
      } catch {
        if (!cancelled) setError(t('Gudang suara provider gagal dimuat.', 'The provider voice warehouse could not be loaded.'));
      } finally {
        if (!cancelled) setLoadingVoices(false);
      }
    };
    void loadProviderVoices();

    const hiddenTimer = window.setTimeout(() => {
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(HIDDEN_VOICES_KEY) || '[]');
        if (Array.isArray(stored) && stored.every(id => typeof id === 'string')) setHiddenVoiceIds(stored);
      } catch {
        localStorage.removeItem(HIDDEN_VOICES_KEY);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(hiddenTimer);
      audioRef.current?.pause();
    };
  }, [t]);

  useEffect(() => {
    const synth = Reflect.get(window, 'speechSynthesis') as SpeechSynthesis | undefined;
    if (!synth) {
      const unsupportedTimer = window.setTimeout(() => {
        setSupported(false);
        setLoadingVoices(false);
      }, 0);
      return () => window.clearTimeout(unsupportedTimer);
    }

    const loadVoices = () => {
      const preferredPrefix = language === 'id' ? 'id' : 'en';
      const entries = synth.getVoices().map((voice): VoiceEntry => ({
        id: `system:${voice.voiceURI || voice.name}:${voice.lang}`,
        name: voice.name,
        lang: voice.lang || 'und',
        local: voice.localService,
        voice,
        source: 'system',
      })).sort((a, b) => {
        const aPreferred = a.lang.toLowerCase().startsWith(preferredPrefix) ? 0 : 1;
        const bPreferred = b.lang.toLowerCase().startsWith(preferredPrefix) ? 0 : 1;
        return aPreferred - bPreferred || Number(b.local) - Number(a.local) || a.name.localeCompare(b.name);
      });
      if (entries.length === 0) {
        entries.push({
          id: 'system-default',
          name: t('Suara Default Perangkat', 'System Default Voice'),
          lang: navigator.language || (language === 'id' ? 'id-ID' : 'en-US'),
          local: true,
          voice: null,
          source: 'system',
        });
      }
      setSystemVoices(entries);
      setSelectedVoiceId(current => current || entries[0].id);
      setSupported(true);
      setLoadingVoices(false);
    };

    synth.addEventListener('voiceschanged', loadVoices);
    const timer = window.setTimeout(loadVoices, 0);
    return () => {
      window.clearTimeout(timer);
      synth.removeEventListener('voiceschanged', loadVoices);
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
      }
      synth.cancel();
    };
  }, [language, t]);

  const visibleSystemVoices = systemVoices.filter(voice => !hiddenVoiceIds.includes(voice.id));
  const allVoices = [...providerVoices, ...visibleSystemVoices];
  const selectedVoice = allVoices.find(voice => voice.id === selectedVoiceId) || allVoices[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredVoices = allVoices.filter(voice => {
    const matchesLanguage = languageFilter === 'all' || voice.lang.toLowerCase().startsWith(languageFilter);
    return matchesLanguage && (!normalizedQuery || `${voice.name} ${voice.lang}`.toLowerCase().includes(normalizedQuery));
  });

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    const synth = Reflect.get(window, 'speechSynthesis') as SpeechSynthesis | undefined;
    synth?.cancel();
    setPlaybackState('idle');
  };

  const playAudio = (url: string) => {
    stopPlayback();
    const audio = new Audio(url);
    audio.playbackRate = rate;
    audio.onplay = () => setPlaybackState('playing');
    audio.onended = () => {
      audioRef.current = null;
      setPlaybackState('idle');
    };
    audio.onerror = () => {
      audioRef.current = null;
      setPlaybackState('error');
      setError(t('Audio gagal diputar.', 'The audio could not be played.'));
    };
    audioRef.current = audio;
    setError(null);
    setPlaybackState('queued');
    void audio.play().catch(() => {
      audioRef.current = null;
      setPlaybackState('error');
      setError(t('Browser memblokir pemutaran audio.', 'The browser blocked audio playback.'));
    });
  };

  const speakWithSystemVoice = (voice: VoiceEntry, content: string) => {
    if (!supported) {
      setError(t('Voice engine tidak tersedia pada browser ini.', 'The voice engine is unavailable in this browser.'));
      return;
    }
    stopPlayback();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.voice = voice.voice;
    utterance.lang = voice.lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onstart = () => setPlaybackState('playing');
    utterance.onend = () => {
      utteranceRef.current = null;
      setPlaybackState('idle');
    };
    utterance.onerror = event => {
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      setPlaybackState('error');
      setError(t('Suara gagal dibuat. Coba voice lain.', 'Speech generation failed. Try another voice.'));
    };
    utteranceRef.current = utterance;
    setError(null);
    setPlaybackState('queued');
    window.speechSynthesis.speak(utterance);
  };

  const generateSpeech = async () => {
    const normalizedText = text.trim();
    if (!selectedVoice || !normalizedText) return;
    if (selectedVoice.source === 'system') {
      speakWithSystemVoice(selectedVoice, normalizedText);
      return;
    }
    if (selectedVoice.profile?.status !== 'ready') {
      setError(t('Voice provider belum siap digunakan.', 'The provider voice is not ready.'));
      return;
    }

    setPlaybackState('queued');
    setError(null);
    try {
      const response = await fetch('/api/voices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceId: selectedVoice.profile.id,
          text: normalizedText,
          rate,
          pitch,
          settings: selectedVoice.profile.settings,
        }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json() as { generation: VoiceGenerationDto };
      setGenerations(current => [data.generation, ...current].slice(0, 20));
      if (data.generation.audioUrl) playAudio(data.generation.audioUrl);
    } catch (reason: unknown) {
      setPlaybackState('error');
      setError(reason instanceof Error ? reason.message : t('Generate suara gagal.', 'Voice generation failed.'));
    }
  };

  const previewVoice = (event: React.MouseEvent<HTMLButtonElement>) => {
    const voice = allVoices.find(entry => entry.id === event.currentTarget.dataset.voiceId);
    if (!voice) return;
    setSelectedVoiceId(voice.id);
    if (voice.source === 'provider' && voice.profile) {
      playAudio(`/api/voices/${voice.profile.id}/audio`);
      return;
    }
    const sample = voice.lang.toLowerCase().startsWith('id')
      ? 'Halo, ini adalah contoh suara dari gudang suara Vibework.'
      : 'Hello, this is a voice preview from the Vibework voice warehouse.';
    speakWithSystemVoice(voice, sample);
  };

  const togglePause = () => {
    if (audioRef.current) {
      if (playbackState === 'playing') {
        audioRef.current.pause();
        setPlaybackState('paused');
      } else if (playbackState === 'paused') {
        void audioRef.current.play();
      }
      return;
    }
    if (playbackState === 'playing') {
      window.speechSynthesis.pause();
      setPlaybackState('paused');
    } else if (playbackState === 'paused') {
      window.speechSynthesis.resume();
      setPlaybackState('playing');
    }
  };

  const resetAddForm = () => {
    setVoiceName('');
    setVoiceLang(language === 'id' ? 'id-ID' : 'en-US');
    setVoiceFile(null);
    setDesign(DEFAULT_DESIGN);
    setConsentConfirmed(false);
    setShowAddVoice(false);
  };

  const addVoice = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = voiceName.trim();
    if (!normalizedName || !voiceLang.trim() || !consentConfirmed) {
      setError(t('Nama, bahasa, dan konfirmasi izin wajib diisi.', 'Name, language, and consent confirmation are required.'));
      return;
    }
    if (addMode === 'clone' && (!voiceFile || !voiceFile.type.startsWith('audio/') || voiceFile.size > MAX_SAMPLE_SIZE)) {
      setError(t('Pilih file audio yang valid dengan ukuran maksimal 10 MB.', 'Choose a valid audio file up to 10 MB.'));
      return;
    }
    if (!providerStatus?.configured) {
      setError(t('Lengkapi konfigurasi Model Studio dan OSS terlebih dahulu.', 'Configure Model Studio and OSS first.'));
      return;
    }

    setSavingVoice(true);
    setError(null);
    try {
      let response: Response;
      if (addMode === 'clone') {
        const form = new FormData();
        form.set('name', normalizedName);
        form.set('language', voiceLang.trim());
        form.set('consent', 'true');
        form.set('audio', voiceFile as File);
        response = await fetch('/api/voices/clone', { method: 'POST', body: form });
      } else {
        response = await fetch('/api/voices/design', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: normalizedName, language: voiceLang.trim(), consent: true, settings: design }),
        });
      }
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json() as { voice: VoiceProfileDto };
      const entry: VoiceEntry = {
        id: `provider:${data.voice.id}`,
        name: data.voice.name,
        lang: data.voice.language,
        local: false,
        voice: null,
        source: 'provider',
        profile: data.voice,
      };
      setProviderVoices(current => [entry, ...current]);
      setSelectedVoiceId(entry.id);
      resetAddForm();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : t('Voice gagal dibuat.', 'The voice could not be created.'));
    } finally {
      setSavingVoice(false);
    }
  };

  const removeVoice = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const voice = allVoices.find(entry => entry.id === event.currentTarget.dataset.voiceId);
    if (!voice) return;
    const message = voice.source === 'provider'
      ? t(`Hapus voice provider "${voice.name}" beserta hasil audionya?`, `Delete provider voice "${voice.name}" and its generated audio?`)
      : t(`Sembunyikan voice bawaan "${voice.name}" dari gudang?`, `Hide the system voice "${voice.name}" from the warehouse?`);
    if (!window.confirm(message)) return;
    stopPlayback();

    if (voice.source === 'provider' && voice.profile) {
      try {
        const response = await fetch(`/api/voices/${voice.profile.id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(await responseError(response));
        const remaining = providerVoices.filter(entry => entry.id !== voice.id);
        setProviderVoices(remaining);
        setGenerations(current => current.filter(generation => generation.voiceId !== voice.profile?.id));
        if (selectedVoiceId === voice.id) setSelectedVoiceId(remaining[0]?.id || visibleSystemVoices[0]?.id || '');
      } catch (reason: unknown) {
        setError(reason instanceof Error ? reason.message : t('Voice gagal dihapus.', 'The voice could not be deleted.'));
      }
      return;
    }

    const nextHiddenVoiceIds = [...new Set([...hiddenVoiceIds, voice.id])];
    setHiddenVoiceIds(nextHiddenVoiceIds);
    localStorage.setItem(HIDDEN_VOICES_KEY, JSON.stringify(nextHiddenVoiceIds));
    if (selectedVoiceId === voice.id) setSelectedVoiceId(providerVoices[0]?.id || systemVoices.find(entry => !nextHiddenVoiceIds.includes(entry.id))?.id || '');
  };

  const restoreSystemVoices = () => {
    setHiddenVoiceIds([]);
    localStorage.removeItem(HIDDEN_VOICES_KEY);
    if (!selectedVoiceId) setSelectedVoiceId(providerVoices[0]?.id || systemVoices[0]?.id || '');
  };

  const updateDesign = <K extends keyof VoiceDesignSettings>(key: K, value: VoiceDesignSettings[K]) => {
    setDesign(current => ({ ...current, [key]: value }));
  };

  const statusLabel = playbackState === 'playing'
    ? t('Sedang diputar', 'Playing')
    : playbackState === 'paused'
      ? t('Dijeda', 'Paused')
      : playbackState === 'queued'
        ? t('Memproses suara', 'Processing voice')
        : playbackState === 'error' ? t('Gagal', 'Failed') : t('Siap', 'Ready');

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#030303] text-white selection:bg-white selection:text-black relative">
      {/* Ambient Top Glow & Subtle Dot Grid */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_70%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="flex min-h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#030303]/80 backdrop-blur-md px-4 sm:px-6 z-10">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="shrink-0">
            <Button variant="secondary" size="sm" className="!p-2 text-zinc-400 hover:text-white" aria-label={t('Kembali ke dashboard', 'Back to dashboard')}>
              <ArrowLeft weight="bold" size={18} />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-sans text-base font-bold text-white sm:text-lg">Voice Warehouse</h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full border border-white/15 bg-white/5 font-mono text-[10px] text-zinc-300">
                AI Studio
              </span>
            </div>
            <p className="hidden font-sans text-xs text-zinc-400 sm:block">
              {t('Suara perangkat dan Qwen TTS dalam satu studio.', 'Device voices and Qwen TTS in one studio.')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className={`hidden px-2.5 py-1 rounded-full font-mono text-[10px] font-semibold md:inline-flex items-center gap-1.5 ${providerStatus?.configured ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-white/10 bg-white/5 text-zinc-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${providerStatus?.configured ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
            {providerStatus?.configured ? 'QWEN DIRECT ACTIVE' : t('Provider belum siap', 'Provider not ready')}
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 z-0">
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(23rem,0.85fr)]">
          
          {/* Left Column: Voice Warehouse */}
          <section className="min-w-0 rounded-2xl border border-white/10 bg-zinc-900/40 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="border-b border-white/10 p-4 sm:p-6 bg-white/[0.01]">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <div className="mb-1.5 flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white">
                      <SpeakerHigh weight="fill" size={20} />
                    </div>
                    <h2 className="font-sans text-xl font-bold text-white sm:text-2xl">{t('Gudang Suara', 'Voice Warehouse')}</h2>
                  </div>
                  <p className="max-w-2xl font-sans text-xs text-zinc-400 leading-relaxed">
                    {t('Clone sampel berizin, rancang karakter original, atau gunakan voice perangkat.', 'Clone a consented sample, design an original character, or use a device voice.')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {hiddenVoiceIds.length > 0 && (
                    <button type="button" onClick={restoreSystemVoices} className="font-mono text-[11px] text-zinc-400 hover:text-white underline underline-offset-4 cursor-pointer">
                      {t(`Pulihkan ${hiddenVoiceIds.length}`, `Restore ${hiddenVoiceIds.length}`)}
                    </button>
                  )}
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-xs text-zinc-300">
                    {allVoices.length} {t('SUARA', 'VOICES')}
                  </span>
                  <Button type="button" variant="primary" size="sm" onClick={() => setShowAddVoice(current => !current)} className="gap-1.5 text-xs font-sans">
                    <Plus weight="bold" size={14} /> {t('Buat Suara', 'Create Voice')}
                  </Button>
                </div>
              </div>

              {/* Add Voice Form */}
              {showAddVoice && (
                <form onSubmit={addVoice} className="mt-5 rounded-xl border border-white/15 bg-[#09090c] p-4 sm:p-5 shadow-2xl animate-in fade-in">
                  <div className="mb-4 grid grid-cols-2 p-1 rounded-xl bg-black/50 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setAddMode('clone')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg font-sans text-xs font-semibold transition-colors cursor-pointer ${
                        addMode === 'clone' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <UploadSimple weight="bold" size={16} /> {t('Clone Sampel', 'Clone Sample')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMode('design')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg font-sans text-xs font-semibold transition-colors cursor-pointer ${
                        addMode === 'design' ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <MagicWand weight="bold" size={16} /> {t('Rancang Suara', 'Design Voice')}
                    </button>
                  </div>

                  {!providerStatus?.configured && (
                    <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 font-mono text-xs text-amber-200">
                      {t('Set DASHSCOPE_* dan ALIYUN_OSS_* pada server untuk mengaktifkan clone dan design.', 'Set DASHSCOPE_* and ALIYUN_OSS_* on the server to enable clone and design.')}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="font-mono text-xs text-zinc-300">
                      <span className="block mb-1.5 uppercase text-[10px] text-zinc-400 tracking-wider">{t('Nama Voice', 'Voice Name')}</span>
                      <input
                        value={voiceName}
                        onChange={event => setVoiceName(event.target.value)}
                        maxLength={80}
                        placeholder={t('Contoh: Narator Senja', 'Example: Dusk Narrator')}
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans"
                      />
                    </label>
                    <label className="font-mono text-xs text-zinc-300">
                      <span className="block mb-1.5 uppercase text-[10px] text-zinc-400 tracking-wider">{t('Kode Bahasa', 'Language Code')}</span>
                      <input
                        value={voiceLang}
                        onChange={event => setVoiceLang(event.target.value)}
                        maxLength={20}
                        placeholder="id-ID"
                        className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 font-sans"
                      />
                    </label>
                  </div>

                  {addMode === 'clone' ? (
                    <label className="mt-4 block font-mono text-xs text-zinc-300">
                      <span className="block mb-1.5 uppercase text-[10px] text-zinc-400 tracking-wider">{t('Sampel Jernih 10-20 Detik (Maks. 10 MB)', 'Clear 10-20 Second Sample (Max. 10 MB)')}</span>
                      <input
                        type="file"
                        accept="audio/*"
                        onChange={event => setVoiceFile(event.target.files?.[0] || null)}
                        className="block w-full rounded-xl border border-white/10 bg-black/60 p-2 font-mono text-xs text-zinc-300 file:mr-3 file:rounded-lg file:border file:border-white/15 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:font-sans file:text-white file:cursor-pointer"
                      />
                    </label>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(Object.keys(DESIGN_OPTIONS) as Array<keyof typeof DESIGN_OPTIONS>).map(key => (
                        <label key={key} className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                          <span className="block mb-1">{optionLabel(key)}</span>
                          <select
                            value={design[key]}
                            onChange={event => updateDesign(key, event.target.value as never)}
                            className="w-full rounded-lg border border-white/10 bg-black/70 px-2.5 py-1.5 font-sans text-xs text-white capitalize focus:outline-none focus:border-white/30"
                          >
                            {DESIGN_OPTIONS[key].map(option => <option key={option} value={option}>{optionLabel(option)}</option>)}
                          </select>
                        </label>
                      ))}
                      <label className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider sm:col-span-2 lg:col-span-3">
                        <span className="block mb-1">{t('Arahan Tambahan', 'Additional Direction')}</span>
                        <textarea
                          value={design.customInstruction}
                          onChange={event => updateDesign('customInstruction', event.target.value)}
                          maxLength={400}
                          rows={2}
                          placeholder={t('Contoh: artikulasi Indonesia yang natural, jeda pendek...', 'Example: natural Indonesian articulation, short pauses...')}
                          className="w-full resize-y rounded-xl border border-white/10 bg-black/60 px-3 py-2 font-sans text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30"
                        />
                      </label>
                    </div>
                  )}

                  <label className="mt-4 flex items-start gap-2.5 font-sans text-xs text-zinc-400 leading-relaxed cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentConfirmed}
                      onChange={event => setConsentConfirmed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/60 accent-white shrink-0"
                    />
                    <span>
                      {addMode === 'clone'
                        ? t('Saya memiliki izin eksplisit pemilik suara untuk cloning dan sintesis.', 'I have the voice owner\'s explicit permission for cloning and synthesis.')
                        : t('Saya akan menggunakan karakter original ini secara bertanggung jawab.', 'I will use this original character responsibly.')}
                    </span>
                  </label>

                  <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center border-t border-white/10 pt-3">
                    <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
                      {addMode === 'clone' ? 'QWEN AUDIO ENROLLMENT' : 'QWEN VOICE DESIGN + ENROLLMENT'}
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={resetAddForm}>
                        {t('Batal', 'Cancel')}
                      </Button>
                      <Button type="submit" variant="primary" size="sm" disabled={savingVoice || !providerStatus?.configured}>
                        {savingVoice ? t('Memproses...', 'Processing...') : addMode === 'clone' ? t('Clone Voice', 'Clone Voice') : t('Rancang Voice', 'Design Voice')}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {/* Search and Language Filters */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">{t('Cari suara', 'Search voices')}</span>
                  <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" weight="bold" size={18} />
                  <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder={t('Cari nama atau bahasa...', 'Search name or language...')}
                    className="w-full rounded-xl border border-white/10 bg-black/50 py-2.5 pr-4 pl-10 font-sans text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/15"
                  />
                </label>
                <div className="flex p-1 rounded-xl bg-black/40 border border-white/10 shrink-0" aria-label={t('Filter bahasa', 'Language filter')}>
                  {(['all', 'id', 'en'] as const).map(filter => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setLanguageFilter(filter)}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold uppercase transition-colors cursor-pointer ${
                        languageFilter === filter ? 'bg-white text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {filter === 'all' ? t('Semua', 'All') : filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Voice Cards List */}
            <div className="grid max-h-[38rem] grid-cols-1 gap-2.5 overflow-y-auto p-4 sm:grid-cols-2 sm:p-6">
              {loadingVoices && allVoices.length === 0 ? (
                [1, 2, 3, 4].map(item => (
                  <div key={item} className="h-20 animate-pulse rounded-xl border border-white/5 bg-white/[0.02]" />
                ))
              ) : filteredVoices.length === 0 ? (
                <div className="col-span-full rounded-xl border border-dashed border-white/10 p-8 text-center">
                  <p className="font-sans text-xs text-zinc-500">
                    {t('Suara tidak ditemukan.', 'No matching voices found.')}
                  </p>
                </div>
              ) : (
                filteredVoices.map((voice, index) => {
                  const selected = voice.id === selectedVoiceId;
                  const ready = voice.source === 'system' || voice.profile?.status === 'ready';
                  return (
                    <article
                      key={voice.id}
                      className={`flex min-w-0 items-center justify-between rounded-xl border transition-all duration-150 group p-2 ${
                        selected
                          ? 'bg-white/10 border-white/30 ring-1 ring-white/20 shadow-lg'
                          : 'bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedVoiceId(voice.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left focus:outline-none cursor-pointer"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                            selected ? 'bg-white text-black' : 'bg-white/5 border border-white/10 text-zinc-300'
                          }`}
                        >
                          {voiceInitials(voice.name)}
                        </span>
                        <span className="min-w-0 flex-1 pr-2">
                          <span className="block truncate font-sans text-xs font-semibold text-white">
                            {voice.name}
                          </span>
                          <span className="mt-0.5 block font-mono text-[10px] text-zinc-400 uppercase">
                            {voice.lang} · {voice.source === 'provider' ? `${voice.profile?.kind}` : voice.local ? t('Perangkat', 'Device') : t('Jaringan', 'Network')} · #{String(index + 1).padStart(2, '0')}
                          </span>
                        </span>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          data-voice-id={voice.id}
                          onClick={previewVoice}
                          disabled={!ready || playbackState === 'queued'}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
                          aria-label={`${t('Preview', 'Preview')} ${voice.name}`}
                        >
                          <Play weight="fill" size={16} />
                        </button>
                        <button
                          type="button"
                          data-voice-id={voice.id}
                          onClick={removeVoice}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                          aria-label={`${voice.source === 'provider' ? t('Hapus', 'Delete') : t('Sembunyikan', 'Hide')} ${voice.name}`}
                        >
                          <Trash weight="bold" size={16} />
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          {/* Right Column: Voice Studio Deck */}
          <section className="h-fit rounded-2xl border border-white/15 bg-[#08080b]/90 shadow-2xl backdrop-blur-2xl xl:sticky xl:top-6 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4 sm:p-5 bg-white/[0.01]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-white">
                  <Waveform weight="fill" size={20} />
                </div>
                <h2 className="font-sans text-lg font-bold text-white tracking-tight">Voice Studio</h2>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full font-mono text-[10px] font-semibold uppercase ${
                  playbackState === 'playing'
                    ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 animate-pulse'
                    : 'border border-white/10 bg-white/5 text-zinc-400'
                }`}
              >
                {statusLabel}
              </span>
            </div>

            <div className="flex flex-col gap-4 p-4 sm:p-5">
              {/* Active Voice Info Card */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-300 shrink-0 mt-0.5">
                  <SpeakerHigh weight="fill" size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-mono text-[10px] uppercase text-zinc-500 block mb-0.5">
                    {t('Suara Aktif', 'Active Voice')}
                  </span>
                  <div className="truncate font-sans text-sm font-bold text-white">
                    {selectedVoice?.name || t('Memuat suara...', 'Loading voices...')}
                  </div>
                  <p className="font-mono text-[11px] text-zinc-400 mt-0.5">
                    {selectedVoice?.lang || '---'} · {selectedVoice?.source === 'provider' ? `MODEL STUDIO · ${selectedVoice.profile?.targetModel}` : t('TTS Perangkat', 'Device TTS')}
                  </p>
                </div>
              </div>

              {selectedVoice?.source === 'provider' && selectedVoice.profile?.status !== 'ready' && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200 text-xs">
                  <p className="font-sans font-bold uppercase">{t('Voice Belum Siap', 'Voice Not Ready')}</p>
                  <p className="mt-0.5 font-mono text-[11px]">{selectedVoice.profile?.errorMessage || selectedVoice.profile?.status}</p>
                </div>
              )}

              {/* Textarea for Script */}
              <div>
                <label htmlFor="voice-script" className="mb-2 flex items-center justify-between gap-3 font-sans text-xs font-semibold text-zinc-300">
                  <span className="flex items-center gap-1.5"><TextT weight="bold" size={16} /> {t('Teks Narasi', 'Narration Text')}</span>
                  <span className="font-mono text-[10px] tabular-nums text-zinc-500">{text.length}/{MAX_TEXT_LENGTH}</span>
                </label>
                <textarea
                  id="voice-script"
                  value={text}
                  onChange={event => setText(event.target.value)}
                  maxLength={MAX_TEXT_LENGTH}
                  rows={6}
                  placeholder={t('Tulis kalimat yang ingin dibacakan dengan suara terpilih...', 'Write the text to read with the selected voice...')}
                  className="w-full resize-y rounded-xl border border-white/10 bg-black/60 p-3.5 font-sans text-xs sm:text-sm text-white leading-relaxed outline-none placeholder:text-zinc-600 focus:border-white/30 focus:ring-1 focus:ring-white/15"
                />
              </div>

              {/* Sliders for Controls */}
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5">
                <div className="mb-3 flex items-center gap-2 font-sans text-xs font-semibold text-zinc-300">
                  <SlidersHorizontal weight="bold" size={16} />
                  <span>{t('Kontrol Suara', 'Voice Controls')}</span>
                </div>
                <div className="space-y-3">
                  <label className="block font-mono text-xs text-zinc-400">
                    <span className="flex justify-between text-[11px]">
                      <span>{t('Kecepatan', 'Speed')}</span>
                      <span className="tabular-nums font-bold text-white">{rate.toFixed(1)}x</span>
                    </span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={rate}
                      onChange={event => setRate(Number(event.target.value))}
                      className="mt-1.5 w-full accent-white h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </label>
                  <label className="block font-mono text-xs text-zinc-400">
                    <span className="flex justify-between text-[11px]">
                      <span>{t('Nada', 'Pitch')}</span>
                      <span className="tabular-nums font-bold text-white">{pitch.toFixed(1)}</span>
                    </span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={pitch}
                      onChange={event => setPitch(Number(event.target.value))}
                      className="mt-1.5 w-full accent-white h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 font-mono text-xs text-rose-200">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-[1fr_auto_auto] gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void generateSpeech()}
                  disabled={!selectedVoice || !text.trim() || playbackState === 'queued' || (selectedVoice.source === 'provider' && selectedVoice.profile?.status !== 'ready')}
                  className="min-w-0 gap-2 font-sans font-semibold text-xs"
                >
                  <Play weight="fill" size={16} />
                  <span className="truncate">{selectedVoice?.source === 'provider' ? t('Generate Qwen', 'Generate with Qwen') : t('Putar Perangkat', 'Play on Device')}</span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={togglePause}
                  disabled={playbackState !== 'playing' && playbackState !== 'paused'}
                  className="!px-3.5"
                  aria-label={playbackState === 'paused' ? t('Lanjutkan', 'Resume') : t('Jeda', 'Pause')}
                >
                  {playbackState === 'paused' ? <Play weight="fill" size={16} /> : <Pause weight="fill" size={16} />}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={stopPlayback}
                  disabled={playbackState === 'idle' || playbackState === 'error'}
                  className="!px-3.5"
                  aria-label={t('Berhenti', 'Stop')}
                >
                  <Stop weight="fill" size={16} />
                </Button>
              </div>

              {/* Recent Output Generations */}
              {generations.length > 0 && (
                <div className="border-t border-white/10 pt-3">
                  <h3 className="font-mono text-[10px] uppercase text-zinc-500 font-semibold mb-2">
                    {t('Hasil Terbaru', 'Recent Output')}
                  </h3>
                  <div className="space-y-1.5">
                    {generations.slice(0, 3).map(generation => (
                      <div key={generation.id} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2">
                        <button
                          type="button"
                          onClick={() => generation.audioUrl && playAudio(generation.audioUrl)}
                          disabled={!generation.audioUrl}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-black hover:bg-zinc-200 disabled:opacity-30 cursor-pointer"
                          aria-label={t('Putar hasil', 'Play output')}
                        >
                          <Play weight="fill" size={12} />
                        </button>
                        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-zinc-300">
                          {generation.text}
                        </span>
                        {generation.audioUrl && (
                          <a
                            href={generation.audioUrl}
                            download
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10"
                            aria-label={t('Unduh hasil', 'Download output')}
                          >
                            <DownloadSimple weight="bold" size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Security Banner */}
              <div className="flex items-start gap-2.5 border-t border-white/10 pt-3 text-zinc-500">
                <ShieldCheck className="mt-0.5 shrink-0 text-zinc-400" weight="bold" size={18} />
                <p className="font-sans text-[11px] leading-relaxed">
                  {t('Audio provider dikirim langsung dari server ke Alibaba Model Studio. API key tidak pernah dikirim ke browser.', 'Provider audio goes directly from the server to Alibaba Model Studio. API keys are never sent to the browser.')}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
