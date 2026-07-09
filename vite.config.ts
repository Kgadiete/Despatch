import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

type DocType = 'IBT' | 'DIBT' | 'INV'

interface LookupRequestBody {
  type?: string
  value?: string
  inv?: string
  dibt?: string
  amsInv?: string
}

function resolveProbePath() {
  const envPath = process.env.DESPATCH_PROBE_PATH
  const candidates = [
    envPath,
    '/home/kiddow/Desktop/Development/DespatchApp/tools/cognito_ibt_probe.sh',
  ].filter(Boolean) as string[]

  return candidates.find((p) => existsSync(p)) || null
}

function extractRawGraphQl(stdout: string): unknown | null {
  const marker = 'Raw response:'
  const markerIndex = stdout.indexOf(marker)
  if (markerIndex === -1) return null

  const after = stdout.slice(markerIndex + marker.length)
  const firstBrace = after.indexOf('{')
  if (firstBrace === -1) return null

  let depth = 0
  let endIndex = -1
  for (let i = firstBrace; i < after.length; i += 1) {
    const ch = after[i]
    if (ch === '{') depth += 1
    if (ch === '}') depth -= 1
    if (depth === 0) {
      endIndex = i
      break
    }
  }

  if (endIndex === -1) return null

  try {
    return JSON.parse(after.slice(firstBrace, endIndex + 1).trim())
  } catch {
    return null
  }
}

function parseBody(req: import('node:http').IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function json(res: import('node:http').ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload)
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(body)
}

const documentLookupDevApi = {
  name: 'document-lookup-dev-api',
  configureServer(server: import('vite').ViteDevServer) {
    server.middlewares.use('/api/document-lookup', async (req, res, next) => {
      if (req.method !== 'POST') {
        return next()
      }

      const probePath = resolveProbePath()
      if (!probePath) {
        return json(res, 500, {
          error:
            'Probe script not found. Set DESPATCH_PROBE_PATH to your cognito_ibt_probe.sh absolute path.',
        })
      }

      let body: LookupRequestBody
      try {
        body = (await parseBody(req)) as LookupRequestBody
      } catch {
        return json(res, 400, { error: 'Invalid JSON payload.' })
      }

      const type = String(body?.type || '').toUpperCase().trim() as DocType
      const value = String(body?.value || '').trim()
      if (!['IBT', 'DIBT', 'INV'].includes(type) || !value) {
        return json(res, 400, { error: 'Provide valid type (IBT/DIBT/INV) and value.' })
      }

      let ibt = ''
      let inv = String(body?.inv || '').trim()
      let dibt = String(body?.dibt || '').trim()
      const amsInv = String(body?.amsInv || '').trim()

      if (type === 'IBT') ibt = value
      if (type === 'DIBT') dibt = value
      if (type === 'INV') inv = value

      const args = ['--ibt', ibt, '--inv', inv, '--dibt', dibt, '--ams-inv', amsInv]

      const cwd = path.dirname(path.dirname(probePath))
      const child = spawn(probePath, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString()
      })
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString()
      })

      const timer = setTimeout(() => {
        child.kill('SIGKILL')
      }, 120000)

      child.on('error', (err) => {
        clearTimeout(timer)
        json(res, 500, { error: String(err) })
      })

      child.on('close', (code) => {
        clearTimeout(timer)
        json(res, 200, {
          command: [probePath, ...args],
          returncode: code ?? 1,
          stdout,
          stderr,
          graphql: extractRawGraphQl(stdout),
          request: { type, value },
        })
      })
    })
  },
}

// https://vite.dev/config/
export default defineConfig({
  base: '/Despatch/',
  plugins: [
    react(),
    documentLookupDevApi,
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      manifest: {
        name: 'Despatch Diary',
        short_name: 'Diary',
        description: 'Lightweight operational incident diary for despatch workers',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/Despatch/',
        start_url: '/Despatch/',
        icons: [
          {
            src: '/Despatch/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
        categories: ['productivity'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
