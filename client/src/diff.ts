export interface DiffRow {
  left: string | null
  right: string | null
  kind: 'same' | 'removed' | 'added' | 'changed'
}

/** Align two snippets line-by-line using an LCS, for side-by-side rendering. */
export function diffLines(original: string, refactored: string): DiffRow[] {
  const a = original.split('\n')
  const b = refactored.split('\n')

  // LCS table (snippets are small — quadratic is fine)
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  )
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const rows: DiffRow[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      rows.push({ left: a[i], right: b[j], kind: 'same' })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      rows.push({ left: a[i], right: null, kind: 'removed' })
      i++
    } else {
      rows.push({ left: null, right: b[j], kind: 'added' })
      j++
    }
  }
  while (i < a.length) rows.push({ left: a[i++], right: null, kind: 'removed' })
  while (j < b.length) rows.push({ left: null, right: b[j++], kind: 'added' })

  // Pair adjacent removed/added runs as "changed" so they sit on the same row
  const paired: DiffRow[] = []
  let k = 0
  while (k < rows.length) {
    if (rows[k].kind === 'removed') {
      const removed: DiffRow[] = []
      while (k < rows.length && rows[k].kind === 'removed') removed.push(rows[k++])
      const added: DiffRow[] = []
      while (k < rows.length && rows[k].kind === 'added') added.push(rows[k++])
      const max = Math.max(removed.length, added.length)
      for (let m = 0; m < max; m++) {
        paired.push({
          left: removed[m]?.left ?? null,
          right: added[m]?.right ?? null,
          kind: removed[m] && added[m] ? 'changed' : removed[m] ? 'removed' : 'added',
        })
      }
    } else {
      paired.push(rows[k++])
    }
  }
  return paired
}
