# Pattern Lab Engine v2

Pattern Lab Engine v2 is a deterministic candidate analysis pipeline. It does not generate candidates directly from the latest DSV1 score. It first loads weekly historical draws, calculates historical scores, derives a statistical range, brute-forces `0000` through `9999`, validates every accepted candidate, and ranks by a fixed formula.

## Pipeline

1. Historical draw loader
2. Historical DSV1 resolver
3. Weekly score analyzer
4. Range analyzer
5. Current weight profile resolver
6. Brute-force candidate generator
7. Candidate validator
8. Candidate ranking
9. REST API

## Data Sources

Historical draws are loaded from the existing `draw_results` collection by `session` and same weekday offsets from the selected target date.

DSV1 profiles are resolved in this order:

1. `currentWeightProfile` supplied to `POST /api/analysis`
2. Existing `analysis_candidates.digitPool.weighted` for the target period
3. Deterministic fallback profile derived from selected historical draw digit frequency

The fallback is included in `source.currentWeightProfile` or `dsv1Profiles[].source` so consumers can see when a stored DSV1 table was unavailable.

## Collections

Existing collections reused:

- `draw_results`
- `analysis_candidates`

New collections:

- `weekly_statistics`
- `candidate_pool`
- `candidate_ranking`
- `backtest_logs`

Historical draw data is not duplicated. V2 documents store references and compact evidence snapshots required for reproducibility.

## API

### `POST /api/analysis`

Runs the full v2 engine and persists statistics, candidate pool, and ranking.

```json
{
  "session": "night",
  "targetDate": "2026-06-30",
  "targetDay": "Selasa",
  "historyDepth": 5,
  "currentWeightProfile": {
    "0": 10,
    "1": 55,
    "2": 40,
    "3": 20,
    "4": 35,
    "5": 45,
    "6": 60,
    "7": 70,
    "8": 25,
    "9": 30
  }
}
```

### `GET /api/analysis`

Lists saved analysis records.

Query:

- `session=day|night`
- `targetDate=YYYY-MM-DD`
- `limit=20`

### `GET /api/candidate`

Lists candidate pool rows, including accepted and rejected candidates.

Query:

- `session=day|night`
- `targetDate=YYYY-MM-DD`
- `status=accepted|rejected`
- `limit=100`

### `GET /api/candidate/ranking`

Lists deterministic ranked candidates.

### `GET /api/statistics`

Alias for saved weekly statistics.

## Ranking Formula

```text
Final Score = DSV1 Score + Support Score + Historical Weight + Frequency Weight
```

Tie-breakers are deterministic:

1. Final score descending
2. Support score descending
3. DSV1 score descending
4. Candidate ascending

## Validator Contract

Every validator returns:

```json
{
  "module": "historical_digit_frequency",
  "supportScore": 12,
  "passed": true,
  "reason": "Candidate digits scored by frequency across selected historical draws",
  "evidence": {}
}
```

Validators are pluggable by extending `src/modules/pattern-lab/validators/index.js`. Validators must not silently remove candidates. Rejection is currently performed only by explicit score-range filtering, and every rejected row is persisted with `rejectionReason`.
