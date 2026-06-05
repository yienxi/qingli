import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// 此服务器仅用于开发静态文件预览。
// API 端点由 Vercel Edge Functions (api/*.js) 提供。
// 要完整测试 API，请使用 `vercel dev` 或部署到 Vercel。

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 8000

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url.split('?')[0]
  if (filePath === './') {
    filePath = './dist/index.html'
  }

  const extname = String(path.extname(filePath)).toLowerCase()
  const contentType = MIME_TYPES[extname] || 'application/octet-stream'

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' })
        res.end('<h1>404 Not Found</h1>', 'utf-8')
      } else {
        res.writeHead(500)
        res.end(`Server Error: ${error.code}`, 'utf-8')
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content, 'utf-8')
    }
  })
})

server.listen(PORT, () => {
  console.log(`Dev server running at http://localhost:${PORT}/`)
  console.log('Serves files from dist/ directory.')
})
