# Design: Fix Wakeup-Imported Course Span (Multi-Period Display)

## Problem

When importing a course schedule from WakeUp app data, courses that span multiple periods (e.g., periods 1-4) only display the first period. The root cause is in `resolveWakeupLessonRange()` in `src/core/schedule/importWakeup.ts`.

## Root Cause

In `resolveWakeupLessonRange()`, `endNode` is computed as:

```js
endNode = clampWakeupNode(startNode + span - 1, maxNode)
```

where `span = getWakeupSpanFromStep(lesson.step)`. When `lesson.step` is `1` (or otherwise unreliable), `span = 1`, causing `endNode = startNode`. The existing `endNodeLookup` (built from time-slot end times) is only used to *infer `startNode`* when it is missing — never to directly determine the actual `endNode`.

## Solution

**Approach: Use `endTime` to look up `endNode` directly.**

When `hasEndTime` is true and `endNodeLookup.get(endTime)` returns a matching node, use that node as `endNode`. Fall back to `startNode + span - 1` only when `endTime` is unavailable or does not match any time slot.

## Changes

### File: `src/core/schedule/importWakeup.ts`

In `resolveWakeupLessonRange()`, replace the single-line `endNode` assignment (current line 142) with:

1. After `startNode = clampWakeupNode(startNode, maxNode)`, check if `hasEndTime` is true.
2. If true, look up `endNodeLookup.get(endTime)`.
3. If a match is found, set `endNode` to the matched node (clamped).
4. If no match, fall back to `startNode + span - 1`.
5. Guard: if the resulting `endNode < startNode`, clamp to `startNode`.

No other functions or data models change. The fix is localized to `endNode` computation.

## Why This Works

WakeUp data includes `endTime` (e.g., `"11:40"`), which maps to a specific time slot node via the existing `endNodeLookup`. Using `endTime` as the ground truth bypasses the unreliable `step` field for determining how many periods a course occupies.

## Edge Cases Handled

- `endTime` not present or empty → falls back to `span`-based calculation.
- `endTime` present but not found in time slots → falls back to `span`-based calculation.
- `endNode` somehow computed smaller than `startNode` → clamped to `startNode`.
- Existing `startNode` inference logic (line 130) is left untouched; it is a rare path.
