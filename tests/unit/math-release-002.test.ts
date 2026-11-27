import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
describe('second original question release', () => {
  it('passes independent calculations for all 100 questions', () => {
    const result = JSON.parse(
      execFileSync('python3', ['scripts/content/check_math_release_002.py'], {
        encoding: 'utf8',
      }),
    )
    expect(result).toMatchObject({
      status: 'PASS',
      questions: 100,
      families: 20,
      humanReview: 'pending',
    })
  })
  it('passes the current editorial validator without declaring human review', () => {
    const result = JSON.parse(
      execFileSync(
        process.execPath,
        [
          'scripts/validate-question-bank.mjs',
          'content/releases/matematica-original-002.jsonl',
        ],
        { encoding: 'utf8' },
      ),
    )
    expect(result).toMatchObject({ accepted: 100, invalid: 0, published: 0 })
  })
  it('is generated deterministically and contains explicit review flags', () => {
    const filename = 'content/releases/matematica-original-002.jsonl'
    const before = readFileSync(filename, 'utf8')
    execFileSync('python3', [
      'scripts/content/generate_math_release_002.py',
      '--check',
    ])
    expect(readFileSync(filename, 'utf8')).toBe(before)
    for (const line of before.trim().split('\n'))
      expect(JSON.parse(line).difficultyReviewed).toBe(false)
  })
})
