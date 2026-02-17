# Census Tracker (SLS-ADC)

An internal Progressive Web App for clinical liaisons at **Salt Lake Specialty Hospital** to track patient admissions, discharges, and return-to-acute (RTA) cases — and calculate monthly Average Daily Census (ADC) for bonus reporting.

> **Built and managed entirely from an Android phone** by the primary user/owner using Claude Code.

---

## Project Goal

Provide a streamlined, mobile-first tool for the two clinical liaisons at Salt Lake Specialty Hospital to:

- Record daily patient admissions, discharges, and RTAs
- Calculate and display the Average Daily Census (ADC) averaged over each month
- Determine bonus tier eligibility based on ADC thresholds
- Generate PDF bonus submission forms
- View historical census data by month with a calendar interface

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Language** | TypeScript 5.9 |
| **Styling** | Tailwind CSS 4.1 + PostCSS |
| **Auth** | Firebase Authentication |
| **Database** | Cloud Firestore |
| **File Storage** | Firebase Cloud Storage |
| **PDF Generation** | jsPDF + html2canvas |
| **Date Utilities** | date-fns |
| **Hosting** | Vercel |
| **App Type** | PWA (manifest + service worker) |

---

## Core Features

### Census View

Displays the **Average Daily Census (ADC)** for the current month, calculated from a running daily census:

```
dailyCensus = startingCensus + admissions − discharges − RTAs
ADC = totalCensusDays / daysElapsed
```

The dashboard shows the current ADC alongside the corresponding **bonus tier** (7 tiers ranging from $750 at 20 ADC to $7,000 at 36+ ADC). A bonus hint indicates how many additional ADC points are needed to reach the next tier. Pull-to-refresh reloads the latest data.

### Admit / Discharge / RTA Entry

Form-based data entry using the app's signature **pill-shaped UI** (all inputs and buttons use `border-radius: 50px` with floating shadows). Each entry type has its own page built on a shared `CrudPage` component:

- **Admissions** — Hospital name, patient type (Resp Complex, Trach Vent, Wound, Med Complex), clinical liaison, and date.
- **Discharges** — Patient name, discharge type (IRF, SNF, HH, ALF, Passed), and date.
- **RTA** — Hospital, reason (Sepsis, Resp, Cardiac, GI Bleed, Family Request, Sx, Procedure, Other), and date.

### User Profiles

Demographic tracking with a **circular floating profile icon** at the top of the profile view. Each user can upload a profile photo (stored in Firebase Cloud Storage), edit their name, email, phone, and title. A dark mode toggle is available and persists across sessions.

### History & Calendar

A monthly calendar view lets liaisons review daily activity — expanding any date to see the admissions, discharges, and RTAs recorded that day. Month-to-month navigation and cross-month day analysis are supported.

### Bonus Tracker

Loads the current month plus the previous six months of ADC data. Displays a bonus tier reference table and can generate a **PDF bonus submission form** pre-populated with the user's profile information.

### Activity Feed

A real-time activity feed on the dashboard shows recent entries from both liaisons, powered by Firestore `onSnapshot` subscriptions with 60-second polling.

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Auth redirect
│   ├── login/              # PIN-based authentication
│   ├── dashboard/          # Main census dashboard
│   ├── admissions/         # Admission entry form
│   ├── discharges/         # Discharge entry form
│   ├── rta/                # Return-to-acute entry form
│   ├── history/            # Monthly calendar view
│   ├── bonus/              # 6-month bonus tracker + PDF
│   └── profile/            # User profile & settings
├── components/             # Shared UI components
│   ├── Header.tsx          # Fixed top header
│   ├── BottomNav.tsx       # Fixed bottom navigation
│   ├── CrudPage.tsx        # Shared admit/discharge/RTA form
│   ├── InstallPrompt.tsx   # PWA install prompt
│   └── NotificationManager.tsx
├── contexts/               # React contexts
│   ├── AuthContext.tsx      # Firebase auth state
│   └── ThemeContext.tsx     # Light/dark theme
├── hooks/
│   └── useInstallPrompt.ts # PWA install detection
└── lib/                    # Business logic & utilities
    ├── firebase.ts         # Firebase init + cache-first reads
    ├── census.ts           # ADC calculations & queries
    ├── bonus.ts            # Bonus tier logic
    ├── types.ts            # TypeScript interfaces
    └── pdfGenerator.ts     # PDF bonus form generation
```

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

## Design System

The UI follows the conventions documented in [`UI_STYLE_GUIDE.md`](./UI_STYLE_GUIDE.md). Key principles:

- **Pill-shaped elements** — All inputs, selects, and buttons use `border-radius: 50px`
- **Floating depth** — Subtle `box-shadow` on interactive elements
- **Mobile-first** — Form wrappers at 90% width on mobile, 60% on desktop
- **Safe area support** — Handles notched devices via `env(safe-area-inset-*)`
- **Dark mode** — Full light/dark theme with CSS custom properties
- **Typography** — Poppins font family with weights 300–700

---

## Current Status

The app is currently functional. The UI is synced with `UI_STYLE_GUIDE.md`. Active development continues with recent work focused on Vercel deployment stability, pill-shape styling consistency, and cache-first data loading for offline resilience.
