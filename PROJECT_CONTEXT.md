# PROJECT_CONTEXT.md

## 📌 Project: **Closy — Your Digital Wardrobe**

### Vision
Closy helps users digitize their wardrobe, track usage, and get smart outfit suggestions that adapt to weather, dress codes, and personal taste. The app aims to reduce friction in daily outfit decisions and eventually recommend **what to wear, what to clean, and what to buy next**.

---

## ✅ Current Status
- Expo React Native app, upgraded to SDK 54.
- Local SQLite database for garments, wear history, and suggestions.
- **Core Features Working**:
  - Add garments with photo + metadata (type, colors, warmth, dress codes, dirty/clean).
  - Today screen with **3 outfit suggestions** (weather + dress code aware).
  - Shuffle per-slot and log outfits as worn.
  - Closet search/filter (by type, dress code, dirty).
  - Full edit flow (long-press → update/delete).
  - Internal TestFlight setup (Apple Developer account ready).

---

## 🧠 Suggestion Algorithm (v1.0)
Inputs:
- Garment metadata (type, colors, warmth, dress codes, water resistance).
- Weather (temperature, rain %, wind).
- User mode (Casual, Smart Casual, Business, Sport).
- History (last worn, wear count).

Rules:
- Filter by dress code & clean status.
- Match warmth to weather.
- Enforce rain → waterproof shoes/jackets.
- Simple color rules (neutrals pair with anything, avoid clashing).
- Rotate items for variety.

Output:
- 3 distinct outfits with per-slot shuffle.
- Items marked worn → update history, mark dirty.

---

## 🪜 Open Issues / Improvements (Sprint Backlog)

### 1. Persistent Media & Migration
Ensure images survive Expo updates by copying to `documentDirectory/closy/`.

### 2. Batch Add Flow
Multi-select garment photos → quick prefill with progress.

### 3. Auto Color Extraction
Detect dominant colors from garment photos.

### 4. Expanded Palette + Eyedropper
Add ~60 swatches + enable eyedropper on garment image.

### 5. Pattern & Fabric Tags
Add pattern + weight enums for better matching.

### 6. Background Removal
Local soften/blur by default; optional cloud cutout (remove.bg, Replicate).

### 7. "Why This Outfit?" Explainer
One-line rationale under each suggestion card.

### 8. Learning From Interactions
Track shuffles & wears → adjust pair affinity scores.

### 9. Favorites & History
Save outfits and view timeline of worn items.

### 10. Backup & Export
Zip DB + images → Export/Import from Files app.

### 11. Closet Gap Analysis
Show insights: *"Adding 1 brown boot unlocks 15 new outfits."*

---

## 📅 Roadmap

- **Week 1 (MVP polish)**
  Persistent media, batch add, auto colors, expanded palette, background soften.

- **Week 2 (Wow features)**
  Explainer, learning affinities, history/favorites, gap analysis, export/backup.

- **v1.0 Launch (App Store)**
  External TestFlight group → gather feedback → polish → publish.

---

## 🛠 Dev Workflow

- **Branches**: `feature/*`, `fix/*`
- **Commits**: `feat(area): short description (#issue)`
- **Issues**: Created for each feature/bug with Acceptance Criteria.
- **Project Board**: Columns → Backlog → Ready → In Progress → In Review → Done.
- **Releases**:
  - `development` → local dev client.
  - `preview` → internal TestFlight builds.
  - `production` → external TestFlight & App Store.

---

## 📱 Apple / Expo Setup

- Apple Developer Program active.
- AscAppId + TeamId stored in `eas.json`.
- Internal TestFlight testers ready.
- `eas.json` defines `development`, `preview`, `production` profiles.

---

## 🧭 Next Steps
1. Implement **Issue 1 (persistent media)** to stop image loss.
2. Push to **internal TestFlight (preview)** for friends to test.
3. Add **batch add + auto-colors** for friction-free onboarding.
4. Roll in **wow features** gradually for better retention.
5. Prepare **privacy/support page** for external TestFlight + App Store launch.

---

👉 This file is the **source of truth**. Update it as features land or roadmap shifts.