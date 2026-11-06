export function createExamTimer(
  onTick: (remainingSeconds: number) => void,
  onComplete: () => void,
) {
  let interval: ReturnType<typeof setInterval> | null = null
  let remainingSeconds = 0

  function stop() {
    if (interval !== null) {
      clearInterval(interval)
      interval = null
    }
  }

  function start(seconds: number) {
    stop()
    remainingSeconds = Math.max(0, Math.floor(seconds))
    onTick(remainingSeconds)

    if (remainingSeconds === 0) {
      onComplete()
      return
    }

    interval = setInterval(() => {
      remainingSeconds -= 1
      onTick(remainingSeconds)

      if (remainingSeconds === 0) {
        stop()
        onComplete()
      }
    }, 1000)
  }

  return { start, stop }
}