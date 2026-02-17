# Census Tracker: SLS Specialty Hospital

> **Built and managed entirely from an Android phone** by the primary user/owner using Claude Code.

---

## Project Overview

A specialized tool for tracking the **Average Daily Census (ADC)** at Salt Lake Specialty Hospital. This app allows Clinical Liaisons (Thad and West) to coordinate data in real-time to ensure accurate monthly reporting and bonus calculations.

---

## Core Logic & Data Points

### 1. Admissions Tracking

- **Hospital Name** — Text input
- **Patient Type** — Dropdown: `Resp Complex`, `Trach Vent`, `Wound`, `Med Complex`
- **Clinical Liaison** — Dropdown: `Thad`, `West`

### 2. Discharge & RTA Tracking

**Routine Discharges:**
- **Type** — `IRF`, `SNF`, `HH`, `ALF`, `Passed`
- **Patient Name** — Text input

**Return to Acute (RTA):**
- **Hospital** — `UofU`, `IMC`, `SMH`, `SLR`, `HC-JV`, `HC-JVW`, `HCH`
- **Reason** — `Sepsis`, `^Resp`, `^Cardiac`, `GI bleed`, `Family Request`, `Sx`, `Procedure`, `Other`

### 3. Calculations & Incentives

**ADC:** Calculated monthly. Previous months' totals are archived and accessible via the history calendar.

```
dailyCensus = startingCensus + admissions − discharges − RTAs
ADC = totalCensusDays / daysElapsed
```

**Bonus Feature (Hidden):** A password-protected or hidden section that calculates monthly bonuses based on the ADC. Seven tiers range from $750 at 20 ADC to $7,000 at 36+ ADC.

| ADC Threshold | Bonus Amount |
|---------------|-------------|
| 36+ | $7,000 |
| 33+ | $5,000 |
| 30+ | $4,000 |
| 28+ | $3,000 |
| 26+ | $2,000 |
| 23+ | $1,350 |
| 20+ | $750 |
| < 20 | $0 |

**Output:** Ability to generate a **Monthly Bonus Submission PDF** including User Name, ADC, Total Bonus, and a Signature/Date line for email submission.

---

## Project Manifesto

This app follows a **Boutique Studio** philosophy. Every design and architecture decision is measured against three principles:

### 1. Whitespace Is a Feature

Large gaps between form elements are mandatory, not optional. Clinical data-entry fatigue is the enemy. Every input group is an **island** — a self-contained visual unit separated by at least `3rem` (48px) of vertical space. Screens should feel like curated showrooms, never dense spreadsheets. See [`UI_STYLE_GUIDE.md`](./UI_STYLE_GUIDE.md) for exact spacing tokens.

### 2. The 150-Line Rule

Component files must stay small and focused. **No single file should exceed ~150 lines.** When a file grows beyond that, it is a signal to decompose:

| Concern | Where It Lives |
|---------|----------------|
| Business logic & state management | `/hooks` |
| Utility math, formatters, helpers | `/utils` or `/lib` |
| Reusable UI primitives | `/components/ui` |
| Complex feature-level UI | `/components/features` |
| Page layouts (thin wrappers) | `/app` |

Pages inside `/app` should be clean, lightweight layouts that **plug in** hooks and components — never containers for raw business logic.

### 3. Pluggable Architecture

Code must be **data-driven**, not hard-coded for specific hospitals, patient types, or clinical liaisons. Configuration arrays (hospitals, discharge types, reasons, users) should live in dedicated config files or be fetched from the database, so the app can adapt to new facilities without touching component code.

---

## Technical Infrastructure

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Language** | TypeScript 5.9 |
| **Styling** | Tailwind CSS 4.1 + PostCSS |
| **Frontend Hosting** | Vercel |
| **Database / Auth** | Firebase (enables real-time syncing between users) |
| **File Storage** | Firebase Cloud Storage |
| **PDF Generation** | jsPDF + html2canvas |
| **Date Utilities** | date-fns |
| **App Type** | PWA (manifest + service worker) |

