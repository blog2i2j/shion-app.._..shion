export const useTime = defineStore('time', () => {
  const running = ref(false)
  const spend = ref(0)
  const time = computed(() => formatTime(spend.value))
  let startTime = 0
  let endTime = 0
  let currentTime = 0
  let frame: number
  let _update: Function | null

  function start(update: Function) {
    _update = update
    running.value = true
    currentTime = endTime = startTime = Date.now()
    count()
  }

  function count() {
    frame = requestAnimationFrame(() => {
      endTime = Date.now()
      if (endTime - currentTime > 1000 * 6) {
        currentTime = endTime
        _update!()
      }

      spend.value = endTime - startTime
      count()
    })
  }

  function finish() {
    running.value = false
    cancelAnimationFrame(frame)
    _update!()
    reset()
  }

  function reset() {
    startTime = endTime = currentTime = 0
    spend.value = 0
    _update = null
  }

  function complement(num: number) {
    return num < 10 ? `0${num}` : num
  }

  function formatTime(time: number) {
    const { milli, second, minute, hour } = extractTime(time)
    const _milli = complement(~~(milli / 10))
    const _second = complement(second)
    const _minute = complement(minute)
    const result = `${_minute}:${_second}.${_milli}`
    return hour ? `${complement(hour)}:${result}` : result
  }

  return {
    running,
    time,
    start,
    finish,
  }
})
