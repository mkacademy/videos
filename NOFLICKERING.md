# Quiz UI flicker: what was wrong and what fixed it

This document explains the flicker and “flash of wrong UI” issues around the Quizzes expanded screen (`src/components/convolayouts/Quizzes/Screen.tsx`), the Redux state that drives it, and the CSS/React techniques that made transitions feel smooth. It is written for anyone maintaining this area later.

---

## 1. Symptom: “removed then put back” (expanded quiz vs grid)

### What you saw

The screen alternates between:

- **Expanded mode**: one `Quiz` header plus either `Questions` or `Followups` under it.
- **Grid mode**: many `Quiz` cards when no quiz is selected.

That switch is driven by `quiz = quizzes[selected]`. If `quiz` is falsy even for a single frame while the UI still “feels” expanded, React tears down the expanded subtree and paints the grid, then the next update restores the expanded view. That reads as a quick flicker.

### Root cause: invalid `selected` index after data changed

In `applyClearSelectedQuizBranches` (quiz route `foundationdashboards`), after filtering, `state.quizzes` is replaced with a shorter array `newQuizzes`, but `state.selected` was updated with:

```ts
state.selected = selected > visbles.length ? -1 : selected;
```

Problems with that:

1. **Wrong comparison**: `selected` is an **index** into `quizzes` (0 … n−1). `visbles` is a **filtered list** of “visible” quizzes; its length is not the same thing as the maximum valid index for `newQuizzes`. Using `visbles.length` could leave `selected` pointing **past the end** of `newQuizzes`.
2. **Off-by-one**: even if the lengths were related, `selected > visbles.length` should have been `>=` for a valid “out of range” check against an array length.

If `selected` stays at `3` while `newQuizzes.length` is `3` (valid indices 0–2), then `quizzes[selected]` is `undefined`, so `quiz` is falsy and the UI jumps to the grid even though Redux still “thinks” a slot is selected.

### Fix

Clamp `selected` against the **actual** post-mutation array length:

```ts
state.selected =
  selected < 0 || selected >= newQuizzes.length ? -1 : selected;
```

The same pattern was corrected for courses in `applyClearSelectedCourseState` (`foundationsifters`), comparing `selected` to `newBanners.length` instead of `visbles.length`.

**Files**

- `src/library/QuizUtils.ts` — `applyClearSelectedQuizBranches`, `foundationdashboards` branch.
- `src/library/CourseUtils.ts` — `applyClearSelectedCourseState`, `foundationsifters` branch.

**Why it worked**: Redux and the UI always agree: `selected` is either `-1` or a valid index. `quizzes[selected]` is no longer `undefined` because the array shrank under the old index, so the expanded vs grid branch does not flap.

---

## 2. Symptom: flicker depended on scroll position (middle of page vs top)

### What you saw

Switching between **Questions** and **Followups** (or similar layout changes) looked fine at `scrollY === 0`, but flickered when the vertical scrollbar was in the middle of the page.

### Root cause: scroll anchoring

Browsers (especially Chromium) implement **scroll anchoring** by default (`overflow-anchor: auto`). When content above or below the viewport changes height, the engine adjusts `scrollY` to keep the anchored content stable. That interacts with React’s commit timing: you can get a visible **scroll nudge** or a double layout that feels like flicker.

When you are already at the top of the document, there is little or nothing for the anchor algorithm to “correct,” so the effect is much less visible.

### Fix

On the region whose height changes when toggling Questions/Followups, disable scroll anchoring:

```css
.quiz-crossfade {
  position: relative;
  overflow-anchor: none;
}
```

(That rule now lives on the crossfade container; earlier iterations used a similar rule on a swap wrapper.)

**Why it worked**: The browser stops automatically shifting `scrollY` when the subtree’s layout changes, so the scroll position no longer fights the React update.

---

## 3. Symptom: entering Followups felt worse than leaving

### What you saw

Going **into** Followups often flickered; going **back** to Questions often felt smooth.

### Why that was plausible

Previously, the UI used a **single branch**: render `Followups` **or** `Questions`, not both. Entering Followups **unmounted** the entire `Questions` tree (many `Question` rows, carousels, etc.) and **mounted** `Followups` in one commit—a large layout swap. Leaving Followups unmounted a smaller tree and remounted `Questions`, which could feel lighter or less jarring.

Hiding `Questions` with `display: none` instead of unmounting helped a bit but did not fully fix the perception, because the swap was still visually abrupt.

---

## 4. Final approach: crossfade + exit snapshot + stacked layout

The solution that made **both directions** feel smooth is implemented in:

- `src/components/convolayouts/Quizzes/Screen.tsx`
- `src/styles/quiz.module.css` (classes `quiz-crossfade`, `quiz-crossfade-layer`, `quiz-crossfade--questions`, `quiz-crossfade--followups`)

### 4.1 Two layers, opacity transition

Instead of swapping a single conditional subtree, the screen always renders **two layers** inside a wrapper:

1. First layer: **Questions** (or its empty state).
2. Second layer: **Followups** (or its empty state), when that panel should exist at all.

