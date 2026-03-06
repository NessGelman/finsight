import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeterministicResponse,
  isAcceptableRewrite,
  isLowQualityResponse,
  summarizeConversationState,
} from '../src/components/assistant/aiAdvisorLogic.js';
import { selectModelTier } from '../src/components/assistant/aiModelService.js';

function makeContext() {
  return {
    ratesStatus: 'live',
    selectedProductDetail: { id: 'termLoan', label: 'Term Loan', scheduleSummary: null, eligibilityWarnings: [] },
    results: [
      {
        id: 'termLoan',
        label: 'Term Loan',
        totalCost: 121000,
        monthlyPayment: 3500,
        likelihood: 72,
        sac: 14.2,
        eac: 15.3,
        termMonths: 36,
        freeCashflowPct: 28.3,
        eligibilityWarnings: [],
        scheduleSummary: { firstPayment: 3520, finalPayment: 3490 },
      },
      {
        id: 'mca',
        label: 'MCA',
        totalCost: 145000,
        monthlyPayment: 5200,
        likelihood: 88,
        sac: 38.2,
        eac: 42.1,
        termMonths: 12,
        freeCashflowPct: 44.4,
        eligibilityWarnings: [],
        scheduleSummary: { firstPayment: 5200, finalPayment: 5200 },
      },
      {
        id: 'lineOfCredit',
        label: 'Line of Credit',
        totalCost: 130000,
        monthlyPayment: 2900,
        likelihood: 80,
        sac: 24.1,
        eac: 26.7,
        termMonths: 24,
        freeCashflowPct: 23.4,
        eligibilityWarnings: [],
        scheduleSummary: { firstPayment: 2800, finalPayment: 3000 },
      },
    ],
  };
}

test('deterministic response returns cost-grounded recommendation', () => {
  const response = buildDeterministicResponse('what is cheapest and why', makeContext(), 'hybrid');
  assert.match(response, /Term Loan/i);
  assert.match(response, /\$121,000/);
});

test('rewrite validator rejects low quality and accepts grounded rewrite', () => {
  const context = makeContext();
  const draft = buildDeterministicResponse('compare top options', context, 'hybrid');
  assert.equal(isLowQualityResponse('a / / / / / / / / / / / /'), true);
  const goodRewrite = `${draft}\nThis keeps the same numbers and product names.`;
  assert.equal(isAcceptableRewrite(draft, goodRewrite, context), true);
  assert.equal(isAcceptableRewrite(draft, 'random nonsense i.e., i.e., i.e.,', context), false);
});

test('model tier selector chooses safe fallback for fast and balanced paths', () => {
  assert.equal(selectModelTier({ qualityMode: 'fast' }), 'fast');
  const tier = selectModelTier({ qualityMode: 'balanced' });
  assert.ok(['balanced', 'fast'].includes(tier));
});

test('conversation summary keeps recent turns and records preferences', () => {
  const turns = [
    { role: 'user', content: 'hi' },
    { role: 'assistant', content: 'hello' },
    { role: 'user', content: 'compare options for monthly payments' },
    { role: 'assistant', content: 'comparison details' },
    { role: 'user', content: 'explain in beginner terms' },
    { role: 'assistant', content: 'beginner explanation' },
    { role: 'user', content: 'and approval odds too' },
    { role: 'assistant', content: 'approval follow-up' },
  ];
  const summary = summarizeConversationState(turns, { styleMode: 'detailed', qualityMode: 'balanced' }, 4);
  assert.match(summary.summary, /detailed explanation style/i);
  assert.match(summary.summary, /(compare|monthly burden)/i);
  assert.equal(summary.recentTurns.length, 4);
});
