// 更新通道：stable 为正式发布通道；nightly 为 CI 每日构建通道（独立包名与更新清单）。
// 构建时通过 VITE_UPDATE_CHANNEL=nightly 注入，未注入时一律视为 stable。
export type UpdateChannel = 'stable' | 'nightly'

export const UPDATE_CHANNEL: UpdateChannel =
  import.meta.env.VITE_UPDATE_CHANNEL === 'nightly' ? 'nightly' : 'stable'

export const IS_NIGHTLY_CHANNEL = UPDATE_CHANNEL === 'nightly'
