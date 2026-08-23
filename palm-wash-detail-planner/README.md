# Palm Wash Detail Planner

A phone-first concept app for **Palm Wash Mobile Detailing** in Charleston, South Carolina. It turns the company’s published vehicle/package matrix into a clear starting estimate, adds structured condition notes, and produces a copyable booking summary.

## What works

- Vehicle-specific estimates for Sunrise and Ocean Breeze packages
- Condition flags for pollen/sap, beach sand, pet hair, spills, and odor concerns
- Preferred-window and service-area intake
- Copyable booking summary
- Device-local save and shareable package links
- Responsive, keyboard-accessible interface
- Standalone static build in `docs/` for GitHub Pages

## Product boundary

This is an independent concept demo, not a commissioned Palm Wash product. Prices are clearly labeled as published starting estimates; Palm Wash must confirm availability, scope, and final pricing. The demo does not collect or transmit customer data.

## Why this workflow

Palm Wash currently publishes a useful but manual service menu and directs customers to call, text, or email to schedule. A guided planner can make the first inquiry more structured without replacing the human quote or booking decision. A production version could add lead intake, crew scheduling, routes, before/after photos, and maintenance reminders.

## Source

Package names, public starting prices, location, phone, and email were drawn from [PalmWash.com](https://www.palmwash.com/) in August 2026.

## Run locally

```bash
npm install
npm run dev
```

The dependency-free GitHub Pages build can also be served directly from `docs/`.
