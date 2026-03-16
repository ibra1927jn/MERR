# Contributing to HarvestPro NZ

Thanks for your interest in contributing! This guide covers our development process.

## Getting Started

```bash
# Clone and install
git clone <repo-url>
cd harvestpro-nz
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/     # React UI components (views/, modals/, ui/, common/)
├── context/        # React contexts (AuthContext, MessagingContext)
├── hooks/          # Custom React hooks (34 hooks)
├── integration/    # Integration tests
├── pages/          # Route-level pages (Login, Manager, Runner, PickerScanner)
├── repositories/   # Data access layer (Supabase queries)
├── services/       # Business logic services
├── stores/         # Zustand store (useHarvestStore + slices)
├── types/          # TypeScript type definitions
└── utils/          # Shared utilities
```

## Development Workflow

1. **Branch from `main`** — feature branches follow `feat/`, `fix/`, `refactor/` conventions
2. **Write tests** — all new hooks/services need tests. Use `renderHook()` for hooks, `vi.mock()` for service boundaries
3. **Check types** — `npx tsc --noEmit` (0 errors expected)
4. **Run tests** — `npm test` (3700+ tests, 99.5%+ pass rate expected)
5. **Build** — `npm run build` (should complete in ~11s, 101 precached entries)
6. **PR** — CI runs automatically (ci.yml: lint, type-check, test, build)

## Key Conventions

### NZ Compliance
- All wages in **NZD** ($23.50/hr minimum wage, $6.50/bucket default piece rate)
- All timestamps use **NZST** (`nowNZST()`, `toNZST()` from `@/utils/nzst`)
- Payroll includes **wage shield** (automatic minimum wage top-up)
- `>14h` days auto-flagged for review per NZ Employment law

### Testing
- Hooks: `renderHook()` from `@testing-library/react` 
- Store slices: Zustand `set()` spy + inline store creation
- Integration: Mock repository boundaries, test service logic
- `vi.hoisted()` required for mock variables used in `vi.mock()` factories

### Offline-First
- All writes go to IndexedDB queue first (`syncService.addToQueue()`)
- Queue processed when online (cross-tab mutex via Web Locks API)
- Max 3 retries before dead-letter queue

## Environment Variables

Required in `.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_VAPID_PUBLIC_KEY=
```

> ⚠️ Never commit `.env` files. Check `.gitignore` is up to date.

## Questions?

Open an issue or contact the project maintainer.
