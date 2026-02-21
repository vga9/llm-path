import type { Message, DiffItem, DiffResult } from '../types';

/**
 * Compute the Longest Common Subsequence (LCS) of two arrays of message IDs
 * Returns the LCS as an array of indices pairs [parentIndex, currentIndex]
 */
function computeLCS(parentIds: string[], currentIds: string[]): [number, number][] {
  const m = parentIds.length;
  const n = currentIds.length;

  // Build LCS length table
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (parentIds[i - 1] === currentIds[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the LCS
  const lcs: [number, number][] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (parentIds[i - 1] === currentIds[j - 1]) {
      lcs.unshift([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Compute the diff between parent messages and current messages
 * Uses LCS algorithm to find the minimal edit sequence
 */
export function computeMessageDiff(
  parentMessageIds: string[],
  currentMessageIds: string[],
  getMessage: (id: string) => Message | undefined
): DiffResult {
  const items: DiffItem[] = [];
  const summary = { unchanged: 0, added: 0, deleted: 0 };

  // Get LCS
  const lcs = computeLCS(parentMessageIds, currentMessageIds);

  // Build diff using LCS as anchors
  let parentIdx = 0;
  let currentIdx = 0;
  let lcsIdx = 0;

  // Collect deletions and additions between LCS points
  const pendingDeletes: { idx: number; id: string }[] = [];
  const pendingAdds: { idx: number; id: string }[] = [];

  const flushPending = () => {
    // Output deletions first, then additions
    for (const del of pendingDeletes) {
      const oldMessage = getMessage(del.id);
      if (oldMessage) {
        items.push({ type: 'deleted', oldMessage });
        summary.deleted++;
      }
    }
    pendingDeletes.length = 0;

    for (const add of pendingAdds) {
      const newMessage = getMessage(add.id);
      if (newMessage) {
        items.push({ type: 'added', newMessage });
        summary.added++;
      }
    }
    pendingAdds.length = 0;
  };

  while (parentIdx < parentMessageIds.length || currentIdx < currentMessageIds.length) {
    // Check if we're at an LCS point
    if (lcsIdx < lcs.length && parentIdx === lcs[lcsIdx][0] && currentIdx === lcs[lcsIdx][1]) {
      // Flush any pending deletes/adds before this unchanged item
      flushPending();

      // This is an unchanged message
      const message = getMessage(parentMessageIds[parentIdx]);
      if (message) {
        items.push({ type: 'unchanged', oldMessage: message, newMessage: message });
        summary.unchanged++;
      }
      parentIdx++;
      currentIdx++;
      lcsIdx++;
    } else {
      // We need to advance to the next LCS point
      const nextLcsParent = lcsIdx < lcs.length ? lcs[lcsIdx][0] : parentMessageIds.length;
      const nextLcsCurrent = lcsIdx < lcs.length ? lcs[lcsIdx][1] : currentMessageIds.length;

      // Collect all deletions (items in parent but not matching LCS)
      while (parentIdx < nextLcsParent) {
        pendingDeletes.push({ idx: parentIdx, id: parentMessageIds[parentIdx] });
        parentIdx++;
      }

      // Collect all additions (items in current but not matching LCS)
      while (currentIdx < nextLcsCurrent) {
        pendingAdds.push({ idx: currentIdx, id: currentMessageIds[currentIdx] });
        currentIdx++;
      }
    }
  }

  // Flush any remaining pending items
  flushPending();

  return { items, summary };
}

/**
 * Compute diff for first request (no parent)
 * All messages are treated as "added"
 */
export function computeFirstRequestDiff(
  currentMessageIds: string[],
  getMessage: (id: string) => Message | undefined
): DiffResult {
  const items: DiffItem[] = [];
  const summary = { unchanged: 0, added: 0, deleted: 0 };

  for (const id of currentMessageIds) {
    const message = getMessage(id);
    if (message) {
      items.push({ type: 'added', newMessage: message });
      summary.added++;
    }
  }

  return { items, summary };
}
