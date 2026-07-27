import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { roadmapNodes, userQuizAttempts } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

interface StoredQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: roadmapId } = await params;
    const body: unknown = await req.json();

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const requestBody = body as Record<string, unknown>;
    if ('score' in requestBody) {
      return NextResponse.json({ error: 'Score is computed by the server' }, { status: 400 });
    }
    const { dbNodeId, answers } = requestBody;
    if (typeof dbNodeId !== 'string' || !dbNodeId.trim() || dbNodeId.length > 100) {
      return NextResponse.json({ error: 'Invalid node ID' }, { status: 400 });
    }

    // Fetch the target node
    const targetNode = await db.select().from(roadmapNodes).where(and(eq(roadmapNodes.id, dbNodeId), eq(roadmapNodes.roadmapId, roadmapId))).get();

    if (!targetNode) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    if (targetNode.status !== 'unlocked' && targetNode.status !== 'mastered') {
      return NextResponse.json({ error: 'This node is locked' }, { status: 409 });
    }

    const quiz = targetNode.quizData;
    if (!Array.isArray(quiz) || quiz.length === 0 || quiz.length > 20 || !quiz.every((question): question is StoredQuizQuestion => {
      if (!question || typeof question !== 'object') return false;
      const { id, question: questionText, options, correctAnswerIndex, explanation } = question as Record<string, unknown>;
      return typeof id === 'string'
        && id.trim().length > 0
        && typeof questionText === 'string'
        && questionText.trim().length > 0
        && typeof explanation === 'string'
        && explanation.trim().length > 0
        && Array.isArray(options)
        && options.length >= 2
        && options.length <= 10
        && options.every(option => typeof option === 'string' && option.trim().length > 0)
        && Number.isInteger(correctAnswerIndex)
        && (correctAnswerIndex as number) >= 0
        && (correctAnswerIndex as number) < options.length;
    })) {
      return NextResponse.json({ error: 'Quiz data is invalid or empty' }, { status: 422 });
    }

    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      return NextResponse.json({ error: 'Answers must be an object' }, { status: 400 });
    }

    const answerRecord = answers as Record<string, unknown>;
    const answerKeys = Object.keys(answerRecord);
    if (answerKeys.length !== quiz.length || answerKeys.some(key => !/^\d+$/.test(key) || Number(key) >= quiz.length)) {
      return NextResponse.json({ error: 'Every quiz question must have exactly one answer' }, { status: 400 });
    }

    let correctCount = 0;
    for (let index = 0; index < quiz.length; index++) {
      const answer = answerRecord[String(index)];
      if (!Number.isInteger(answer) || (answer as number) < 0 || (answer as number) >= quiz[index].options.length) {
        return NextResponse.json({ error: `Answer ${index} is out of range` }, { status: 400 });
      }
      if (answer === quiz[index].correctAnswerIndex) correctCount++;
    }

    const score = Math.round((correctCount / quiz.length) * 100);
    const passed = score >= 70;

    db.transaction((tx) => {
      tx.insert(userQuizAttempts).values({
        roadmapNodeId: targetNode.id,
        score,
        passed,
      }).run();

      if (!passed) return;

      tx.update(roadmapNodes).set({ status: 'mastered' }).where(eq(roadmapNodes.id, targetNode.id)).run();
      const allNodes = tx.select().from(roadmapNodes).where(eq(roadmapNodes.roadmapId, roadmapId)).all();

      const masteredNodeIds = new Set(
        allNodes
          .filter(n => n.id === targetNode.id || n.status === 'mastered')
          .map(n => n.nodeId)
      );

      for (const node of allNodes) {
        if (node.status === 'locked') {
          if (!Array.isArray(node.prerequisites) || !node.prerequisites.every(value => typeof value === 'string')) continue;
          const prereqs = node.prerequisites;
          const allPrereqsMet = prereqs.every(p => masteredNodeIds.has(p));
          if (allPrereqsMet) {
            tx.update(roadmapNodes).set({ status: 'unlocked' }).where(eq(roadmapNodes.id, node.id)).run();
          }
        }
      }
    });

    return NextResponse.json({ success: true, passed, score });
  } catch (error: unknown) {
    console.error('Error submitting quiz:', error);
    const message = error instanceof Error ? error.message : 'Failed to process quiz submission';
    const status = error instanceof SyntaxError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
