/**
 * Pollinations AI — free text generation, no API key, no account needed.
 * https://text.pollinations.ai/
 * CORS-enabled, works directly from the browser.
 *
 * v2: better prompts, retry logic, richer financial context (all 8 options)
 */

const POLLINATIONS_URL = 'https://text.pollinations.ai/openai';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSystemPrompt() {
  return `You are FinSight, a concise business financing advisor. Rules:
- Answer in 2-4 sentences maximum
- Reference SPECIFIC numbers from the options provided (APR, monthly payment, total cost)
- No generic advice — only comment on the options shown
- If asked to compare, pick the best option and explain WHY with numbers
- Tone: direct, clear, professional`;
}

function buildUserPrompt(userQuestion, results, userInputs) {
  const allOptions = (results || []).slice(0, 8);
  const profile = [
    `Loan needed: $${(userInputs.principal || 0).toLocaleString()}`,
    `Annual revenue: $${(userInputs.annualRevenue || 0).toLocaleString()}`,
    `Credit score: ${userInputs.creditScore || 'unknown'}`,
    `Business age: ${userInputs.businessAge || 'unknown'} years`,
    userInputs.industry ? `Industry: ${userInputs.industry}` : null,
    userInputs.loanPurpose ? `Purpose: ${userInputs.loanPurpose}` : null,
  ].filter(Boolean).join('\n');

  const optionsList = allOptions
    .map((opt, idx) => {
      const apr = (opt.apr || opt.eac || 0).toFixed(1);
      const monthly = (opt.monthlyPayment || 0).toLocaleString();
      const total = (opt.totalCost || 0).toLocaleString();
      const term = opt.termMonths ? `${opt.termMonths}mo` : '';
      const approval = opt.approvalLikelihood ? ` | Approval: ${opt.approvalLikelihood}` : '';
      return `${idx + 1}. ${opt.label}: $${monthly}/mo | ${apr}% APR | $${total} total | ${term}${approval}`;
    })
    .join('\n');

  return `Business profile:\n${profile}\n\nFinancing options:\n${optionsList}\n\nQuestion: ${userQuestion}`;
}

async function attemptPollinationsRequest(userQuestion, results, userInputs, attempt = 0) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(POLLINATIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(userQuestion, results, userInputs) },
        ],
        model: 'openai',
        seed: Math.floor(Math.random() * 99999),
      }),
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Pollinations API error: ${response.status}`);
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message?.content?.trim();
    if (!message) throw new Error('Empty response from AI');

    return { message, source: 'pollinations', model: 'FinSight AI (free)' };
  } catch (err) {
    clearTimeout(timeout);
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * (attempt + 1));
      return attemptPollinationsRequest(userQuestion, results, userInputs, attempt + 1);
    }
    if (err.name === 'AbortError') {
      throw new Error('AI timed out — please try again in a moment');
    }
    throw err;
  }
}

export async function askHuggingFace(userQuestion, calculationData, userInputs) {
  const { results } = calculationData;
  return attemptPollinationsRequest(userQuestion, results, userInputs);
}

export async function askPollinations(userQuestion, results, userInputs) {
  return attemptPollinationsRequest(userQuestion, results, userInputs);
}

export { buildUserPrompt, buildSystemPrompt };
