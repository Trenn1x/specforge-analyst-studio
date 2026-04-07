# SpecForge Studio

SpecForge Studio is a browser-native analyst-to-delivery accelerator.

It converts requirement intake into practical delivery artifacts:
- priority-ranked backlog
- SQL scaffold suggestions
- acceptance-oriented test matrix
- release readiness checklist

## Live Demo
- https://trenn1x.github.io/specforge-analyst-studio/

## Why it is useful
Teams often collect requirements but lose speed between analysis and implementation.
SpecForge compresses that handoff by generating build-ready outputs from structured intake rows.

## Core features
- Weighted prioritization model (value, urgency, risk, effort)
- Delivery lane assignment (Now / Next / Later)
- Auto-generated user stories
- Domain-aware SQL starter schemas
- Exportable markdown brief and prioritized backlog CSV

## Quick start
1. Open `index.html` in a browser.
2. Click **Load Sample Intake**.
3. Click **Build Delivery Plan**.
4. Review prioritized backlog and artifact tabs.
5. Export brief and backlog.

## Expected CSV columns
```csv
feature_id,feature_name,business_domain,business_value,urgency,implementation_effort,risk_level,stakeholders,entities,acceptance_focus
```

## Stack
- HTML
- CSS
- Vanilla JavaScript

## Deployment
Hosted for free via GitHub Pages.
