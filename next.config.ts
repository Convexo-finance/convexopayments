import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  // webpack mode — Turbopack breaks with some deps
  experimental: {},
}

export default withNextIntl(nextConfig)
