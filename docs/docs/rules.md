---
id: rules
title: Data Cleaning Rules
slug: /cleaning-rules
---

# Data Cleaning Rules

The following transformations are applied to uploaded Excel files to ensure standardized, clean, and anonymized output:

## General Cleaning

- Remove unnamed columns and empty rows.
- Remove duplicate rows after transformation.
- Normalize header names to ensure a consistent schema.

## Sensitive Data Sanitization

- Replace the `NHI` column with an anonymized `ID` (persisted across sheets in the same upload).
- Convert `DOB` to a calculated `Age`, then drop `DOB`.
- Drop columns named `Address` or `Contact`.

## Transformation Logic

- Multi-sheet alignment: the same `ID` maps across sheets for the same patient.
- Bias-detection rules for demographics (optional future extension).
- File-specific rules applied for:
  - Case-Mix
  - Holistic
  - Fare-up
  - Outpatient
