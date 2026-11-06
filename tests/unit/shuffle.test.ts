import { describe, expect, it } from 'vitest'
import { shuffleItems } from '../../shared/domain/questions/shuffle'

describe('shuffleItems', () => {
  it('returns a shuffled copy without losing or duplicating items', () => {
    const original = ['a', 'b', 'c', 'd']
    const randomValues = [0, 0.99, 0]
    const shuffled = shuffleItems(original, () => randomValues.shift() ?? 0)

    expect(shuffled).toEqual(['b', 'd', 'c', 'a'])
    expect([...shuffled].sort()).toEqual([...original].sort())
    expect(original).toEqual(['a', 'b', 'c', 'd'])
  })

  it('handles empty and single-item lists', () => {
    expect(shuffleItems([])).toEqual([])
    expect(shuffleItems(['only'])).toEqual(['only'])
  })
})