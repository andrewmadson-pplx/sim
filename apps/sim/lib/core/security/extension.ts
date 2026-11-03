import { getEnv } from '@/lib/core/config/env'
import { isHosted } from '@/lib/core/config/env-flags'
import { SIM_NEW_TAB_ID } from '@/lib/navigation/browser-extension'

/** Exact deployment-owned extension origins; malformed configuration fails closed. */
function configuredExtensionIds(): string[] {
  const configured = getEnv('BROWSER_EXTENSION_IDS')
  if (!configured || configured.length > 1_024) return []
  const ids = configured.split(',').map((id) => id.trim())
  if (ids.length > 16 || ids.some((id) => !/^[a-p]{32}$/.test(id))) return []
  return [...new Set(ids)]
}

export function getBrowserExtensionOrigins(): string[] {
  return configuredExtensionIds()
    .filter((id) => id !== SIM_NEW_TAB_ID)
    .map((id) => `chrome-extension://${id}`)
}

/** The separately installed Home companion can frame only its own Sim Cloud surface. */
export function getNewTabOrigins(): string[] {
  return isHosted || configuredExtensionIds().includes(SIM_NEW_TAB_ID)
    ? [`chrome-extension://${SIM_NEW_TAB_ID}`]
    : []
}
