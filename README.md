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

## Firebase Sync

Set Firebase values in [src/lib/firebaseConfig.ts](src/lib/firebaseConfig.ts) to enable cloud sync:

```ts
export const firebaseSyncConfig = {
 apiKey: "...",
 authDomain: "...",
 databaseURL: "...",
 projectId: "...",
 storageBucket: "...",
 messagingSenderId: "...",
 appId: "...",
 syncPath: "appSync",
}
```

Notes:

- `syncPath` is optional and defaults to `appSync` in the checked-in config.
- A device hash is generated automatically and saved in local storage under `sync.hash`.
- Local changes are uploaded with a 5s debounce.
- Hash edits trigger a debounced pull from Firebase.
- Incoming data is applied only when remote `sync.timestamp` is newer than local.

## Deploy

A GitHub Actions workflow at `.github/workflows/deploy-gh-pages.yml` builds and deploys `dist` to the `gh-pages` branch whenever `main` updates.

For project pages, Vite automatically uses `/<repo-name>/` base when running inside GitHub Actions.
