# FinSight

FinSight is a React + Vite app for comparing small-business financing options across:

- total cost
- monthly payment burden
- approval likelihood
- speed to funding
- scenario tradeoffs

The app models multiple products (SBA, term loans, LOC, MCA, invoice factoring, etc.) and supports live baseline rates (with fallback behavior).

## Stack

- React 19
- Vite 7
- Recharts
- ESLint 9
- GitHub Pages CI/CD via GitHub Actions

## Quick Start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Scripts

```bash
npm run start    # dev server + auto-open browser
npm run dev      # dev server only
npm run lint     # lint checks
npm run build    # production build to dist/
npm run check    # lint + build
npm run preview  # preview production build
npm run test:e2e # run Playwright end-to-end tests
```

If Playwright browsers are not installed yet:

```bash
npx playwright install chromium
```

## Project Structure

```text
src/
  components/    UI modules (dashboard, inputs, assistant, layout)
  data/          financing metadata, speed tiers, rates service
  engine/        core financing calculation logic
  hooks/         stateful app logic and memoized derivations
  utils/         formatting + export helpers
```

Entry flow: `index.html` -> `src/main.jsx` -> `src/App.jsx`

## Rates and Fallbacks

- Live rates are fetched from FRED through proxy endpoints.
- If live fetch fails, FinSight falls back to static default rates.
- Local cache is used to reduce repeated fetches.

## Deployment (GitHub Pages)

This project is configured for project-site deployment with:

- Vite base path: `/finsight/` (see `vite.config.js`)
- CI workflow: `.github/workflows/pages.yml`

Behavior:

1. Pull requests to `main`: run lint + build.
2. Pushes to `main`: run lint + build, then deploy `dist/` to GitHub Pages.

Expected URL:

- `https://<github-username>.github.io/finsight/`

If the repository name changes, update `base` in `vite.config.js`.

## Optional macOS Launcher

You can run the bundled launcher script:

```bash
./Launch-FinSight.command
```

It installs dependencies if needed, then starts the app.
