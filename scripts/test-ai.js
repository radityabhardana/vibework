import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

(async () => {
  const apiKey = process.env.AI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL;
  if (!apiKey || !baseURL) {
    throw new Error('AI_API_KEY and OPENAI_BASE_URL are required.');
  }

  const qwen = createOpenAI({
    apiKey,
    baseURL,
  });

  const result = await streamText({
    model: qwen('qwen-max'),
    messages: [{ role: 'user', content: 'hello' }],
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
  console.log("\nDone");
})();
