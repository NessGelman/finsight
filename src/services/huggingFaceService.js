/**
 * Hugging Face Inference API
 * FREE tier - no account or API key needed for public models.
 * https://huggingface.co/inference-api
 */

const HF_API_URL =
  'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';

export async function askHuggingFace(userQuestion, calculationData, userInputs) {
  const { results } = calculationData;
  const topOptions = (results || []).slice(0, 3);

  const prompt = `<s>[INST] You are a concise business financing advisor.

User needs $${(userInputs.principal || 0).toLocaleString()} in financing.
Credit score: ${userInputs.creditScore}. Revenue: $${(userInputs.annualRevenue || 0).toLocaleString()}/yr.

Top financing options:
${topOptions.map((opt, idx) =>
  `${idx + 1}. ${opt.label}: $${(opt.monthlyPayment || 0).toLocaleString()}/mo, ${(opt.apr || opt.eac || 0).toFixed(1)}% APR, ${opt.termMonths} months`
).join('\n')}

Question: ${userQuestion}

Answer in 2-3 sentences about their specific options. [/INST]`;

  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 180,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.status}`);
  }

  const data = await response.json();
  // Model may still be loading on HF free tier
  if (data.error) {
    throw new Error(data.error);
  }

  const message = data[0]?.generated_text?.trim() || 'No response generated.';
  return {
    message,
    source: 'huggingface',
    model: 'Mistral-7B',
  };
}
