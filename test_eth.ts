import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { generateLearningRoadmap } from './src/lib/engine/prompt-chaining';

console.log('Model:', process.env.AI_MODEL_NAME);
console.log('Endpoint:', process.env.OPENAI_BASE_URL);

const start = Date.now();
generateLearningRoadmap('ethereum coding', { familiarity: 'Nol Besar', goals: ['Build a Production Project'] }, 'id')
  .then(res => {
    console.log('🎉 SUCCESS in', (Date.now() - start) / 1000, 'seconds!');
    console.log('Title:', res.title);
    console.log('Sections:', res.sections?.length);
  })
  .catch(err => {
    console.error('❌ Failed:', err);
  });
