/**
 * Unified Free AI Service — v2
 * ─────────────────────────────────────────────────────────────────
 * Priority order:
 *   1. Groq (if user has provided a free API key — fastest, best quality)
 *   2. Chrome Built-in AI (Gemini Nano, runs locally — if available)
 *   3. Pollinations AI (no key needed, retry logic, always available)
 *
 * All tiers are 100% free. Groq is optional but recommended for best results.
 * Get a free Groq key at: https://console.groq.com (no credit card)
 */

import { isChromeAIAvailable, askChromeAI } from './chromeAIService';
import { askHuggingFace, buildSystemPrompt, buildUserPrompt } from './huggingFaceService';

const GROQ_KEY_STORAGE = 'finsight-groq-key';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.1-8b-instant'; // Free, fast, great at reasoning

let selectedProvider = null;

// ─── Groq key management ─────────────────────────────────────────────────────
export function getGroqKey() {
  try {
    return localStorage.getItem(GROQ_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function saveGroqKey(key) {
  try {
    if (key) {
      localStorage.setItem(GROQ_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GROQ_KEY_STORAGE);
    }
  } catch {
    // Silently ignore
  }
}

export function hasGroqKey() {
  return !!getGroqKey();
}

// ─── Groq provider ───────────────────────────────────────────────────────────
async function askGroq(userQuestion, results, userInputs) {
  const key = getGroqKey();
  if (!key) throw new Error('No Groq key');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(userQuestion, results, userInputs) },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    clearTimeout(timeout);

    if (response.status === 401) {
      saveGroqKey(''); // Clear invalid key
      throw new Error('Invalid Groq API key — cleared. Try re-entering it.');
    }
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content?.trim();
    if (!message) throw new Error('Empty Groq response');

    return { message, source: 'groq', model: 'Llama 3.1 (Groq · free)' };
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// ─── Provider init ────────────────────────────────────────────────────────────
export async function initAI() {
  // Check Groq first (best quality)
  if (hasGroqKey()) {
    selectedProvider = 'groq';
    return { provider: 'groq', status: 'ready' };
  }

  // Chrome Built-in AI (local, private)
  if (await isChromeAIAvailable()) {
    selectedProvider = 'chrome-ai';
    return { provider: 'chrome-ai', status: 'ready' };
  }

  // Pollinations fallback (always available)
  selectedProvider = 'huggingface';
  return { provider: 'huggingface', status: 'ready' };
}

// Force re-check provider (used after user adds/removes Groq key)
export async function reinitAI() {
  selectedProvider = null;
  return initAI();
}

// ─── Unified ask function ─────────────────────────────────────────────────────
export async function askAI(userQuestion, calculationData, userInputs) {
  if (!selectedProvider) {
    await initAI();
  }

  const { results } = calculationData;

  switch (selectedProvider) {
    case 'groq':
      try {
        return await askGroq(userQuestion, results, userInputs);
      } catch (err) {
        // If Groq fails (invalid key, rate limit), fall through to next provider
        console.warn('Groq failed, falling back:', err.message);
        selectedProvider = 'huggingface';
        return askHuggingFace(userQuestion, calculationData, userInputs);
      }

    case 'chrome-ai':
      try {
        return await askChromeAI(userQuestion, calculationData, userInputs);
      } catch (err) {
        console.warn('Chrome AI failed, falling back:', err.message);
        selectedProvider = 'huggingface';
        return askHuggingFace(userQuestion, calculationData, userInputs);
      }

    case 'huggingface':
      return askHuggingFace(userQuestion, calculationData, userInputs);

    default:
      throw new Error('No AI provider available');
  }
}

// ─── Provider info ────────────────────────────────────────────────────────────
export function getAIProviderInfo() {
  const info = {
    groq: {
      name: 'Llama 3.1 via Groq',
      description: 'Fast cloud LLM — free API key from groq.com',
      cost: 'FREE',
      privacy: 'Good (no data storage per Groq policy)',
      quality: 'Excellent',
    },
    'chrome-ai': {
      name: 'Chrome Built-in AI',
      description: 'Runs locally in your browser (private & fast)',
      cost: 'FREE',
      privacy: 'Excellent (100% local)',
      quality: 'Good',
    },
    huggingface: {
      name: 'Pollinations AI',
      description: 'Cloud AI — free, no account needed',
      cost: 'FREE',
      privacy: 'Good (no account needed)',
      quality: 'Good',
    },
  };

  return info[selectedProvider] ?? {
    name: 'AI Advisor',
    description: 'Initializing…',
    cost: 'FREE',
    privacy: 'Good',
    quality: 'Good',
  };
}

export function getSelectedProvider() {
  return selectedProvider;
}
