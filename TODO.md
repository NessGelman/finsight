# FinSight Task Progress: Add FRED API Key Input

## Plan Steps
- [x] Plan approved by user
- [x] Step 1: Update src/App.jsx (add fredApiKey to inputs)
- [x] Step 2: Update src/components/inputs/InputPanel.jsx (add Data section with API key input + refresh)
- [x] Step 3: Update src/hooks/useLiveRates.js (add refresh event listener)
- [x] Step 4: Final validation and completion

## Notes
- Backend (ratesService.js) already supports localStorage.fredApiKey
- Key will be masked in UI for security

