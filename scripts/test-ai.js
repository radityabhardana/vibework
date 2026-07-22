import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

(async () => {
  const qwen = createOpenAI({
    apiKey: "sk-ws-H.YHMDMY.TDIR.MEQCIHYCKkQ1UM_aAXYFDd6spXKXEHgsVI4QnuXdwn2k_lTfAiA_d1r-iAWXX6-mafXoNZ4j3oueiHVD_KWLWmdxZFEbQg",
    baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
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
