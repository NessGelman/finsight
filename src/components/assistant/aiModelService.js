const MODEL_ID = 'Xenova/flan-t5-base';
const TRANSFORMERS_CDN_URL = 'https://esm.sh/@xenova/transformers@2.17.2?bundle';

let modelInstance = null;
let modelPromise = null;

async function loadModel() {
  if (modelInstance) return modelInstance;
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    const { pipeline, env } = await import(/* @vite-ignore */ TRANSFORMERS_CDN_URL);
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    modelInstance = await pipeline('text2text-generation', MODEL_ID);
    return modelInstance;
  })();

  try {
    return await modelPromise;
  } catch (error) {
    modelPromise = null;
    throw error;
  }
}

export function preloadAdvisorModel() {
  return loadModel();
}

export async function generateAdvisorText(prompt) {
  const model = await loadModel();
  const output = await model(prompt, {
    max_new_tokens: 180,
    min_length: 48,
    do_sample: false,
    repetition_penalty: 1.1,
  });
  return Array.isArray(output) ? output[0]?.generated_text ?? '' : String(output ?? '');
}
