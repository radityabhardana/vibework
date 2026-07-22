import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { learningRoadmaps, roadmapNodes } from '@/lib/db/schema';
import { generateLearningRoadmap } from '@/lib/engine/prompt-chaining';

export async function POST(req: Request) {
  try {
    const { topic, familiarity, goals, focusText, level, language } = await req.json();

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'Topic is required.' }, { status: 400 });
    }

    // Call LLM to generate granular roadmap.sh style roadmap with grill context & language
    const roadmapResult = await generateLearningRoadmap(topic, { familiarity, goals, focusText, level }, language || 'id');

    const roadmapId = crypto.randomUUID();

    // Insert roadmap header
    await db.insert(learningRoadmaps).values({
      id: roadmapId,
      topic: topic.trim(),
      title: roadmapResult.title || `Learning Path: ${topic}`,
      description: roadmapResult.description || `AI Generated Learning Roadmap for ${topic}`,
    });

    const nodesToInsert: any[] = [];
    let globalIdx = 0;

    if (Array.isArray(roadmapResult.sections) && roadmapResult.sections.length > 0) {
      // Process roadmap.sh hierarchical section -> group -> topics structure
      roadmapResult.sections.forEach((sec: any, secIdx: number) => {
        const sectionName = sec.sectionName || `Section ${secIdx + 1}`;
        const groups = sec.groups || [];

        groups.forEach((grp: any, grpIdx: number) => {
          const groupName = grp.groupName || 'General';
          const side = grp.side || (grpIdx % 2 === 0 ? 'left' : 'right');
          const topics = grp.topics || [];

          topics.forEach((t: any) => {
            const hasPrereqs = Array.isArray(t.prerequisites) && t.prerequisites.length > 0;
            nodesToInsert.push({
              id: crypto.randomUUID(),
              roadmapId,
              nodeId: t.nodeId || `topic_${globalIdx + 1}`,
              title: t.title,
              description: t.description || '',
              category: JSON.stringify({
                category: t.category || 'required',
                sectionName,
                groupName,
                side,
                sectionOrder: secIdx + 1,
              }),
              prerequisites: t.prerequisites || [],
              contentMarkdown: t.contentMarkdown || `# ${t.title}\n\n${t.description}`,
              quizData: t.quiz || [],
              status: secIdx === 0 && !hasPrereqs ? 'unlocked' : (hasPrereqs ? 'locked' : 'unlocked'),
              orderIndex: globalIdx++,
            });
          });
        });
      });
    } else if (Array.isArray(roadmapResult.nodes)) {
      // Fallback for flat nodes structure
      roadmapResult.nodes.forEach((node: any, idx: number) => {
        const hasPrereqs = Array.isArray(node.prerequisites) && node.prerequisites.length > 0;
        nodesToInsert.push({
          id: crypto.randomUUID(),
          roadmapId,
          nodeId: node.nodeId || `node_${idx + 1}`,
          title: node.title,
          description: node.description || '',
          category: JSON.stringify({ category: node.category || 'required', sectionName: 'Fundamentals', groupName: 'Core Topics', side: idx % 2 === 0 ? 'left' : 'right' }),
          prerequisites: node.prerequisites || [],
          contentMarkdown: node.contentMarkdown || `# ${node.title}\n\n${node.description}`,
          quizData: node.quiz || [],
          status: hasPrereqs ? 'locked' : 'unlocked',
          orderIndex: idx,
        });
      });
    }

    for (const nodeVal of nodesToInsert) {
      await db.insert(roadmapNodes).values(nodeVal);
    }

    return NextResponse.json({ success: true, roadmapId });
  } catch (error: any) {
    console.error('Error generating learning roadmap:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate roadmap' }, { status: 500 });
  }
}
