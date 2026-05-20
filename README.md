# triage-cdst

A TypeScript module that validates hospital triage payloads and generates
clinical decision support (CDST) flags for emergency care scenarios.

## How to Run Tests

Install dependencies:
```bash
npm install
```

Run tests:
```bash
npm test
```

## Assumptions Made

### Validation
- Required fields (`encounterId`, `patientId`, `department`, `chiefComplaint`)
  must be present and non-empty strings. Whitespace-only strings are rejected.
- `symptoms` must be an array of strings. An empty array is valid, 
  it means no symptoms were reported, not that the field is missing.
- `observations` is optional. Its absence does not affect validation outcome.
- Vital sign ranges are treated as inclusive on both ends,
  a value exactly equal to the minimum or maximum is considered valid.

### Flag Generation
- Symptom matching is case-insensitive. `"Chest Pain"` and `"chest pain"`
  both trigger `EMERGENCY_RED_FLAG_SYMPTOM`.
- Symptom matching is partial. `"severe chest pain"` triggers the flag
  because it contains the red flag term `"chest pain"`.
- `SEVERE_HYPERTENSION` requires only one of systolic or diastolic
  to cross the threshold, both values are reported in the evidence
  regardless of which one triggered the flag.
- Severity assignments:
  - `HIGH_FEVER` - `warning`: elevated temperature is serious but
    rarely immediately life threatening.
  - `SEVERE_HYPERTENSION` - `critical`: hypertensive crisis carries
    immediate risk of stroke and organ damage.
  - `LOW_OXYGEN_SATURATION` - `critical`: low oxygen causes rapid
    deterioration of vital organs.
  - `EMERGENCY_RED_FLAG_SYMPTOM` - `critical`: chest pain and
    shortness of breath are classic presentations of cardiac and
    respiratory emergencies.

### General
- The disclaimer `"Clinical decision support only. Not a diagnosis."`
  is always returned on successful evaluation regardless of flags raised.
