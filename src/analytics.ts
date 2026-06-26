function gtag(...args: unknown[]) {
  const dl = (window as unknown as Record<string, unknown>).dataLayer as unknown[]
  if (dl) dl.push(args)
}

export function initAnalytics() {
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined
  console.log('[SpringGuard] GA ID:', gaId)
  console.log('[SpringGuard] Umami URL:', import.meta.env.VITE_UMAMI_URL)
  console.log('[SpringGuard] Umami ID:', import.meta.env.VITE_UMAMI_WEBSITE_ID)
  if (gaId) {
    const gtagUrl = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
    const script = document.createElement('script')
    script.async = true
    script.src = gtagUrl
    document.head.appendChild(script)

    ;(window as unknown as Record<string, unknown>).dataLayer = []
    gtag('js', new Date())
    gtag('config', gaId)
    ;(window as unknown as Record<string, unknown>).gtag = gtag
  }

  const umamiUrl = import.meta.env.VITE_UMAMI_URL as string | undefined
  const umamiId = import.meta.env.VITE_UMAMI_WEBSITE_ID as string | undefined
  if (umamiUrl && umamiId) {
    const script = document.createElement('script')
    script.async = true
    script.defer = true
    script.src = umamiUrl
    script.setAttribute('data-website-id', umamiId)
    document.head.appendChild(script)
  }
}
