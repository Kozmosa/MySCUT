export type UpdateLinkProviderId = 'github' | 'fastgit' | 'jsdelivr' | 'unpkg' | 'raw'

export type UpdateLinkProvider = {
  id: UpdateLinkProviderId
  name: string
  enabled: boolean
  buildUrl: (url: string) => string
}

const GITHUB_RAW_PREFIX = 'https://raw.githubusercontent.com/'

function tryBuildJsdelivrGhUrl(url: string) {
  if (!url.startsWith(GITHUB_RAW_PREFIX)) {
    return null
  }

  const rest = url.slice(GITHUB_RAW_PREFIX.length)
  const segments = rest.split('/').filter((segment) => segment.length > 0)
  if (segments.length < 6) {
    return null
  }

  const owner = segments[0]
  const repo = segments[1]
  const refsToken = segments[2]
  const headsToken = segments[3]
  const branch = segments[4]
  const filePath = segments.slice(5).join('/')

  if (refsToken !== 'refs' || headsToken !== 'heads' || !filePath) {
    return null
  }

  return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${filePath}`
}

const UPDATE_LINK_PROVIDERS: Record<UpdateLinkProviderId, UpdateLinkProvider> = {
  github: {
    id: 'github',
    name: 'GitHub',
    enabled: true,
    buildUrl: (url) => url,
  },
  fastgit: {
    id: 'fastgit',
    name: 'FastGit',
    enabled: true,
    buildUrl: (url) => `https://fastgit.cc/${url}`,
  },
  jsdelivr: {
    id: 'jsdelivr',
    name: 'jsDelivr',
    enabled: false,
    buildUrl: (url) => tryBuildJsdelivrGhUrl(url) ?? url,
  },
  unpkg: {
    id: 'unpkg',
    name: 'unpkg',
    enabled: false,
    buildUrl: (url) => url,
  },
  raw: {
    id: 'raw',
    name: 'Raw',
    enabled: true,
    buildUrl: (url) => url,
  },
}

export const DEFAULT_UPDATE_PROVIDER_ORDER: UpdateLinkProviderId[] = ['fastgit', 'jsdelivr', 'unpkg', 'github']

export function getUpdateLinkProvider(providerId: UpdateLinkProviderId) {
  return UPDATE_LINK_PROVIDERS[providerId]
}

export function buildProviderUrl(providerId: UpdateLinkProviderId, sourceUrl: string) {
  return getUpdateLinkProvider(providerId).buildUrl(sourceUrl)
}
