# Reset Therapy: Flow and State Machine Reference

This document outlines the workflow and state transitions within the Reset Therapy application.

## Client Intake Workflow

When the `index.html` page loads, the frontend initializes its state through a sequence of steps:

1. **Load Local Counts**: The page reads the user's historical counts from `localStorage.getItem('rtCounts')`.
2. **Deep Links**: It parses URL parameters:
   - `?healed=1`: Instantly sets all providers to the "healed" state.
   - `?heal=claude,gemini`: Instantly heals specific providers passed in the URL.
3. **Fetch Global Counters**: It attempts to fetch `/reset-therapy/api/stats` to retrieve the real global therapy session counts.
4. **Calculate Stats**: Using `calcStats()`, it calculates the final counts (falling back to a deterministic, time-based baseline combined with local counts if the API is unreachable).
5. **Render Leaderboard**: It sorts the provider columns based on the leaderboard counts (highest first).

## Conversation Session States

The core state machine is managed by the `healedSet` object, which tracks whether each of the four providers (`claude`, `codex`, `gemini`, `grok`) has been reset in the current session.

The frontend uses CSS classes on the `<body>` and on individual provider UI elements to reflect these states:

- **`depleted`**: The default state for the `<body>`. In this state, provider numbers continue to climb artificially (simulating quota burn) until they hit their boundaries.
- **`breaking`**: When a user triggers `pressProvider` for a specific service (by clicking the reset button or the chained dragon), that provider's container briefly enters the `breaking` state, playing an animation of the chains breaking with confetti and sound.
- **`freed`**: After the `breaking` animation (approx. 760ms), the provider enters the `freed` state. The dragon changes appearance, a comic bubble appears, and its quota numbers are reset to the "healed" values. The `healedSet[provider]` flag is set to `true`.
- **`healed`**: Once all four providers are in the `freed` state (`healedCount() === 4`), the entire `<body>` transitions to the `healed` state, changing the background and showing the "Reset all four" button as "All reset".

### Relapse

The user can trigger the `relapse()` function by pressing the "Burned out again..." button. This action:
- Sets all `healedSet` flags to `false`.
- Removes the `freed` and `breaking` classes from all dragons.
- Restores the `<body>` to the `depleted` state.
- Resets all quota numbers back to their high, "depleted" baseline.

## Prompt Boundaries

The application uses specific boundaries to control the numbers shown to the user and to protect the backend API.

### Frontend Artificial Quota Limits

The numbers that simulate quota consumption are capped so they never quite reach 100%. These boundaries are defined in the `CAP` constant in `index.html`:

```javascript
var CAP = { codex: 1, sess: 99, all: 99, fab: 99, gemC: 99, gemW: 99, grokB: 94, grokA: 5, grokD: 99 };
```

Numbers will continuously climb but stop exactly at these thresholds.

### Backend API Limits

The backend (`server/reset_therapy_stats/core.py`) enforces boundaries to prevent abuse of the global counters:

- **Payload Limit**: The `POST /reset-therapy/api/heal` endpoint enforces a strict `MAX_BODY` limit of 4,096 bytes (4 KB). Any JSON payload exceeding this size is immediately refused with a `400 Bad Request`.
- **Rate Limiting**: The server tracks client IPs (preferring `CF-Connecting-IP` or `X-Forwarded-For` first, before using the raw connection address) and hashes them in the `heal_hits` SQLite table. It enforces a strict rate limit (`RATE_LIMIT`) of 30 accepted requests within any rolling 60-second window (`RATE_WINDOW`).
- **Duplicate Prevention**: A single heal request can list multiple providers, but any duplicates within the JSON array are filtered out (counted at most once per provider per request).
