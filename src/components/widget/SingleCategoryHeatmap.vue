<script setup lang="ts">
import colors from 'vuetify/util/colors'
import type { EChartsOption } from 'echarts'
import Color from 'color'

import { addDays, getDay, isBefore, isSameYear } from 'date-fns'
import { type SelectActivity, type SelectNote, type SelectOverview, db } from '@/modules/database'

interface DailyStatus {
  total: number
  list: Array<{
    total: number
    name: string
    color: string
    key: string
  }>
}

const props = defineProps<{
  data: SelectOverview['data']
}>()

const configStore = useConfigStore()

const { config } = storeToRefs(configStore)

const { format, formatHHmmss } = useDateFns()
const { position, theme } = useEcharts()

const CELL_SIZE = 17

const chartRef = ref()
const noteList = ref<Array<SelectNote>>([])
const activityList = ref<Array<SelectActivity>>([])
const day = ref(30)

const { width } = useElementBounding(chartRef)

const range = computed(() => generateRange(day.value))

const dailyStatusMap = computed(() => {
  const transformNoteList = splitByDay(noteList.value, range.value).map(({ start, end, label }) => ({ start, end, color: label.color, key: `label-${label.id}`, name: label.name }))
  const transformactivityList = splitByDay(activityList.value, range.value).map(({ start, end, program }) => ({ start, end, color: program.color, key: `program-${program.id}`, name: program.name }))

  const map = new Map<string, DailyStatus>()

  for (const { start, end, key, color, name } of [...transformNoteList, ...transformactivityList]) {
    const date = format(start, 'yyyy-MM-dd')
    if (!map.get(date)) {
      map.set(date, {
        total: 0,
        list: [],
      })
    }
    const group = map.get(date)!
    const spend = end - start
    group.total += spend
    const target = group.list.find(i => i.key == key)
    if (target) {
      target.total += spend
    }
    else {
      group.list.push({
        total: spend,
        name,
        color,
        key,
      })
    }
  }

  return map
})

const calendarList = computed(() => {
  const [start, end] = range.value
  for (let time = start; isBefore(time, end); time = addDays(time, 1)) {
    const date = format(time, 'yyyy-MM-dd')
    if (!dailyStatusMap.value.get(date)) {
      dailyStatusMap.value.set(date, {
        total: 0,
        list: [],
      })
    }
  }
  return [...dailyStatusMap.value.entries()].map(([date, { total }]) => [date, total])
})
const title = computed(() => props.data.widget?.title as string)
const color = computed(() => props.data.widget?.color as string)

async function refresh() {
  noteList.value = activityList.value = []
  const { query } = props.data
  if (!query)
    return

  const { table, where } = query
  const [start, end] = range.value
  const condition = {
    ...where,
    start: start.getTime(),
    end: end.getTime(),
  } as any
  if (table == db.note.table) {
    noteList.value = await db.note.select(condition)
  }
  else if (table == db.activity.table) {
    activityList.value = await db.activity.select(condition)
  }
  else if (table == db.dimension.table) {
    noteList.value = await db.note.selectByDimension(condition)
    activityList.value = await db.activity.selectByDimension(condition)
  }
}

const buildMarker = color => `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${color};" class="shrink-0"></span>`

function generatePieces(value: string, index: number, length: number, hour: number) {
  const color = Color(value)
  const ratio = (length - index) / (length + 1)
  const colorStr = color.lightness(ratio * 100).toString()
  const isLast = index == length - 1
  if (isLast) {
    return {
      gt: calcDuration(hour, 'hour'), color: colorStr,
    }
  }
  else {
    return {
      lte: calcDuration(hour, 'hour'), color: colorStr,
    }
  }
}

const option = computed<EChartsOption>(() => {
  let partition = [0.5, 1, 3, 5, 8]
  const last = partition[partition.length - 1]
  partition = [...partition, last]
  const pieces = [
    {
      lte: calcDuration(0, 'hour'), color: colors.grey.lighten2,
    },
    ...partition.map((h, index) => generatePieces(color.value, index, partition.length, h)),
  ]
  return {
    title: {
      text: title.value,
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal',
      },
    },
    visualMap: {
      show: false,
      type: 'piecewise',
      pieces,
    },
    calendar: {
      left: 50,
      top: 24,
      range: range.value.map(date => format(date, 'yyyy-MM-dd')),
      cellSize: CELL_SIZE,
      splitLine: {
        show: false,
      },
      dayLabel: {
        nameMap: dayMap[config.value.locale] || dayMap['en-US'],
        firstDay: config.value.locale == 'zh-CN' ? 1 : 0,
      },
      monthLabel: {
        show: false,
      },
      yearLabel: {
        show: false,
      },
      itemStyle: {
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0)',
      },
    },
    tooltip: {
      borderColor: 'transparent',
      formatter(params) {
        const [time, value] = params.value
        const date = new Date(time)
        const dateText = isSameYear(new Date(), date) ? format(date, 'MM-dd') : format(date, 'yyyy-MM-dd')
        if (value == 0)
          return ''

        const key = format(date, 'yyyy-MM-dd')
        const timeDetail = dailyStatusMap.value.get(key)?.list.sort((a, b) => b.total - a.total) || []
        const timeDetailTemplate = timeDetail.map(({
          name, total, color,
        }) => `<div style="display: flex; align-items: center;">${buildMarker(color)}<span style="margin-left: 6px;" class="text-ellipsis overflow-hidden">${name}</span><div style="min-width: 40px; flex-grow: 1;"></div><span>${formatHHmmss(total)}</span></div>`).join('')

        return `<div style="margin-bottom: 6px;">
                  <span>${dateText}</span>
                  <span style="float:right;margin-left:20px;font-size:14px;color:#666;font-weight:900">${formatHHmmss(value)}</span>
                </div>
                <div>
                  ${timeDetailTemplate}
                </div>
                `
      },
      position,
      extraCssText: 'max-width:calc(60% + 80px);',
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: calendarList.value,
    },
  }
})

watch(() => props.data, refresh, {
  deep: true,
  immediate: true,
})

watchDebounced(width, async (v) => {
  const week = ~~((v - 70) / CELL_SIZE)
  day.value = week * 7 + getDay(new Date())
  await refresh()
}, {
  debounce: 300,
  immediate: true,
})
</script>

<template>
  <vue-echarts ref="chartRef" :option="option" autoresize :theme="theme" />
</template>
