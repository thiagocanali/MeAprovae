export function shuffleItems<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...items]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const currentItem = shuffled[index]!
    shuffled[index] = shuffled[swapIndex]!
    shuffled[swapIndex] = currentItem
  }

  return shuffled
}