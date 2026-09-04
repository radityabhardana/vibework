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
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#e5e5f7]">
      <header className="flex min-h-20 shrink-0 items-center justify-between gap-3 border-b-4 border-brutal-black bg-brutal-white px-3 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="shrink-0">
            <Button variant="secondary" size="sm" className="!px-3" aria-label={t('Kembali ke dashboard', 'Back to dashboard')}>
              <ArrowLeft weight="bold" size={20} />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-sans text-lg font-black uppercase sm:text-2xl">Voice Warehouse</h1>
            <p className="hidden font-mono text-xs font-bold opacity-55 sm:block">
              {t('Suara perangkat dan Qwen TTS dalam satu studio.', 'Device voices and Qwen TTS in one studio.')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`hidden border-2 border-brutal-black px-2 py-1 font-mono text-[10px] font-bold uppercase md:inline-block ${providerStatus?.configured ? 'bg-brutal-yellow' : 'bg-gray-200'}`}>
            {providerStatus?.configured ? 'QWEN DIRECT' : t('Provider belum siap', 'Provider not ready')}
          </span>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="mx-auto grid w-full max-w-[1440px] gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(23rem,0.85fr)]">
          <section className="min-w-0 border-4 border-brutal-black bg-brutal-white shadow-brutal">
            <div className="border-b-4 border-brutal-black p-4 sm:p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <SpeakerHigh weight="bold" size={28} />
                    <h2 className="font-sans text-2xl font-black uppercase sm:text-3xl">{t('Gudang suara', 'Voice warehouse')}</h2>
                  </div>
                  <p className="max-w-2xl font-mono text-sm font-medium leading-relaxed opacity-65">
                    {t('Clone sampel berizin, rancang karakter original, atau gunakan voice perangkat.', 'Clone a consented sample, design an original character, or use a device voice.')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {hiddenVoiceIds.length > 0 && (
                    <button type="button" onClick={restoreSystemVoices} className="font-mono text-[10px] font-bold uppercase underline underline-offset-4">
                      {t(`Pulihkan ${hiddenVoiceIds.length}`, `Restore ${hiddenVoiceIds.length}`)}
                    </button>
                  )}
                  <span className="border-2 border-brutal-black bg-brutal-blue px-3 py-1 font-mono text-xs font-bold text-brutal-white">{allVoices.length} {t('SUARA', 'VOICES')}</span>
                  <Button type="button" variant="primary" size="sm" onClick={() => setShowAddVoice(current => !current)} className="gap-2 !border-2 !px-3 !py-1.5 !shadow-none">
                    <Plus weight="bold" size={18} /> {t('Buat suara', 'Create voice')}
                  </Button>
                </div>
              </div>

              {showAddVoice && (
                <form onSubmit={addVoice} className="mt-5 border-4 border-brutal-black bg-brutal-yellow p-4">
                  <div className="mb-4 grid grid-cols-2 border-4 border-brutal-black bg-brutal-white">
                    <button type="button" onClick={() => setAddMode('clone')} className={`flex items-center justify-center gap-2 border-r-2 border-brutal-black px-3 py-3 font-sans text-xs font-black uppercase ${addMode === 'clone' ? 'bg-brutal-blue text-brutal-white' : ''}`}>
                      <UploadSimple weight="bold" size={18} /> {t('Clone sampel', 'Clone sample')}
                    </button>
                    <button type="button" onClick={() => setAddMode('design')} className={`flex items-center justify-center gap-2 border-l-2 border-brutal-black px-3 py-3 font-sans text-xs font-black uppercase ${addMode === 'design' ? 'bg-brutal-blue text-brutal-white' : ''}`}>
                      <MagicWand weight="bold" size={18} /> {t('Rancang suara', 'Design voice')}
                    </button>
                  </div>

                  {!providerStatus?.configured && (
                    <div className="mb-4 border-4 border-brutal-black bg-brutal-red p-3 font-mono text-[11px] font-bold text-brutal-white">
                      {t('Set DASHSCOPE_* dan ALIYUN_OSS_* pada server untuk mengaktifkan clone dan design.', 'Set DASHSCOPE_* and ALIYUN_OSS_* on the server to enable clone and design.')}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="font-sans text-xs font-black uppercase">
                      {t('Nama voice', 'Voice name')}
                      <input value={voiceName} onChange={event => setVoiceName(event.target.value)} maxLength={80} placeholder={t('Contoh: Narator Senja', 'Example: Dusk Narrator')} className="mt-2 w-full border-4 border-brutal-black bg-brutal-white px-3 py-2 font-mono text-sm font-bold normal-case outline-none focus:ring-4 focus:ring-brutal-blue" />
                    </label>
                    <label className="font-sans text-xs font-black uppercase">
                      {t('Kode bahasa', 'Language code')}
                      <input value={voiceLang} onChange={event => setVoiceLang(event.target.value)} maxLength={20} placeholder="id-ID" className="mt-2 w-full border-4 border-brutal-black bg-brutal-white px-3 py-2 font-mono text-sm font-bold normal-case outline-none focus:ring-4 focus:ring-brutal-blue" />
                    </label>
                  </div>

                  {addMode === 'clone' ? (
                    <label className="mt-4 block font-sans text-xs font-black uppercase">
                      {t('Sampel jernih 10-20 detik (maks. 10 MB)', 'Clear 10-20 second sample (max. 10 MB)')}
                      <input type="file" accept="audio/*" onChange={event => setVoiceFile(event.target.files?.[0] || null)} className="mt-2 block w-full border-4 border-brutal-black bg-brutal-white p-2 font-mono text-xs font-bold file:mr-3 file:border-2 file:border-brutal-black file:bg-brutal-white file:px-3 file:py-1 file:font-bold" />
                    </label>
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {(Object.keys(DESIGN_OPTIONS) as Array<keyof typeof DESIGN_OPTIONS>).map(key => (
                        <label key={key} className="font-sans text-[10px] font-black uppercase">
                          {optionLabel(key)}
                          <select value={design[key]} onChange={event => updateDesign(key, event.target.value as never)} className="mt-1 w-full border-3 border-brutal-black bg-brutal-white px-2 py-2 font-mono text-xs font-bold capitalize outline-none focus:ring-3 focus:ring-brutal-blue">
                            {DESIGN_OPTIONS[key].map(option => <option key={option} value={option}>{optionLabel(option)}</option>)}
                          </select>
                        </label>
                      ))}
                      <label className="font-sans text-[10px] font-black uppercase sm:col-span-2 lg:col-span-3">
                        {t('Arahan tambahan', 'Additional direction')}
                        <textarea value={design.customInstruction} onChange={event => updateDesign('customInstruction', event.target.value)} maxLength={400} rows={2} placeholder={t('Contoh: artikulasi Indonesia yang natural, jeda pendek...', 'Example: natural Indonesian articulation, short pauses...')} className="mt-1 w-full resize-y border-3 border-brutal-black bg-brutal-white px-3 py-2 font-mono text-xs font-bold normal-case outline-none focus:ring-3 focus:ring-brutal-blue" />
                      </label>
                    </div>
                  )}

                  <label className="mt-4 flex items-start gap-3 font-mono text-xs font-bold leading-relaxed">
                    <input type="checkbox" checked={consentConfirmed} onChange={event => setConsentConfirmed(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-blue-700" />
                    {addMode === 'clone'
                      ? t('Saya memiliki izin eksplisit pemilik suara untuk cloning dan sintesis.', 'I have the voice owner\'s explicit permission for cloning and synthesis.')
                      : t('Saya akan menggunakan karakter original ini secara bertanggung jawab.', 'I will use this original character responsibly.')}
                  </label>
                  <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <p className="font-mono text-[10px] font-bold uppercase opacity-60">{addMode === 'clone' ? 'QWEN AUDIO ENROLLMENT' : 'QWEN VOICE DESIGN + ENROLLMENT'}</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={resetAddForm} className="!border-2 !shadow-none">{t('Batal', 'Cancel')}</Button>
                      <Button type="submit" variant="primary" size="sm" disabled={savingVoice || !providerStatus?.configured} className="!border-2 !shadow-none">
                        {savingVoice ? t('Memproses...', 'Processing...') : addMode === 'clone' ? t('Clone voice', 'Clone voice') : t('Rancang voice', 'Design voice')}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">{t('Cari suara', 'Search voices')}</span>
                  <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" weight="bold" size={20} />
                  <input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Cari nama atau bahasa...', 'Search name or language...')} className="w-full border-4 border-brutal-black bg-brutal-white py-3 pr-4 pl-12 font-mono text-sm font-bold outline-none focus:ring-4 focus:ring-brutal-blue" />
                </label>
                <div className="grid grid-cols-3 border-4 border-brutal-black" aria-label={t('Filter bahasa', 'Language filter')}>
                  {(['all', 'id', 'en'] as const).map(filter => (
                    <button key={filter} type="button" onClick={() => setLanguageFilter(filter)} className={`border-r-2 border-brutal-black px-4 py-2 font-mono text-xs font-bold uppercase last:border-r-0 ${languageFilter === filter ? 'bg-brutal-yellow' : 'bg-brutal-white hover:bg-gray-100'}`}>
                      {filter === 'all' ? t('Semua', 'All') : filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid max-h-[38rem] grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-6">
              {loadingVoices && allVoices.length === 0 ? (
                [1, 2, 3, 4].map(item => <div key={item} className="h-28 animate-pulse border-4 border-brutal-black/20 bg-gray-100" />)
              ) : filteredVoices.length === 0 ? (
                <div className="col-span-full border-4 border-dashed border-brutal-black/40 p-8 text-center"><p className="font-mono text-sm font-bold uppercase opacity-55">{t('Suara tidak ditemukan.', 'No matching voices found.')}</p></div>
              ) : filteredVoices.map((voice, index) => {
                const selected = voice.id === selectedVoiceId;
                const ready = voice.source === 'system' || voice.profile?.status === 'ready';
                return (
                  <article key={voice.id} className={`flex min-w-0 items-stretch border-4 border-brutal-black transition-transform ${selected ? 'bg-brutal-blue text-brutal-white shadow-brutal-sm -translate-y-0.5' : 'bg-brutal-white hover:-translate-y-0.5 hover:bg-brutal-yellow'}`}>
                    <button type="button" onClick={() => setSelectedVoiceId(voice.id)} className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brutal-yellow">
                      <span className={`flex h-12 w-12 shrink-0 items-center justify-center border-2 font-sans text-sm font-black ${selected ? 'border-brutal-white bg-brutal-white text-brutal-blue' : 'border-brutal-black bg-brutal-black text-brutal-white'}`}>{voiceInitials(voice.name)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-sans text-sm font-black uppercase">{voice.name}</span>
                        <span className="mt-1 block font-mono text-[10px] font-bold uppercase opacity-70">
                          {voice.lang} / {voice.source === 'provider' ? `${voice.profile?.kind} · ${voice.profile?.status}` : voice.local ? t('Perangkat', 'Device') : t('Jaringan', 'Network')} / #{String(index + 1).padStart(2, '0')}
                        </span>
                      </span>
                    </button>
                    <button type="button" data-voice-id={voice.id} onClick={previewVoice} disabled={!ready || playbackState === 'queued'} className={`flex w-14 shrink-0 items-center justify-center border-l-4 disabled:opacity-30 ${selected ? 'border-brutal-white hover:bg-brutal-white hover:text-brutal-blue' : 'border-brutal-black hover:bg-brutal-black hover:text-brutal-white'}`} aria-label={`${t('Preview', 'Preview')} ${voice.name}`}><Play weight="fill" size={20} /></button>
                    <button type="button" data-voice-id={voice.id} onClick={removeVoice} className={`flex w-11 shrink-0 items-center justify-center border-l-2 ${selected ? 'border-brutal-white hover:bg-brutal-red' : 'border-brutal-black hover:bg-brutal-red hover:text-brutal-white'}`} aria-label={`${voice.source === 'provider' ? t('Hapus', 'Delete') : t('Sembunyikan', 'Hide')} ${voice.name}`}><Trash weight="bold" size={18} /></button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="h-fit border-4 border-brutal-black bg-brutal-yellow shadow-brutal xl:sticky xl:top-0">
            <div className="flex items-center justify-between gap-3 border-b-4 border-brutal-black p-4 sm:p-5">
              <div className="flex items-center gap-3"><Waveform weight="bold" size={28} /><h2 className="font-sans text-2xl font-black uppercase">Voice Studio</h2></div>
              <span className={`border-2 border-brutal-black px-2 py-1 font-mono text-[10px] font-bold uppercase ${playbackState === 'playing' ? 'bg-brutal-blue text-brutal-white' : 'bg-brutal-white'}`}>{statusLabel}</span>
            </div>

            <div className="flex flex-col gap-5 p-4 sm:p-5">
              <div className="border-4 border-brutal-black bg-brutal-white p-3">
                <span className="font-mono text-[10px] font-bold uppercase opacity-55">{t('Suara aktif', 'Active voice')}</span>
                <div className="mt-1 flex items-center gap-2"><SpeakerHigh weight="fill" size={22} /><strong className="truncate font-sans text-base uppercase">{selectedVoice?.name || t('Memuat suara...', 'Loading voices...')}</strong></div>
                <p className="mt-1 font-mono text-xs opacity-60">{selectedVoice?.lang || '---'} / {selectedVoice?.source === 'provider' ? `MODEL STUDIO · ${selectedVoice.profile?.targetModel}` : t('TTS perangkat', 'Device TTS')}</p>
              </div>

              {selectedVoice?.source === 'provider' && selectedVoice.profile?.status !== 'ready' && (
                <div className="border-4 border-brutal-black bg-brutal-red p-3 text-brutal-white">
                  <p className="font-sans text-sm font-black uppercase">{t('Voice belum siap', 'Voice not ready')}</p>
                  <p className="mt-1 font-mono text-[11px] font-bold">{selectedVoice.profile?.errorMessage || selectedVoice.profile?.status}</p>
                </div>
              )}

              <div>
                <label htmlFor="voice-script" className="mb-2 flex items-center justify-between gap-3 font-sans text-sm font-black uppercase">
                  <span className="flex items-center gap-2"><TextT weight="bold" size={18} /> {t('Teks narasi', 'Narration text')}</span>
                  <span className="font-mono text-[10px] tabular-nums opacity-55">{text.length}/{MAX_TEXT_LENGTH}</span>
                </label>
                <textarea id="voice-script" value={text} onChange={event => setText(event.target.value)} maxLength={MAX_TEXT_LENGTH} rows={7} placeholder={t('Tulis kalimat yang ingin dibacakan dengan suara terpilih...', 'Write the text to read with the selected voice...')} className="w-full resize-y border-4 border-brutal-black bg-brutal-white p-4 font-mono text-sm font-medium leading-relaxed outline-none placeholder:text-brutal-black/40 focus:ring-4 focus:ring-brutal-blue" />
              </div>

              <div className="border-4 border-brutal-black bg-brutal-white p-4">
                <div className="mb-4 flex items-center gap-2 font-sans text-sm font-black uppercase"><SlidersHorizontal weight="bold" size={18} />{t('Kontrol suara', 'Voice controls')}</div>
                <label className="block font-mono text-xs font-bold uppercase">
                  <span className="flex justify-between"><span>{t('Kecepatan', 'Speed')}</span><span className="tabular-nums">{rate.toFixed(1)}x</span></span>
                  <input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={event => setRate(Number(event.target.value))} className="mt-2 w-full accent-blue-700" />
                </label>
                <label className="mt-4 block font-mono text-xs font-bold uppercase">
                  <span className="flex justify-between"><span>{t('Nada', 'Pitch')}</span><span className="tabular-nums">{pitch.toFixed(1)}</span></span>
                  <input type="range" min="0.5" max="2" step="0.1" value={pitch} onChange={event => setPitch(Number(event.target.value))} className="mt-2 w-full accent-blue-700" />
                </label>
              </div>

              {error && <div role="alert" className="border-4 border-brutal-black bg-brutal-red p-3 font-mono text-xs font-bold text-brutal-white">{error}</div>}

              <div className="grid grid-cols-[1fr_auto_auto] gap-3">
                <Button type="button" variant="primary" onClick={() => void generateSpeech()} disabled={!selectedVoice || !text.trim() || playbackState === 'queued' || (selectedVoice.source === 'provider' && selectedVoice.profile?.status !== 'ready')} className="min-w-0 gap-2 !bg-brutal-blue !text-brutal-white hover:!bg-blue-800">
                  <Play weight="fill" size={20} /><span className="truncate">{selectedVoice?.source === 'provider' ? t('Generate Qwen', 'Generate with Qwen') : t('Putar perangkat', 'Play on device')}</span>
                </Button>
                <Button type="button" variant="secondary" onClick={togglePause} disabled={playbackState !== 'playing' && playbackState !== 'paused'} className="!px-4" aria-label={playbackState === 'paused' ? t('Lanjutkan', 'Resume') : t('Jeda', 'Pause')}>{playbackState === 'paused' ? <Play weight="fill" size={20} /> : <Pause weight="fill" size={20} />}</Button>
                <Button type="button" variant="secondary" onClick={stopPlayback} disabled={playbackState === 'idle' || playbackState === 'error'} className="!px-4" aria-label={t('Berhenti', 'Stop')}><Stop weight="fill" size={20} /></Button>
              </div>

              {generations.length > 0 && (
                <div className="border-t-4 border-brutal-black pt-4">
                  <h3 className="font-sans text-sm font-black uppercase">{t('Hasil terbaru', 'Recent output')}</h3>
                  <div className="mt-2 space-y-2">
                    {generations.slice(0, 3).map(generation => (
                      <div key={generation.id} className="flex items-center gap-2 border-2 border-brutal-black bg-brutal-white p-2">
                        <button type="button" onClick={() => generation.audioUrl && playAudio(generation.audioUrl)} disabled={!generation.audioUrl} className="flex h-8 w-8 shrink-0 items-center justify-center bg-brutal-black text-brutal-white disabled:opacity-30" aria-label={t('Putar hasil', 'Play output')}><Play weight="fill" size={15} /></button>
                        <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold">{generation.text}</span>
                        {generation.audioUrl && <a href={generation.audioUrl} download className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-brutal-black" aria-label={t('Unduh hasil', 'Download output')}><DownloadSimple weight="bold" size={16} /></a>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 border-t-4 border-brutal-black pt-4">
                <ShieldCheck className="mt-0.5 shrink-0" weight="bold" size={22} />
                <p className="font-mono text-[11px] font-bold leading-relaxed opacity-70">
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
