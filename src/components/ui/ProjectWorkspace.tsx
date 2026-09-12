'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Edge,
  Node,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useRouter } from 'next/navigation';
import dagre from 'dagre';
import { nodeTypes, edgeTypes, ViewerModal } from '@/components/flow/FlowNodes';
import { createZip, type ZipEntry } from '@/lib/zip';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/context/LanguageContext';
import {
  TreeStructure,
  Article,
  Robot,
  Cpu,
  Lightning,
  Copy,
  Check,
  DownloadSimple,
  ArrowClockwise,
  WarningCircle,
  Code
} from '@phosphor-icons/react';

type WorkspaceTab = 'tree' | 'prd' | 'agents' | 'architecture' | 'prompts';
type GenerationAction = 'flowchart' | 'adr' | 'schema' | 'prompts' | 'agents' | 'prd';
type RecoveryKind = 'generation-in-progress' | 'source-changed' | 'transport';

type RefreshPending = {
  action: GenerationAction;
  operation: string;
  revision: number;
};

type RecoveryRefreshPending = {
  action: GenerationAction;
  kind: RecoveryKind;
  baselineProject: any;
  baselineRevision: number | null;
};

const EXPORT_ARTIFACT_NAMES = ['PRD.md', 'AGENTS.md', 'ADR.md', 'DATABASE_SCHEMA.md', 'PROMPT.md'];
const REFRESH_RECONCILIATION_TIMEOUT_MS = 10_000;

const hasMeaningfulText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;

const readGenerationPayload = async (res: Response): Promise<Record<string, unknown>> => {
  const body: unknown = await res.json().catch(() => null);
  return asRecord(body) || {};
};

const getPayloadError = (body: Record<string, unknown>, fallback: string, timeoutMessage: string, status: number) => {
  const error = asRecord(body.error);
  if (error && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }
  if (typeof body.error === 'string' && body.error.trim().length > 0) {
    return body.error;
  }
  if (typeof body.message === 'string' && body.message.trim().length > 0) {
    return body.message;
  }
  if (status === 504) return timeoutMessage;
  return fallback;
};

const getPayloadCode = (body: Record<string, unknown>) => {
  const error = asRecord(body.error);
  const code = error?.code ?? body.code ?? body.errorCode;
  return typeof code === 'string' ? code.toUpperCase().replace(/[-\s]/g, '_') : null;
};

const getPayloadRevision = (body: Record<string, unknown>) => {
  // `committedRevision` is accepted while older route deployments roll over
  // to the Phase 2 `revision` field.
  const revision = body.revision ?? body.committedRevision;
  if (typeof revision === 'number' && Number.isInteger(revision) && revision >= 0) return revision;
  if (typeof revision === 'string' && revision.trim().length > 0) {
    const parsed = Number(revision);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  }
  return null;
};

const getProjectRevision = (project: any) => {
  const revision = project?.specRevision;
  if (typeof revision === 'number' && Number.isInteger(revision) && revision >= 0) return revision;
  if (typeof revision === 'string' && revision.trim().length > 0) {
    const parsed = Number(revision);
    if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  }
  return null;
};

const getPayloadOperation = (body: Record<string, unknown>, fallback: GenerationAction) =>
  typeof body.operation === 'string' && body.operation.trim().length > 0 ? body.operation : fallback;

class GenerationHttpError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null, message: string) {
    super(message);
    this.name = 'GenerationHttpError';
    this.status = status;
    this.code = code;
  }
}

