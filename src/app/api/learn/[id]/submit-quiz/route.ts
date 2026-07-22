import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { roadmapNodes, userQuizAttempts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roadmapId } = await params;
    const { dbNodeId, score, answers } = await req.json();

    // Fetch the target node
    const targetNode = await db.select().from(roadmapNodes).where(and(eq(roadmapNodes.id, dbNodeId), eq(roadmapNodes.roadmapId, roadmapId))).get();

    if (!targetNode) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const passed = score >= 70; // 70% to pass quiz

    // Record attempt
    await db.insert(userQuizAttempts).values({
      roadmapNodeId: targetNode.id,
      score,
      passed,
    });

    if (passed) {
      // Mark current node as mastered
      await db.update(roadmapNodes).set({ status: 'mastered' }).where(eq(roadmapNodes.id, targetNode.id));

      // Check all other nodes in this roadmap to see if any locked nodes can now be unlocked
      const allNodes = await db.select().from(roadmapNodes).where(eq(roadmapNodes.roadmapId, roadmapId)).all();

      const masteredNodeIds = new Set(
        allNodes
          .filter(n => n.id === targetNode.id || n.status === 'mastered')
          .map(n => n.nodeId)
      );

      for (const node of allNodes) {
        if (node.status === 'locked') {
          const prereqs = (node.prerequisites as string[]) || [];
          const allPrereqsMet = prereqs.every(p => masteredNodeIds.has(p));
          if (allPrereqsMet) {
            await db.update(roadmapNodes).set({ status: 'unlocked' }).where(eq(roadmapNodes.id, node.id));
          }
        }
      }
    }

    return NextResponse.json({ success: true, passed, score });
  } catch (error: any) {
    console.error('Error submitting quiz:', error);
    return NextResponse.json({ error: error.message || 'Failed to process quiz submission' }, { status: 500 });
  }
}
