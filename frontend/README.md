# Frontend (Vite + React)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `/Users/macbook/Desktop/Trucking-Management-System/frontend/.env`:

```env
VITE_MAPBOX_TOKEN=your_mapbox_public_token_here
```

3. Start dev server:

```bash
npm run dev
```

The map component reads the token from `import.meta.env.VITE_MAPBOX_TOKEN`. Do not hardcode tokens in source files.

`VITE_MAPBOX_TOKEN` is required for both map rendering and place autocomplete.
Autocomplete requests are debounced by 300ms, only run after 3+ typed characters, and return up to 5 results.
