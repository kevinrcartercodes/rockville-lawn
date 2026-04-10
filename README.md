# Rockville Lawn

Live watering recommendations and a full yearly care schedule for a Jonathan Green Black Beauty tall fescue lawn in Rockville, MD.

Weather comes from the free [Open-Meteo](https://open-meteo.com/) API (no key needed). All lawn advice is sourced from the [University of Maryland Extension](https://extension.umd.edu/) and the [Maryland Department of Agriculture](https://mda.maryland.gov/pages/fertilizer.aspx).

## What it does

- Pulls the last 7 days of rainfall plus the next 48 hours of forecast rain for Rockville, MD
- Decides whether to water today based on UMD Extension guidance (1"/week target, deep infrequent, 5–10 AM only)
- Shows the current month's action
- Lists the next 3 upcoming milestones (pre-emergent, overseed, last legal fertilizer day, etc.)
- Displays the full yearly schedule with the current month highlighted
- Summarizes Maryland's lawn fertilizer law so you don't get fined

## Run locally

Any static file server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Push to a repo on GitHub
2. Settings → Pages → Source: `Deploy from a branch` → `main` / `/` (root)
3. Site will be live at `https://<username>.github.io/<repo>/`

## Files

- `index.html` — layout
- `styles.css` — dark green theme
- `schedule.js` — monthly care schedule data
- `app.js` — weather fetch + watering decision logic

## Watering logic

The decision tree in `app.js`:

1. **Winter (Dec–Feb, blackout):** Dormant. No watering.
2. **Summer dormancy (Jun 15 – Sep 1):** UMD default is to let the lawn go dormant. Only water if 7-day rainfall is below 0.25" AND the lawn has been brown for weeks.
3. **Active growth:**
   - If 7-day rainfall ≥ 1.0" → skip
   - If next-48h rainfall ≥ 0.25" or rain probability ≥ 70% → wait
   - Otherwise → water the deficit (target − actual) deeply, 5–10 AM
