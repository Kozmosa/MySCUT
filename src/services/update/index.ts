export { checkForAppUpdate, compareVersion } from './checkForUpdate'
export type { AppUpdateCheckResult, ApkAssetDescriptor } from './checkForUpdate'
export { UPDATE_CHANNEL, IS_NIGHTLY_CHANNEL } from './channel'
export type { UpdateChannel } from './channel'
export {
  buildProviderUrl,
  DEFAULT_UPDATE_PROVIDER_ORDER,
  getUpdateLinkProvider,
} from './providers'
export type { UpdateLinkProviderId, UpdateLinkProvider } from './providers'
