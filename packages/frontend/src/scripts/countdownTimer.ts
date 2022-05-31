import { Timestamp } from '@explorer/types'

const formatTimeUntil = (timestamp: Timestamp) => {
  const timeUntil = Number(timestamp) - Date.now()

  const days = Math.floor(timeUntil / (1000 * 3600 * 24))
  const hours = Math.floor((timeUntil % (1000 * 3600 * 24)) / (1000 * 3600))
  const minutes = Math.floor((timeUntil % (1000 * 3600)) / (1000 * 60))
  const seconds = Math.floor((timeUntil % (1000 * 60)) / 1000)

  const result = []

  if (days) {
    result.push(`${days}d`)
  }

  if (hours) {
    result.push(`${hours}h`)
  }
  if (minutes) {
    result.push(`${minutes}m`)
  }
  if (seconds) {
    result.push(`${seconds}s`)
  }

  return result.join(' ')
}

export function initCountdownTimer() {
  const timers = document.querySelectorAll<HTMLElement>('[data-timestamp]')

  timers.forEach((timer) => {
    const timestamp = Timestamp(Number(timer.dataset.timestamp))

    timer.innerHTML = formatTimeUntil(timestamp)
    setInterval(() => {
      timer.innerHTML = formatTimeUntil(timestamp)
    }, 1000)
  })
}
