import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { learningRoadmaps } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const roadmaps = await db.select().from(learningRoadmaps).orderBy(desc(learningRoadmaps.createdAt)).all();
    return NextResponse.json({ roadmaps });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
