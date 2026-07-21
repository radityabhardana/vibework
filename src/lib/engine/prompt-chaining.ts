import { generateText, generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const qwen = createOpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

export async function generatePRD(idea: string) {
  const result = await generateText({
    model: qwen('qwen-plus'), // Standard Qwen model, or whichever is available on the compatible endpoint
    system: `You are an expert Product Manager. Generate a strict PRD in markdown based on the user's idea. Include Target User, Core Features, MVP Constraints, and Monetization Model. Keep it concise, brutalist, and actionable.`,
    prompt: idea,
  });

  return result.text;
}

// Example for generating tech stack (ADR)
// export async function generateADR(...) { ... }
