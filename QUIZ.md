# Quiz Combinations and Submission Storage

This document explains, in detail, how quiz combinations are generated and how a chosen combination is represented and saved in quiz submissions.

## Quick Reference

Use this section as the fast mental model before reading deeper details.

- `attempt` (`Record<string, Attempt>`)
  - In-memory latest selection map.
  - Key format: `choice<bannerOrPennantId>`.
  - Typical entry:
    ```ts
    attempt["choice42"] = { choice42: "184" };
    ```
  - Source of truth for current UI-selected option IDs.

- `combinations` (`string[][][]`)
  - Top-level combination pool generated from `state.content`.
  - Indexed by content group:
    - `combinations[groupIndex] -> string[][]` (all candidate combos for that group)
    - `combinations[groupIndex][comboIndex] -> string[]` (one combo)
    - each string is an option ID like `"123c"` or `"123i"`.

- `followupCombinations` (`Record<number, string[][]>`)
  - Followup-mode combination pool, partitioned by pennant id.
  - Key = followup pennant id; value = that pennant's generated combinations.
  - Recomputed whenever followup context/content changes.

Suffix semantics used by generated option IDs:

- `"c"` = content/text option for an item id
- `"i"` = image option for the same item id

### Example: how combinations are built

Assume one `SlideGroup` has three thumb items with IDs `10`, `11`, and `12`.

`getCombination` first expands each item id into content/image option IDs:

```ts
preProcessed = ["10c", "10i", "11c", "11i", "12c", "12i"];
```

Because there are more than 4 options, the generator creates unique size-4 combinations (up to 1000 max). A few valid examples:

```ts
[
  ["10c", "10i", "11c", "11i"],
  ["10c", "11c", "12c", "12i"],
  ["10i", "11i", "12c", "12i"],
  ["10c", "11i", "12c", "12i"],
  // ... more unique 4-item combinations
]
```

At state level (single group case), shape becomes:

```ts
state.combinations = [
  [
    ["10c", "10i", "11c", "11i"],
    ["10c", "11c", "12c", "12i"],
    // ...
  ],
];
```

If a group has only two thumb items, e.g. IDs `20` and `21`, expanded options are 4 values total:

```ts
["20c", "20i", "21c", "21i"]
```

In that case, no sampling is needed and the function returns a single combination for that group:

```ts
[["20c", "20i", "21c", "21i"]]
```

## Core Data Structures

### `Submition` (saved attempt entity)

Defined in `src/library/QuizUtils.ts`:

- `Submition` represents a persisted attempt row (stored under `Quiz.pennants`).
- The most important field for choices is `quote: string`.
- `quote` stores the selected choice payload encoded as Base64 JSON.
- Each decoded payload is keyed by a choice key like `choice<id>`.

Example decoded `quote` payload shapes:

```json
{
  "choice42": {
    "choice42": "184c"
  }
}
```

After update/re-encode flows, the same payload may look like:

```json
{
  "choice42": {
    "0": "184c",
    "1": "184i"
  }
}
```

Important details:

- Values are option IDs (for example `184c` or `184i`), not plain numeric ids.
- `c` means "content/text option", `i` means "image option" for the same base item id.
- `getChoices` always returns the latest selected value by taking the last value in that object.
- Some reducer logic parses the numeric portion with `parseInt(value, 10)`, so `184c`/`184i` both map back to base item id `184` when needed for dismiss/toggle behavior.

### Redux `quiz` state (`QuizState`)

Defined in `src/library/QuizUtils.ts` and used by `src/store/slices/quizSlice.ts`.

- `attempt: { [x: string]: Attempt }`
  - In-memory current selections.
  - Primary key format: `choice<bannerOrPennantId>`.
  - Value shape usually looks like `{ choice42: "184" }`.
- `combinations: string[][][]`
  - Top-level list indexed by `content` group.
  - Each group contains many candidate combinations.
  - Each combination is an array of option IDs (strings).
- `followupCombinations: Record<number, string[][]>`
  - Combination set for followup pennants when a `followupId` is active.

## How Combinations Are Generated

## 1) Generation entry point

In `quizSlice`, when quizzes/content are set, combinations are recomputed:

- `setQuizzes` reducer:
  - `state.combinations = getCombination(content);` (`src/store/slices/quizSlice.ts`)
- Also recomputed in merge flows:
  - `mergeQuizFetchSkeletonsFulfilledIfQuiz` calls `getCombination(state.content)`.

So combinations are derived from current `content` (course/slide layout), not from attempts.

## 2) `getCombination(content)` algorithm

Implemented in `src/library/QuizUtils.ts`.

For each `SlideGroup`:

1. Read `slides` and `thumbs`:
   - `const { slides = [], ...thumbs } = slideGroup;`
2. Ignore `slides` intentionally.
   - Only thumb items participate in top-level quiz combinations.
3. Build a flattened option ID array (`preProccessed`) from each thumb item ID:
   - For each numeric item id `n`, append:
     - `n + "c"` (content option)
     - `n + "i"` (image option)
4. Choose generation strategy:
   - If `preProccessed.length <= 4`, return exactly one combination: `[preProccessed]`.
   - If `preProccessed.length > 4`, generate up to 1000 unique combos of length 4:
     - `generateUniqueCombinations(preProccessed, 4, 1000)`.

Result type for each group: `string[][]`.
Whole function result: `string[][][]` (all groups).

## 3) Uniqueness and sampling details

`generateUniqueCombinations` uses two phases:

1. **Systematic phase** (coverage first):
   - Calls `generateSystematicCombinations(arr, length, Math.min(maxCombinations, 500))`.
   - Iterative index-based generation (stack) creates deterministic coverage.
