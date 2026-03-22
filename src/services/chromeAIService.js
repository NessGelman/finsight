/**
 * Chrome Built-in AI (Gemini Nano)
 * FREE - Runs locally in Chrome 127+
 * https://developer.chrome.com/docs/ai/built-in
 */

let aiSession = null;

export async function isChromeAIAvailable() {
  if (typeof window === 'undefined') return false;
  if (!window.ai || !window.ai.languageModel) return false;
  try {
    const capabilities = await window.ai.languageModel.capabilities();
    return capabilities.available !== 'no';
  } catch {
    return false;
  }
}

async function getAISession() {
  if (aiSession) return aiSession;
  aiSession = await window.ai.languageModel.create({
    systemPrompt:
      'You are a helpful business financing advisor. Answer questions concisely and specifically about the user\'s financing options. Do not give generic advice.',
  });
  return aiSession;
}

export async function askChromeAI(userQuestion, calculationData, userInputs) {
  const { results, rates } = calculationData;
  const topOptions = (results || []).slice(0, 3);

  const contextPrompt = `I'm analyzing business financing options. Here's my situation:

Business Details:
- Loan amount: $${(userInputs.principal || 0).toLocaleString()}
- Annual revenue: $${(userInputs.annualRevenue || 0).toLocaleString()}
- Credit score: ${userInputs.creditScore}
- Business age: ${userInputs.businessAge} years
- Industry: ${userInputs.industry}

Top 3 Recommended Options:
${topOptions.map((opt, idx) =>
  ` ${idx + 1}. ${opt.label}
   - Monthly payment: $${(opt.monthlyPayment || 0).toLocaleString()}
   - Total cost: $${(opt.totalCost || 0).toLocaleString()}
   - APR: ${(opt.apr || opt.eac || 0).toFixed(2)}%
   - Term: ${opt.termMonths} months`
).join('\n')}

Current Market Rates:
- Prime rate: ${rates?.prime?.value?.toFixed(2) ?? 'N/A'}%
- Credit card APR: ${rates?.creditCard?.value?.toFixed(2) ?? 'N/A'}%

My question: ${userQuestion}

Please answer specifically about MY options above, not generic advice.`;

  const session = await getAISession();
  const response = await session.prompt(contextPrompt);
  return {
    message: response,
    source: 'chrome-ai',
    model: 'Gemini Nano (local)',
  };
}

export async function destroyAISession() {
  if (aiSession) {
    try {
      await aiSession.destroy();
    } catch {
      // Ignore
    }
    aiSession = null;
  }
}
