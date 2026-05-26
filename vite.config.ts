import fs from 'node:fs'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv } from 'vite'
import type { ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

type ConnectNext = (err?: unknown) => void

const devPublicJsonFallback = () => ({
  name: 'dev-public-json-fallback',
  enforce: 'pre' as const,
  configureServer(server: ViteDevServer) {
    server.middlewares.use(
      (req: IncomingMessage, res: ServerResponse, next: ConnectNext) => {
      if (req.method !== 'GET' || !req.url) {
        next()
        return
      }

      const pathname = req.url.split('?')[0]
      const pairs: Record<string, [string, string]> = {
        '/project_ids.json': ['project_ids.json', 'project_ids.json.example'],
      }

      const pair = pairs[pathname]
      if (!pair) {
        next()
        return
      }

      const publicDir = path.resolve(process.cwd(), 'public')
      const targetPath = path.join(publicDir, pair[0])
      const examplePath = path.join(publicDir, pair[1])

      if (!fs.existsSync(targetPath) && fs.existsSync(examplePath)) {
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(fs.readFileSync(examplePath))
        return
      }

      next()
    }
    )
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const workflowProxyTarget = env.VITE_WORKFLOW_API_PROXY_TARGET?.replace(/\/$/, '')

  return {
    plugins: [react(), devPublicJsonFallback()],
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    server: workflowProxyTarget
      ? {
          proxy: {
            '/workflow-api': {
              target: workflowProxyTarget,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/workflow-api/, ''),
              configure: (proxy) => {
                proxy.on('proxyReq', (_proxyReq, req) => {
                  const url = req.url ?? ''
                  console.log(
                    `[vite proxy] ${req.method} ${url} → ${workflowProxyTarget}${url.replace(/^\/workflow-api/, '')}`
                  )
                })
                proxy.on('error', (err, req) => {
                  console.error('[vite proxy] error', req.method, req.url, err.message)
                })
              },
            },
          },
        }
      : undefined,
  }
})
