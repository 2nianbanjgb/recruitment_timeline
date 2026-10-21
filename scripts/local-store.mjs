import { createServer } from 'node:http'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIST_DIR = join(ROOT, 'dist')
const DATA_DIR = resolve(process.env.RT_DATA_DIR || join(ROOT, 'data'))
const STATE_PATH = join(DATA_DIR, 'recruitment-timeline.json')
const LOG_PATH = join(DATA_DIR, 'changes.log')
const PORT = Number(process.env.RT_PORT || 5173)
const HOST = process.env.RT_HOST || '127.0.0.1'
const MAX_BODY_BYTES = 8 * 1024 * 1024

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

mkdirSync(DATA_DIR, { recursive: true })

function readState() {
  try {
    if (!existsSync(STATE_PATH)) return { revision: 0, savedAt: null, data: null }
    const parsed = JSON.parse(readFileSync(STATE_PATH, 'utf8'))
    return {
      revision: Number.isFinite(parsed.revision) ? parsed.revision : 0,
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : null,
      data: parsed.data ?? null,
    }
  } catch {
    return { revision: 0, savedAt: null, data: null, broken: true }
  }
}

function writeState(data, changes) {
  const previous = readState()
  const revision = previous.revision + 1
  const savedAt = new Date().toISOString()
  const payload = { schemaVersion: 1, revision, savedAt, data }

  const tmpPath = `${STATE_PATH}.tmp`
  writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf8')
  renameSync(tmpPath, STATE_PATH)

  appendFileSync(LOG_PATH, `${JSON.stringify({ at: savedAt, revision, changes })}\n`, 'utf8')
  return { revision, savedAt }
}

function sendJson(response, statusCode, body) {
  const payload = JSON.stringify(body)
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(payload),
  })
  response.end(payload)
}

function readBody(request) {
  return new Promise((resolvePromise, reject) => {
    const chunks = []
    let size = 0
    request.on('data', chunk => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('body too large'))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => resolvePromise(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function isSameOrigin(request) {
  const origin = request.headers.origin
  if (!origin) return true
  try {
    const parsed = new URL(origin)
    return parsed.host === request.headers.host
  } catch {
    return false
  }
}

async function handleApi(request, response, pathname) {
  if (!isSameOrigin(request)) {
    sendJson(response, 403, { error: '只接受同源请求' })
    return true
  }

  if (pathname === '/api/health' && request.method === 'GET') {
    sendJson(response, 200, { ok: true, dataDir: DATA_DIR, port: PORT })
    return true
  }

  if (pathname === '/api/state' && request.method === 'GET') {
    const state = readState()
    sendJson(response, 200, { ...state, dataDir: DATA_DIR })
    return true
  }

  if (pathname === '/api/state' && request.method === 'PUT') {
    let body
    try {
      body = JSON.parse(await readBody(request))
    } catch {
      sendJson(response, 400, { error: '请求体不是有效的 JSON' })
      return true
    }

    const data = body?.data
    const validShape =
      data &&
      typeof data === 'object' &&
      Array.isArray(data.events) &&
      Array.isArray(data.todos) &&
      data.settings &&
      typeof data.settings === 'object'
    if (!validShape) {
      sendJson(response, 400, { error: 'data 需要包含 events、todos、settings' })
      return true
    }

    const changes = Array.isArray(body.changes) ? body.changes.slice(0, 200) : []
    const result = writeState(data, changes)
    sendJson(response, 200, { ...result, dataDir: DATA_DIR })
    return true
  }

  return false
}

function sendFile(response, filePath) {
  const ext = extname(filePath).toLowerCase()
  const isHashedAsset = filePath.includes(`${sep}assets${sep}`)
  const cacheControl = isHashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache'
  try {
    const body = readFileSync(filePath)
    response.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': cacheControl,
      'content-length': body.length,
    })
    response.end(body)
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('not found')
  }
}

function serveStatic(request, response, pathname) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('method not allowed')
    return
  }

  let decoded = '/'
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    decoded = '/'
  }
  if (decoded === '/') decoded = '/index.html'

  const filePath = resolve(DIST_DIR, `.${decoded}`)
  if (!filePath.startsWith(DIST_DIR)) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('forbidden')
    return
  }

  const exists = existsSync(filePath) && statSync(filePath).isFile()
  if (exists) {
    sendFile(response, filePath)
    return
  }

  if (decoded.startsWith('/assets/')) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('not found')
    return
  }

  const index = join(DIST_DIR, 'index.html')
  if (existsSync(index)) {
    sendFile(response, index)
    return
  }

  response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
  response.end('尚未构建：先运行 npm run build')
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`)
  const pathname = url.pathname

  if (pathname.startsWith('/api/')) {
    handleApi(request, response, pathname)
      .then(handled => {
        if (!handled) sendJson(response, 404, { error: '未知接口' })
      })
      .catch(() => sendJson(response, 500, { error: '服务端错误' }))
    return
  }

  serveStatic(request, response, pathname)
})

server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用。可以换一个端口：RT_PORT=4601 npm run app`)
  } else {
    console.error(error)
  }
  process.exitCode = 1
})

server.listen(PORT, HOST, () => {
  console.log('秋招日程已启动')
  console.log(`  页面  http://${HOST}:${PORT}/`)
  console.log(`  数据  ${STATE_PATH}`)
  console.log(`  日志  ${LOG_PATH}`)
  console.log('  按 Ctrl+C 停止')
})
