# FinSight Pro (Vite + React)

This app deploys to GitHub Pages as a project site and is designed for PR-based collaboration.

## Local setup
```bash
npm install
npm run dev
```

## Fast launch
```bash
npm run start
```

## One-click launch (macOS)
Double-click [Launch-FinSight.command](/Users/nessg/Desktop/FinSight%20Pro/Launch-FinSight.command).

## Quality gate
```bash
npm run check
```

## Commands
```bash
npm run start    # dev server + open browser
npm run dev      # dev server only
npm run build    # production build
npm run lint     # lint checks
npm run check    # lint + build
npm run preview  # preview built app
```

## GitHub Pages deployment
1. Create a GitHub repository named `finsight`.
2. Push `main` to GitHub.
3. In GitHub: Settings -> Pages -> Source = `GitHub Actions`.
4. The workflow at `.github/workflows/pages.yml` will:
   - run lint and build on PRs to `main`
   - deploy `dist/` to Pages on push to `main`

Expected URL:
- `https://<your-username>.github.io/finsight/`
- Or explicitly set in `package.json`

## Team workflow
1. Create a branch per change: `feature/<name>` or `fix/<name>`.
2. Open a PR to `main`.
3. Require at least one review + passing checks before merge.
4. Merge to `main` triggers automatic Pages deploy.

## Branch protection recommended
In GitHub Settings -> Branches -> Add rule for `main`:
- Require a pull request before merging
- Require approvals
- Require status checks to pass (`Build and Deploy Pages / check`)
- Require conversation resolution
- Optional: disallow force pushes, require linear history

## Base path note
This project uses Vite `base: '/finsight/'`.
If your repository name is not `finsight`, update `vite.config.js` to `base: '/<repo-name>/'`.

## App entrypoint
- `index.html` -> `src/main.jsx` -> `src/App.jsx`
