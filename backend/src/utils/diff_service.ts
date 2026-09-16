export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  lineA?: number;
  lineB?: number;
  text: string;
}

export interface DocumentDiffResult {
  lines: DiffLine[];
  summary: {
    addedCount: number;
    removedCount: number;
    unchangedCount: number;
    totalLinesA: number;
    totalLinesB: number;
  };
}

export class DiffService {
  /**
   * Computes an explainable line-by-line diff between two document strings.
   */
  computeDiff(textA: string, textB: string): DocumentDiffResult {
    const linesA = (textA || '').split('\n');
    const linesB = (textB || '').split('\n');

    const m = linesA.length;
    const n = linesB.length;

    // LCS table for line-based diff
    // Cap matrix size if document is extraordinarily large to keep performance < 15ms
    if (m * n > 4000000) {
      // Line count exceeds 2000x2000, fallback to chunked comparison
      return this.fallbackDiff(linesA, linesB);
    }

    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (linesA[i] === linesB[j]) {
          dp[i + 1][j + 1] = dp[i][j] + 1;
        } else {
          dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
        }
      }
    }

    const result: DiffLine[] = [];
    let i = m;
    let j = n;

    const backtrack: DiffLine[] = [];

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
        backtrack.push({
          type: 'unchanged',
          lineA: i,
          lineB: j,
          text: linesA[i - 1]
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        backtrack.push({
          type: 'added',
          lineB: j,
          text: linesB[j - 1]
        });
        j--;
      } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
        backtrack.push({
          type: 'removed',
          lineA: i,
          text: linesA[i - 1]
        });
        i--;
      }
    }

    backtrack.reverse();

    let addedCount = 0;
    let removedCount = 0;
    let unchangedCount = 0;

    for (const line of backtrack) {
      if (line.type === 'added') addedCount++;
      else if (line.type === 'removed') removedCount++;
      else unchangedCount++;
    }

    return {
      lines: backtrack,
      summary: {
        addedCount,
        removedCount,
        unchangedCount,
        totalLinesA: m,
        totalLinesB: n
      }
    };
  }

  private fallbackDiff(linesA: string[], linesB: string[]): DocumentDiffResult {
    const lines: DiffLine[] = [];
    const setA = new Set(linesA);
    const setB = new Set(linesB);

    let addedCount = 0;
    let removedCount = 0;
    let unchangedCount = 0;

    for (let i = 0; i < linesA.length; i++) {
      const line = linesA[i];
      if (setB.has(line)) {
        lines.push({ type: 'unchanged', lineA: i + 1, text: line });
        unchangedCount++;
      } else {
        lines.push({ type: 'removed', lineA: i + 1, text: line });
        removedCount++;
      }
    }

    for (let j = 0; j < linesB.length; j++) {
      const line = linesB[j];
      if (!setA.has(line)) {
        lines.push({ type: 'added', lineB: j + 1, text: line });
        addedCount++;
      }
    }

    return {
      lines,
      summary: {
        addedCount,
        removedCount,
        unchangedCount,
        totalLinesA: linesA.length,
        totalLinesB: linesB.length
      }
    };
  }
}

export const diffService = new DiffService();
