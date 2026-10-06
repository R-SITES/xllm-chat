#!/usr/bin/env python3
"""Verify the table-scroller fix INSIDE the xLLM Chat Android app's WebView (S25+).

Reads the live WebView over CDP (adb forward tcp:9444 localabstract:webview_devtools_remote_<pid>):
 1. what page/version the app has loaded, and whether the served copy carries .tbl-wrap
 2. reloads the page if the served copy is stale
 3. renders a deliberately wide GFM table through the app's own escapeAndFormat()
    into a temp assistant bubble and measures bubble/table/wrapper geometry
No taps, no typing — the app stays where it is; the temp node is removed after.
"""
import asyncio, json, sys, time, urllib.request
import websockets

PORT = 9444


def target():
    for _ in range(15):
        try:
            pages = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PORT}/json/list").read())
        except Exception:
            time.sleep(0.5); continue
        for p in pages:
            if p.get("type") == "page":
                return p
        time.sleep(0.5)
    raise SystemExit("no webview page target")


WIDE_MD = "\n".join([
    "| # | President | Term | Nickname / Note |",
    "|---|-----------|------|-----------------|",
    "| 3 | Thomas Jefferson | 1801-1809 | Declaration of Independence |",
    "| 4 | James Madison | 1809-1817 | Father of the Constitution |",
    "| 8 | Martin Van Buren | 1837-1841 | First President born a United States citizen |",
    "| 9 | William Henry Harrison | 1841 | Died in office after 31 days |",
])

CHECK = """(() => {
  const md = %s;
  const host = document.getElementById('messages') || document.querySelector('.messages') || document.body;
  const d = document.createElement('div');
  d.className = 'msg assistant'; d.id = '__tblProbe';
  d.innerHTML = '<div class="msg-main"><div class="bubble">' + escapeAndFormat(md) + '</div></div>';
  host.appendChild(d);
  const b = d.querySelector('.bubble'), w = d.querySelector('.tbl-wrap'), t = d.querySelector('table');
  if (!t) return JSON.stringify({error: 'no table rendered', html: d.innerHTML.slice(0, 200)});
  const R = e => { const r = e.getBoundingClientRect(); return {l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width)}; };
  const scroller = w || t;
  scroller.scrollLeft = 0;
  scroller.scrollLeft = 99999;
  const maxLeft = scroller.scrollLeft;
  const res = {
    appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : null,
    page: location.href,
    viewportCss: document.documentElement.clientWidth,
    devicePixelRatio: window.devicePixelRatio,
    wrapped: !!w,
    bubble: R(b), table: R(t),
    tableRightVsBubbleRight: R(t).r - R(b).r,
    tableInsideBubble: R(t).r <= R(b).r + 1,
    tablePastViewportEdge: R(t).r - window.innerWidth,
    scrollerClientW: scroller.clientWidth, scrollerScrollW: scroller.scrollWidth,
    scrollable: scroller.scrollWidth > scroller.clientWidth + 1,
    maxScrollLeft: maxLeft,
    pageOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
  scroller.scrollLeft = 0;
  d.remove();
  return JSON.stringify(res);
})()""" % json.dumps(WIDE_MD)

PROBE = """(() => ({
  page: location.href,
  appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : null,
  hasWrapTablesFn: typeof wrapTables === 'function',
  hasWrapperRule: (() => {
    for (const s of document.styleSheets) { try { for (const r of s.cssRules) { if (r.cssText && r.cssText.includes('.tbl-wrap')) return true; } } catch (e) {} }
    return false;
  })(),
}))()"""


async def main():
    t = target()
    print("target:", t.get("title"), t.get("url"))
    async with websockets.connect(t["webSocketDebuggerUrl"], max_size=30 * 1024 * 1024) as ws:
        n = [0]

        async def send(method, params=None):
            n[0] += 1
            mid = n[0]
            await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
            while True:
                msg = json.loads(await asyncio.wait_for(ws.recv(), timeout=40))
                if msg.get("id") == mid:
                    return msg

        async def ev(expr):
            r = await send("Runtime.evaluate", {"expression": expr, "returnByValue": True})
            res = r.get("result", {})
            if "exceptionDetails" in res:
                return "EXCEPTION " + json.dumps(res["exceptionDetails"])[:300]
            return res.get("result", {}).get("value")

        await send("Runtime.enable")
        before = await ev(PROBE)
        print("before reload:", before)
        need = (not isinstance(before, dict)) or (not before.get("hasWrapperRule"))
        if need:
            await send("Page.enable")
            await send("Page.reload", {"ignoreCache": True})
            await asyncio.sleep(4)
            after = await ev(PROBE)
            print("after reload :", after)
        print("render check :", await ev(CHECK))

asyncio.run(main())
