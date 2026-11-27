# Aspect dashboard

A clickable front-end prototype of **Aspect**, an internal benchmarking dashboard for testing, grading and comparing the After Effects motion-design skills built for an AI agent harness.

It is built from the *Aspect Dashboard* Figma file (page "V2 layout"). Colors, type, spacing, radii and icons come straight from that file's variables and layers.

## Run it

There is no build step and no dependencies. Serve the folder with any static server:

```sh
python3 -m http.server 5173
# open http://localhost:5173
```

Opening `index.html` directly from disk also works. The only external request is the Instrument Sans font from Google Fonts; without it, the page falls back to the system sans-serif.

## Screens

| Route | Figma frame | What works |
| --- | --- | --- |
| `#/overview` | 01 · Overview | Day/Week/Month/Year/All toggle, KPI cards, 10 most recent runs. Each row opens the run detail. |
| `#/runs` | 01b · All runs | Search, Skill/Level/Quality/Date filters, sort, pagination, Export CSV of the filtered rows. |
| `#/runs/:id` | 01c · Run detail | Run modal with a placeholder player, prompt, benchmark results and "Open in archive". |
| `#/upload` | 02, 02b, 03 | Two steps. **Enter run**: run details (multi-select skills with add-new, level, token cost, prompt, drag-and-drop video) and benchmark results from local testing (Complete, Editable, Fidelity %, Quality / 5). **Review & upload**: run info and the four results as cards, then upload. |
| `#/skills` | 06b, 06d | Skills table with descriptions, **Edit skills** (rename, remove with undo, add, save, cancel). |
| `#/archive` | 07 to 07g | Video grid, multi-skill filter with search, level filter with "Best runs only", tag tooltips, hover state, preview modal, delete with confirmation. |
| `#/deleted` | 08 · Recently deleted | Days-left countdown (red at 3 days or fewer), restore, delete forever, delete all. |

### Behavior worth knowing

- **Benchmark results are entered by hand** from local testing. Skill(s), Fidelity (0–100) and Quality (0–5) are required; the form flags anything missing or out of range. Runs at level and the upload date fill in automatically.
- **Uploading a run** adds it to Overview, All runs and the archive with the values you entered. New runs are not tagged **Best**; the design no longer has a step for choosing one.
- **Removing a skill** moves runs tagged *only* with that skill to Recently deleted. This matches the warning in the Figma file. **Renaming a skill** updates every run that uses it.
- **Escape** closes menus and dialogs. Focus stays inside open dialogs, and every control works from the keyboard.

## What is placeholder

- **Benchmark numbers** keep the Figma placeholders: `xx`, `xx%`, `x.x / 5`, `xxK`, `$x.xx`. They mark where real results will appear.
- **Skill names, file names, levels and dates** mirror the Figma screens. Prompts and feedback beyond the lower-third example are sample text.
- **Videos are gray placeholders.** Play animates the progress bar over the 6-second duration. Download shows a notice.
- **State lives in memory** and resets on reload.

## Files

```
index.html        App shell: sidebar, view, modal and toast regions
css/styles.css    Design tokens (Figma variables) and all component styles
js/icons.js       Icon set exported from the Figma icon/* layers
js/data.js        Sample skills and runs
js/app.js         Router, views, upload flow, modals and interactions
assets/           Aspect mark and favicon
```
