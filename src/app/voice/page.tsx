'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
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
  Waveform,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';
import { deleteVoiceSample, listVoiceSamples, saveVoiceSample, type StoredVoiceSample } from '@/lib/voice-library';

type VoiceEntry = {
  id: string;
  name: string;
  lang: string;
  local: boolean;
  voice: SpeechSynthesisVoice | null;
  source: 'system' | 'custom';
  sample?: StoredVoiceSample;
};

type PlaybackState = 'idle' | 'queued' | 'playing' | 'paused' | 'error';
type LanguageFilter = 'all' | 'id' | 'en';

const MAX_TEXT_LENGTH = 3_000;
const MAX_SAMPLE_SIZE = 10 * 1024 * 1024;
const HIDDEN_VOICES_KEY = 'vibework_hidden_system_voices';

function voiceInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'VO';
}

export default function VoiceStudioPage() {
  const { language, t } = useLanguage();
  const [voices, setVoices] = useState<VoiceEntry[]>([]);
  const [customVoices, setCustomVoices] = useState<VoiceEntry[]>([]);
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
  const [voiceName, setVoiceName] = useState('');
  const [voiceLang, setVoiceLang] = useState('id-ID');
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const sampleUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listVoiceSamples()
      .then(samples => {
        if (cancelled) return;
        const entries = samples.map((sample): VoiceEntry => ({
          id: `custom:${sample.id}`,
          name: sample.name,
          lang: sample.lang,
          local: true,
          voice: null,
          source: 'custom',
          sample,
        }));
        setCustomVoices(entries);
        setSelectedVoiceId(current => current || entries[0]?.id || '');
      })
      .catch(() => {
        if (!cancelled) setError(t('Gudang suara lokal gagal dibuka.', 'The local voice warehouse could not be opened.'));
      });

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
      if (sampleAudioRef.current) sampleAudioRef.current.pause();
      if (sampleUrlRef.current) URL.revokeObjectURL(sampleUrlRef.current);
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
      const browserVoices = synth.getVoices();
      const preferredPrefix = language === 'id' ? 'id' : 'en';
      const entries = browserVoices
        .map((voice): VoiceEntry => ({
          id: `system:${voice.voiceURI || voice.name}:${voice.lang}`,
          name: voice.name,
          lang: voice.lang || 'und',
          local: voice.localService,
          voice,
          source: 'system',
        }))
        .sort((a, b) => {
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

      setVoices(entries);
      setSelectedVoiceId(current => current || entries[0].id);
      setSupported(true);
      setLoadingVoices(false);
    };

    synth.addEventListener('voiceschanged', loadVoices);
    const loadTimer = window.setTimeout(loadVoices, 0);

    return () => {
      window.clearTimeout(loadTimer);
      synth.removeEventListener('voiceschanged', loadVoices);
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
      }
      synth.cancel();
    };
  }, [language, t]);

  const visibleSystemVoices = voices.filter(voice => !hiddenVoiceIds.includes(voice.id));
  const allVoices = [...customVoices, ...visibleSystemVoices];
  const selectedVoice = allVoices.find(voice => voice.id === selectedVoiceId) || allVoices[0];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredVoices = allVoices.filter(voice => {
    const matchesLanguage = languageFilter === 'all' || voice.lang.toLowerCase().startsWith(languageFilter);
    const matchesQuery = !normalizedQuery || `${voice.name} ${voice.lang}`.toLowerCase().includes(normalizedQuery);
    return matchesLanguage && matchesQuery;
  });

  const clearSampleAudio = () => {
    if (sampleAudioRef.current) {
      sampleAudioRef.current.onplay = null;
      sampleAudioRef.current.onended = null;
      sampleAudioRef.current.onerror = null;
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
    }
    if (sampleUrlRef.current) {
      URL.revokeObjectURL(sampleUrlRef.current);
      sampleUrlRef.current = null;
    }
  };

  const speak = (content: string) => {
    const normalizedText = content.trim();
    if (!normalizedText) {
      setError(t('Tulis teks yang ingin diubah menjadi suara.', 'Enter the text you want to turn into speech.'));
      return;
    }
    if (!selectedVoice) {
      setError(t('Voice engine tidak tersedia pada browser ini.', 'The voice engine is unavailable in this browser.'));
      return;
    }
    if (selectedVoice.source === 'custom') {
      setError(t(
        'Voice custom sudah tersimpan, tetapi generate teks dengan suara ini memerlukan API/model voice-cloning.',
        'The custom voice is stored, but generating text with it requires a voice-cloning API/model.'
      ));
      return;
    }
    if (!supported) {
      setError(t('Voice engine tidak tersedia pada browser ini.', 'The voice engine is unavailable in this browser.'));
      return;
    }

    clearSampleAudio();
    const synth = window.speechSynthesis;
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(normalizedText);
    utterance.voice = selectedVoice.voice;
    utterance.lang = selectedVoice.lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onstart = () => setPlaybackState('playing');
    utterance.onend = () => {
      setPlaybackState('idle');
      utteranceRef.current = null;
    };
    utterance.onerror = event => {
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      setPlaybackState('error');
      setError(t('Suara gagal dibuat. Coba voice lain.', 'Speech generation failed. Try another voice.'));
    };

    utteranceRef.current = utterance;
    setError(null);
    setPlaybackState('queued');
    synth.speak(utterance);
  };

  const previewVoice = (event: React.MouseEvent<HTMLButtonElement>) => {
    const voice = allVoices.find(entry => entry.id === event.currentTarget.dataset.voiceId);
    if (!voice) return;
    setSelectedVoiceId(voice.id);
    clearSampleAudio();

    if (voice.source === 'custom' && voice.sample) {
      const synth = Reflect.get(window, 'speechSynthesis') as SpeechSynthesis | undefined;
      if (utteranceRef.current) {
        utteranceRef.current.onend = null;
        utteranceRef.current.onerror = null;
        utteranceRef.current = null;
      }
      synth?.cancel();

      const sampleUrl = URL.createObjectURL(voice.sample.audio);
      const audio = new Audio(sampleUrl);
      audio.playbackRate = rate;
      audio.onplay = () => setPlaybackState('playing');
      audio.onended = () => {
        setPlaybackState('idle');
        clearSampleAudio();
      };
      audio.onerror = () => {
        setPlaybackState('error');
        setError(t('Sampel suara gagal diputar.', 'The voice sample could not be played.'));
        clearSampleAudio();
      };
      sampleAudioRef.current = audio;
      sampleUrlRef.current = sampleUrl;
      setError(null);
      setPlaybackState('queued');
      void audio.play().catch(() => {
        setPlaybackState('error');
        setError(t('Browser memblokir pemutaran sampel.', 'The browser blocked sample playback.'));
        clearSampleAudio();
      });
      return;
    }

    if (!supported) {
      setError(t('Voice engine tidak tersedia pada browser ini.', 'The voice engine is unavailable in this browser.'));
      return;
    }

    const sample = voice.lang.toLowerCase().startsWith('id')
      ? 'Halo, ini adalah contoh suara dari gudang suara Vibework.'
      : 'Hello, this is a voice preview from the Vibework voice warehouse.';

    const synth = window.speechSynthesis;
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(sample);
    utterance.voice = voice.voice;
    utterance.lang = voice.lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onstart = () => setPlaybackState('playing');
    utterance.onend = () => {
      setPlaybackState('idle');
      utteranceRef.current = null;
    };
    utterance.onerror = event => {
      if (event.error === 'canceled' || event.error === 'interrupted') return;
      setPlaybackState('error');
      setError(t('Preview suara gagal diputar.', 'The voice preview could not be played.'));
    };

    utteranceRef.current = utterance;
    setError(null);
    setPlaybackState('queued');
    synth.speak(utterance);
  };

  const togglePause = () => {
    if (sampleAudioRef.current) {
      if (playbackState === 'playing') {
        sampleAudioRef.current.pause();
        setPlaybackState('paused');
        return;
      }
      if (playbackState === 'paused') {
        void sampleAudioRef.current.play();
        setPlaybackState('playing');
        return;
      }
    }

    if (playbackState === 'playing') {
      window.speechSynthesis.pause();
      setPlaybackState('paused');
      return;
    }
    if (playbackState === 'paused') {
      window.speechSynthesis.resume();
      setPlaybackState('playing');
    }
  };

  const stopPlayback = () => {
    clearSampleAudio();
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    const synth = Reflect.get(window, 'speechSynthesis') as SpeechSynthesis | undefined;
    synth?.cancel();
    setPlaybackState('idle');
  };

  const addVoice = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedName = voiceName.trim();
    if (!normalizedName || !voiceLang.trim() || !voiceFile) {
      setError(t('Nama, bahasa, dan file audio wajib diisi.', 'Name, language, and audio file are required.'));
      return;
    }
    if (!voiceFile.type.startsWith('audio/')) {
      setError(t('File harus berupa audio.', 'The selected file must be audio.'));
      return;
    }
    if (voiceFile.size > MAX_SAMPLE_SIZE) {
      setError(t('Ukuran audio maksimal 10 MB.', 'Audio files are limited to 10 MB.'));
      return;
    }
    if (!consentConfirmed) {
      setError(t('Konfirmasi izin pemilik suara sebelum menyimpan.', 'Confirm the voice owner\'s permission before saving.'));
      return;
    }

    setSavingVoice(true);
    setError(null);
    try {
      const sample = await saveVoiceSample({
        name: normalizedName.slice(0, 80),
        lang: voiceLang.trim().slice(0, 20),
        audio: voiceFile,
      });
      const entry: VoiceEntry = {
        id: `custom:${sample.id}`,
        name: sample.name,
        lang: sample.lang,
        local: true,
        voice: null,
        source: 'custom',
        sample,
      };
      setCustomVoices(current => [entry, ...current]);
      setSelectedVoiceId(entry.id);
      setVoiceName('');
      setVoiceLang(language === 'id' ? 'id-ID' : 'en-US');
      setVoiceFile(null);
      setConsentConfirmed(false);
      setShowAddVoice(false);
    } catch {
      setError(t('Sampel suara gagal disimpan.', 'The voice sample could not be saved.'));
    } finally {
      setSavingVoice(false);
    }
  };

  const removeVoice = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const voice = allVoices.find(entry => entry.id === event.currentTarget.dataset.voiceId);
    if (!voice) return;
    const message = voice.source === 'custom'
      ? t(`Hapus sampel suara "${voice.name}"?`, `Delete the voice sample "${voice.name}"?`)
      : t(`Sembunyikan voice bawaan "${voice.name}" dari gudang?`, `Hide the system voice "${voice.name}" from the warehouse?`);
    if (!window.confirm(message)) return;

    stopPlayback();
    if (voice.source === 'custom' && voice.sample) {
      try {
        await deleteVoiceSample(voice.sample.id);
        const remainingCustomVoices = customVoices.filter(entry => entry.id !== voice.id);
        setCustomVoices(remainingCustomVoices);
        if (selectedVoiceId === voice.id) {
          setSelectedVoiceId(remainingCustomVoices[0]?.id || visibleSystemVoices[0]?.id || '');
        }
      } catch {
        setError(t('Sampel suara gagal dihapus.', 'The voice sample could not be deleted.'));
      }
      return;
    }

    const nextHiddenVoiceIds = [...new Set([...hiddenVoiceIds, voice.id])];
    setHiddenVoiceIds(nextHiddenVoiceIds);
    localStorage.setItem(HIDDEN_VOICES_KEY, JSON.stringify(nextHiddenVoiceIds));
    if (selectedVoiceId === voice.id) {
      const remainingSystemVoice = voices.find(entry => !nextHiddenVoiceIds.includes(entry.id));
      setSelectedVoiceId(customVoices[0]?.id || remainingSystemVoice?.id || '');
    }
  };

  const restoreSystemVoices = () => {
    setHiddenVoiceIds([]);
    localStorage.removeItem(HIDDEN_VOICES_KEY);
    if (!selectedVoiceId) setSelectedVoiceId(customVoices[0]?.id || voices[0]?.id || '');
  };

  const statusLabel = playbackState === 'playing'
    ? t('Sedang diputar', 'Playing')
    : playbackState === 'paused'
      ? t('Dijeda', 'Paused')
      : playbackState === 'queued'
        ? t('Menyiapkan suara', 'Preparing voice')
        : playbackState === 'error'
          ? t('Gagal', 'Failed')
          : t('Siap', 'Ready');

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
              {t('Pilih suara, tulis naskah, lalu dengarkan hasilnya.', 'Choose a voice, write a script, and hear the result.')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden border-2 border-brutal-black bg-brutal-yellow px-2 py-1 font-mono text-[10px] font-bold uppercase md:inline-block">
            {t('Suara perangkat', 'Device voices')}
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
                    <h2 className="font-sans text-2xl font-black uppercase sm:text-3xl">
                      {t('Gudang suara', 'Voice warehouse')}
                    </h2>
                  </div>
                  <p className="max-w-2xl font-mono text-sm font-medium leading-relaxed opacity-65">
                    {t(
                      'Koleksi suara mengikuti voice yang tersedia di perangkat dan browser kamu.',
                      'The collection uses voices available on your current device and browser.'
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {hiddenVoiceIds.length > 0 && (
                    <button type="button" onClick={restoreSystemVoices} className="font-mono text-[10px] font-bold uppercase underline underline-offset-4">
                      {t(`Pulihkan ${hiddenVoiceIds.length}`, `Restore ${hiddenVoiceIds.length}`)}
                    </button>
                  )}
                  <span className="w-fit border-2 border-brutal-black bg-brutal-blue px-3 py-1 font-mono text-xs font-bold text-brutal-white">
                    {allVoices.length} {t('SUARA', 'VOICES')}
                  </span>
                  <Button type="button" variant="primary" size="sm" onClick={() => setShowAddVoice(current => !current)} className="gap-2 !border-2 !px-3 !py-1.5 !shadow-none">
                    <Plus weight="bold" size={18} />
                    {t('Tambah suara', 'Add voice')}
                  </Button>
                </div>
              </div>

              {showAddVoice && (
                <form onSubmit={addVoice} className="mt-5 border-4 border-brutal-black bg-brutal-yellow p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="font-sans text-xs font-black uppercase">
                      {t('Nama pemilik/voice', 'Voice name')}
                      <input
                        value={voiceName}
                        onChange={event => setVoiceName(event.target.value)}
                        maxLength={80}
                        placeholder={t('Contoh: Narator Andi', 'Example: Andi Narrator')}
                        className="mt-2 w-full border-4 border-brutal-black bg-brutal-white px-3 py-2 font-mono text-sm font-bold normal-case outline-none focus:ring-4 focus:ring-brutal-blue"
                      />
                    </label>
                    <label className="font-sans text-xs font-black uppercase">
                      {t('Kode bahasa', 'Language code')}
                      <input
                        value={voiceLang}
                        onChange={event => setVoiceLang(event.target.value)}
                        maxLength={20}
                        placeholder="id-ID"
                        className="mt-2 w-full border-4 border-brutal-black bg-brutal-white px-3 py-2 font-mono text-sm font-bold normal-case outline-none focus:ring-4 focus:ring-brutal-blue"
                      />
                    </label>
                  </div>
                  <label className="mt-4 block font-sans text-xs font-black uppercase">
                    {t('Sampel audio (maks. 10 MB)', 'Audio sample (max. 10 MB)')}
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={event => setVoiceFile(event.target.files?.[0] || null)}
                      className="mt-2 block w-full border-4 border-brutal-black bg-brutal-white p-2 font-mono text-xs font-bold file:mr-3 file:border-2 file:border-brutal-black file:bg-brutal-white file:px-3 file:py-1 file:font-bold"
                    />
                  </label>
                  <label className="mt-4 flex items-start gap-3 font-mono text-xs font-bold leading-relaxed">
                    <input
                      type="checkbox"
                      checked={consentConfirmed}
                      onChange={event => setConsentConfirmed(event.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-blue-700"
                    />
                    {t(
                      'Saya memiliki izin eksplisit dari pemilik suara untuk menyimpan dan menggunakan sampel ini.',
                      'I have the voice owner\'s explicit permission to store and use this sample.'
                    )}
                  </label>
                  <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <p className="font-mono text-[10px] font-bold uppercase opacity-60">
                      {t('Disimpan lokal. Generate voice custom memerlukan model API.', 'Stored locally. Custom voice generation requires a model API.')}
                    </p>
                    <div className="flex gap-2">
                      <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddVoice(false)} className="!border-2 !shadow-none">
                        {t('Batal', 'Cancel')}
                      </Button>
                      <Button type="submit" variant="primary" size="sm" disabled={savingVoice} className="!border-2 !shadow-none">
                        {savingVoice ? t('Menyimpan...', 'Saving...') : t('Simpan sampel', 'Save sample')}
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">{t('Cari suara', 'Search voices')}</span>
                  <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" weight="bold" size={20} />
                  <input
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    placeholder={t('Cari nama atau bahasa...', 'Search name or language...')}
                    className="w-full border-4 border-brutal-black bg-brutal-white py-3 pr-4 pl-12 font-mono text-sm font-bold outline-none transition-shadow focus:ring-4 focus:ring-brutal-blue"
                  />
                </label>
                <div className="grid grid-cols-3 border-4 border-brutal-black" aria-label={t('Filter bahasa', 'Language filter')}>
                  {(['all', 'id', 'en'] as const).map(filter => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setLanguageFilter(filter)}
                      className={`border-r-2 border-brutal-black px-4 py-2 font-mono text-xs font-bold uppercase transition-colors last:border-r-0 ${
                        languageFilter === filter ? 'bg-brutal-yellow' : 'bg-brutal-white hover:bg-gray-100'
                      }`}
                    >
                      {filter === 'all' ? t('Semua', 'All') : filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid max-h-[38rem] grid-cols-1 gap-3 overflow-y-auto p-4 sm:grid-cols-2 sm:p-6">
              {loadingVoices && customVoices.length === 0 ? (
                [1, 2, 3, 4].map(item => (
                  <div key={item} className="h-28 animate-pulse border-4 border-brutal-black/20 bg-gray-100" />
                ))
              ) : supported === false && customVoices.length === 0 ? (
                <div className="col-span-full border-4 border-brutal-black bg-brutal-yellow p-6">
                  <h3 className="font-sans text-xl font-black uppercase">{t('Browser tidak mendukung TTS', 'Browser does not support TTS')}</h3>
                  <p className="mt-2 font-mono text-sm font-bold opacity-70">
                    {t('Buka halaman ini menggunakan Chrome, Edge, Safari, atau browser modern lain.', 'Open this page in Chrome, Edge, Safari, or another modern browser.')}
                  </p>
                </div>
              ) : filteredVoices.length === 0 ? (
                <div className="col-span-full border-4 border-dashed border-brutal-black/40 p-8 text-center">
                  <p className="font-mono text-sm font-bold uppercase opacity-55">{t('Suara tidak ditemukan.', 'No matching voices found.')}</p>
                </div>
              ) : (
                filteredVoices.map((voice, index) => {
                  const selected = voice.id === selectedVoiceId;
                  return (
                    <article
                      key={voice.id}
                      className={`flex min-w-0 items-stretch border-4 border-brutal-black transition-transform ${
                        selected ? 'bg-brutal-blue text-brutal-white shadow-brutal-sm -translate-y-0.5' : 'bg-brutal-white hover:-translate-y-0.5 hover:bg-brutal-yellow'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedVoiceId(voice.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brutal-yellow"
                      >
                        <span className={`flex h-12 w-12 shrink-0 items-center justify-center border-2 font-sans text-sm font-black ${selected ? 'border-brutal-white bg-brutal-white text-brutal-blue' : 'border-brutal-black bg-brutal-black text-brutal-white'}`}>
                          {voiceInitials(voice.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-sans text-sm font-black uppercase">{voice.name}</span>
                          <span className="mt-1 block font-mono text-[10px] font-bold uppercase opacity-70">
                            {voice.lang} / {voice.source === 'custom' ? t('Custom sample', 'Custom sample') : voice.local ? t('Lokal', 'Local') : t('Jaringan', 'Network')} / #{String(index + 1).padStart(2, '0')}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        data-voice-id={voice.id}
                        onClick={previewVoice}
                        disabled={playbackState === 'queued'}
                        className={`flex w-14 shrink-0 items-center justify-center border-l-4 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brutal-yellow disabled:opacity-40 ${
                          selected ? 'border-brutal-white hover:bg-brutal-white hover:text-brutal-blue' : 'border-brutal-black hover:bg-brutal-black hover:text-brutal-white'
                        }`}
                        aria-label={`${t('Preview', 'Preview')} ${voice.name}`}
                      >
                        <Play weight="fill" size={20} />
                      </button>
                      <button
                        type="button"
                        data-voice-id={voice.id}
                        onClick={removeVoice}
                        className={`flex w-11 shrink-0 items-center justify-center border-l-2 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-brutal-yellow ${
                          selected ? 'border-brutal-white hover:bg-brutal-red' : 'border-brutal-black hover:bg-brutal-red hover:text-brutal-white'
                        }`}
                        aria-label={voice.source === 'custom' ? `${t('Hapus', 'Delete')} ${voice.name}` : `${t('Sembunyikan', 'Hide')} ${voice.name}`}
                        title={voice.source === 'custom' ? t('Hapus sampel', 'Delete sample') : t('Sembunyikan dari gudang', 'Hide from warehouse')}
                      >
                        <Trash weight="bold" size={18} />
                      </button>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <section className="h-fit border-4 border-brutal-black bg-brutal-yellow shadow-brutal xl:sticky xl:top-0">
            <div className="flex items-center justify-between gap-3 border-b-4 border-brutal-black p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <Waveform weight="bold" size={28} />
                <h2 className="font-sans text-2xl font-black uppercase">Voice Studio</h2>
              </div>
              <span className={`border-2 border-brutal-black px-2 py-1 font-mono text-[10px] font-bold uppercase ${
                playbackState === 'playing' ? 'bg-brutal-blue text-brutal-white' : 'bg-brutal-white text-brutal-black'
              }`}>
                {statusLabel}
              </span>
            </div>

            <div className="flex flex-col gap-5 p-4 sm:p-5">
              <div className="border-4 border-brutal-black bg-brutal-white p-3">
                <span className="font-mono text-[10px] font-bold uppercase opacity-55">{t('Suara aktif', 'Active voice')}</span>
                <div className="mt-1 flex items-center gap-2">
                  <SpeakerHigh weight="fill" size={22} />
                  <strong className="truncate font-sans text-base uppercase">{selectedVoice?.name || t('Memuat suara...', 'Loading voices...')}</strong>
                </div>
                <p className="mt-1 font-mono text-xs opacity-60">
                  {selectedVoice?.lang || '---'} / {selectedVoice?.source === 'custom' ? t('Custom sample', 'Custom sample') : t('TTS siap', 'TTS ready')}
                </p>
              </div>

              {selectedVoice?.source === 'custom' && (
                <div className="border-4 border-brutal-black bg-brutal-white p-3">
                  <p className="font-sans text-sm font-black uppercase">{t('Model voice-cloning diperlukan', 'Voice-cloning model required')}</p>
                  <p className="mt-1 font-mono text-[11px] font-bold leading-relaxed opacity-65">
                    {t(
                      'Sampel bisa dipreview dan dihapus sekarang. Untuk membacakan teks dengan karakter suara ini, hubungkan ElevenLabs atau Coqui XTTS.',
                      'The sample can be previewed and deleted now. Connect ElevenLabs or Coqui XTTS to synthesize text with this voice.'
                    )}
                  </p>
                </div>
              )}

              <div>
                <label htmlFor="voice-script" className="mb-2 flex items-center justify-between gap-3 font-sans text-sm font-black uppercase">
                  <span className="flex items-center gap-2"><TextT weight="bold" size={18} /> {t('Teks narasi', 'Narration text')}</span>
                  <span className="font-mono text-[10px] tabular-nums opacity-55">{text.length}/{MAX_TEXT_LENGTH}</span>
                </label>
                <textarea
                  id="voice-script"
                  value={text}
                  onChange={event => setText(event.target.value)}
                  maxLength={MAX_TEXT_LENGTH}
                  rows={8}
                  placeholder={t('Tulis kalimat yang ingin dibacakan dengan suara terpilih...', 'Write the text to read with the selected voice...')}
                  className="w-full resize-y border-4 border-brutal-black bg-brutal-white p-4 font-mono text-sm font-medium leading-relaxed outline-none transition-shadow placeholder:text-brutal-black/40 focus:ring-4 focus:ring-brutal-blue"
                />
              </div>

              <div className="border-4 border-brutal-black bg-brutal-white p-4">
                <div className="mb-4 flex items-center gap-2 font-sans text-sm font-black uppercase">
                  <SlidersHorizontal weight="bold" size={18} />
                  {t('Kontrol suara', 'Voice controls')}
                </div>
                <label className="block font-mono text-xs font-bold uppercase">
                  <span className="flex justify-between"><span>{t('Kecepatan', 'Speed')}</span><span className="tabular-nums">{rate.toFixed(1)}x</span></span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={rate}
                    onChange={event => setRate(Number(event.target.value))}
                    className="mt-2 w-full accent-blue-700"
                  />
                </label>
                <label className="mt-4 block font-mono text-xs font-bold uppercase">
                  <span className="flex justify-between"><span>{t('Nada', 'Pitch')}</span><span className="tabular-nums">{pitch.toFixed(1)}</span></span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={pitch}
                    onChange={event => setPitch(Number(event.target.value))}
                    className="mt-2 w-full accent-blue-700"
                  />
                </label>
              </div>

              {error && (
                <div role="alert" className="border-4 border-brutal-black bg-brutal-red p-3 font-mono text-xs font-bold uppercase text-brutal-white">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-[1fr_auto_auto] gap-3">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => speak(text)}
                  disabled={!selectedVoice || selectedVoice.source === 'custom' || !supported || !text.trim() || playbackState === 'queued'}
                  className="min-w-0 gap-2 !bg-brutal-blue !text-brutal-white hover:!bg-blue-800"
                >
                  <Play weight="fill" size={20} />
                  <span className="truncate">
                    {selectedVoice?.source === 'custom' ? t('Model diperlukan', 'Model required') : t('Generate & Putar', 'Generate & Play')}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={togglePause}
                  disabled={playbackState !== 'playing' && playbackState !== 'paused'}
                  className="!px-4"
                  aria-label={playbackState === 'paused' ? t('Lanjutkan', 'Resume') : t('Jeda', 'Pause')}
                >
                  {playbackState === 'paused' ? <Play weight="fill" size={20} /> : <Pause weight="fill" size={20} />}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={stopPlayback}
                  disabled={playbackState === 'idle' || playbackState === 'error'}
                  className="!px-4"
                  aria-label={t('Berhenti', 'Stop')}
                >
                  <Stop weight="fill" size={20} />
                </Button>
              </div>

              <div className="flex items-start gap-3 border-t-4 border-brutal-black pt-4">
                <ShieldCheck className="mt-0.5 shrink-0" weight="bold" size={22} />
                <p className="font-mono text-[11px] font-bold leading-relaxed opacity-70">
                  {t(
                    'Mode ini memakai suara perangkat. Cloning dari rekaman orang memerlukan provider khusus dan izin eksplisit pemilik suara.',
                    "This mode uses device voices. Cloning from a person's recording requires a dedicated provider and the voice owner's explicit consent."
                  )}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
