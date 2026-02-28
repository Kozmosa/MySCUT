export type UpdateLinkProviderId = 'github' | 'fastgit'

export type UpdateLinkProvider = {
  id: UpdateLinkProviderId
  name: string
  buildUrl: (url: string) => string
}

const UPDATE_LINK_PROVIDERS: Record<UpdateLinkProviderId, UpdateLinkProvider> = {
  github: {
    id: 'github',
    name: 'GitHub',
    buildUrl: (url) => url,
  },
  fastgit: {
    id: 'fastgit',
    name: 'FastGit',
    buildUrl: (url) => `https://fastgit.cc/${url}`,
  },
}

export const DEFAULT_UPDATE_PROVIDER_ORDER: UpdateLinkProviderId[] = ['fastgit', 'github']

export function getUpdateLinkProvider(providerId: UpdateLinkProviderId) {
  return UPDATE_LINK_PROVIDERS[providerId]
}

export function buildProviderUrl(providerId: UpdateLinkProviderId, sourceUrl: string) {
  return getUpdateLinkProvider(providerId).buildUrl(sourceUrl)
}