2. **Random phase** (fill remainder):
   - Repeatedly shuffles and slices (`generateRandomCombination`) until:
     - `maxCombinations` reached, or
     - `maxAttempts = maxCombinations * 10` reached.

Uniqueness is enforced with a `Set` keyed by sorted members (`combo.sort().join('|')`), so `[a,b,c,d]` and permutations are treated as the same combination.

## 4) Followup-specific combinations

When `followupId` is set, `recomputeFollowupCombinations(state)` builds dedicated sets:

1. Find the followup parent banner (`state.banners.find(b => b.id === followupId)`).
2. Flatten all `SlideItem`s from `state.content`.
3. For each parent pennant:
   - collect slides where `slide.bannerId === pennant.id`
   - call `getCombinationFromSlideItems(collected)`
4. Store by pennant id in `state.followupCombinations[pennant.id]`.

`getCombinationFromSlideItems` mirrors top-level behavior:

- Emits `id+"c"` and `id+"i"` for each slide item.
- If more than 4 options, generate up to 1000 unique size-4 combinations.
- Else, one full combination.

### `followupCombinations` explained in practical terms

`followupCombinations` is a lookup table used when the UI is in followup mode (a parent question is active via `followupId`).

- **Key**: followup pennant id (`number`)
- **Value**: all generated option combinations for that pennant (`string[][]`)

So the shape is:

```ts
Record<number, string[][]>
```

Example:

```ts
{
  9001: [
    ["123c", "123i", "124c", "124i"],
    ["123c", "125c", "125i", "126i"],
  ],
  9002: [
    ["200c", "200i", "201c", "201i"],
  ],
}
```

How this should be interpreted:

- `9001` and `9002` are two different followup pennants under the currently selected followup parent.
- Each inner array is one valid combination candidate to render/choose from for that specific pennant.
- The store keeps combinations isolated per pennant, so combinations from one followup branch are never mixed with another branch.

Lifecycle and recomputation behavior:

1. If `followupId` is unset (`undefined`), `followupCombinations` is reset to `{}`.
2. If `followupId` does not match any banner, it is also reset to `{}`.
3. If a valid parent exists:
   - combinations are rebuilt from current `state.content` slides,
   - grouped by each parent pennant id,
   - and replaced atomically (`state.followupCombinations = next`).

This means `followupCombinations` is always a derived cache of current content for the active followup context, not a persisted source of truth.

## How a Selection Is Saved in a Submission

There are two related layers:

1. **In-memory active selection** (`state.attempt`), updated immediately by UI actions.
2. **Persisted submission row** (`Submition.quote`), encoded/decoded through helpers.

## 1) In-memory save (`state.attempt`)

Reducers that merge a selection payload:

- `dismissOption` -> `applyDismissOption`:
  - `state.attempt = { ...state.attempt, ...choice }`
- `dismissFollowupOption` -> `applyDismissFollowupOption`:
  - same merge pattern.

`choice` keys are normalized as `choice<id>` and point to current selected item ids.

Example merged shape:

```ts
state.attempt["choice42"] = { choice42: "184" };
```

This is the source of truth for current UI-selected option IDs.

## 2) Persisted save (`Submition.quote`)

Persistence helpers live in `src/library/quizAttemptManager.ts`.

### Encoding path

- `encodeAttempts(consolidatedattempts)`:
  - `JSON.stringify(...)`
  - `Buffer.from(...).toString("base64")`
- Stored in `Submition.quote`.

### Decoding path

- `getChoices({ quote })`:
  - Base64 decode -> JSON parse
  - take the last key/value pair
  - normalize result to:
    - `{ [choiceKey]: [lastSelectedValue] }`

This means persisted submissions can carry history-like arrays, but consumption logic intentionally reads only the latest selected value.

## 3) Rehydration back into Redux attempt map

When quizzes are loaded into state (`setQuizzes`), attempt state is rebuilt from persisted `pennants`:

- `state.attempt = getAttempts(newQuizzesState);`
- `getAttempts`:
  1. flatten all submission pennants
  2. decode each with `getChoices`
  3. convert to `{ [choiceKey]: { [choiceKey]: latestValue } }`
  4. reduce into one object map

So, persisted `Submition.quote` is the durable form; `state.attempt` is its working projection.

## 4) Update vs insert behavior

`quizAttemptManager` provides both directions:

- `insertSubmitted(...)`
  - builds submissions from attempt keys not already represented in saved choices
  - creates `Submition` records with encoded `quote`
- `updateSubmitted(...)`
  - finds already-saved submissions and re-encodes `quote` with latest selection appended

Both eventually dispatch `setQuizzes(...)`, which rehydrates `state.attempt` from the newly persisted data.

## End-to-End Example

1. User selects option item `184` for question `42`.
2. UI dispatches a dismiss/select action with:
   - `choice = { choice42: { choice42: "184" } }`
3. Reducer merges this into `state.attempt`.
4. On submit/update:
   - selection is encoded to Base64 JSON and placed into `Submition.quote`.
5. On next load/refresh:
   - `setQuizzes` -> `getAttempts` decodes quotes.
   - `state.attempt["choice42"]` is restored with the latest value.
6. Independently, `state.combinations` is generated from current content/thumb topology and used for combination logic/rendering.

## Important Implementation Notes

- Top-level `getCombination` intentionally ignores `slides`; it uses only non-`slides` group entries (thumb items).
- IDs are stringified with suffix semantics:
  - `"c"` for content text option
  - `"i"` for image option
- Combination size is fixed at `4`.
- Cap is `1000` unique combinations per group/pennant context.
- If available options are `<= 4`, the system returns exactly one combination containing all available option IDs.
