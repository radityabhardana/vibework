'use server';

import { db } from '@/lib/db';
import { projects } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function deleteProjectAction(id: string) {
  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath('/projects');
  revalidatePath('/');
}
