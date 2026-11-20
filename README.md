# Aspect dashboard

A clickable front-end prototype of **Aspect**, an internal benchmarking dashboard for testing, grading and comparing the After Effects motion-design skills built for an AI agent harness.

It is built from the *Aspect Dashboard* Figma file (page "V1 layout"). Colors, type, spacing, radii and icons come straight from that file's variables and layers.

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
| `#/upload` | 02 to 05b | Four-step flow: **Upload** (multi-select skills with add-new, level, token cost, prompt, drag-and-drop video, .aep attach), **Automated checks**, **Quality check**, **Feedback** (optional suggested prompt, edit, copy, save). |
| `#/skills` | 06 to 06d | Skills table with descriptions, best run per skill with "View details" hover, **Edit skills** (rename, remove with undo, add, save, cancel). |
| `#/archive` | 07 to 07g | Video grid, multi-skill filter with search, level filter with "Best runs only", tag tooltips, hover state, preview modal, delete with confirmation. |
| `#/deleted` | 08 · Recently deleted | Days-left countdown (red at 3 days or fewer), restore, delete forever, delete all. |

### Behavior worth knowing

- **Quality check picks its mode.** If the uploaded skill(s) and level already have a best run, you compare the new run against it ("Keep current best" or "New run is better"). Otherwise you get the first-run rubric with a star override.
- **Saving a run** adds it to Overview, All runs and the archive. If it wins, it takes the **Best** tag from the previous best.
- **The .aep file controls the editability check.** Without the attached project, Automated checks shows Editability as "Not checked".
- **Removing a skill** moves runs tagged *only* with that skill to Recently deleted. This matches the warning in the Figma file. **Renaming a skill** updates every run that uses it.
- **Escape** closes menus and dialogs. Focus stays inside open dialogs, and every control works from the keyboard.

## What is placeholder

- **Benchmark numbers** keep the Figma placeholders: `xx`, `xx%`, `x.x / 5`, `xxK`, `$x.xx`. They mark where real results will appear.
- **Skill names, file names, levels and dates** mirror the Figma screens. Prompts and feedback beyond the lower-third example are sample text.
- **Automated check results, the rubric and the suggested prompt** are fixed sample content (the lower-third example from Figma). They don't change with what you upload, because there is no backend.
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