**UI Standards:** Follows [`UI_STYLE_GUIDE.md`](./UI_STYLE_GUIDE.md) — Boutique Studio aesthetic with pill-shaped inputs (`border-radius: 50px`), `max-width: 450px` form containers, 3rem vertical rhythm, floating elevation shadows, and a Crimson-gradient Hero button.

**Assets:** Company logo is stored at `/public/CT_logo.png` (header) and `/public/CT_LOGO_.png` (login).

---

## Key Workflows

### Real-time Sync

Data must be cohesive across all user devices. Firestore `onSnapshot` subscriptions and a cache-first loading strategy ensure both liaisons always see the latest entries. Pull-to-refresh on the dashboard reloads current month data.

### Reminders

Generate a notification if admissions/discharges aren't entered by noon the following day. A `NotificationManager` component polls for activity every 60 seconds.

### Profile

Users can upload profile pictures and manage demographic info:
- **Name**
- **Phone**
- **Email**
- **Title**

Displayed with a circular floating profile icon at the top of the profile view. A dark mode toggle is available and persists across sessions.

### Census Dashboard

The main dashboard shows the current month's ADC alongside the corresponding bonus tier. A bonus hint indicates how many additional ADC points are needed to reach the next tier. An activity feed shows recent entries from both liaisons in real time.

### History & Calendar

A monthly calendar view lets liaisons review daily activity — expanding any date to see the admissions, discharges, and RTAs recorded that day. Month-to-month navigation and cross-month day analysis are supported. Previous months' ADC totals are archived here.

---

## File Structure Map

The project follows a layered architecture. Pages are thin layout shells; logic lives in hooks; UI lives in components.

```
src/
├── app/                        # Clean, lightweight page layouts
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Auth redirect
│   ├── login/                  # PIN-based authentication
│   ├── dashboard/              # Main census dashboard
│   ├── admissions/             # Admission entry form
│   ├── discharges/             # Discharge entry form
│   ├── rta/                    # Return-to-acute entry form
│   ├── history/                # Monthly calendar view
│   ├── bonus/                  # 6-month bonus tracker + PDF
│   └── profile/                # User profile & settings
│
├── components/
│   ├── ui/                     # "Lego brick" primitives
│   │   ├── PillInput.tsx       # Reusable pill-shaped input
│   │   ├── PillSelect.tsx      # Reusable pill-shaped dropdown
│   │   ├── HeroButton.tsx      # Crimson-gradient primary action
│   │   └── BoutiqueCard.tsx    # Floating card with elevation
│   ├── features/               # Complex, feature-level UI pieces
│   │   ├── CensusList.tsx      # Monthly entry list with edit/delete
│   │   ├── ActivityFeed.tsx    # Real-time activity stream
│   │   └── CalendarGrid.tsx    # Daily census calendar view
│   ├── Header.tsx              # Fixed top header
│   ├── BottomNav.tsx           # Fixed bottom navigation
│   ├── InstallPrompt.tsx       # PWA install prompt
│   └── NotificationManager.tsx # Reminder notifications
│
├── hooks/                      # All business logic & state management
│   ├── useInstallPrompt.ts     # PWA install detection
│   ├── useDashboard.ts         # Dashboard data, refresh, census editing
│   ├── useCrudForm.ts          # Generic CRUD form state machine
│   ├── useMonthlyHistory.ts    # 12-month history loading
│   ├── useCalendarView.ts      # Calendar day-by-day calculations
│   ├── useBonusData.ts         # Bonus tier loading & PDF generation
│   └── useProfileEdit.ts       # Profile form + image upload
│
├── contexts/                   # React contexts (thin providers)
│   ├── AuthContext.tsx          # Firebase auth state
│   └── ThemeContext.tsx         # Light/dark theme
│
└── lib/                        # Utilities, types, Firebase helpers
    ├── firebase.ts             # Firebase init + cache-first reads
    ├── census.ts               # ADC calculations & Firestore queries
    ├── bonus.ts                # Bonus tier logic
    ├── types.ts                # TypeScript interfaces
    ├── pdfGenerator.ts         # PDF bonus form generation
    └── imageUtils.ts           # Client-side image compression & upload
```

