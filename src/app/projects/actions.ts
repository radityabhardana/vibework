'use server';

import { db } from '@/lib/db';
import { projects, chatSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function deleteProjectAction(id: string) {
  if (!UUID_PATTERN.test(id)) throw new Error('Invalid project ID');

  try {
    db.transaction((tx) => {
      tx.update(chatSessions)
        .set({ projectId: null })
        .where(eq(chatSessions.projectId, id))
        .run();
      tx.delete(projects).where(eq(projects.id, id)).run();
    });
    revalidatePath('/projects');
    revalidatePath('/engine');
    revalidatePath('/');
  } catch (error: unknown) {
    console.error('Delete Project Error:', error);
    throw new Error('Unable to delete the project');
  }
}
