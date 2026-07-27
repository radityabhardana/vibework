import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { learningRoadmaps, roadmapNodes } from '@/lib/db/schema';
import { generateLearningRoadmap } from '@/lib/engine/prompt-chaining';

type NodeInsert = typeof roadmapNodes.$inferInsert;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function requiredText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`Invalid generated roadmap: ${field}`);
  }
  return value;
}

function buildNodeInserts(result: unknown, roadmapId: string) {
  if (!isRecord(result)) throw new Error('Invalid generated roadmap: expected an object');

  const title = requiredText(result.title, 'title', 200);
  const description = requiredText(result.description, 'description', 1000);
  if (!Array.isArray(result.sections) || result.sections.length === 0 || result.sections.length > 8) {
    throw new Error('Invalid generated roadmap: sections');
  }

  const nodes: NodeInsert[] = [];
  const nodeIds = new Set<string>();
  const prerequisiteLists: string[][] = [];

  result.sections.forEach((section, sectionIndex) => {
    if (!isRecord(section)) throw new Error(`Invalid generated roadmap: section ${sectionIndex + 1}`);
    const sectionName = requiredText(section.sectionName, `section ${sectionIndex + 1} name`, 200);
    if (!Array.isArray(section.groups) || section.groups.length === 0 || section.groups.length > 8) {
      throw new Error(`Invalid generated roadmap: section ${sectionIndex + 1} groups`);
    }

    section.groups.forEach((group, groupIndex) => {
      if (!isRecord(group)) throw new Error(`Invalid generated roadmap: group ${groupIndex + 1}`);
      const groupName = requiredText(group.groupName, `group ${groupIndex + 1} name`, 200);
      if (group.side !== 'left' && group.side !== 'right') {
        throw new Error(`Invalid generated roadmap: group ${groupIndex + 1} side`);
      }
      if (!Array.isArray(group.topics) || group.topics.length === 0 || group.topics.length > 20) {
        throw new Error(`Invalid generated roadmap: group ${groupIndex + 1} topics`);
      }

      group.topics.forEach((topic, topicIndex) => {
        if (!isRecord(topic) || nodes.length >= 40) {
          throw new Error('Invalid generated roadmap: too many or malformed topics');
        }

        const nodeId = requiredText(topic.nodeId, `topic ${topicIndex + 1} nodeId`, 100);
        if (!/^[a-zA-Z0-9_-]+$/.test(nodeId) || nodeIds.has(nodeId)) {
          throw new Error(`Invalid generated roadmap: duplicate or malformed nodeId ${nodeId}`);
        }
        nodeIds.add(nodeId);

        const nodeTitle = requiredText(topic.title, `topic ${nodeId} title`, 300);
        const nodeDescription = requiredText(topic.description, `topic ${nodeId} description`, 2000);
        const contentMarkdown = requiredText(topic.contentMarkdown, `topic ${nodeId} content`, 20000);
        if (!['required', 'recommended', 'optional'].includes(String(topic.category))) {
          throw new Error(`Invalid generated roadmap: topic ${nodeId} category`);
        }
        if (!Array.isArray(topic.prerequisites)
          || topic.prerequisites.some(value => typeof value !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(value))) {
          throw new Error(`Invalid generated roadmap: topic ${nodeId} prerequisites`);
        }
        const prerequisites = topic.prerequisites as string[];

        if (!Array.isArray(topic.quiz) || topic.quiz.length === 0 || topic.quiz.length > 5) {
          throw new Error(`Invalid generated roadmap: topic ${nodeId} quiz`);
        }
        const quiz = topic.quiz.map((question, questionIndex) => {
          if (!isRecord(question)) throw new Error(`Invalid generated roadmap: topic ${nodeId} question ${questionIndex + 1}`);
          const id = requiredText(question.id, `topic ${nodeId} question ID`, 100);
          const questionText = requiredText(question.question, `topic ${nodeId} question`, 2000);
          const explanation = requiredText(question.explanation, `topic ${nodeId} explanation`, 4000);
          if (!Array.isArray(question.options)
            || question.options.length < 2
            || question.options.length > 6
            || question.options.some(option => typeof option !== 'string' || !option.trim() || option.length > 1000)) {
            throw new Error(`Invalid generated roadmap: topic ${nodeId} question options`);
          }
          if (!Number.isInteger(question.correctAnswerIndex)
            || (question.correctAnswerIndex as number) < 0
            || (question.correctAnswerIndex as number) >= question.options.length) {
            throw new Error(`Invalid generated roadmap: topic ${nodeId} correct answer`);
          }
          return {
            id,
            question: questionText,
            options: question.options as string[],
            correctAnswerIndex: question.correctAnswerIndex as number,
            explanation,
          };
        });

        prerequisiteLists.push(prerequisites);
        nodes.push({
          id: crypto.randomUUID(),
          roadmapId,
          nodeId,
          title: nodeTitle,
          description: nodeDescription,
          category: JSON.stringify({
            category: topic.category,
            sectionName,
            groupName,
            side: group.side,
            sectionOrder: sectionIndex + 1,
          }),
          prerequisites,
          contentMarkdown,
          quizData: quiz,
          status: prerequisites.length > 0 ? 'locked' : 'unlocked',
          orderIndex: nodes.length,
        });
      });
    });
  });

  const nodeOrder = new Map(nodes.map((node, index) => [node.nodeId, index]));
  if (nodes.length === 0 || prerequisiteLists.some((prerequisites, index) =>
    prerequisites.some(prerequisite => (nodeOrder.get(prerequisite) ?? index) >= index))) {
    throw new Error('Invalid generated roadmap: missing, cyclic, or non-sequential prerequisites');
  }

  return { title, description, nodes };
}

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });

    const { topic, familiarity, goals, focusText, level } = body;
    const language = body.language === undefined ? 'id' : body.language;
    if (typeof topic !== 'string' || !topic.trim() || topic.length > 120) {
      return NextResponse.json({ error: 'Topic must be between 1 and 120 characters.' }, { status: 400 });
    }
    if (familiarity !== undefined && (typeof familiarity !== 'string' || !familiarity.trim() || familiarity.length > 200)) {
      return NextResponse.json({ error: 'Familiarity must be 1 to 200 characters.' }, { status: 400 });
    }
    if (level !== undefined && (typeof level !== 'string' || !level.trim() || level.length > 100)) {
      return NextResponse.json({ error: 'Level must be 1 to 100 characters.' }, { status: 400 });
    }
    if (focusText !== undefined && (typeof focusText !== 'string' || focusText.length > 500)) {
      return NextResponse.json({ error: 'Focus text cannot exceed 500 characters.' }, { status: 400 });
    }
    if (goals !== undefined && (!Array.isArray(goals)
      || goals.length === 0
      || goals.length > 6
      || goals.some(goal => typeof goal !== 'string' || !goal.trim() || goal.length > 150))) {
      return NextResponse.json({ error: 'Goals must contain 1 to 6 short entries.' }, { status: 400 });
    }
    if (language !== 'id' && language !== 'en') {
      return NextResponse.json({ error: 'Language must be "id" or "en".' }, { status: 400 });
    }

    const roadmapResult = await generateLearningRoadmap(topic.trim(), {
      familiarity: familiarity as string | undefined,
      goals: goals as string[] | undefined,
      focusText: focusText as string | undefined,
      level: level as string | undefined,
    }, language);

    const roadmapId = crypto.randomUUID();
    const roadmap = buildNodeInserts(roadmapResult, roadmapId);

    db.transaction((tx) => {
      tx.insert(learningRoadmaps).values({
        id: roadmapId,
        topic: topic.trim(),
        title: roadmap.title,
        description: roadmap.description,
      }).run();
      tx.insert(roadmapNodes).values(roadmap.nodes).run();
    });

    return NextResponse.json({ success: true, roadmapId });
  } catch (error: unknown) {
    console.error('Error generating learning roadmap:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate roadmap';
    return NextResponse.json({ error: message }, { status: error instanceof SyntaxError ? 400 : 500 });
  }
}
