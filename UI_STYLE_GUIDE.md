# Census Tracker - UI Style Guide

## Boutique Studio Aesthetic

This document defines the design tokens and styling conventions for the Census Tracker (SLS-ADC) application. The design language is **Boutique Studio** — spacious, elevated, and refined. Every screen should feel like a curated showroom, not a dense data-entry form. All entry fields, buttons, and form containers must follow these specifications.

---

## 1. Layout & Containers — The "Anti-Cram" Layout

### Form Wrapper

All forms must be wrapped in a narrow, centered container. The intentionally constrained width creates generous negative space on both sides, giving each form the presence of a standalone display piece.

| Property | Value |
|----------|-------|
| `max-width` | `450px` |
| `width` | `100%` |
| `margin` | `0 auto` |
| `padding` | `0 1.5rem` |

```css
.form-wrapper {
  max-width: 450px;
  width: 100%;
  margin: 0 auto;
  padding: 0 1.5rem;
}
```

### Vertical Rhythm — "Islands" of Information

Each logical group of elements (a label + input pair, a button, a section heading) is an **island** — a self-contained visual unit separated by significant vertical space.

| Property | Value | Notes |
|----------|-------|-------|
| `margin-bottom` on form groups | `3rem` (48px) | Creates clear separation between islands |
| `gap` in flex/grid form layouts | `3rem` (48px) | Same rhythm when using flex or grid |

```css
.form-group,
.form-field {
  margin-bottom: 3rem;
}

/* When using flex or grid layout */
.form-layout {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}
```

### Breathability

- Use `margin: 0 auto` on all form containers to center the layout horizontally.
- The `max-width: 450px` constraint is deliberate — it prevents the form from ever feeling wide or dense.
- Maintain ample white space on all sides. Content must never touch the viewport boundary.
- The 3rem vertical spacing between elements is a hard minimum; more space is acceptable, less is not.

---

## 2. Floating Pill Architecture

### Shape

Apply a **pill / floating-bubble** shape to all interactive form elements. Every input and button must feel like a discrete, touchable object hovering above the surface.

| Element | `border-radius` |
|---------|-----------------|
| Text inputs | `50px` |
| Dropdowns / selects | `50px` |
| Buttons | `50px` |

```css
input[type="text"],
input[type="date"],
input[type="email"],
input[type="password"],
input[type="number"],
select,
button {
  border-radius: 50px;
}
```

### Soft Elevation Shadow

All interactive elements carry a soft elevation shadow that makes them appear to float above the background.

```css
input,
select,
button {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
}
```

### Constraints

All individual input fields must be constrained so they never stretch beyond the form wrapper.

```css
input,
select {
  max-width: 100%;
  width: 100%;
}
```

### Centering

Every input field must be centered within its parent container.

```css
input,
select {
  margin: 0 auto;
  display: block;
}
```

### Internal Spacing

Increase internal padding so text does not feel cramped against the rounded edges.

```css
input,
select,
button {
  padding: 14px 28px;
}
```

The minimum padding values are `14px` vertical and `28px` horizontal. Larger elements (e.g., primary action buttons) may use more padding, but never less than these minimums.

---

## 3. Micro-Interactions

### Focus "Lift" Effect

When a user focuses an input, the element should **lift** — scaling up slightly and deepening its shadow — to communicate that it is the active target.

| State | `transform` | `box-shadow` |
|-------|-------------|-------------|
| Default | `scale(1)` | `0 10px 25px -5px rgba(0, 0, 0, 0.05)` |
| Focused | `scale(1.02)` | `0 14px 35px -5px rgba(0, 0, 0, 0.10)` |

```css
input,
select {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

input:focus,
select:focus {
  transform: scale(1.02);
  box-shadow: 0 14px 35px -5px rgba(0, 0, 0, 0.10);
  outline: none;
}
```

> **Accessibility note:** The scale + shadow shift provides a strong visual focus indicator. If additional contrast is needed, a subtle border-color change may be added, but the lift effect is the primary indicator.

---

## 4. The "Hero" Button

The main action button on any page (e.g., "Record", "Submit", "Save") receives the **Hero** treatment — a gradient pill with a color-matched glowing shadow.

### Gradient & Glow

| Property | Value |
|----------|-------|
| `background` | `linear-gradient(135deg, #DC143C, #E85D5D)` (Crimson to Soft Red) |
| `color` | `#FFFFFF` |
| `border` | `none` |
| `border-radius` | `50px` |
| `padding` | `16px 40px` |
| `font-weight` | `600` |
| `box-shadow` | `0 10px 30px -5px rgba(220, 20, 60, 0.40)` (crimson glow) |

```css
.btn-hero {
  background: linear-gradient(135deg, #DC143C, #E85D5D);
  color: #ffffff;
  border: none;
  border-radius: 50px;
  padding: 16px 40px;
  font-weight: 600;
  font-size: 1rem;
  box-shadow: 0 10px 30px -5px rgba(220, 20, 60, 0.40);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.btn-hero:hover,
.btn-hero:focus {
  transform: scale(1.03);
  box-shadow: 0 14px 40px -5px rgba(220, 20, 60, 0.55);
}

.btn-hero:active {
  transform: scale(0.98);
  box-shadow: 0 6px 20px -5px rgba(220, 20, 60, 0.35);
}
```

### When to Use Hero

- **One** Hero button per screen. It is the single most important action.
- Examples: "Record" on data-entry pages, "Save" on edit forms, "Log In" on auth screens.
- Secondary actions (Cancel, Back, Delete) must **not** use the Hero style — use a ghost or muted pill instead.

---

## 5. Atmosphere

### Background

Replace flat white backgrounds with a soft, designer-grade surface tone.

