const TRANSFORMERS_CDN_URL = 'https://esm.sh/@xenova/transformers@2.17.2?bundle';
const MODEL_LADDER = {
  balanced: 'Xenova/flan-t5-large',
  fast: 'Xenova/flan-t5-base',
};
const FALLBACK_TIER = 'fast';
const DEFAULT_PRELOAD_BUDGET_MS = 1400;

const modelInstances = new Map();
const modelPromises = new Map();
const modelStatus = {
  activeTier: null,
  loadedTiers: [],
  lastError: null,
};

function getCapabilityProfile() {
  if (typeof navigator === 'undefined') {
    return { deviceMemory: 4, hardwareConcurrency: 4 };
  }
  const deviceMemory = Number.isFinite(navigator.deviceMemory) ? navigator.deviceMemory : 4;
  const hardwareConcurrency = Number.isFinite(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 4;
  return { deviceMemory, hardwareConcurrency };
}

function canRunBalanced(profile = getCapabilityProfile()) {
  return profile.deviceMemory >= 8 && profile.hardwareConcurrency >= 6;
}

function resolveTier(requestedTier = 'fast') {
  if (requestedTier === 'balanced') {
    return canRunBalanced() ? 'balanced' : FALLBACK_TIER;
  }
  if (requestedTier === 'fast') return 'fast';
  return 'fast';
}

export function selectModelTier({ qualityMode = 'fast', requestedTier = null } = {}) {
  if (requestedTier) return resolveTier(requestedTier);
  if (qualityMode === 'balanced') return resolveTier('balanced');
  return resolveTier('fast');
}

function withTimeout(promise, timeoutMs, errorMessage) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

async function loadModelTier(tier, { timeoutMs = 0 } = {}) {
  if (modelInstances.has(tier)) return modelInstances.get(tier);
  if (modelPromises.has(tier)) return modelPromises.get(tier);

  const modelId = MODEL_LADDER[tier];
  const promise = (async () => {
    const { pipeline, env } = await import(/* @vite-ignore */ TRANSFORMERS_CDN_URL);
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    const model = await pipeline('text2text-generation', modelId);
    modelInstances.set(tier, model);
    modelStatus.activeTier = tier;
    modelStatus.loadedTiers = [...new Set([...modelStatus.loadedTiers, tier])];
    modelStatus.lastError = null;
    return model;
  })();

  modelPromises.set(tier, promise);
  try {
    const loaded = await withTimeout(promise, timeoutMs, `Model preload timeout (${tier})`);
    return loaded;
  } catch (error) {
    modelStatus.lastError = error instanceof Error ? error.message : String(error);
    modelPromises.delete(tier);
    throw error;
  } finally {
    if (modelInstances.has(tier)) {
      modelPromises.delete(tier);
    }
  }
}

async function loadWithFallback(preferredTier, options = {}) {
  const resolvedTier = selectModelTier({ requestedTier: preferredTier });
  try {
    return await loadModelTier(resolvedTier, options);
  } catch (error) {
    if (resolvedTier === FALLBACK_TIER) throw error;
    return loadModelTier(FALLBACK_TIER, options);
  }
}

export async function preloadAdvisorModel({ tier = 'fast', budgetMs = DEFAULT_PRELOAD_BUDGET_MS } = {}) {
  return loadWithFallback(tier, { timeoutMs: budgetMs });
}

export async function generateAdvisorText(prompt, { tier = 'fast', styleMode = 'hybrid' } = {}) {
  const model = await loadWithFallback(tier);
  const paramsByStyle = {
    concise: { max_new_tokens: 110, min_length: 32 },
    hybrid: { max_new_tokens: 170, min_length: 56 },
    detailed: { max_new_tokens: 240, min_length: 72 },
  };
  const styleParams = paramsByStyle[styleMode] ?? paramsByStyle.hybrid;
  const output = await model(prompt, {
    ...styleParams,
    do_sample: false,
    repetition_penalty: 1.12,
  });
  return Array.isArray(output) ? output[0]?.generated_text ?? '' : String(output ?? '');
}

export function getModelStatus() {
  return {
    ...modelStatus,
    loadedTiers: [...modelStatus.loadedTiers],
  };
}