export function ProjectWorkspace({
  project,
  prd,
  adr,
  schema,
  prompts = [],
  appFlowchart,
}: {
  project: any;
  prd: any;
  adr?: any;
  schema?: any;
  prompts?: any[];
  appFlowchart?: any;
}) {
  const router = useRouter();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('tree');
  const [loadingFlowchart, setLoadingFlowchart] = useState(false);
  const [loadingAdr, setLoadingAdr] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewerData, setViewerData] = useState<{ title: string; content: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [promptsInvalidatedBySchema, setPromptsInvalidatedBySchema] = useState(false);
  const [showSchemaConfirm, setShowSchemaConfirm] = useState(false);
  const [retryAction, setRetryAction] = useState<GenerationAction | null>(null);
  const [refreshPending, setRefreshPending] = useState<RefreshPending | null>(null);
  const [refreshRequired, setRefreshRequired] = useState<RefreshPending | null>(null);
  const [recoveryRefreshPending, setRecoveryRefreshPending] = useState<RecoveryRefreshPending | null>(null);
  const [isEditingPrd, setIsEditingPrd] = useState(false);
  const [prdDraft, setPrdDraft] = useState('');
  const [prdDirty, setPrdDirty] = useState(false);
  const [prdSaving, setPrdSaving] = useState(false);
  const [prdSaveError, setPrdSaveError] = useState<string | null>(null);
  const [prdNeedsRefresh, setPrdNeedsRefresh] = useState(false);
  const schemaConfirmRef = useRef<HTMLDivElement>(null);
  const schemaTriggerRef = useRef<HTMLButtonElement>(null);
  const prdConfirmRef = useRef<HTMLDivElement>(null);
  const prdSaveTriggerRef = useRef<HTMLButtonElement>(null);
  const projectPropsRef = useRef(project);
  const workspaceBusyRef = useRef(false);

  const schemaReady = hasMeaningfulText(schema?.dbSchema);
  const schemaContent = schemaReady ? schema.dbSchema.trim() : '';
  const hasAtomicPrompts = Array.isArray(prompts) && prompts.length > 0;
  const promptsReady = schemaReady && hasAtomicPrompts && !loadingSchema && !promptsInvalidatedBySchema;
  const generationInProgress = loadingFlowchart || loadingAdr || loadingSchema || loadingPrompts || loadingAgents;
  const workspaceBusy = generationInProgress || !!refreshPending || !!refreshRequired || !!recoveryRefreshPending || isEditingPrd || prdSaving;
  const schemaOrPromptsBusy = workspaceBusy;
  workspaceBusyRef.current = workspaceBusy;

  useEffect(() => {
    const refreshTarget = refreshPending || refreshRequired;
    if (!refreshTarget) return;
    const currentRevision = getProjectRevision(project);
    if (currentRevision === null || currentRevision < refreshTarget.revision) return;

    if (refreshTarget.action === 'flowchart') setLoadingFlowchart(false);
    if (refreshTarget.action === 'adr') setLoadingAdr(false);
    if (refreshTarget.action === 'schema') setLoadingSchema(false);
    if (refreshTarget.action === 'prompts') setLoadingPrompts(false);
    if (refreshTarget.action === 'agents') setLoadingAgents(false);
    setRefreshPending(null);
    setRefreshRequired(null);
  }, [project?.specRevision, refreshPending, refreshRequired]);

  const requestWorkspaceRefresh = () => {
    try {
      router.refresh();
    } catch {
      // A successful POST remains authoritative even if requesting the RSC
      // refresh throws synchronously. The bounded reconciliation state below
      // keeps stale artifact actions locked until props catch up.
    }
  };

  useEffect(() => {
    if (!refreshPending) return;
    const pending = refreshPending;
    const timeout = window.setTimeout(() => {
      if (pending.action === 'flowchart') setLoadingFlowchart(false);
      if (pending.action === 'adr') setLoadingAdr(false);
      if (pending.action === 'schema') setLoadingSchema(false);
      if (pending.action === 'prompts') setLoadingPrompts(false);
      if (pending.action === 'agents') setLoadingAgents(false);
      setRefreshPending(null);
      setRefreshRequired(pending);
      requestWorkspaceRefresh();
    }, REFRESH_RECONCILIATION_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [refreshPending]);

  useEffect(() => {
    if (workspaceBusy) setViewerData(null);
  }, [workspaceBusy]);

  useEffect(() => {
    const propsChanged = projectPropsRef.current !== project;
    projectPropsRef.current = project;

    if (!recoveryRefreshPending || (!propsChanged && recoveryRefreshPending.baselineProject === project && getProjectRevision(project) === recoveryRefreshPending.baselineRevision)) {
      return;
    }

    const { action, kind } = recoveryRefreshPending;
    setRecoveryRefreshPending(null);
    setError(
      kind === 'generation-in-progress'
        ? t('Generasi lain sedang berjalan. Workspace sudah diperbarui; coba lagi secara manual.', 'Another generation is in progress. The workspace has been refreshed; retry manually when ready.')
        : kind === 'source-changed'
          ? t('Sumber berubah saat generasi berlangsung. Workspace sudah diperbarui; tinjau perubahan sebelum mencoba lagi.', 'The source changed while generation was running. The workspace has been refreshed; review the changes before retrying.')
          : t('Status generasi tidak dapat dipastikan. Workspace sudah diperbarui; tinjau artefak sebelum mencoba lagi.', 'The generation status is uncertain. The workspace has been refreshed; review the artifacts before retrying.'),
    );
    setRetryAction(action);
  }, [project, recoveryRefreshPending, t]);

  useEffect(() => {
    if (!showSchemaConfirm) return;
    schemaConfirmRef.current?.focus();
  }, [showSchemaConfirm]);

  const closeSchemaConfirm = () => {
    setShowSchemaConfirm(false);
    window.setTimeout(() => schemaTriggerRef.current?.focus(), 0);
  };

  const handleSchemaDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSchemaConfirm();
      return;
    }
    if (event.key !== 'Tab' || !schemaConfirmRef.current) return;
    const focusable = Array.from(schemaConfirmRef.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])'));
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === schemaConfirmRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  useEffect(() => {
    if (promptsInvalidatedBySchema && prompts.length === 0) {
      setPromptsInvalidatedBySchema(false);
    }
  }, [prompts.length, promptsInvalidatedBySchema]);

  const copyToClipboard = (text: string, key: string) => {
    if (workspaceBusyRef.current) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (content: Blob | string, filename: string) => {
    if (workspaceBusyRef.current) return;
    const blob = content instanceof Blob ? content : new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openViewer = (data: { title: string; content: string }) => {
    if (workspaceBusyRef.current) return;
    setViewerData(data);
  };

  const layoutAppFlowchartDagre = (flowchart: any) => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'LR', ranksep: 200, nodesep: 100 });
    g.setDefaultEdgeLabel(() => ({}));

    (flowchart.nodes || []).forEach((n: any) => {
      g.setNode(`appflow-${n.id}`, { width: 320, height: 100 });
    });

    (flowchart.edges || []).forEach((e: any) => {
      g.setEdge(`appflow-${e.source}`, `appflow-${e.target}`);
    });

    dagre.layout(g);
    return g;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isLoading =
      loadingFlowchart || loadingAdr || loadingSchema || loadingPrompts || loadingAgents;

    if (isLoading) {
      setGenerationProgress(0);
      interval = setInterval(() => {
        setGenerationProgress((p) => {
          if (p < 60) return p + Math.random() * 8;
          if (p < 85) return p + Math.random() * 3;
          if (p < 95) return p + 0.5;
          if (p < 99) return p + 0.1;
          return p;
        });
      }, 500);
    } else {
      setGenerationProgress(0);
    }
    return () => clearInterval(interval);
  }, [loadingFlowchart, loadingAdr, loadingSchema, loadingPrompts, loadingAgents]);

  const getRecoveryKind = (failure: unknown): RecoveryKind => {
    const httpFailure = failure instanceof GenerationHttpError ? failure : null;
    if (httpFailure && httpFailure.status >= 500) return 'transport';
    const code = httpFailure?.code || '';
    const message = failure instanceof Error ? failure.message.toLowerCase() : '';

    if (code.includes('SOURCE_CHANGED') || code.includes('STALE_SOURCE') || /source changed|sumber berubah/.test(message)) {
      return 'source-changed';
    }
    if (
      code.includes('GENERATION_IN_PROGRESS')
      || code.includes('CONCURRENT_GENERATION')
      || code.includes('LEASE_HELD')
      || code.includes('GENERATION_BUSY')
      || code.includes('LOCKED')
    ) {
      return 'generation-in-progress';
    }
    return 'transport';
  };

  const recoveryMessage = (kind: RecoveryKind, refreshed: boolean) => {
    if (kind === 'generation-in-progress') {
      return refreshed
        ? t('Generasi lain sedang berjalan. Workspace sudah diperbarui; coba lagi secara manual.', 'Another generation is in progress. The workspace has been refreshed; retry manually when ready.')
        : t('Generasi lain sedang berjalan. Menyegarkan workspace sebelum menawarkan retry.', 'Another generation is in progress. Refreshing the workspace before offering a retry.');
    }
    if (kind === 'source-changed') {
      return refreshed
        ? t('Sumber berubah saat generasi berlangsung. Workspace sudah diperbarui; tinjau perubahan sebelum mencoba lagi.', 'The source changed while generation was running. The workspace has been refreshed; review the changes before retrying.')
        : t('Sumber berubah saat generasi berlangsung. Menyegarkan workspace sebelum menawarkan retry.', 'The source changed while generation was running. Refreshing the workspace before offering a retry.');
    }
    return refreshed
      ? t('Status generasi tidak dapat dipastikan. Workspace sudah diperbarui; tinjau artefak sebelum mencoba lagi.', 'The generation status is uncertain. The workspace has been refreshed; review the artifacts before retrying.')
      : t('Status generasi tidak dapat dipastikan. Workspace harus diperbarui sebelum mencoba lagi.', 'The generation status is uncertain. The workspace must be refreshed before retrying.');
  };

  const handleGenerationFailure = (action: GenerationAction, failure: unknown, fallback: string) => {
    const httpFailure = failure instanceof GenerationHttpError ? failure : null;
    const isConflict = httpFailure?.status === 409;
    const isDefinitiveSchemaTimeout = action === 'schema'
      && httpFailure?.status === 504
      && httpFailure.code === 'GENERATION_TIMEOUT';

    if (isDefinitiveSchemaTimeout) {
      setError(failure instanceof Error && failure.message
        ? failure.message
        : t('Generasi schema timeout sebelum apa pun disimpan.', 'Schema generation timed out before anything was saved.'));
      setRetryAction(action);
      return;
    }

    const requiresRefresh = !httpFailure || isConflict || httpFailure.status >= 500;

    if (requiresRefresh) {
      const kind = getRecoveryKind(failure);
      setRecoveryRefreshPending({
        action,
        kind,
        baselineProject: project,
        baselineRevision: getProjectRevision(project),
      });
      setRetryAction(null);
      setError(recoveryMessage(kind, false));
      requestWorkspaceRefresh();
      return;
    }

    setError(failure instanceof Error && failure.message ? failure.message : fallback);
    setRetryAction(action);
  };

  const completeGeneration = (action: GenerationAction, body: Record<string, unknown>) => {
    const revision = getPayloadRevision(body);
    if (revision !== null) {
      setRefreshPending({
        action,
        operation: getPayloadOperation(body, action),
        revision,
      });
      requestWorkspaceRefresh();
      return true;
    }

    // Legacy responses have no revision to fence against. Preserve their
    // existing refresh behavior rather than inventing a client-side target.
    requestWorkspaceRefresh();
    return false;
  };

  const generateFlowchart = async () => {
    if (workspaceBusy) return;
    setLoadingFlowchart(true);
    setError(null);
    let waitingForRefresh = false;
    try {
      const res = await fetch('/api/projects/generate-flowchart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const body = await readGenerationPayload(res);
      if (!res.ok) {
        throw new GenerationHttpError(
          res.status,
          getPayloadCode(body),
          getPayloadError(body, t('Tree gagal dibuat. Silakan coba lagi.', 'Unable to generate the tree. Please try again.'), t('Generasi timeout. Silakan coba lagi.', 'Generation timed out. Please try again.'), res.status),
        );
      }
      setRetryAction(null);
      waitingForRefresh = completeGeneration('flowchart', body);
    } catch (e: unknown) {
      handleGenerationFailure('flowchart', e, t('Tree gagal dibuat. Silakan coba lagi.', 'Unable to generate the tree. Please try again.'));
    } finally {
      if (!waitingForRefresh) setLoadingFlowchart(false);
    }
  };

  const generateADR = async () => {
    if (!prd || workspaceBusy) return;
    setLoadingAdr(true);
    setError(null);
    let waitingForRefresh = false;
    try {
      const res = await fetch('/api/projects/generate-adr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const body = await readGenerationPayload(res);
      if (!res.ok) {
        throw new GenerationHttpError(
          res.status,
          getPayloadCode(body),
          getPayloadError(body, t('ADR gagal dibuat. Silakan coba lagi.', 'Unable to generate the ADR. Please try again.'), t('Generasi timeout. Silakan coba lagi.', 'Generation timed out. Please try again.'), res.status),
        );
      }
      setRetryAction(null);
      waitingForRefresh = completeGeneration('adr', body);
    } catch (e: unknown) {
      handleGenerationFailure('adr', e, t('ADR gagal dibuat. Silakan coba lagi.', 'Unable to generate the ADR. Please try again.'));
    } finally {
      if (!waitingForRefresh) setLoadingAdr(false);
    }
  };

  const runGenerateSchema = async () => {
    if (schemaOrPromptsBusy) return;

    setLoadingSchema(true);
    setError(null);
    let waitingForRefresh = false;
    try {
      const res = await fetch('/api/projects/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const body = await readGenerationPayload(res);
      if (!res.ok) {
        throw new GenerationHttpError(
          res.status,
          getPayloadCode(body),
          getPayloadError(body, t('Schema gagal dibuat. Silakan coba lagi.', 'Unable to generate the schema. Please try again.'), t('Generasi schema timeout sebelum apa pun disimpan.', 'Schema generation timed out before anything was saved.'), res.status),
        );
      }
      setPromptsInvalidatedBySchema(true);
      setRetryAction(null);
      waitingForRefresh = completeGeneration('schema', body);
    } catch (e: unknown) {
      handleGenerationFailure('schema', e, t('Schema gagal dibuat. Silakan coba lagi.', 'Unable to generate the schema. Please try again.'));
    } finally {
      if (!waitingForRefresh) setLoadingSchema(false);
    }
  };

  const generateSchema = async () => {
    if (schemaOrPromptsBusy) return;
    if (schemaReady) {
      setShowSchemaConfirm(true);
      return;
    }
    await runGenerateSchema();
  };

  const confirmSchemaRegeneration = async () => {
    closeSchemaConfirm();
    await runGenerateSchema();
  };

  const generatePrompts = async () => {
    if (schemaOrPromptsBusy) return;

    setLoadingPrompts(true);
    setError(null);
    let waitingForRefresh = false;
    try {
      const res = await fetch('/api/projects/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const body = await readGenerationPayload(res);
      if (!res.ok) {
        throw new GenerationHttpError(
          res.status,
          getPayloadCode(body),
          getPayloadError(body, t('Prompt gagal dibuat. Silakan coba lagi.', 'Unable to generate prompts. Please try again.'), t('Generasi timeout. Silakan coba lagi.', 'Generation timed out. Please try again.'), res.status),
        );
      }
      setRetryAction(null);
      waitingForRefresh = completeGeneration('prompts', body);
    } catch (e: unknown) {
      handleGenerationFailure('prompts', e, t('Prompt gagal dibuat. Silakan coba lagi.', 'Unable to generate prompts. Please try again.'));
    } finally {
      if (!waitingForRefresh) setLoadingPrompts(false);
    }
  };

  const generateAgents = async () => {
    if (workspaceBusy) return;
    setLoadingAgents(true);
    setError(null);
    let waitingForRefresh = false;
    try {
      const res = await fetch('/api/projects/generate-agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const body = await readGenerationPayload(res);
      if (!res.ok) {
        throw new GenerationHttpError(
          res.status,
          getPayloadCode(body),
          getPayloadError(body, t('AGENTS.md gagal dibuat. Silakan coba lagi.', 'Unable to generate AGENTS.md. Please try again.'), t('Generasi timeout. Silakan coba lagi.', 'Generation timed out. Please try again.'), res.status),
        );
      }
      setRetryAction(null);
      waitingForRefresh = completeGeneration('agents', body);
    } catch (e: unknown) {
      handleGenerationFailure('agents', e, t('AGENTS.md gagal dibuat. Silakan coba lagi.', 'Unable to generate AGENTS.md. Please try again.'));
    } finally {
      if (!waitingForRefresh) setLoadingAgents(false);
    }
  };

  // Build the master prompt fallback if project.promptDocument is not directly stored
  const generatedPromptMd = hasAtomicPrompts
      ? prompts
          .map(
            (p: any) =>
              `# PROMPT ${p.executionOrder}: ${p.title}\n\n**Context:** ${p.context}\n**Task:** ${p.task}\n**Constraints:** ${p.constraints}\n**Format:** ${p.format}\n**Dependencies:** ${(p.dependencies || []).join(', ')}\n`
          )
          .join('\n---\n\n')
      : '';
  const effectivePromptMd = promptsReady
    ? (hasMeaningfulText(project.promptDocument) ? project.promptDocument : generatedPromptMd)
    : '';

  const exportableArtifacts: ZipEntry[] = [
    hasMeaningfulText(prd?.documentContent) ? { name: 'PRD.md', content: prd.documentContent.trim() } : null,
    hasMeaningfulText(project.agentsDocument) ? { name: 'AGENTS.md', content: project.agentsDocument.trim() } : null,
    hasMeaningfulText(adr?.adrDocument) ? { name: 'ADR.md', content: adr.adrDocument.trim() } : null,
    schemaReady ? { name: 'DATABASE_SCHEMA.md', content: schemaContent.trim() } : null,
    effectivePromptMd ? { name: 'PROMPT.md', content: effectivePromptMd.trim() } : null,
  ].filter((entry): entry is ZipEntry => entry !== null);
  const exportableArtifactNames = exportableArtifacts.map((entry) => entry.name);
  const hasExportableArtifacts = exportableArtifacts.length > 0;
  const exportIsPartial = hasExportableArtifacts && exportableArtifacts.length < EXPORT_ARTIFACT_NAMES.length;
  const exportStatus = !hasExportableArtifacts
    ? t('Belum ada artefak Markdown yang siap diekspor.', 'No Markdown artifacts are ready to export.')
    : exportIsPartial
      ? t(`Arsip parsial: hanya artefak siap (${exportableArtifactNames.join(', ')}) yang akan disertakan.`, `Partial archive: only ready artifacts (${exportableArtifactNames.join(', ')}) will be included.`)
      : t('Semua artefak Markdown siap diekspor.', 'All Markdown artifacts are ready to export.');

  // Master export for entire project
  const handleExportAll = () => {
    if (workspaceBusyRef.current || !exportableArtifacts.length) return;
    const files = [...exportableArtifacts];

    const manifest = [
      `# ${project.name} - Project Specification`,
      '',
      'Artifacts in this archive:',
      ...files.map((f) => `- ${f.name}`),
    ].join('\n');
    files.unshift({ name: 'README.md', content: manifest });

    downloadFile(
      createZip(files),
      `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_spec.zip`,
    );
  };

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    const newNodes: Node[] = [
      {
        id: '1',
        position: { x: 50, y: 50 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: prd ? `✅ PRD` : `PRD: ${t('Menunggu', 'Pending')}`,
          onView: prd && !workspaceBusy
            ? () => openViewer({ title: t('Product Requirements Document', 'Product Requirements Document'), content: prd.documentContent })
            : undefined,
        },
      },
    ];

    if (appFlowchart) {
      newNodes.push({
        id: '1.5',
        position: { x: 50, y: 200 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: '✅ Interactive Tree',
          onView: !workspaceBusy ? () =>
            openViewer({
              title: t('Application Tree Flowchart', 'Application Tree Flowchart'),
              content: JSON.stringify(appFlowchart.nodes, null, 2),
            }) : undefined,
        },
      });
    } else {
      newNodes.push({
        id: '1.5',
        position: { x: 50, y: 200 },
        type: 'actionNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: t('Tree Not Generated', 'Tree Not Generated'),
          buttonText: t('Generate Tree', 'Generate Tree'),
          onAction: generateFlowchart,
          isLoading: loadingFlowchart,
          progress: generationProgress,
          disabled: !prd || workspaceBusy,
          prerequisite: !prd ? t('Buka PRD terlebih dahulu', 'Open the PRD first') : undefined,
          onPrerequisite: !prd ? () => setActiveTab('prd') : undefined,
        },
      });
    }

    if (project.agentsDocument) {
      newNodes.push({
        id: '1.8',
        position: { x: 300, y: 200 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: '✅ AGENTS.md',
          onView: !workspaceBusy ? () =>
            openViewer({
              title: t('AGENTS.md Directive & Rules', 'AGENTS.md Directive & Rules'),
              content: project.agentsDocument,
            }) : undefined,
        },
      });
    }

    if (adr) {
      newNodes.push({
        id: '2',
        position: { x: 50, y: 350 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: '✅ Architecture ADR',
          onView: !workspaceBusy ? () =>
            openViewer({ title: t('Architecture Decision Record', 'Architecture Decision Record'), content: adr.adrDocument }) : undefined,
        },
      });
    } else {
      newNodes.push({
        id: '2',
        position: { x: 50, y: 350 },
        type: 'actionNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: t('Architecture Not Generated', 'Architecture Not Generated'),
          buttonText: t('Generate ADR', 'Generate ADR'),
          onAction: generateADR,
          isLoading: loadingAdr,
          progress: generationProgress,
          disabled: !prd || workspaceBusy,
          prerequisite: !prd ? t('Buka PRD terlebih dahulu', 'Open the PRD first') : undefined,
          onPrerequisite: !prd ? () => setActiveTab('prd') : undefined,
        },
      });
    }

    if (schemaReady) {
      newNodes.push({
        id: '3',
        position: { x: 50, y: 500 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: '✅ Schema & API',
          onView: !workspaceBusy ? () =>
            openViewer({
              title: t('Database Schema & API Contract', 'Database Schema & API Contract'),
              content: `### Database Schema\n\n${schemaContent}\n\n### API Contract\n\n${JSON.stringify(schema.apiContract, null, 2)}`,
            }) : undefined,
        },
      });
    } else {
      newNodes.push({
        id: '3',
        position: { x: 50, y: 500 },
        type: 'actionNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: t('Database Schema Not Generated', 'Database Schema Not Generated'),
          buttonText: t('Generate Schema', 'Generate Schema'),
          onAction: (event: React.MouseEvent<HTMLButtonElement>) => {
            schemaTriggerRef.current = event.currentTarget;
            void generateSchema();
          },
          isLoading: loadingSchema,
          progress: generationProgress,
          disabled: !adr || schemaOrPromptsBusy,
          prerequisite: !adr ? t('Buka ADR terlebih dahulu', 'Open the ADR first') : undefined,
          onPrerequisite: !adr ? () => setActiveTab('architecture') : undefined,
        },
      });
    }

    if (promptsReady) {
      newNodes.push({
        id: '4',
        position: { x: 50, y: 650 },
        type: 'statusNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: `✅ ${prompts.length} ${t('Atomic Prompts', 'Atomic Prompts')}`,
          onView: !workspaceBusy ? () =>
            openViewer({
              title: t('AI Atomic Prompts', 'AI Atomic Prompts'),
              content: effectivePromptMd,
            }) : undefined,
        },
      });
    } else {
      newNodes.push({
        id: '4',
        position: { x: 50, y: 650 },
        type: 'actionNode',
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
        data: {
          label: t('AI Prompts Not Generated', 'AI Prompts Not Generated'),
          buttonText: t('Generate Prompts', 'Generate Prompts'),
          onAction: generatePrompts,
          isLoading: loadingPrompts,
          progress: generationProgress,
          disabled: !schemaReady || schemaOrPromptsBusy,
          prerequisite: !schemaReady ? t('Buat Schema terlebih dahulu', 'Create the schema first') : undefined,
          onPrerequisite: !schemaReady ? () => setActiveTab('architecture') : undefined,
        },
      });
    }

    setNodes(newNodes);

    const newEdges: Edge[] = [
      { id: 'e1-1.5', source: '1', target: '1.5', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
      { id: 'e1.5-2', source: '1.5', target: '2', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
      { id: 'e2-3', source: '2', target: '3', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
      { id: 'e3-4', source: '3', target: '4', type: 'default', style: { strokeWidth: 3, stroke: '#050505' } },
    ];

    if (project.agentsDocument) {
      newEdges.push({
        id: 'e1-1.8',
        source: '1',
        target: '1.8',
        type: 'default',
        style: { strokeWidth: 2, stroke: 'rgba(255, 255, 255, 0.5)' },
      });
    }

    if (appFlowchart && appFlowchart.nodes) {
      const dagreGraph = layoutAppFlowchartDagre(appFlowchart);
      const startX = 600;
      const startY = 50;

      (appFlowchart.nodes || []).forEach((n: any) => {
        const nodeId = `appflow-${n.id}`;
        const dagreNode = dagreGraph.node(nodeId);

        newNodes.push({
          id: nodeId,
          position: { x: startX + (dagreNode?.x || 0) - 160, y: startY + (dagreNode?.y || 0) },
          type: 'promptNode',
          data: {
            label: n.label,
            onView: !workspaceBusy ? () => {
              const content = `${t('Node:', 'Node:')} ${n.label}\n${t('Description:', 'Description:')} ${n.description || t('No description provided.', 'No description provided.')}`;
              openViewer({ title: n.label, content });
            } : undefined,
          },
        });
      });

      (appFlowchart.edges || []).forEach((e: any, idx: number) => {
        const sourceNode = dagreGraph.node(`appflow-${e.source}`);
        const targetNode = dagreGraph.node(`appflow-${e.target}`);

        let sourceHandle = 'right';
        let targetHandle = 'left';

        if (sourceNode && targetNode && sourceNode.x >= targetNode.x) {
          sourceHandle = 'bottom';
          targetHandle = 'bottom';
        }

        newEdges.push({
          id: `e-appflow-${e.source}-${e.target}-${idx}`,
          source: `appflow-${e.source}`,
          target: `appflow-${e.target}`,
          sourceHandle,
          targetHandle,
          type: 'appFlowEdge',
          label: e.label || '',
          style: { strokeWidth: 2, stroke: '#050505', strokeDasharray: '4,4' },
        });
      });

      const targetNodes = new Set((appFlowchart.edges || []).map((e: any) => e.target));
      const rootNodes = (appFlowchart.nodes || []).filter((n: any) => !targetNodes.has(n.id));

      rootNodes.forEach((root: any) => {
        newEdges.push({
          id: `e-connect-${root.id}`,
          source: '1.5',
          target: `appflow-${root.id}`,
          type: 'default',
          style: { strokeWidth: 2, stroke: 'rgba(255, 255, 255, 0.4)' },
        });
      });

      setNodes([...newNodes]);
    }

    setEdges(newEdges);
  }, [
    project,
    prd,
    adr,
    schema,
    prompts,
    appFlowchart,
    loadingFlowchart,
    loadingAdr,
    loadingSchema,
    loadingPrompts,
    loadingAgents,
    generationProgress,
    schemaReady,
    schemaContent,
    promptsReady,
    schemaOrPromptsBusy,
    workspaceBusy,
    t,
  ]);

  // Artifact tabs: sequential workflow first; auxiliary artifacts follow without sequence numbers.
  const TABS: { id: WorkspaceTab; num: string; label: string; icon: typeof TreeStructure; ready: boolean }[] = [
    { id: 'prd', num: '01', label: t('PRD', 'PRD'), icon: Article, ready: !!prd },
    { id: 'architecture', num: '02', label: t('Arsitektur & Schema', 'Architecture & Schema'), icon: Cpu, ready: !!adr && schemaReady },
    { id: 'prompts', num: '03', label: t('Prompt.md', 'Prompt.md'), icon: Lightning, ready: promptsReady },
    { id: 'tree', num: 'Aux', label: t('Interactive Tree', 'Interactive Tree'), icon: TreeStructure, ready: !!appFlowchart },
    { id: 'agents', num: 'Aux', label: t('AGENTS.md', 'AGENTS.md'), icon: Robot, ready: !!project.agentsDocument },
  ];

  const renderArtifactTab = ({ id, num, label, icon: TabIcon, ready }: (typeof TABS)[number]) => (
    <button
      key={id}
      type="button"
      onClick={() => setActiveTab(id)}
      className={`shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs font-medium border transition-all duration-300 cursor-pointer ${
        activeTab === id
          ? 'bg-[var(--accent)] text-[#102016] border-transparent shadow-sm'
          : 'bg-transparent text-zinc-400 hover:text-white hover:bg-white/[0.04] border-transparent'
      }`}
      aria-label={label}
    >
      <TabIcon weight="bold" className="w-4 h-4" />
      <span className="hidden lg:inline">{num}</span>
      <span>{label}</span>
      {ready && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${activeTab === id ? 'bg-black/10 text-black' : 'bg-white/10 text-white'}`}>✓</span>
      )}
    </button>
  );

  return (
    <div aria-busy={workspaceBusy} className="flex-1 w-full h-full flex flex-col overflow-hidden bg-[#0b0d0f] text-white relative">
      {/* Top Workspace Tab Switcher Bar */}
      <div className="bg-[#0f1314] border-b border-white/[0.08] px-4 py-3 flex flex-col gap-3 shrink-0 z-20">
        <div className="flex items-center justify-between gap-3">
          <div className="hidden min-w-0 pr-3 xl:block">
          <p className="truncate font-sans text-sm font-semibold text-white">{project.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{TABS.filter(tab => tab.ready).length}/5 {project.status || t('Workspace', 'Workspace')}</p>
          </div>
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            <span className="text-zinc-300">{t('Alur artefak', 'Artifact flow')}</span>
            <span className={prd ? 'text-emerald-300' : 'text-zinc-600'}>01 PRD</span>
            <span className="text-zinc-700">→</span>
            <span className={adr && schemaReady ? 'text-emerald-300' : 'text-zinc-600'}>02 {t('Arsitektur/Schema', 'Architecture/Schema')}</span>
            <span className="text-zinc-700">→</span>
            <span className={promptsReady ? 'text-emerald-300' : 'text-zinc-600'}>03 Prompt</span>
          </div>
          <button type="button" onClick={handleExportAll} disabled={workspaceBusy || !hasExportableArtifacts} aria-describedby={workspaceBusy ? 'workspace-busy-status workspace-export-status' : 'workspace-export-status'} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/[0.04] px-2.5 py-1.5 font-mono text-xs font-medium text-white ring-1 ring-white/30 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50 sm:px-3" title={exportStatus}>
            <DownloadSimple weight="bold" className="size-3.5" />
            <span className="hidden sm:inline">{t('Export All Specs (.zip)', 'Export All Specs (.zip)')}</span>
          </button>
        </div>
        <p id="workspace-export-status" aria-live="polite" className="font-mono text-[10px] text-zinc-500">
          {exportStatus}
        </p>
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-1" aria-label={t('Alur artefak utama', 'Primary artifact flow')}>
          {TABS.filter(tab => tab.num !== 'Aux').map(renderArtifactTab)}
        </div>
        <div className="flex min-w-0 items-center gap-3 border-t border-white/[0.06] pt-2" aria-label={t('Artefak tambahan', 'Auxiliary artifacts')}>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">{t('Artefak tambahan', 'Auxiliary artifacts')}</span>
          <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
            {TABS.filter(tab => tab.num === 'Aux').map(renderArtifactTab)}
          </div>
        </div>

      </div>

      {workspaceBusy && (
        <div id="workspace-busy-status" role="status" aria-live="polite" className="shrink-0 border-b border-amber-300/20 bg-amber-950/40 px-4 py-2 font-mono text-[11px] text-amber-100">
          {refreshPending
            ? t(`Tersimpan (${refreshPending.operation}, revisi ${refreshPending.revision}). Menyegarkan workspace...`, `Saved (${refreshPending.operation}, revision ${refreshPending.revision}). Refreshing the workspace...`)
            : refreshRequired
              ? <span className="flex flex-wrap items-center gap-2">{t(`Tersimpan (${refreshRequired.operation}, revisi ${refreshRequired.revision}), tetapi tampilan belum mengejar revisi tersebut.`, `Saved (${refreshRequired.operation}, revision ${refreshRequired.revision}), but the view has not caught up yet.`)} <button type="button" onClick={requestWorkspaceRefresh} className="underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70">{t('Segarkan workspace', 'Refresh workspace')}</button></span>
              : recoveryRefreshPending
              ? recoveryMessage(recoveryRefreshPending.kind, false)
              : t('Generasi sedang berjalan. Kontrol artefak dan export dikunci hingga selesai.', 'Generation is in progress. Artifact controls and export are locked until it finishes.')}
        </div>
      )}

      {/* Global Error Notice */}
      {error && (
        <div className="bg-rose-950/80 text-rose-200 border-b border-rose-500/30 font-sans text-xs p-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <WarningCircle weight="bold" className="w-4 h-4 text-rose-400" />
            <span>{t('Error:', 'Error:')} {error}</span>
          </div>
          <div className="flex items-center gap-3">
            {retryAction && (
              <button
                type="button"
                onClick={() => {
                  if (retryAction === 'flowchart') void generateFlowchart();
                  if (retryAction === 'adr') void generateADR();
                  if (retryAction === 'schema') void generateSchema();
                  if (retryAction === 'prompts') void generatePrompts();
                  if (retryAction === 'agents') void generateAgents();
                }}
                className="rounded-md bg-rose-200/10 px-2 py-1 font-mono text-[10px] font-semibold text-rose-100 transition-colors hover:bg-rose-200/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200/70"
              >
                {t('Coba lagi', 'Retry')}
              </button>
            )}
            <button type="button" onClick={() => { setError(null); setRetryAction(null); }} className="underline uppercase text-[10px] font-semibold text-rose-300 hover:text-rose-100">
              {t('Tutup', 'Dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* Main Tab Content Area */}
      <div className="flex-1 w-full h-full overflow-hidden relative">
        {/* TAB 1: INTERACTIVE TREE */}
        {activeTab === 'tree' && (
          <div className="w-full h-full relative bg-background bg-dot-grid">
            {!appFlowchart && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#14191a]/95 border border-white/15 p-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-[calc(100%-2rem)]">
                <div>
                  <p className="font-sans font-semibold text-sm text-zinc-100">{t('Interactive Tree Belum Digenerate', 'Interactive Tree Not Generated')}</p>
                  <p className="font-sans text-xs text-zinc-400">{t('Klik tombol untuk memetakan alur screen dan modul aplikasi.', 'Click the button to map application screens and modules.')}</p>
                  {!prd && (
                    <button type="button" onClick={() => setActiveTab('prd')} className="mt-1 font-mono text-[10px] text-amber-200 underline underline-offset-2 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70">
                      {t('Buka PRD untuk membuka Tree →', 'Open PRD to unlock Tree →')}
                    </button>
                  )}
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={generateFlowchart}
                  disabled={workspaceBusy || !prd}
                >
                  {loadingFlowchart ? `${t('Membuat Tree', 'Creating Tree')} (${Math.round(generationProgress)}%)...` : t('Generate Tree Sekarang', 'Generate Tree Now')}
                </Button>
              </div>
            )}

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              minZoom={0.1}
              attributionPosition="bottom-right"
            >
              <Controls className="!border !border-white/10 !rounded-lg !shadow-xl !bg-zinc-900/90 !text-zinc-200 [&>button]:!border-b [&>button]:!border-white/10 [&>button]:!bg-transparent [&>button]:hover:!bg-white/[0.08] [&>button]:!text-zinc-200 [&>button:last-child]:!border-b-0" />
              <MiniMap className="!border !border-white/10 !rounded-lg !shadow-xl !bg-zinc-900/90" nodeColor="#3f3f46" maskColor="rgba(9, 9, 11, 0.7)" />
              <Background gap={24} size={1.5} color="rgba(255, 255, 255, 0.08)" />
            </ReactFlow>
          </div>
        )}

        {/* TAB 2: PRD */}
        {activeTab === 'prd' && (
          <div className="w-full h-full overflow-y-auto bg-background p-4 md:p-6 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-4">
              <div className="bg-zinc-900/80 border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-sans font-bold text-xl text-zinc-100">
                    {t('Product Requirements Document (PRD)', 'Product Requirements Document (PRD)')}
                  </h2>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    {t('Target:', 'Target:')} {prd?.targetUser || t('General User', 'General User')} &bull; {t('Monetisasi:', 'Monetization:')} {prd?.monetizationModel || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => copyToClipboard(prd?.documentContent || '', 'prd')}
                    disabled={workspaceBusy}
                    className="gap-1.5 text-xs"
                  >
                    {copiedKey === 'prd' ? <Check weight="bold" className="text-emerald-400" /> : <Copy weight="bold" />}
                    <span>{copiedKey === 'prd' ? t('Tersalin!', 'Copied!') : t('Copy PRD', 'Copy PRD')}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadFile(prd?.documentContent || '', `${project.name}_PRD.md`)}
                    disabled={workspaceBusy}
                    className="gap-1.5 text-xs"
                  >
                    <DownloadSimple weight="bold" />
                    <span>{t('Download PRD.md', 'Download PRD.md')}</span>
                  </Button>
                </div>
              </div>

              <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {prd?.documentContent || t('PRD belum digenerate.', 'PRD has not been generated yet.')}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AGENTS.MD */}
        {activeTab === 'agents' && (
          <div className="w-full h-full overflow-y-auto bg-background p-4 md:p-6 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-4">
              <div className="bg-zinc-900/80 border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-white/5 text-zinc-400 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] rounded-full border border-white/10">
                      {t('AI Pair Programmer Directive', 'AI Pair Programmer Directive')}
                    </span>
                  </div>
                  <h2 className="font-sans font-bold text-xl text-zinc-100">
                    {t('AGENTS.md (Pedoman & Guardrails)', 'AGENTS.md (Guidelines & Guardrails)')}
                  </h2>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    {t('Petunjuk operasional coding untuk Cursor, Windsurf, Claude Code, Antigravity, dan Copilot.', 'Operational coding guidance for Cursor, Windsurf, Claude Code, Antigravity, and Copilot.')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generateAgents}
                    disabled={workspaceBusy}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowClockwise weight="bold" className={loadingAgents ? 'animate-spin' : ''} />
                    <span>{loadingAgents ? t('Merumuskan AGENTS.md...', 'Drafting AGENTS.md...') : project.agentsDocument ? t('Regenerate AGENTS.md', 'Regenerate AGENTS.md') : t('Generate AGENTS.md', 'Generate AGENTS.md')}</span>
                  </Button>
                  {project.agentsDocument && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(project.agentsDocument, 'agents')}
                        disabled={workspaceBusy}
                        className="gap-1.5 text-xs"
                      >
                        {copiedKey === 'agents' ? <Check weight="bold" className="text-emerald-400" /> : <Copy weight="bold" />}
                        <span>{copiedKey === 'agents' ? t('Tersalin!', 'Copied!') : t('Copy AGENTS.md', 'Copy AGENTS.md')}</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadFile(project.agentsDocument, 'AGENTS.md')}
                        disabled={workspaceBusy}
                        className="gap-1.5 text-xs"
                      >
                        <DownloadSimple weight="bold" />
                        <span>{t('Download AGENTS.md', 'Download AGENTS.md')}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {project.agentsDocument ? (
                <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {project.agentsDocument}
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-dashed border-white/10 rounded-2xl p-6 text-center flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
                    <Robot weight="duotone" className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-lg text-zinc-100">{t('AGENTS.md Belum Dibuat', 'AGENTS.md Has Not Been Created')}</h3>
                    <p className="font-sans text-xs text-zinc-400 max-w-md mt-1">
                      {t('Buat aturan standar coding, pencegah halusinasi, dan guardrails teknis untuk coding agent kamu.', 'Create standard coding rules, hallucination prevention, and technical guardrails for your coding agent.')}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generateAgents}
                    disabled={workspaceBusy}
                  >
                    {loadingAgents ? `${t('Generating AGENTS.md', 'Generating AGENTS.md')} (${Math.round(generationProgress)}%)...` : t('Buat AGENTS.md Sekarang', 'Create AGENTS.md Now')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ARCHITECTURE & SCHEMA */}
        {activeTab === 'architecture' && (
          <div className="w-full h-full overflow-y-auto bg-background p-4 md:p-6 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-4">
              {/* Architecture Decision Record Header */}
              <div className="bg-zinc-900/80 border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-sans font-bold text-xl text-zinc-100">
                    {t('Architecture & Tech Stack (ADR)', 'Architecture & Tech Stack (ADR)')}
                  </h2>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    {t('Stack:', 'Stack:')} {adr?.frontendStack || 'Next.js'} &bull; {t('Backend:', 'Backend:')} {adr?.backendStack || 'Node.js'} &bull; {t('DB:', 'DB:')} {adr?.database || 'SQLite / PostgreSQL'}
                  </p>
                  {!prd && <button type="button" onClick={() => setActiveTab('prd')} className="mt-2 font-mono text-[10px] text-amber-200 underline underline-offset-2 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70">{t('Buka PRD untuk membuka ADR →', 'Open PRD to unlock ADR →')}</button>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generateADR}
                    disabled={workspaceBusy || !prd}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowClockwise weight="bold" className={loadingAdr ? 'animate-spin' : ''} />
                    <span>{loadingAdr ? t('Merancang ADR...', 'Designing ADR...') : adr ? t('Regenerate ADR', 'Regenerate ADR') : t('Generate ADR', 'Generate ADR')}</span>
                  </Button>
                  {adr?.adrDocument && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(adr.adrDocument, 'adr')}
                      disabled={workspaceBusy}
                      className="gap-1.5 text-xs"
                    >
                      {copiedKey === 'adr' ? <Check weight="bold" className="text-emerald-400" /> : <Copy weight="bold" />}
                      <span>{copiedKey === 'adr' ? t('Tersalin!', 'Copied!') : t('Copy ADR', 'Copy ADR')}</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* ADR Markdown */}
              {adr?.adrDocument && (
                <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {adr.adrDocument}
                </div>
              )}

              {/* Database Schema & API Contract Section */}
              <div className="bg-zinc-900/80 border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-sans font-bold text-lg text-zinc-100">
                    {t('Database Schema & API Contract', 'Database Schema & API Contract')}
                  </h3>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    {t('Struktur tabel relasional dan spesifikasi endpoint API.', 'Relational table structure and API endpoint specifications.')}
                  </p>
                  {!adr && <button type="button" disabled={workspaceBusy} onClick={() => { if (!prd) setActiveTab('prd'); else void generateADR(); }} className="mt-2 font-mono text-[10px] text-amber-200 underline underline-offset-2 transition-colors hover:text-amber-100 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70">{!prd ? t('Buka PRD untuk membuka ADR →', 'Open PRD to unlock ADR →') : loadingAdr ? t('ADR sedang dibuat...', 'ADR is being created...') : t('Buat ADR untuk membuka Schema →', 'Create ADR to unlock Schema →')}</button>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(event) => {
                      schemaTriggerRef.current = event.currentTarget;
                      void generateSchema();
                    }}
                    disabled={schemaOrPromptsBusy || !adr}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowClockwise weight="bold" className={loadingSchema ? 'animate-spin' : ''} />
                    <span>{loadingSchema ? t('Merancang Schema...', 'Designing Schema...') : schemaReady ? t('Regenerate Schema', 'Regenerate Schema') : t('Generate Schema', 'Generate Schema')}</span>
                  </Button>
                  {schemaReady && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyToClipboard(schemaContent, 'schema')}
                      disabled={workspaceBusy}
                      className="gap-1.5 text-xs"
                    >
                      {copiedKey === 'schema' ? <Check weight="bold" className="text-emerald-400" /> : <Copy weight="bold" />}
                      <span>{copiedKey === 'schema' ? t('Tersalin!', 'Copied!') : t('Copy Schema', 'Copy Schema')}</span>
                    </Button>
                  )}
                </div>
              </div>

              {schemaReady ? (
                <div className="flex flex-col gap-4">
                  <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {schemaContent}
                  </div>
                  {schema.apiContract && (
                    <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed overflow-x-auto">
                      <pre>{JSON.stringify(schema.apiContract, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-dashed border-white/10 rounded-2xl p-6 text-center font-sans text-xs text-zinc-500">
                  {t('Database Schema & API Contract belum digenerate.', 'Database Schema & API Contract has not been generated yet.')}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PROMPT.MD */}
        {activeTab === 'prompts' && (
          <div className="w-full h-full overflow-y-auto bg-background p-4 md:p-6 flex flex-col items-center">
            <div className="w-full max-w-5xl flex flex-col gap-4">
              <div className="bg-zinc-900/80 border border-white/10 p-4 md:p-5 rounded-2xl shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-white/5 text-zinc-400 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] rounded-full border border-white/10">
                      {t('Sequential Coding Plan', 'Sequential Coding Plan')}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">
                      {promptsReady ? `${prompts.length} ${t('Langkah Atomik', 'Atomic Steps')}` : t('Mode Master Prompt', 'Master Prompt Mode')}
                    </span>
                  </div>
                  <h2 className="font-sans font-bold text-xl text-zinc-100">
                    {t('Master Prompt.md', 'Master Prompt.md')}
                  </h2>
                  <p className="font-sans text-xs text-zinc-400 mt-1">
                    {t('Prompt step-by-step siap di-copy langsung ke terminal atau editor AI untuk eksekusi kode.', 'Step-by-step prompts ready to copy into a terminal or AI editor for code execution.')}
                  </p>
                  {!schemaReady && <button type="button" onClick={() => setActiveTab('architecture')} className="mt-2 font-mono text-[10px] text-amber-200 underline underline-offset-2 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70">{t('Buka Arsitektur & Schema untuk membuka Prompt →', 'Open Architecture & Schema to unlock Prompt →')}</button>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generatePrompts}
                    disabled={schemaOrPromptsBusy || !schemaReady}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowClockwise weight="bold" className={loadingPrompts ? 'animate-spin' : ''} />
                    <span>{loadingPrompts ? t('Membuat Atomic Prompts...', 'Creating Atomic Prompts...') : promptsReady ? t('Regenerate Prompts', 'Regenerate Prompts') : t('Generate Atomic Prompts', 'Generate Atomic Prompts')}</span>
                  </Button>
                  {effectivePromptMd && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => copyToClipboard(effectivePromptMd, 'prompt')}
                        disabled={workspaceBusy}
                        className="gap-1.5 text-xs"
                      >
                        {copiedKey === 'prompt' ? <Check weight="bold" className="text-emerald-400" /> : <Copy weight="bold" />}
                        <span>{copiedKey === 'prompt' ? t('Tersalin!', 'Copied!') : t('Copy Prompt.md', 'Copy Prompt.md')}</span>
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadFile(effectivePromptMd, 'Prompt.md')}
                        disabled={workspaceBusy}
                        className="gap-1.5 text-xs"
                      >
                        <DownloadSimple weight="bold" />
                        <span>{t('Download Prompt.md', 'Download Prompt.md')}</span>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {effectivePromptMd ? (
                <div className="bg-zinc-950 border border-white/10 rounded-2xl p-4 md:p-6 shadow-lg font-mono text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {effectivePromptMd}
                </div>
              ) : (
                <div className="bg-zinc-900/50 border border-dashed border-white/10 rounded-2xl p-6 text-center flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
                    <Lightning weight="duotone" className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-lg text-zinc-100">{t('Atomic Prompts Belum Dibuat', 'Atomic Prompts Have Not Been Created')}</h3>
                    <p className="font-sans text-xs text-zinc-400 max-w-md mt-1">
                      {t('Pecah implementasi sistem ke dalam rangkaian prompt atomik berurutan untuk AI Coder.', 'Break the system implementation into a sequence of atomic prompts for an AI Coder.')}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={generatePrompts}
                    disabled={schemaOrPromptsBusy || !schemaReady}
                  >
                    {loadingPrompts ? `${t('Generating Prompts', 'Generating Prompts')} (${Math.round(generationProgress)}%)...` : t('Buat Atomic Prompts', 'Create Atomic Prompts')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showSchemaConfirm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4" role="presentation">
          <div ref={schemaConfirmRef} tabIndex={-1} onKeyDown={handleSchemaDialogKeyDown} role="alertdialog" aria-modal="true" aria-labelledby="schema-confirm-title" aria-describedby="schema-confirm-description" className="w-full max-w-md rounded-2xl border border-white/15 bg-[#14191a] p-5 shadow-2xl focus:outline-none">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200">!</div>
              <div>
                <h2 id="schema-confirm-title" className="font-sans text-base font-semibold text-white">{t('Regenerate Schema?', 'Regenerate schema?')}</h2>
                <p id="schema-confirm-description" className="mt-2 font-sans text-xs leading-5 text-zinc-400">
                  {t('Schema baru akan menghapus Atomic Prompts dan/atau Prompt.md yang sudah ada. Tindakan ini tidak dapat dibatalkan dari workspace.', 'A new schema will remove the existing Atomic Prompts and/or Prompt.md. This cannot be undone from the workspace.')}
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={closeSchemaConfirm} className="rounded-lg px-3 py-2 font-mono text-xs text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">{t('Batal', 'Cancel')}</button>
              <button type="button" onClick={() => void confirmSchemaRegeneration()} disabled={workspaceBusy} className="rounded-lg bg-amber-200 px-3 py-2 font-mono text-xs font-semibold text-[#201a0d] transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 disabled:cursor-not-allowed disabled:opacity-50">{t('Lanjutkan & hapus', 'Continue & remove')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Viewer when clicking nodes in ReactFlow */}
      {viewerData && !workspaceBusy && (
        <ViewerModal
          title={viewerData.title}
          content={viewerData.content}
          onClose={() => setViewerData(null)}
        />
      )}
    </div>
  );
}