> **Note:** The `/components/ui`, `/components/features`, and several `/hooks` files shown above represent the **target** structure. The current codebase has not yet been fully decomposed — see the System Analysis below for the migration plan.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Firebase project with Authentication, Firestore, and Cloud Storage enabled

### Installation

```bash
git clone https://github.com/cardboardamigo/SLS-ADC.git
cd SLS-ADC
npm install
```

### Environment Variables

Copy the example env file and fill in your Firebase credentials:

```bash
cp .env.local.example .env.local
```

Required variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Development

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

To use Firebase emulators for local development:

```bash
npm run firebase:emulators
```

### Build & Deploy

```bash
npm run build
```

The app is deployed to **Vercel** and connects to Firebase services in production.

---

## Current Status

The app is fully functional and deployed. The **Boutique Studio** design vision is documented in [`UI_STYLE_GUIDE.md`](./UI_STYLE_GUIDE.md) and its CSS tokens are implemented in `globals.css`. Active development is now focused on bringing the codebase into full compliance with the Manifesto:

- **Decomposition** — Extracting logic from page files into `/hooks` and splitting large components per the 150-Line Rule.
- **UI Primitives** — Building `/components/ui` (PillInput, HeroButton, BoutiqueCard) to replace inline style repetition.
- **Pluggable Config** — Moving hardcoded hospital/liaison/type arrays into external config.
- **Spacing Audit** — Ensuring every screen meets the 3rem "island" minimum between form groups.

---

## System Analysis: Boutique Compliance Audit

> Performed against the Manifesto and UI Style Guide above. Every file in `/src` was reviewed.

### A. Spacing & Layout Violations (Anti-Cram Rule)

The style guide mandates `3rem` (48px) minimum vertical spacing between form "islands" and `max-width: 450px` centered containers. The CSS class `.form-wrapper` and Tailwind's `mb-12` / `space-y-12` satisfy this. Violations occur where smaller spacing is used between top-level form groups or section blocks.

| File | Line(s) | Current Spacing | Required | Issue |
|------|---------|----------------|----------|-------|
| `login/page.tsx` | 132 | `mb-10` (2.5rem) | 3rem | Logo-to-content gap is 8px under minimum |
| `login/page.tsx` | 143 | `gap-6` (1.5rem) | 3rem | User selection buttons only half the required gap |
| `login/page.tsx` | 200 | `mb-8` (2rem) | 3rem | Avatar-to-form gap is 1rem under minimum |
| `login/page.tsx` | 104 | `mb-5` (1.25rem) | 3rem | Error banner spacing is cramped |
| `history/page.tsx` | 215 | `space-y-4` (1rem) | 3rem | Month cards stacked too tightly |
| `dashboard/page.tsx` | 357 | `space-y-3` (0.75rem) | N/A | Activity list items within a card — acceptable |
| `dashboard/page.tsx` | 409 | `mt-6` (1.5rem) | 3rem | Version footer gap under minimum |
| `bonus/page.tsx` | 142 | `space-y-3` (0.75rem) | N/A | Tier rows within a card — acceptable |
| `profile/edit/page.tsx` | 473 | `mb-4` (1rem) | 3rem | Status messages cramped against content |

**Compliant areas:** `CrudPage.tsx` uses `mb-12` (3rem) consistently between form fields. `dashboard/page.tsx` uses `mb-12` between top-level cards. `bonus/page.tsx` uses `mb-12` between major sections. `profile/page.tsx` uses `mb-12` between profile card and settings.

### B. Logic in Pages Instead of Hooks (150-Line Rule)

The Manifesto requires pages to be thin layout shells (<150 lines) that plug in hooks. Currently, most pages contain all their business logic inline.

