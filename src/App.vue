<script setup lang="ts">
import { ModalsContainer } from 'vue-final-modal'

const configStore = useConfigStore()
useExtensionStore()
useUpdateStore()
useTimerStore()
useMonitorStore()
useActivityStore()
useExportStore()
useAnnouncementStore()

const { config } = storeToRefs(configStore)

const { theme } = useVuetifyColorMode()

useTour()

useHotkey('*', (keyboardEvent) => {
  const disableKeys = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']
  if (disableKeys.includes(keyboardEvent.key))
    return false

  return !keyboardEvent.ctrlKey
})

useDandanplay()
</script>

<template>
  <v-locale-provider :locale="config.locale">
    <v-theme-provider with-background :theme="theme">
      <layout />
      <ModalsContainer />
      <notification-container />
    </v-theme-provider>
  </v-locale-provider>
</template>
