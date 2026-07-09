# Despatch Diary — manual test checklist

Use on a real phone after `npm run build && npm run preview` (or deploy `dist/`).

## Install PWA

- [ ] Open app in Chrome/Safari on phone
- [ ] Add to Home Screen / Install app
- [ ] App opens standalone (no browser chrome)

## Fast capture

- [ ] Tap **Voice** → record → stop → entry appears with placeholder title
- [ ] Tap **Camera** → take photo → entry appears
- [ ] Tap **Note** → type → save
- [ ] Tap **Video** → pick/record → entry appears
- [ ] Tap entry → edit header (e.g. truck reg) → save

## Offline

- [ ] Install PWA, open once online
- [ ] Enable airplane mode
- [ ] App still loads; can create text note and view today’s entries

## Archive

- [ ] **Archive** → year → month → week → day → see entries
- [ ] “Open on home” jumps to that day

## Search

- [ ] Search by header text
- [ ] Filter by preset tag (e.g. `urgent`)

## Reminders

- [ ] Open entry → add reminder with future time
- [ ] Allow notifications when prompted
- [ ] Notification fires at scheduled time (app open or background)

## Tyre trip counting

- [ ] Open **Count** tab
- [ ] Log trips (e.g. 10, 7, 12) — running total updates immediately
- [ ] Breakdown shows `10 + 7 + 12 = 29`
- [ ] Tap a trip → edit count, add notes, attach photo
- [ ] **All days** → open a past date and review trips
- [ ] Session notes save on blur

## Media

- [ ] Photo shows preview in entry detail
- [ ] Voice note plays with audio controls
- [ ] Add more media from entry detail (“Add more”)
