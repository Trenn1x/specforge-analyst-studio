# Transaction Observatory

**Thomas Verdier | Independent researcher and full stack developer**

## Math publication

**Verdier, T. “Carrier-Resolved Burnside Data for CSS Lattice Codes: Incidence Complexes, Ground-Space Reduction, and X-Cube Sewing.”** Accepted for publication in *Journal of Applied Mathematics and Physics*, Vol. 14, No. 9, September 2026. Final proof stage as of September 9, 2026. [ORCID](https://orcid.org/0009-0003-0286-6668).

## Working demo

[Open Transaction Observatory](https://trenn1x.github.io/specforge-analyst-studio/transaction-observatory/)

A small, reproducible workbench for spend forecasting, customer inactivity screening, and campaign economics. The Python pipeline computes every displayed result. The interface filters categories, exports selected customer cohorts, and recalculates campaign economics from margin and cost inputs. It runs without a backend, sign-in, or external API.

**All transactions and experiment participants are synthetic.** Strong predictive results reflect the deliberately learnable simulation. This is a work sample, with no claim of production credit-card modeling experience or real-world predictive performance.

## Reproduce

Python 3.11+ recommended. Commands run from this project directory:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python analysis/build.py
python -m unittest discover -s tests
python analysis/audit.py
python -m http.server 8000 --directory dist
```

Open `http://localhost:8000`. The checked-in `dist` also works by opening its `index.html` directly. Rebuild takes a few seconds on ordinary hardware.

Audit a CSV locally with `python analysis/audit.py path/to/transactions.csv`. Schema: `customer_id,day,category,amount`. The supplied SQL checks missing/invalid values, surfaces possible duplicate collisions for human review, and reports category totals. Identical purchase values alone do not establish a duplicate transaction. The audit contract expects integer customer IDs 0–1199, integer days 0–299, category codes 0–3, and positive numeric amounts; adapt it before using another source.

## Evaluation design

- Dataset: 164,367 positive purchases, 1,200 synthetic customers, 300 days. Fixed seed 1724867; NumPy random generator. Four category codes: 0 groceries, 1 dining, 2 retail, 3 travel.
- Forecast: trailing 84-day ridge regression with a linear trend and weekday effects. Frozen 28-day horizon. Four non-overlapping backtests at day 188, 216, 244, and 272. Baseline repeats the last observed week. WAPE = sum absolute error / sum actual spend.
- Inactivity: no purchases in the following 30 days. Eligible customers have a purchase in the preceding 90 days. Features use only records strictly before the cutoff. Standardization fits on training data only; regularized logistic regression C=0.3.
- Temporal cutoffs: training 150, validation 210, test 270. Earlier label windows finish before the next snapshot. Threshold chosen for validation F1, then frozen. Test panel has 1,074 eligible customers; the same customers can appear at different cutoffs. This measures future behavior for an existing panel, not new-customer generalization.
- Calibration bins show mean predicted risk and observed inactivity. Brier baseline uses training prevalence; AP and top-decile lift are reported alongside ROC AUC.
- Forecast band: 90th percentile of absolute errors pooled from the first three backtests, then assessed on the fourth. Empirical band, without a theoretical coverage guarantee under serial dependence or drift.
- Separate randomized experiment: 2,000 participants, binary 50% assignment, known additive effect of $8. Difference in group means estimates average incremental spend. Normal-approximation 95% CI uses separate arm variances. These are simulated dollars. Customer risk is not a treatment effect; no effect is transported to the screening queue.

## Results from the fixed run

| Measure | Result |
|---|---:|
| Final aggregate forecast WAPE | 7.22% |
| Weekly baseline WAPE | 9.10% |
| Inactivity ROC AUC | 0.968 |
| Inactivity average precision | 0.916 |
| Inactivity Brier score | 0.0253 |
| Training-prevalence Brier baseline | 0.1125 |
| Randomized spend effect estimate | $6.80 |
| Approximate 95% interval | $2.48–$11.11 |

Machine-readable outputs: `dist/results.json`. The UI reads the same results from `dist/results.js`. `dist/synthetic-sample.csv` contains the first 2,500 rows, not the full panel; regenerate for full-data analyses.

## What a real deployment would add

Panel coverage and population weighting, consistent transaction identifiers, refund/chargeback rules, timestamp/time-zone handling, source-specific contracts, drift monitoring, subgroup validation, and governance for payment and personal information. Scoring artifacts are rebuilt offline; there is no production model service in this demo.

## Availability

Thomas Verdier is available for remote analytics, Python/SQL automation, research software, and data operations work. [Contact](mailto:tverdier88@gmail.com) · [GitHub](https://github.com/Trenn1x).
