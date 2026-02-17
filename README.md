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

**UI Standards:** Follows [`UI_STYLE_GUIDE.md`](./UI_STYLE_GUIDE.md) — Pill-shaped inputs (`border-radius: 50px`), max-width 400px, centered layouts, floating shadows.

**Assets:** Company logo is stored at `/public/SLS-LOGO.png`.

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

## Current Status

The app is currently functional. UI is synced with `UI_STYLE_GUIDE.md`. Active development continues with recent work focused on Vercel deployment stability, pill-shape styling consistency, and cache-first data loading for offline resilience.
