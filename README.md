# ISEPS Tools Website

SolidJS + Vite website hosting client-side ISEPS utilities.

## Stack

- SolidJS
- Vite
- TailwindCSS
- Kobalte

## Local Development

1. Install Node.js 22+
1. Install deps:

```bash
npm install
```

1. Start dev server:

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## Deploy

A GitHub Actions workflow at `.github/workflows/deploy-gh-pages.yml` builds and deploys `dist` to the `gh-pages` branch whenever `main` updates.

For project pages, Vite automatically uses `/<repo-name>/` base when running inside GitHub Actions.
