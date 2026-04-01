export function createEnvContext(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const locale = Intl.DateTimeFormat().resolvedOptions().locale

  return `
<omo-env>
  Timezone: ${timezone}
  Locale: ${locale}
</omo-env>`
}