| File | Lines | Over Limit | Logic That Should Be Extracted |
|------|-------|-----------|-------------------------------|
| `profile/edit/page.tsx` | **761** | 5.1x | `compressImage()`, `uploadWithProgress()`, `withTimeout()` belong in `/lib/imageUtils.ts`. Form state + upload state machine → `useProfileEdit` hook. |
| `history/page.tsx` | **669** | 4.5x | `loadData()` (12-month history) → `useMonthlyHistory` hook. `loadCalendarData()` + running census calculation → `useCalendarView` hook. Calendar grid rendering → `/components/features/CalendarGrid.tsx`. Day detail modal → `/components/features/DayDetailSheet.tsx`. |
| `dashboard/page.tsx` | **513** | 3.4x | `loadData()`, `refreshData()`, real-time subscription, bonus calculation → `useDashboard` hook. Pull-to-refresh touch handlers → `usePullToRefresh` hook. FAB menu → `/components/features/FabMenu.tsx`. Activity feed → `/components/features/ActivityFeed.tsx`. |
| `components/CrudPage.tsx` | **487** | 3.2x | Form state machine (add/edit/delete/navigate) → `useCrudForm` hook. Entry list with edit/delete → `/components/features/CensusList.tsx`. The CrudPage.tsx component itself becomes a thin composition. |
| `profile/page.tsx` | **306** | 2.0x | Settings list items could be extracted to `/components/features/SettingsList.tsx`. Sign-out handler is minor. |
| `login/page.tsx` | **296** | 2.0x | Auth logic → `useLogin` hook. PIN input form → `/components/features/PinForm.tsx`. User selection → `/components/features/UserSelector.tsx`. |
| `bonus/page.tsx` | **247** | 1.6x | Data loading + PDF generation → `useBonusData` hook. Tier chart → `/components/features/TierChart.tsx`. |

### C. Standard Corners Instead of Pill Shape

The style guide requires `border-radius: 50px` on all inputs, selects, and buttons, and `12px` (`--card-radius`) on card containers. The global CSS enforces pills via `!important` rules, so most form elements comply. Violations are in components using Tailwind border-radius classes that don't match the design tokens.

| File | Line(s) | Current | Required | Element |
|------|---------|---------|----------|---------|
| `profile/page.tsx` | 54, 122, 207 | `rounded-2xl` (16px) | `rounded-xl` (12px) / `--card-radius` | Profile card, settings list, app section cards |
| `profile/edit/page.tsx` | 654 | `rounded-2xl` (16px) | `rounded-xl` (12px) / `--card-radius` | Edit profile form card |
| `history/page.tsx` | 280, 497 | `rounded-lg` (8px) / `rounded-t-2xl` (16px) | 12px | Bonus display inside expanded month; day detail bottom sheet |
| `dashboard/page.tsx` | 232 | `rounded-xl` (12px) | 12px | ADC hero card — compliant but uses hardcoded gradient instead of a reusable component |
| `bonus/page.tsx` | 116 | `rounded-xl` (12px) | 12px | Current month bonus card — compliant |
| `login/page.tsx` | 87 | `var(--bubble-radius)` (40px) | 50px or 12px | Glass card uses 40px — neither pill nor card-radius |

**Compliant areas:** All `<input>`, `<select>`, and `<button>` elements receive `border-radius: 50px !important` from `globals.css`. The `.card` utility class uses `var(--card-radius)` (12px). `.btn-hero` uses 50px.

### D. Pluggable Architecture Violations

The Manifesto requires data-driven configuration. Currently, several arrays are hardcoded in source files.

| File | Line(s) | Hardcoded Data |
|------|---------|---------------|
| `login/page.tsx` | 8-11 | `USERS` array with names and emails for exactly 2 users |
| `admissions/page.tsx` | 7-8 | `PATIENT_TYPES` and `CLINICAL_LIAISONS` arrays |
| `discharges/page.tsx` | 7 | `DISCHARGE_TYPES` array |
| `rta/page.tsx` | 7-17 | `RTA_HOSPITALS` and `RTA_REASONS` arrays |
| `lib/types.ts` | Throughout | Union types like `"Thad" \| "West"` lock the schema to current staff |
| `lib/bonus.ts` | Top | `BONUS_TIERS` array (7 tiers) — acceptable as config but should be extractable |
| `components/Header.tsx` | 7-15 | `pageTitles` map is hardcoded (minor) |

**Recommendation:** Create a `/lib/config.ts` (or `/config/`) that exports all domain-specific arrays. Page files import from config. Types become generic strings instead of literal unions. This lets a new facility fork the config without modifying components.

