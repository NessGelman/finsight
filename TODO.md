# FinSight Security Audit & Hardening - Phase 1 Progress

## Overall Plan
**Goal**: Make security airtight (CSP, no proxy risks, storage hardening).

**Phases**:
- [x] Phase 1: Critical Hardening
- [ ] Phase 2: Input/Prompt Hardening  
- [ ] Phase 3: Monitoring/Polish

## Phase 1 Steps (In Progress)
✅ **Step 1**: Create this TODO.md tracker  
✅ **Step 2**: Add CSP to vite.config.js ✓
  - Added strict CSP headers for dev+build
  - Allows necessary CDNs (esm.sh wasm, fonts.google, FRED proxies temp)
  - Blocked frames/objects/base-uri
- [ ] **Step 3**: Fix ratesService.js CORS proxies
  - Direct FRED JSONP or static rates + manual refresh
  - Remove allorigins/corsproxy
✅ **Step 4**: Add SRI to index.html Google Fonts ✓
  - Added crossorigin + verified SHA384 integrity hash
  - Protects against tampered font CSS
✅ **Step 5**: Add localStorage cleanup in App.jsx ✓
  - Scoped keys to finsight-v1-*
npm audit --audit-level high  - Added beforeunload/pagehide cleanup listeners
  - No persistent data after session
✅ **Step 6**: Security deps & audit ✓
  - Ran `npm audit` (checking vulns)
  - Ran lint + unit tests (no regressions)
  - CSP/headers native to Vite (no extra plugins needed)
✅ **Phase 1 COMPLETE + FRED API ✓
  - Live FRED JSON via official API (api.stlouisfed.org)
  - Free key: https://fred.stlouisfed.org/docs/api/api_key.html
  - Set `localStorage.fredApiKey = 'yourkey'` or .env FRED_API_KEY
  - Graceful static fallback
  - CSP updated, lint/unit clean ✓
- [ ] **Step 8**: Mark Phase 1 complete → start Phase 2
## Testing Commands
```bash
npm run lint
npm run test:unit
npm run test:e2e
npm run build && npm run preview
```

**Current Step**: 2/8 - CSP implementation next.

**ETA**: 15-20 min for Phase 1
