/**
 * Unified free AI service.
 * Priority: Chrome Built-in AI → Hugging Face (free tier)
 * All providers are 100% free, no API keys required.
 */

import { isChromeAIAvailable, askChromeAI } from './chromeAIService';
import { askHuggingFace } from './huggingFaceService';

let selectedProvider = null;

export async function initAI() {
  if (await isChromeAIAvailable()) {
    selectedProvider = 'chrome-ai';
    return { provider: 'chrome-ai', status: 'ready' };
  }

  selectedProvider = 'huggingface';
  return { provider: 'huggingface', status: 'ready' };
}

export async function askAI(userQuestion, calculationData, userInputs) {
  if (!selectedProvider) {
    await initAI();
  }

  switch (selectedProvider) {
    case 'chrome-ai':
      return askChromeAI(userQuestion, calculationData, userInputs);
    case 'huggingface':
      return askHuggingFace(userQuestion, calculationData, userInputs);
    default:
      throw new Error('No AI provider available');
  }
}

export function getAIProviderInfo() {
  const info = {
    'chrome-ai': {
      name: 'Chrome Built-in AI',
      description: 'Runs locally in your browser (private & fast)',
      cost: 'FREE',
      privacy: 'Excellent (100% local)',
    },
    huggingface: {
      name: 'Pollinations AI',
      description: 'Cloud AI — free, no account needed',
      cost: 'FREE',
      privacy: 'Good (no account needed)',
    },
  };

  return info[selectedProvider] ?? {
    name: 'AI Advisor',
    description: 'Initializing…',
    cost: 'FREE',
    privacy: 'Good',
  };
}

export function getSelectedProvider() {
  return selectedProvider;
}
