// Screenshot the current page (or a clip): node cdp-shot.mjs <port> <out.png> [x y w h]
import { writeFileSync } from 'node:fs';
const [port, out, x, y, w, h] = process.argv.slice(2);
const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = list.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const mid = ++id; pending.set(mid, { res, rej }); ws.send(JSON.stringify({ id: mid, method, params }));
});
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
});
await new Promise(r => ws.addEventListener('open', r));
const params = { format: 'png', captureBeyondViewport: false };
if (x !== undefined) params.clip = { x: +x, y: +y, width: +w, height: +h, scale: 1 };
const r = await send('Page.captureScreenshot', params);
writeFileSync(out, Buffer.from(r.data, 'base64'));
console.log(out, Buffer.from(r.data, 'base64').length, 'bytes');
process.exit(0);