| Token | Value | Description |
|-------|-------|-------------|
| `--bg` (light mode) | `#F4F7F6` | Soft mint-grey; warm and inviting |
| `--bg` (dark mode) | `#0f172a` | Unchanged deep navy |

```css
:root {
  --bg: #F4F7F6;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a;
  }
}

body {
  background-color: var(--bg);
}
```

> The `#F4F7F6` background is essential to the Boutique Studio feel. It gives the floating pill elements a clean surface to cast their shadows against, unlike flat `#FFFFFF` which looks clinical.

---

## 6. Existing CSS Variable Reference

These are the existing design tokens defined in `src/app/globals.css` that work alongside the tokens above.

### Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--card-radius` | `12px` | Card containers |
| `--bubble-radius` | `40px` | Large buttons, modals |
| `--bubble-radius-sm` | `28px` | Medium elements |
| `--bubble-radius-input` | `20px` | Form inputs (override to `50px` per this guide) |

> **Note:** The pill look defined in this guide (`border-radius: 50px`) supersedes `--bubble-radius-input` for all text inputs, dropdowns, and buttons.

### Shadow Tokens

| Token | Value |
|-------|-------|
| `--card-shadow` | `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)` |
| `--avatar-shadow` | `0 4px 16px rgba(15,42,74,0.3)` |
| Floating field shadow | `0 10px 25px -5px rgba(0,0,0,0.05)` |
| Focused field shadow | `0 14px 35px -5px rgba(0,0,0,0.10)` |
| Hero button glow | `0 10px 30px -5px rgba(220,20,60,0.40)` |

### Color Palette

#### Primary

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--primary` | `#1a365d` | `#63b3ed` |
| `--accent` | `#38b2ac` | `#4fd1c5` |

#### Hero Gradient

| Stop | Value |
|------|-------|
| Start (135deg) | `#DC143C` (Crimson) |
| End | `#E85D5D` (Soft Red) |

#### Status Colors

| Status | Token | Value |
|--------|-------|-------|
| Admit | `--status-admit` | `#059669` (green) |
| Discharge | `--status-discharge` | `#e11d48` (red) |
| RTA | `--status-rta` | `#d97706` (amber) |

#### Semantic Colors

| Purpose | Token | Value |
|---------|-------|-------|
| Danger | `--danger` | `#e53e3e` |
| Warning | `--warning` | `#d69e2e` |
| Success | `--success` | `#38a169` |

### Input & Surface Tokens

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--input-bg` | `rgba(255,255,255,0.9)` | `rgba(30,41,59,0.8)` |
| `--card` | `#ffffff` | `#1e293b` |
| `--bg` | `#F4F7F6` | `#0f172a` |
| `--border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` |
| `--text` | `#1a202c` | `#e2e8f0` |
| `--text-secondary` | `#718096` | `#94a3b8` |

---

## 7. Typography

| Property | Value |
|----------|-------|
| Font Family | `'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| Weights used | 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold) |

---

## 8. Profile Page

The profile view has additional requirements:

1. **Circular Floating Profile Icon** - Place a circular avatar at the top center of the profile view.

```css
.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin: 0 auto;
  box-shadow: 0 4px 16px rgba(15, 42, 74, 0.3);
  object-fit: cover;
  display: block;
}
```

2. **Demographic Fields** - All profile/demographic fields below the avatar must follow the same pill constraints defined above (`border-radius: 50px`, `max-width: 100%` within the 450px wrapper, `margin: 0 auto`).

---

## 9. Component-Level Button Colors

| Page / Action | Background | Hover | Focus Ring |
|---------------|------------|-------|------------|
| Admissions | `bg-emerald-600` | `bg-emerald-700` | `focus:ring-green-400` |
| Discharges | `bg-orange-500` | `bg-orange-600` | `focus:ring-orange-400` |
| RTA | Blue / teal | Darker teal | `focus:ring-teal-400` |
| Dashboard | `#1a365d` (navy) | Lighter navy | `focus:ring-teal-500` |
| **Primary action** | **Hero gradient** | **See Section 4** | **Crimson glow** |

All buttons share these base styles in addition to their color:

```css
button {
  border-radius: 50px;
  padding: 14px 28px;
  font-weight: 600;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}
```

---

## 10. Responsive & Mobile Considerations

- The app is a **PWA** optimized for mobile-first use.
- Safe area insets are handled via `env(safe-area-inset-*)` for notched devices.
- Content clears the fixed header using `padding-top: calc(5rem + env(safe-area-inset-top, 0px))`.
- The bottom navigation bar is fixed at `h-16` (4rem) with `backdrop-blur-md`.
- The form wrapper's `max-width: 450px` naturally adapts to smaller screens; the `width: 100%` and side padding ensure it doesn't overflow on mobile.
- The 3rem vertical gap between islands remains consistent across all breakpoints — do not compress spacing on mobile.

---

## 11. Quick-Reference Token Summary

```
Aesthetic:           Boutique Studio
Background:          --bg: #F4F7F6 (light), #0f172a (dark)
Form max-width:      max-width: 450px
Vertical spacing:    gap / margin-bottom: 3rem (48px)
Shape (pill):        border-radius: 50px
Float shadow:        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05)
Focus lift:          transform: scale(1.02)
Focus shadow:        box-shadow: 0 14px 35px -5px rgba(0,0,0,0.10)
Hero gradient:       linear-gradient(135deg, #DC143C, #E85D5D)
Hero glow:           box-shadow: 0 10px 30px -5px rgba(220,20,60,0.40)
Internal padding:    padding: 14px 28px
Field centering:     margin: 0 auto
Profile avatar:      border-radius: 50%, 100x100px, centered, floating shadow
```
