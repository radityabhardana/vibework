import { db } from '@/lib/db';
import { generationLeases, type GenerationOperation } from '@/lib/db/schema';
import { and, eq, lte } from 'drizzle-orm';

export const GENERATION_LEASE_DURATION_MS = 120_000;

type LeaseDatabase = typeof db;
type LeaseTransaction = Parameters<Parameters<LeaseDatabase['transaction']>[0]>[0];

export type GenerationLease = {
  projectId: string;
  operation: GenerationOperation;
  ownerToken: string;
  acquiredAt: number;
  expiresAt: number;
};

export class GenerationInProgressError extends Error {
  readonly operation: GenerationOperation;
  readonly retryAfterSeconds: number;

  constructor(operation: GenerationOperation, expiresAt: number, now: number) {
    const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt - now) / 1000));
    super('Another generation is already in progress for this project.');
    this.name = 'GenerationInProgressError';
    this.operation = operation;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class GenerationLeaseLostError extends Error {
  readonly operation: GenerationOperation;

  constructor(operation: GenerationOperation) {
    super('The generation lease expired or was superseded before the result could be committed.');
    this.name = 'GenerationLeaseLostError';
    this.operation = operation;
  }
}

export function acquireGenerationLease(
  projectId: string,
  operation: GenerationOperation,
  now = Date.now(),
  database: LeaseDatabase = db,
): GenerationLease {
  const lease = {
    projectId,
    operation,
    ownerToken: crypto.randomUUID(),
    acquiredAt: now,
    expiresAt: now + GENERATION_LEASE_DURATION_MS,
  } satisfies GenerationLease;

  return database.transaction((tx) => {
    const result = tx.insert(generationLeases)
      .values(lease)
      .onConflictDoUpdate({
        target: generationLeases.projectId,
        set: {
          operation: lease.operation,
          ownerToken: lease.ownerToken,
          acquiredAt: lease.acquiredAt,
          expiresAt: lease.expiresAt,
        },
        where: lte(generationLeases.expiresAt, now),
      })
      .run();

    if (result.changes === 0) {
      const activeLease = tx.select().from(generationLeases)
        .where(eq(generationLeases.projectId, projectId))
        .get();
      if (activeLease && activeLease.expiresAt > now) {
        throw new GenerationInProgressError(
          activeLease.operation as GenerationOperation,
          activeLease.expiresAt,
          now,
        );
      }
    }

    return lease;
  });
}

export function assertGenerationLease(
  tx: LeaseTransaction,
  lease: Pick<GenerationLease, 'projectId' | 'operation' | 'ownerToken'>,
  now = Date.now(),
): void {
  const currentLease = tx.select().from(generationLeases)
    .where(eq(generationLeases.projectId, lease.projectId))
    .get();

  if (!currentLease
    || currentLease.ownerToken !== lease.ownerToken
    || currentLease.expiresAt <= now) {
    throw new GenerationLeaseLostError(lease.operation);
  }
}

export function withFencedGenerationCommit<T>(
  lease: Pick<GenerationLease, 'projectId' | 'operation' | 'ownerToken'>,
  commit: (tx: LeaseTransaction) => T,
  now = Date.now(),
  database: LeaseDatabase = db,
): T {
  return database.transaction((tx) => {
    assertGenerationLease(tx, lease, now);
    return commit(tx);
  });
}

export function releaseGenerationLease(
  lease: Pick<GenerationLease, 'projectId' | 'ownerToken'>,
  database: LeaseDatabase = db,
): void {
  database.delete(generationLeases)
    .where(and(
      eq(generationLeases.projectId, lease.projectId),
      eq(generationLeases.ownerToken, lease.ownerToken),
    ))
    .run();
}

export function releaseGenerationLeaseBestEffort(
  lease: Pick<GenerationLease, 'projectId' | 'ownerToken'>,
  database: LeaseDatabase = db,
): void {
  try {
    releaseGenerationLease(lease, database);
  } catch (error: unknown) {
    console.error(
      'Generation lease cleanup failed:',
      error instanceof Error ? error.message : 'Unknown cleanup error',
    );
  }
}
