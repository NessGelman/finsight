/**
 * Pollinations AI — free text generation, no API key, no account needed.
 * https://text.pollinations.ai/
 * CORS-enabled, works directly from the browser.
 */

const POLLINATIONS_URL = 'https://text.pollinations.ai/';

export async function askHuggingFace(userQuestion, calculationData, userInputs) {
  const { results } = calculationData;
  const topOptions = (results || []).slice(0, 3);

  const systemPrompt =
    'You are a concise business financing advisor. Answer in 2-3 sentences using only the options provided. No generic advice.';

  const userPrompt = `I need $${(userInputs.principal || 0).toLocaleString()} in financing.
Credit score: ${userInputs.creditScore}. Revenue: $${(userInputs.annualRevenue || 0).toLocaleString()}/yr.

Top options:
${topOptions
  .map(
    (opt, idx) =>
      `${idx + 1}. ${opt.label}: $${(opt.monthlyPayment || 0).toLocaleString()}/mo, ${(opt.apr || opt.eac || 0).toFixed(1)}% APR, ${opt.termMonths} months`,
  )
  .join('\n')}

Question: ${userQuestion}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response;
  try {
    response = await fetch(POLLINATIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        model: 'openai-fast',
        private: true,
        seed: Math.floor(Math.random() * 10000),
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Pollinations API error: ${response.status}`);
  }

  const message = (await response.text()).trim();
  if (!message) throw new Error('Empty response from AI');

  return {
    message,
    source: 'pollinations',
    model: 'Pollinations (free)',
  };
}
