#!/usr/bin/env node
/**
 * mockScutJw.mjs — Mock SCUT JW server for in-app browser testing.
 *
 * Usage:
 *   node scripts/mockScutJw.mjs
 *
 * Binds to 0.0.0.0:8080 so Android devices on the same LAN can connect.
 * All requests are logged to stdout with ISO timestamps.
 */

import http from 'node:http'
import os from 'node:os'
import { Buffer } from 'node:buffer'

// ── Log buffer ────────────────────────────────────────────────────────
const requestLog = []
const MAX_LOG = 500

function log(method, url, status, note = '') {
  const entry = {
    ts: new Date().toISOString(),
    method,
    url,
    status,
    note,
  }
  requestLog.push(entry)
  if (requestLog.length > MAX_LOG) requestLog.shift()
  const ts = entry.ts.slice(11, 23)
  console.log(`${ts} ${method.padEnd(6)} ${status} ${url}${note ? '  ← ' + note : ''}`)
}

// ── HTML templates ────────────────────────────────────────────────────

const LANDING_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>华南理工大学教务系统 · Mock</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 0 16px; line-height: 1.6; }
h1 { color: #1a3c6e; border-bottom: 2px solid #1a3c6e; padding-bottom: 8px; }
.card { background: #f5f7fa; border-radius: 8px; padding: 16px; margin: 16px 0; }
a { display: inline-block; margin: 8px 0; color: #1a3c6e; }
.info { color: #666; font-size: 14px; }
hr { margin: 24px 0; }
</style>
</head>
<body>
<h1>📚 华南理工大学教务系统 · Mock</h1>
<div class="card">
  <p>这是华工教务系统的模拟服务器，用于测试课表导入流程。</p>
  <p><strong>步骤：</strong></p>
  <ol>
    <li>点击下方链接进入「个人课表查询」页面</li>
    <li>在课表页面确认课程数据正确</li>
    <li>返回 MySCUT App，点击「开始导入」</li>
  </ol>
  <p><a href="/xkjs.aspx">➡ 进入个人课表查询</a></p>
</div>
<div class="card">
  <p class="info">Mock Server 运行中 · 端口 8080</p>
  <p class="info">所有请求已记录到服务端日志</p>
</div>
<hr>
<div id="reqlog" style="font-size:12px;color:#999;">
  <p>最近请求：</p>
  <pre id="logcontent" style="white-space:pre-wrap;word-break:break-all;"></pre>
</div>
<script>
fetch('/api/log').then(r=>r.json()).then(logs => {
  document.getElementById('logcontent').textContent =
    logs.slice(-10).map(e => e.ts.slice(11,23) + ' ' + e.method + ' ' + e.url + ' ' + e.status).join('\\n');
});
</script>
</body>
</html>`

// ── Reuse the schedule table HTML from the test fixture ───────────────
// This is the table#kbgrid_table_0 from scutSchedule.html, wrapped in
// a minimal page that the parseScutScheduleHtml parser can process.

const SCHEDULE_HTML_BODY = `<div class="tab-content" id="ylkbTable">
<div class="tab-pane fade active in" id="table1">
<table id="kbgrid_table_0" class="table table-hover table-bordered text-center timetable1" style="width:98%;margin-left:10px">
<tbody>
<tr>
<td colspan="9">
<div class="timetable_title">
<h6 class="pull-left">2025-2026学年第2学期</h6>测试同学的课表
<h6 class="pull-right">　学号：TEST-STUDENT-LEGACY</h6>
</div>
<div>
<span class="pull-left"> -其他 -集中实践 -实习 -实验 -理论</span>
<span class="pull-right"><font color="red" size="3"><b>注：</b></font><font color="red" size="3"><i>红色斜体为待筛选</i></font>，<font color="blue" size="3">蓝色为已选上</font></span>
</div>
</td>
</tr>

<tr>
<td width="7.5%"><span class="time">时间段</span></td>
<td width="5%"><span class="time">节次</span></td>
<td width="12.5%"><span class="time">星期一</span></td>
<td width="12.5%"><span class="time">星期二</span></td>
<td width="12.5%"><span class="time">星期三</span></td>
<td width="12.5%"><span class="time">星期四</span></td>
<td width="12.5%"><span class="time">星期五</span></td>
<td width="12.5%"><span class="time">星期六</span></td>
<td width="12.5%"><span class="time">星期日</span></td>
</tr>

<tr>
<td rowspan="4"><span class="time">上午</span></td>
<td><span class="festival">1</span></td>
<td rowspan="1" id="1-1" class="td_wrap"></td>
<td rowspan="1" id="2-1" class="td_wrap"></td>
<td rowspan="1" id="3-1" class="td_wrap"></td>
<td rowspan="2" id="4-1" class="td_wrap">
<div class="timetable_con text-left">
<span class="title"><font color="blue">工科数学分析(二) </font></span>
<p><span data-toggle="tooltip" data-placement="top" title="节/周"><font color="blue"><span class="glyphicon glyphicon-time"></span></font></span><font color="blue"> (1-2节)1-16周</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="上课地点"><font color="blue"><span class="glyphicon glyphicon-map-marker"></span></font></span><font color="blue"> 测试校区  A0101</font></p>
<font color="blue"> </font>
<p><span data-toggle="tooltip" data-placement="top" title="教师 "><font color="blue"><span class="glyphicon glyphicon-user"></span></font></span><font color="blue"> 张老师</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="教学班名称"><font color="blue"><span class="glyphicon glyphicon-home"></span></font></span><font color="blue"> (2025-2026-2)-040100641-07</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="考核方式"><font color="blue"><span class="glyphicon glyphicon-tower"></span></font></span><font color="blue"> 考试</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="学分"><font color="blue"><span class="glyphicon glyphicon-tower"></span></font></span><font color="blue"> 7.0</font></p>
</div>
</td>
<td rowspan="1" id="5-1" class="td_wrap"></td>
<td rowspan="1" id="6-1" class="td_wrap"></td>
<td rowspan="1" id="7-1" class="td_wrap"></td>
</tr>

<tr>
<td><span class="festival">2</span></td>
<td rowspan="1" id="1-2" class="td_wrap"></td>
<td rowspan="1" id="2-2" class="td_wrap"></td>
<td rowspan="1" id="3-2" class="td_wrap"></td>
<td rowspan="1" id="5-2" class="td_wrap"></td>
<td rowspan="1" id="6-2" class="td_wrap"></td>
<td rowspan="1" id="7-2" class="td_wrap"></td>
</tr>

<tr>
<td><span class="festival">3</span></td>
<td rowspan="2" id="1-3" class="td_wrap">
<div class="timetable_con text-left">
<span class="title"><font color="blue">工科数学分析(二) </font></span>
<p><span data-toggle="tooltip" data-placement="top" title="节/周"><font color="blue"><span class="glyphicon glyphicon-time"></span></font></span><font color="blue"> (3-4节)1-8周</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="上课地点"><font color="blue"><span class="glyphicon glyphicon-map-marker"></span></font></span><font color="blue"> 测试校区  A0101</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="教师 "><font color="blue"><span class="glyphicon glyphicon-user"></span></font></span><font color="blue"> 张老师</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="学分"><font color="blue"><span class="glyphicon glyphicon-tower"></span></font></span><font color="blue"> 7.0</font></p>
</div>
</td>
<td rowspan="2" id="2-3" class="td_wrap">
<div class="timetable_con text-left">
<span class="title"><font color="blue">工科数学分析(二) </font></span>
<p><span data-toggle="tooltip" data-placement="top" title="节/周"><font color="blue"><span class="glyphicon glyphicon-time"></span></font></span><font color="blue"> (3-4节)1-16周</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="上课地点"><font color="blue"><span class="glyphicon glyphicon-map-marker"></span></font></span><font color="blue"> 测试校区  A0101</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="教师 "><font color="blue"><span class="glyphicon glyphicon-user"></span></font></span><font color="blue"> 张老师</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="学分"><font color="blue"><span class="glyphicon glyphicon-tower"></span></font></span><font color="blue"> 7.0</font></p>
</div>
</td>
<td rowspan="2" id="3-3" class="td_wrap">
<div class="timetable_con text-left">
<span class="title"><font color="blue">工科数学分析(二) </font></span>
<p><span data-toggle="tooltip" data-placement="top" title="节/周"><font color="blue"><span class="glyphicon glyphicon-time"></span></font></span><font color="blue"> (3-4节)1-16周</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="上课地点"><font color="blue"><span class="glyphicon glyphicon-map-marker"></span></font></span><font color="blue"> 测试校区  A0101</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="教师 "><font color="blue"><span class="glyphicon glyphicon-user"></span></font></span><font color="blue"> 张老师</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="学分"><font color="blue"><span class="glyphicon glyphicon-tower"></span></font></span><font color="blue"> 7.0</font></p>
</div>
</td>
<td rowspan="1" id="4-3" class="td_wrap"></td>
<td rowspan="1" id="5-3" class="td_wrap"></td>
<td rowspan="1" id="6-3" class="td_wrap"></td>
<td rowspan="1" id="7-3" class="td_wrap"></td>
</tr>

<tr>
<td><span class="festival">4</span></td>
<td rowspan="1" id="4-4" class="td_wrap"></td>
<td rowspan="1" id="5-4" class="td_wrap"></td>
<td rowspan="1" id="6-4" class="td_wrap"></td>
<td rowspan="1" id="7-4" class="td_wrap"></td>
</tr>

<tr>
<td rowspan="4"><span class="time">下午</span></td>
<td><span class="festival">5</span></td>
<td rowspan="1" id="1-5" class="td_wrap"></td>
<td rowspan="3" id="2-5" class="td_wrap">
<div class="timetable_con text-left">
<span class="title"><font color="blue">高级语言程序设计(C++)(下) </font></span>
<p><span data-toggle="tooltip" data-placement="top" title="节/周"><font color="blue"><span class="glyphicon glyphicon-time"></span></font></span><font color="blue"> (5-7节)1-10周</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="上课地点"><font color="blue"><span class="glyphicon glyphicon-map-marker"></span></font></span><font color="blue"> 测试校区  A0103</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="教师 "><font color="blue"><span class="glyphicon glyphicon-user"></span></font></span><font color="blue"> 李老师</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="学分"><font color="blue"><span class="glyphicon glyphicon-tower"></span></font></span><font color="blue"> 2.0</font></p>
</div>
</td>
<td rowspan="1" id="3-5" class="td_wrap"></td>
<td rowspan="1" id="4-5" class="td_wrap"></td>
<td rowspan="4" id="5-5" class="td_wrap">
<div class="timetable_con text-left">
<span class="title"><font color="blue">数字逻辑 </font></span>
<p><span data-toggle="tooltip" data-placement="top" title="节/周"><font color="blue"><span class="glyphicon glyphicon-time"></span></font></span><font color="blue"> (5-7节)2-13周</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="上课地点"><font color="blue"><span class="glyphicon glyphicon-map-marker"></span></font></span><font color="blue"> 测试校区  A0103</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="教师 "><font color="blue"><span class="glyphicon glyphicon-user"></span></font></span><font color="blue"> 王老师</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="学分"><font color="blue"><span class="glyphicon glyphicon-tower"></span></font></span><font color="blue"> 3.0</font></p>
</div>
<div class="timetable_con text-left">
<span class="title"><font color="blue">数字逻辑 </font></span>
<p><span data-toggle="tooltip" data-placement="top" title="节/周"><font color="blue"><span class="glyphicon glyphicon-time"></span></font></span><font color="blue"> (5-8节)1周</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="上课地点"><font color="blue"><span class="glyphicon glyphicon-map-marker"></span></font></span><font color="blue"> 测试校区  A0103</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="教师 "><font color="blue"><span class="glyphicon glyphicon-user"></span></font></span><font color="blue"> 王老师</font></p>
<p><span data-toggle="tooltip" data-placement="top" title="学分"><font color="blue"><span class="glyphicon glyphicon-tower"></span></font></span><font color="blue"> 3.0</font></p>
</div>
</td>
<td rowspan="1" id="6-5" class="td_wrap"></td>
<td rowspan="1" id="7-5" class="td_wrap"></td>
</tr>

<tr><td><span class="festival">6</span></td><td rowspan="1" id="1-6" class="td_wrap"></td><td rowspan="1" id="3-6" class="td_wrap"></td><td rowspan="1" id="4-6" class="td_wrap"></td><td rowspan="1" id="6-6" class="td_wrap"></td><td rowspan="1" id="7-6" class="td_wrap"></td></tr>
<tr><td><span class="festival">7</span></td><td rowspan="1" id="1-7" class="td_wrap"></td><td rowspan="1" id="3-7" class="td_wrap"></td><td rowspan="1" id="4-7" class="td_wrap"></td><td rowspan="1" id="6-7" class="td_wrap"></td><td rowspan="1" id="7-7" class="td_wrap"></td></tr>
<tr><td><span class="festival">8</span></td><td rowspan="1" id="1-8" class="td_wrap"></td><td rowspan="1" id="2-8" class="td_wrap"></td><td rowspan="1" id="3-8" class="td_wrap"></td><td rowspan="1" id="4-8" class="td_wrap"></td><td rowspan="1" id="6-8" class="td_wrap"></td><td rowspan="1" id="7-8" class="td_wrap"></td></tr>

<tr>
<td rowspan="4"><span class="time">晚上</span></td>
<td><span class="festival">9</span></td>
<td rowspan="1" id="1-9" class="td_wrap"></td><td rowspan="1" id="2-9" class="td_wrap"></td><td rowspan="1" id="3-9" class="td_wrap"></td><td rowspan="1" id="4-9" class="td_wrap"></td><td rowspan="1" id="5-9" class="td_wrap"></td><td rowspan="1" id="6-9" class="td_wrap"></td><td rowspan="1" id="7-9" class="td_wrap"></td>
</tr>
<tr><td><span class="festival">10</span></td><td rowspan="1" id="1-10" class="td_wrap"></td><td rowspan="1" id="2-10" class="td_wrap"></td><td rowspan="1" id="3-10" class="td_wrap"></td><td rowspan="1" id="4-10" class="td_wrap"></td><td rowspan="1" id="5-10" class="td_wrap"></td><td rowspan="1" id="6-10" class="td_wrap"></td><td rowspan="1" id="7-10" class="td_wrap"></td></tr>
<tr><td><span class="festival">11</span></td><td rowspan="1" id="1-11" class="td_wrap"></td><td rowspan="1" id="2-11" class="td_wrap"></td><td rowspan="1" id="3-11" class="td_wrap"></td><td rowspan="1" id="4-11" class="td_wrap"></td><td rowspan="1" id="5-11" class="td_wrap"></td><td rowspan="1" id="6-11" class="td_wrap"></td><td rowspan="1" id="7-11" class="td_wrap"></td></tr>
<tr><td><span class="festival">12</span></td><td rowspan="1" id="1-12" class="td_wrap"></td><td rowspan="1" id="2-12" class="td_wrap"></td><td rowspan="1" id="3-12" class="td_wrap"></td><td rowspan="1" id="4-12" class="td_wrap"></td><td rowspan="1" id="5-12" class="td_wrap"></td><td rowspan="1" id="6-12" class="td_wrap"></td><td rowspan="1" id="7-12" class="td_wrap"></td></tr>

<tr>
<td colspan="9" style="text-align:left;">
<div class="timetable_title">
<span class="red" style="font: normal 18px/25px microsoft YaHei;">其它课程：</span>
<span style="font: 18px/25px SimSun;">数字逻辑 王老师(共4周)/8-11周/无;</span><br>
</div>
</td>
</tr>
</tbody>
</table>
</div>
</div>`

const SCHEDULE_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>个人课表查询 · 华南理工大学</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body { font-family: sans-serif; margin: 0; padding: 16px; background: #f0f2f5; }
h2 { color: #1a3c6e; }
.info-bar { background: #e8f0fe; border-radius: 6px; padding: 8px 12px; margin: 12px 0; font-size: 14px; }
table { background: #fff; border-collapse: collapse; width: 100%; font-size: 13px; }
td, th { border: 1px solid #d0d5dd; padding: 6px; text-align: center; }
.timetable_title { font-size: 16px; font-weight: bold; padding: 8px; }
.glyphicon { display: inline-block; width: 16px; }
.festival { font-weight: bold; }
.time { font-weight: bold; color: #555; }
.td_wrap { vertical-align: top; text-align: left; }
.timetable_con { font-size: 12px; line-height: 1.5; padding: 4px; }
.title { font-weight: bold; font-size: 14px; }
</style>
</head>
<body>
<h2>📋 个人课表查询</h2>
<div class="info-bar">
  <strong>当前用户：</strong> 测试同学 ｜
  <strong>学年学期：</strong> 2025-2026学年第2学期 ｜
  <strong>Cookie 已注入</strong>
</div>
<p style="font-size:14px;color:#666;">
  ✅ 此页面已包含完整课表数据，返回 App 点击「开始导入」即可抓取。
</p>
<hr>
${SCHEDULE_HTML_BODY}
<hr>
<p style="font-size:12px;color:#999;text-align:center;">
  模拟服务器 · 非真实教务系统数据
</p>
</body>
</html>`

// ── HTTP server ───────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  const method = req.method
  const url = req.url

  // CORS headers (for CapacitorHttp calls from the app)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // ── API: get log ──────────────────────────────────────────────────
  if (url === '/api/log') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(requestLog))
    log(method, url, 200)
    return
  }

  // ── Schedule page (matches what CapacitorHttp will fetch) ─────────
  if (url === '/xkjs.aspx' || url === '/xkjs.asp' || url === '/schedule') {
    // Set a mock cookie so the app's cookie read succeeds
    res.setHeader('Set-Cookie', 'ASP.NET_SessionId=mock-test-session; path=/; httponly')
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(SCHEDULE_PAGE)
    const cookie = req.headers['cookie'] || '(none)'
    log(method, url, 200, `cookie: ${cookie}`)
    return
  }

  // ── Landing page ──────────────────────────────────────────────────
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': 'ASP.NET_SessionId=mock-test-session; path=/; httponly' })
    res.end(LANDING_PAGE)
    return
  }

  // ── Static assets (icon, etc.) ────────────────────────────────────
  if (url.endsWith('.ico') || url.endsWith('.png') || url.endsWith('.svg')) {
    res.writeHead(404)
    res.end()
    log(method, url, 404)
    return
  }

  // ── All other paths ───────────────────────────────────────────────
  res.writeHead(302, { Location: '/' })
  res.end()
  log(method, url, 302, `→ /`)
})

// ── Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080
server.listen(PORT, '0.0.0.0', () => {
  // Find LAN IP to print
  const ifaces = os.networkInterfaces()
  let lanIp = '127.0.0.1'
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        lanIp = iface.address
        break
      }
    }
    if (lanIp !== '127.0.0.1') break
  }

  console.log('='.repeat(56))
  console.log('  Mock SCUT JW Server')
  console.log('='.repeat(56))
  console.log()
  console.log(`  Local:    http://127.0.0.1:${PORT}`)
  console.log(`  LAN:      http://${lanIp}:${PORT}`)
  console.log(`  Schedule: http://${lanIp}:${PORT}/xkjs.aspx`)
  console.log()
  console.log(`  Log API:  http://127.0.0.1:${PORT}/api/log`)
  console.log()
  console.log('  Press Ctrl+C to stop')
  console.log('='.repeat(56))
  console.log()
})
