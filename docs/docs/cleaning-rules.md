---
id: cleaning-rules
title: Data Cleaning Rules
description: Full logic applied by Clinisync to sanitize, deduplicate, and transform Excel datasets.
---

# Data Cleaning Rules

The following transformations are applied to uploaded Excel files to ensure standardized, clean, and anonymized output:

## 🔄 General Cleaning
- Remove unnamed columns or empty rows.
- Remove duplicate rows and columns.
- Normalize header names to ensure consistent schema.

## 🛡️ Sensitive Data Sanitization
- Replace `NHI` column with anonymized `ID` (persisted across sheets).
- Convert `DOB` to calculated `Age`, then remove `DOB`.
- Remove `Address` and `Contact` columns.

## ⚙️ Transformation Logic
- Multi-sheet alignment: The same `ID` maps across sheets for the same patient.
- Bias-detection rules for demographics (optional future extension).
- File-specific rules applied for:
  - Case-Mix
  - Holistic
  - Fare-up
  - Outpatient