---

## Prioritized Compliance Roadmap

Changes ordered by impact on the Boutique Studio vision, from most critical to least.

### P0 — Foundation (Do First)

| # | Change | Files Affected | Rationale |
|---|--------|---------------|-----------|
| 1 | Create `/lib/imageUtils.ts` — extract `compressImage`, `uploadWithProgress`, `withTimeout` from `profile/edit/page.tsx` | `profile/edit/page.tsx`, new file | Largest file (761 lines), utilities are reusable, 150-Line Rule |
| 2 | Create `useDashboard` hook — extract data loading, refresh, census editing, bonus calc | `dashboard/page.tsx`, new hook | Dashboard is the most-visited page, 513 lines |
| 3 | Create `useCrudForm` hook — extract form state machine from `CrudPage.tsx` | `CrudPage.tsx`, new hook | Shared by 3 pages, 487 lines |
| 4 | Create `/lib/config.ts` — centralize all hardcoded arrays (users, patient types, hospitals, discharge types, RTA reasons) | Multiple page files, new file | Pluggable Architecture compliance |

### P1 — Component Extraction

| # | Change | Files Affected | Rationale |
|---|--------|---------------|-----------|
| 5 | Create `/components/ui/PillInput.tsx` — reusable pill input with built-in style, focus lift, and label | All form pages | Eliminates repeated inline `inputStyle` objects |
| 6 | Create `/components/ui/PillSelect.tsx` — same for dropdowns | All form pages | Same pattern as PillInput |
| 7 | Create `/components/ui/HeroButton.tsx` — reusable `.btn-hero` wrapper | All form pages | Standardizes the Hero treatment |
| 8 | Create `/components/ui/BoutiqueCard.tsx` — card with `--card-radius` and `--card-shadow` | All pages with `.card` | Replaces inline card styling |
| 9 | Create `/components/features/ActivityFeed.tsx` — extract from dashboard | `dashboard/page.tsx` | Separates feature UI from page layout |
| 10 | Create `/components/features/CalendarGrid.tsx` + `DayDetailSheet.tsx` — extract from history | `history/page.tsx` | Largest page (669 lines) |

### P2 — Spacing & Radius Fixes

| # | Change | Files Affected | Rationale |
|---|--------|---------------|-----------|
| 11 | Fix `login/page.tsx` spacing: `mb-10` → `mb-12`, `gap-6` → `gap-12`, `mb-8` → `mb-12`, `mb-5` → `mb-12` | `login/page.tsx` | Anti-Cram compliance |
| 12 | Fix `history/page.tsx` list spacing: `space-y-4` → `space-y-12` between month cards | `history/page.tsx` | Anti-Cram compliance |
| 13 | Fix card border-radius: `rounded-2xl` → `rounded-xl` on profile page cards | `profile/page.tsx`, `profile/edit/page.tsx` | Match `--card-radius: 12px` token |
| 14 | Fix `login/page.tsx` glass card: `var(--bubble-radius)` → use card-radius or pill-radius consistently | `login/page.tsx` | Radius token alignment |
| 15 | Fix `dashboard/page.tsx` version footer: `mt-6` → `mt-12` | `dashboard/page.tsx` | Anti-Cram compliance |
| 16 | Fix `profile/edit/page.tsx` status messages: `mb-4` → `mb-12` | `profile/edit/page.tsx` | Anti-Cram compliance |

### P3 — Hook Extraction (Remaining Pages)

| # | Change | Files Affected | Rationale |
|---|--------|---------------|-----------|
| 17 | Create `useMonthlyHistory` + `useCalendarView` hooks | `history/page.tsx`, new hooks | 669-line page → thin layout |
| 18 | Create `useBonusData` hook | `bonus/page.tsx`, new hook | 247-line page → thin layout |
| 19 | Create `useProfileEdit` hook | `profile/edit/page.tsx`, new hook | 761-line page → thin layout |
| 20 | Create `useLogin` hook | `login/page.tsx`, new hook | 296-line page → thin layout |
| 21 | Create `usePullToRefresh` hook | `dashboard/page.tsx`, new hook | Reusable touch gesture logic |
