import { genkit } from 'genkit';
import { openAI } from '@genkit-ai/compat-oai/openai';

const ai = genkit({ plugins: [openAI()] });

const { text } = await ai.generate({
    model: openAI.model('gpt-4o-mini'),
    prompt: 'Why is Genkit awesome?'
});