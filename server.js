import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Solar, Lunar } from 'lunar-typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 8000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function getYiJi(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const solar = Solar.fromYmd(y, m, d);
  const lunar = solar.getLunar();
  return {
    yi: lunar.getDayYi(),
    ji: lunar.getDayJi(),
    lunarMonth: lunar.getMonthInChinese(),
    lunarDay: lunar.getDayInChinese(),
    solarTerm: getSolarTerm(y, m, d),
    festival: getLunarFestival(lunar),
  };
}

function getSolarTerm(year, month, day) {
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();
  const table = lunar.getJieQiTable();
  const dateKey = `${year}-${month}-${day}`;
  for (const [name, termSolar] of Object.entries(table)) {
    if (/[\u4e00-\u9fff]/.test(name)) {
      const termKey = `${termSolar.getYear()}-${termSolar.getMonth()}-${termSolar.getDay()}`;
      if (termKey === dateKey) {
        return name;
      }
    }
  }
  return null;
}

function getLunarFestival(lunar) {
  const month = lunar.getMonth();
  const day = lunar.getDay();
  const festivals = {
    '1/1': '春节',
    '1/15': '元宵节',
    '2/2': '龙抬头',
    '3/3': '上巳节',
    '5/5': '端午节',
    '6/6': '天贶节',
    '7/7': '七夕节',
    '7/15': '中元节',
    '8/15': '中秋节',
    '9/9': '重阳节',
    '10/1': '寒衣节',
    '10/15': '下元节',
    '12/8': '腊八节',
    '12/23': '小年',
    '12/30': '除夕',
  };
  return festivals[`${month}/${day}`] || null;
}

function buildFallbackSummary(data) {
  const yiList = data.yi.slice(0, 4).join('、');
  const jiList = data.ji.slice(0, 3).join('、');
  let summary = `宜：${yiList || '诸事不宜'}`;
  if (jiList) summary += `，忌：${jiList}`;
  if (data.festival) summary += ` | ${data.festival}`;
  if (data.solarTerm) summary += ` | ${data.solarTerm}`;
  return summary;
}

async function generateAISummary(data, apiKey) {
  if (!apiKey || apiKey.length < 10) {
    return null;
  }

  const yiList = data.yi.slice(0, 6).join('、') || '无';
  const jiList = data.ji.slice(0, 4).join('、') || '无';
  const now = new Date();
  const todayStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  let extra = '';
  if (data.festival) extra += `\n今天是${data.festival}。`;
  if (data.solarTerm) extra += `\n今天是${data.solarTerm}。`;

  const prompt = `你是一个有趣的黄历解读助手，专门给年轻人看。

今天是${todayStr}，农历${data.lunarMonth}月${data.lunarDay}。

宜：${yiList}
忌：${jiList}${extra}

请用轻松幽默、一针见血的口吻写一句话（30-50字），帮现代职场/学生快速理解今天适合做什么。不用古文，不用「宜」「忌」这些词。

只输出一句话，不要任何其他内容。`;

  try {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.8,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('DeepSeek API error:', res.status, errorText);
      return null;
    }

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content?.trim();
    if (text) {
      return text.replace(/^["']|["']$/g, '');
    }
    return null;
  } catch (e) {
    console.error('Failed to generate AI summary:', e);
    return null;
  }
}

async function handleAISummary(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const date = url.searchParams.get('date');
  const now = new Date();
  const dateStr = date || `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

  try {
    const data = getYiJi(dateStr);
    
    // 从环境变量获取 API Key
    const apiKey = process.env.DEEPSEEK_API_KEY || '';
    
    let summary = null;
    let generated = false;

    if (apiKey) {
      summary = await generateAISummary(data, apiKey);
      if (summary) {
        generated = true;
      }
    }

    if (!summary) {
      summary = buildFallbackSummary(data);
      generated = false;
    }

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({
      summary,
      generated,
      festival: data.festival,
      solarTerm: data.solarTerm,
    }));
  } catch (e) {
    console.error('Error in ai-summary API:', e);
    const data = getYiJi(dateStr);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({
      summary: buildFallbackSummary(data),
      generated: false,
      error: e.message,
    }));
  }
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // 去掉查询字符串
  const urlWithoutQuery = req.url.split('?')[0];

  // 处理API路由
  if (urlWithoutQuery === '/api/ai-summary') {
    handleAISummary(req, res);
    return;
  }

  let filePath = '.' + urlWithoutQuery;
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
