#!/usr/bin/env node

import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import http from 'node:http'
import os from 'node:os'

const requestLog = []
const MAX_LOG = 500
const PORT = process.env.PORT || 8080
const scheduleFixtureUrl = new URL('../tests/fixtures/public/scutSchedule.synthetic.html', import.meta.url)
const scheduleFixture = readFileSync(scheduleFixtureUrl, 'utf8')

function log(method, url, status, note = '') {
  const entry = {
    ts: new Date().toISOString(),
    method,
    url,
    status,
    note,
  }

  requestLog.push(entry)
  if (requestLog.length > MAX_LOG) {
    requestLog.shift()
  }

  const timestamp = entry.ts.slice(11, 23)
  console.log(`${timestamp} ${method.padEnd(6)} ${status} ${url}${note ? `  ← ${note}` : ''}`)
}

const landingPage = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>SCUT JW synthetic mock</title>
  </head>
  <body>
    <main>
      <h1>教务课表合成测试服务器</h1>
      <p>该服务只提供仓库内的 TEST-* 合成课表数据。</p>
      <p><a href="/xkjs.aspx">进入个人课表查询</a></p>
      <pre id="log"></pre>
    </main>
    <script>
      fetch('/api/log')
        .then((response) => response.json())
        .then((entries) => {
          document.getElementById('log').textContent = entries
            .slice(-10)
            .map((entry) => entry.ts + ' ' + entry.method + ' ' + entry.url + ' ' + entry.status)
            .join('\\n')
        })
    </script>
  </body>
</html>`

const server = http.createServer((request, response) => {
  const method = request.method ?? 'GET'
  const url = request.url ?? '/'

  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie, Authorization')

  if (method === 'OPTIONS') {
    response.writeHead(204)
    response.end()
    return
  }

  if (url === '/api/log') {
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(requestLog))
    log(method, url, 200)
    return
  }

  if (url === '/xkjs.aspx' || url === '/xkjs.asp' || url === '/schedule') {
    response.setHeader('Set-Cookie', 'TEST_SESSION=synthetic-session; path=/; httponly')
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    response.end(scheduleFixture)
    log(method, url, 200, `cookie: ${request.headers.cookie || '(none)'}`)
    return
  }

  if (url === '/' || url === '/index.html') {
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': 'TEST_SESSION=synthetic-session; path=/; httponly',
    })
    response.end(landingPage)
    log(method, url, 200)
    return
  }

  response.writeHead(302, { Location: '/' })
  response.end(Buffer.alloc(0))
  log(method, url, 302, '→ /')
})

server.listen(PORT, '0.0.0.0', () => {
  const interfaces = os.networkInterfaces()
  let lanIp = '127.0.0.1'

  for (const interfaceItems of Object.values(interfaces)) {
    const match = interfaceItems?.find((item) => item.family === 'IPv4' && !item.internal)
    if (match) {
      lanIp = match.address
      break
    }
  }

  console.log(`Synthetic SCUT JW mock: http://${lanIp}:${PORT}/xkjs.aspx`)
})
