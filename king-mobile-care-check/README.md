# King Mobile Care Check

A phone-first service-request prototype for King Mobile Automotive, a mobile mechanic serving the Summerville, South Carolina area.

## What it does

Customers can organize the basic facts a mechanic needs before a callback:

- vehicle location and whether it is inside the stated service area
- year, make, and model
- broad service category and notes
- whether the vehicle appears safe to move
- urgency and preferred time

The app turns those answers into a readable request that can be copied, saved locally, or sent to the business by email. It does not diagnose a vehicle or confirm service, scheduling, pricing, or coverage.

## Product direction

This MVP tests whether a structured intake can reduce phone tag. A finished web or mobile product could add crew dispatch, customer job status, photo notes, service history, and maintenance reminders.

## Project shape

- `app/` — React/Vinext version deployed through Sites
- `docs/` — dependency-free static version for GitHub Pages
- `public/og.png` — social preview image
- `tests/` — render and content checks

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm run dev
```

Run the production render checks with:

```bash
npm test
```

The GitHub Pages build can also be opened directly from `docs/index.html` or served with any static HTTP server.

## Disclaimer

This is an independent product concept. It was not commissioned by and is not operated by King Mobile Automotive.