A class on the wrapper toggles between:

- `quiz-crossfade--questions` — questions visible, followups faded out.
- `quiz-crossfade--followups` — followups visible, questions faded out.

Each layer has:

```css
transition: opacity 220ms ease-in-out;
```

So when Redux flips `showFollowups`, **opacity** animates between the two panes instead of an instant mount/unmount swap.

**Constant**: `FOLLOWUPS_CROSSFADE_MS = 220` in `Screen.tsx` should stay aligned with the `220ms` in CSS if you tune duration.

### 4.2 Why the inactive layer is `position: absolute`

If both layers stayed in normal document flow in the same grid cell, the grid row’s height would tend to be the **maximum** of both subtrees. You would get a very tall block (questions height + followups height in effect), empty space, and bad scrolling.

So the **inactive** layer is taken out of flow:

- `position: absolute; left: 0; right: 0; top: 0; width: 100%;`
- `opacity: 0; pointer-events: none;`

The **active** layer stays `position: relative` so the wrapper’s height follows **only** the visible panel. The inactive layer still paints for the opacity transition but does not stretch the layout.

### 4.3 The hard part: closing Followups (Redux clears props immediately)

When the user leaves Followups, `setFollowupId(undefined)` runs. Then:

- `followupId` is gone.
- `parent = banners.find(b => b.id === followupId)` becomes `undefined`.
- `showFollowups` becomes false **immediately**.

If the UI tied “render Followups” strictly to live Redux, the Followups subtree would **unmount in the same frame** as the mode switch. There would be **nothing left to animate** on the followups side—no crossfade out, only an instant disappear (often perceived as flicker).

#### Snapshot + exit hold

To crossfade **out** of followups:

1. **While followups are visible**, a `useEffect` keeps a ref updated:

   `followupPanelSnapRef.current = { parent, visible }` whenever `showFollowups && parent`.

2. When `showFollowups` goes from **true to false**, another `useEffect` (using `prevShowFollowupsRef` to detect that edge only):

   - Sets `followupExitHold` to `true`.
   - Starts a `setTimeout` for `FOLLOWUPS_CROSSFADE_MS`.
   - On fire (and on cleanup), clears the hold and nulls the snapshot ref.

3. **Render logic**:

   - `showFollowupsPanel = (showFollowups && parent) || exitingSnap` where `exitingSnap` is the snapshot while `followupExitHold` is true.
   - `followupPanelProps` uses live Redux when `showFollowups && parent`, otherwise the snapshot during the exit hold.

4. The wrapper’s CSS class still uses **`showFollowups`** (not the hold) so the visual mode is **questions** while the hold runs: questions fade in, followups fade out using **snapshot** props.

5. Re-opening followups during the timeout: the effect’s cleanup **clears the timeout** when `showFollowups` becomes true again, so a stale timeout does not wipe state mid-navigation.

**Why it worked**: For ~220ms after Redux says “we’re back to questions,” the followups layer **still exists** with the last known `parent` and `visible` list, so the browser can actually run an opacity transition. After the timeout, the snapshot is dropped and memory/props align with Redux again.

---

## 5. Mental model (short)

| Issue | Mechanism | Mitigation |
|--------|-----------|------------|
| Expanded ↔ grid flash | `selected` out of range → `quizzes[selected]` undefined | Clamp `selected` to `newQuizzes.length` / `newBanners.length` |
| Flicker vs scroll position | Scroll anchoring adjusts `scrollY` on layout change | `overflow-anchor: none` on the changing region |
| Harsh Questions ↔ Followups | Instant swap / huge DOM churn | Two layers + opacity transition |
| Broken exit crossfade | Redux clears `parent` before paint | Snapshot ref + timed `followupExitHold` |
| Double-height scroll | Both layers in flow | Absolute positioning for the inactive layer |

---

## 6. Files to read when touching this again

| Area | File |
|------|------|
| Quiz expanded layout, crossfade, snapshot | `src/components/convolayouts/Quizzes/Screen.tsx` |
| Crossfade / scroll-anchor CSS | `src/styles/quiz.module.css` (`quiz-crossfade*`) |
| Selected index after clear-selected (quiz) | `src/library/QuizUtils.ts` — `applyClearSelectedQuizBranches` |
| Selected index after clear-selected (course) | `src/library/CourseUtils.ts` — `applyClearSelectedCourseState` |
| Deferred router selection (can cause one-tick delay) | `src/Hooks/useShortcuts.ts` — `useApplyRouterSelections` |

---

## 7. Optional follow-ups (not implemented here)

- If you ever need a guaranteed “paint at opacity 0 before fade in,” you can arm the transition with a double `requestAnimationFrame` or `@starting-style` where supported.
- If `useApplyRouterSelections` still causes a one-frame mismatch between URL state and Redux, consider dispatching selection synchronously in the `useEffect` instead of `setTimeout(…, 0)`—that is a product decision because it changes long-standing timing.

---

*This note reflects the state of the codebase when the no-flicker work was integrated; keep constants and comments in sync if you change animation duration or snapshot timing.*
