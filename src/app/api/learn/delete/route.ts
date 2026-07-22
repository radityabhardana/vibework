import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { learningRoadmaps } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.delete(learningRoadmaps).where(eq(learningRoadmaps.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
