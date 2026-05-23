import type { CapacitorConfig } from '@capacitor/cli'

// The native apps are thin wrappers — they load the deployed web bundle from
// pathofpraxis.com so there's a single source of truth and updates ship as
// soon as the web deploy completes. `webDir` is still required by `cap sync`
// but is not used at runtime when `server.url` is set.
const config: CapacitorConfig = {
  appId:   'com.pathofpraxis.game',
  appName: 'Path of Praxis',
  webDir:  'dist',
  server: {
    url:       'https://pathofpraxis.com',
    cleartext: false,
  },
  plugins: {
    AdMob: {},
  },
}

export default config
