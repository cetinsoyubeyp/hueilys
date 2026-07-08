import { defineEventHandler } from 'h3'

/**
 * server/middleware/headers-patch.ts
 *
 * Patches server request & response objects to bridge Web API standards with Node.js dev server.
 * Fixes request-side headers.get errors and response-side headers.getSetCookie / headers.set errors
 * commonly caused by h3 v2/edge features running on Node.js.
 */
export default defineEventHandler((event) => {
  // ─── 1. Patch event.url for getQuery relative path issues ───────────────────
  if (!event.url && event.node?.req?.url) {
    const protocol = event.node.req.headers['x-forwarded-proto'] || 'http'
    const host = event.node.req.headers['host'] || 'localhost'
    try {
      (event as any).url = new URL(event.node.req.url, `${protocol}://${host}`)
    } catch (e) {
      console.error('[Headers Patch] Failed to construct event.url:', e)
    }
  }

  // ─── 2. Patch Request Headers (get() method) ────────────────────────────────
  const patchReqHeaders = (headers: any) => {
    if (headers && typeof headers.get !== 'function') {
      Object.defineProperty(headers, 'get', {
        value: function (name: string) {
          return this[name.toLowerCase()];
        },
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
  }
  patchReqHeaders(event.node?.req?.headers)
  patchReqHeaders(event.req?.headers)

  // ─── 3. Patch Response Headers (getSetCookie / set / append / delete) ───────
  const mockResponseHeaders = (res: any) => {
    if (res && !res.headers) {
      const mockHeaders = {
        get: (name: string) => {
          return res.getHeader ? res.getHeader(name) : undefined
        },
        set: (name: string, value: any) => {
          if (res.setHeader) res.setHeader(name, value)
        },
        append: (name: string, value: any) => {
          if (!res.getHeader || !res.setHeader) return
          let current = res.getHeader(name)
          if (!current) {
            res.setHeader(name, [value])
          } else {
            if (!Array.isArray(current)) current = [current]
            current.push(value)
            res.setHeader(name, current)
          }
        },
        delete: (name: string) => {
          if (res.removeHeader) res.removeHeader(name)
        },
        getSetCookie: () => {
          if (!res.getHeader) return []
          const val = res.getHeader('set-cookie')
          if (!val) return []
          return Array.isArray(val) ? val : [val]
        }
      }

      Object.defineProperty(res, 'headers', {
        value: mockHeaders,
        writable: true,
        configurable: true,
        enumerable: false
      })
    }
  }

  mockResponseHeaders(event.node?.res)
  mockResponseHeaders(event.res)
})
