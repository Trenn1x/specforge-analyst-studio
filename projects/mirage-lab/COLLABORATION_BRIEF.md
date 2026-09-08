# MIRAGE collaboration brief

## Question
When senescent-cell burden falls or remains persistent, how much can the readout distinguish physical loss of the original senescent cells from replacement by newly senescent cells or loss of observability?

## Result already in hand
The preceding analysis constructs a family of recruitment/removal models with identical total-burden dynamics but different original-cohort survival. MIRAGE adds an observation-channel stress test: under an illustrative additive-hazard model, a low-versus-high burden contrast in original-cohort loss cancels tracking loss that is shared across arms, while unequal tracking loss creates a predictable bias.

This is a model diagnostic, not evidence that a particular senescent-cell system actually follows the constructed mechanism.

## Smallest useful data contribution
An existing dataset may be enough. For each independent biological replicate, MIRAGE needs:

- low and high initial senescent-burden conditions;
- an irreversible or independently adjudicated identity for the cells present in the original senescent cohort;
- absolute original-cohort counts at baseline and at least one follow-up;
- simultaneous absolute total senescent-cell counts;
- measured total cell counts or observation volume;
- information sufficient to distinguish physical cell loss from marker loss, phenotype escape, migration, label transfer, or fluorescent debris;
- ideally, counts of newly senescent cells among cells that were nonsenescent at baseline.

Four time points (for example days 0, 1, 3, and 7) are preferable because they allow a check of the constant-hazard approximation.

## First analysis
1. Blind condition labels where feasible.
2. Estimate original-cohort survival separately by biological replicate and burden.
3. Estimate low/high loss hazards and their paired contrast.
4. Calibrate or bound differential tracking/observation loss between conditions.
5. Compare total-burden change with original-cohort loss and new-senescence entry.
6. Reserve a replicate or condition for a held-out prediction.

## Falsification criteria
The simple diagnostic is not interpretable if original-cell identity is not stable, physical loss cannot be separated from observation loss, or burden calibration is unavailable. A pattern incompatible with both endpoint mechanisms rejects both simple explanations rather than forcing a preferred interpretation.

## What Thomas Verdier can contribute
- reproducible data transformations and model fitting;
- donor-aware uncertainty analysis;
- observation-loss sensitivity analysis;
- blinded image-annotation/QC tooling if the imaging format is suitable;
- an analysis specification before receiving confirmatory data;
- a reproducible report and held-out prediction.

## Immediate ask
Before running a new experiment: determine whether a lab already has paired original-cohort identity plus total-senescence measurements at more than one starting burden. If so, a de-identified table of counts may be sufficient for the first test.

Research prototype, 8 September 2026. No clinical claim or biological mechanism is asserted as established.