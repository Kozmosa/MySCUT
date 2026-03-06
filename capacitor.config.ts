import type { CapacitorConfig } from '@capacitor/cli'

const androidConfig = {
  adjustMarginsForEdgeToEdge: 'auto',
}

const config: CapacitorConfig = {
  appId: 'com.manual.univ',
  appName: '启梦华工',
  webDir: process.env.CAP_WEB_DIR || 'dist/android',
  android: androidConfig as unknown as CapacitorConfig['android'],
}

export default config
