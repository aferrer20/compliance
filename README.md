# The Chief Negotiators × Strategic Supply Partners — Vetting Portal

Static site for **compliance.thechiefnegotiators.com** (GitHub Pages). Every GPU supplier,
GPU buyer and compute off-taker completes a dossier here; it is graded server-side and
decided by named reviewers in the review desk.

| File | Purpose |
|---|---|
| `index.html` | Co-branded landing page, routes to the three dossiers |
| `supplier.html` | Supplier vetting (entity, ownership, board, supply chain, export, banking, references, documents) |
| `buyer.html` | GPU buyer / end-user qualification, aligned to the OEM & NVIDIA end-user discovery |
| `compute.html` | Compute capacity (off-taker) qualification |
| `review.html` | Review desk for reviewers (Supabase sign-in, `vetting_reviewers` only) |
| `customer.html`, `tenant.html` | Redirects from the old URLs (keep query strings) |
| `forms/*.js` | Question schemas. `common.js` holds shared blocks (owners, board, screening, attestation) |
| `vetting.js` / `vetting.css` | Form engine: steps, autosave, validation, uploads, submission |
| `brand.css` | Co-brand design system (navy, champagne gold, Cormorant / Inter / Plex Mono) |
| `privacy.html` | Privacy notice linked from every page |

## How a dossier flows

1. The browser posts raw answers to the Supabase function `vetting-intake` (CRM repo,
   `supabase/functions/vetting-intake`). **No scoring code ships to the browser**, so
   applicants cannot learn which answers move their grade.
2. The function sanitises, rate-limits, checks cross-dossier fraud signals (re-used bank
   accounts, prior declines), optionally screens every name on the U.S. Consolidated
   Screening List, grades A–F, stores the row, returns signed upload URLs for documents and
   emails the desk.
3. Reviewers work the file in `review.html`. The database trigger `vetting_guard` enforces
   the approval gate (blockers cleared with evidence, required verifications done, score
   floors, approver role, two approvers for scores under 70, written reasons, append-only
   audit). The UI only mirrors those rules.

If the function is unreachable, the form falls back to Web3Forms with the raw answers
(clearly marked UNGRADED) so no submission is lost.

## Editing questions

Edit the schema in `forms/`. If you add, rename or remove a field that the rules use,
update `rules.mjs` in the CRM repo too and bump `version` in the schema (this also resets
saved drafts for that form).
