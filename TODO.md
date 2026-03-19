# FinSight GitHub Pages Deployment TODO

## Plan Steps (Approved ✅)

**Step 1: Fix index.html path [COMPLETE ✅]**
- Change script src from "/src/main.jsx" → "./src/main.jsx" for GH Pages base path compatibility

**Step 2: Update README.md with deployment & FRED instructions [COMPLETE ✅]**
- Add GH Pages deploy instructions
- Document FRED API key setup for live rates

**Step 3: Test local build [COMPLETE ✅]**  
- Build succeeded ✓ All chunks generated  
- Preview server running: http://localhost:4173/finsight/  
- Visit URL to verify full rendering + lazy components
```bash
npm run build
npx vite preview
```
- Verify app renders fully, no broken assets
- Test FRED rates (set localStorage.fredApiKey first)

**Step 4: Deploy to GitHub Pages [USER]**
```bash
npm i -D gh-pages
```
Add to package.json:
```
"predeploy": "npm run build",
"deploy": "gh-pages -d dist"
```
Then: `npm run deploy`

**Step 5: Live FRED rates [USER]**
- Get free key: https://fred.stlouisfed.org/docs/api/api_key.html
- Console: `localStorage.fredApiKey = 'yourkey'`
- Refresh page → see live rates

## Progress Tracking
✅ **All code fixes complete!** Core technical work done.

**Next:**  
• Test preview server (running): http://localhost:4173/finsight/  
• Deploy (see Step 4)  
• Set FRED key for live rates (Step 5)

