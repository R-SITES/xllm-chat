// Minimal dependency-free CDP driver for verifying the xLLM Chat page.
//   node cdp-eval.mjs <cdp-port> <url-or-"-"> <js-file> [--new-target]
// Targets the first page target on <cdp-port>; with a URL it navigates there
// first and waits for load. Prints the JSON of the last Runtime.evaluate value,
// or the exception text. Node 22 (global fetch + WebSocket), no packages.
import { readFileSync } from 'node:fs';

const [port, url, jsFile] = process.argv.slice(2);
const js = readFileSync(jsFile, 'utf8');

const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
let page = list.find(t => t.type === 'page');
if (!page) throw new Error('no page target: ' + JSON.stringify(list));

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const mid = ++id;
  pending.set(mid, { res, rej });
  ws.send(JSON.stringify({ id: mid, method, params }));
});
const events = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
  } else if (m.method) events.push(m);
});
await new Promise(r => ws.addEventListener('open', r));
await send('Runtime.enable');
await send('Page.enable');
// Optional phone-shaped viewport: CDP_W=412 CDP_H=900 CDP_DPR=3
if (process.env.CDP_W) {
  await send('Emulation.setDeviceMetricsOverride', {
    width: +process.env.CDP_W, height: +(process.env.CDP_H || 900),
    deviceScaleFactor: +(process.env.CDP_DPR || 3), mobile: true,
  });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
}

if (url && url !== '-') {
  await send('Page.navigate', { url });
  // wait for Page.loadEventFired (or 15s)
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && !events.some(e => e.method === 'Page.loadEventFired')) {
    await new Promise(r => setTimeout(r, 150));
  }
  await new Promise(r => setTimeout(r, 800));   // let the app's boot script settle
}

const r = await send('Runtime.evaluate', {
  expression: js, awaitPromise: true, returnByValue: true,
  userGesture: true,
});
if (r.exceptionDetails) {
  console.error('EXCEPTION: ' + JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  process.exit(2);
}
console.log(JSON.stringify(r.result.value, null, 2));
ws.close();
process.exit(0);
