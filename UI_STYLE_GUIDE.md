# Census Tracker - UI Style Guide

## Design Tokens & Styling Standards

This document defines the design tokens and styling conventions for the Census Tracker (SLS-ADC) application. All entry fields, buttons, and form containers must follow these specifications.

---

## 1. Layout & Containers

### Form Wrapper

All forms must be wrapped in a centered container that adapts to viewport size.

| Property | Desktop | Mobile |
|----------|---------|--------|
| `width` | `60%` | `90%` |
| `margin` | `0 auto` | `0 auto` |

```css
.form-wrapper {
  width: 60%;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .form-wrapper {
    width: 90%;
  }
}
```

### Breathability

- Use `margin: 0 auto` on all form containers to center the layout horizontally.
- Maintain ample white space on the left and right edges of the screen so content never touches the viewport boundary.
- Avoid full-bleed form layouts; the form wrapper percentages above ensure consistent breathing room at all breakpoints.

---

## 2. Field & Button Geometry (The "Pill" Look)

### Shape

Apply a **pill / floating-bubble** shape to all interactive form elements.

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

### Constraints

All individual input fields must be constrained so they never stretch across the entire screen.

```css
input,
select {
  max-width: 400px;
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

---

## 3. Aesthetics & Depth

### Floating Effect

Add a subtle box shadow to all form fields so they appear to float above the background.

```css
input,
select,
button {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
```

### Internal Spacing

Increase internal padding so text does not feel cramped against the rounded edges.

```css
input,
select,
button {
  padding: 12px 24px;
}
```

The minimum padding values are `12px` vertical and `24px` horizontal. Larger elements (e.g., primary action buttons) may use more padding, but never less than these minimums.

### Profile Page

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

2. **Demographic Fields** - All profile/demographic fields below the avatar must follow the same pill constraints defined above (`border-radius: 50px`, `max-width: 400px`, `margin: 0 auto`).

---

## 4. Existing CSS Variable Reference

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
| Floating field shadow | `0 4px 12px rgba(0,0,0,0.05)` |

### Color Palette

#### Primary

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--primary` | `#1a365d` | `#63b3ed` |
| `--accent` | `#38b2ac` | `#4fd1c5` |

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
| `--bg` | `#f0f4f8` | `#0f172a` |
| `--border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` |
| `--text` | `#1a202c` | `#e2e8f0` |
| `--text-secondary` | `#718096` | `#94a3b8` |

---

## 5. Typography

| Property | Value |
|----------|-------|
| Font Family | `'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` |
| Weights used | 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold) |

---

## 6. Component-Level Button Colors

| Page / Action | Background | Hover | Focus Ring |
|---------------|------------|-------|------------|
| Admissions | `bg-emerald-600` | `bg-emerald-700` | `focus:ring-green-400` |
| Discharges | `bg-orange-500` | `bg-orange-600` | `focus:ring-orange-400` |
| RTA | Blue / teal | Darker teal | `focus:ring-teal-400` |
| Dashboard | `#1a365d` (navy) | Lighter navy | `focus:ring-teal-500` |

All buttons share these base styles in addition to their color:

```css
button {
  border-radius: 50px;
  padding: 12px 24px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}
```

---

## 7. Responsive & Mobile Considerations

- The app is a **PWA** optimized for mobile-first use.
- Safe area insets are handled via `env(safe-area-inset-*)` for notched devices.
- Content clears the fixed header using `padding-top: calc(5rem + env(safe-area-inset-top, 0px))`.
- The bottom navigation bar is fixed at `h-16` (4rem) with `backdrop-blur-md`.
- Form wrappers switch from `60%` width (desktop) to `90%` width (mobile) at the `768px` breakpoint.

---

## 8. Quick-Reference Token Summary

```
Shape (pill):        border-radius: 50px
Field max-width:     max-width: 400px
Field centering:     margin: 0 auto
Float shadow:        box-shadow: 0 4px 12px rgba(0,0,0,0.05)
Internal padding:    padding: 12px 24px
Form width desktop:  width: 60%
Form width mobile:   width: 90%
Form centering:      margin: 0 auto
Profile avatar:      border-radius: 50%, 100x100px, centered, floating shadow
```
