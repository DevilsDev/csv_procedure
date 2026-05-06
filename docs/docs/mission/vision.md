---
id: vision
title: Vision
---

# Vision

Most clinical data work starts with the same chore: someone exports an Excel workbook out of a clinical system, and an analyst spends an afternoon stripping identifiers, normalizing headers, and chasing odd dates before they can do any actual analysis.

Clinisync compresses that afternoon into a single HTTP call.

## Principles

**One job, done predictably.** The cleaning rules are fixed in code, small in number, and documented page by page. There is no DSL, no rule engine, no inference. If the rule isn't in the code, it isn't applied — and that's the point.

**De-identify by default.** Output CSVs do not contain `NHI`, `DOB`, `Address`, or `Contact`. Patient identity is replaced by sequential per-upload IDs that don't survive across uploads. The pipeline is built so the *most common mistake* (forgetting to scrub a column) cannot happen by default.

**Hold no data.** Cleaned files land on disk and are swept after a TTL. There is no database, no patient registry, no audit table — just transient on-disk artifacts and a per-upload manifest. The system is designed to be forgotten between requests.

**Be honest about what's in the box.** Clinisync is not a HIPAA-certified product, not a managed service, and not a place to permanently store patient data. The README, this site, and the source code stay aligned with reality; if a feature isn't implemented, it isn't claimed.

## What "done" looks like for a request

A clinical analyst points their workbook at `/upload`, gets back JSON with the per-sheet stats and CSV filenames, downloads the CSVs within 24 hours, and forgets the service exists. The next person who uploads the same workbook 25 hours later finds nothing of theirs lingering on the server.

That's the shape of the problem. The rest of the docs describe how each piece holds up its end of that contract.
