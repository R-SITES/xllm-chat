(() => {
  // Render a wide GFM table through the app's own markdown path into a real
  // assistant bubble, then measure whether the table stays INSIDE the bubble
  // and whether it scrolls horizontally there.
  const md = [
    '| # | President | Term | Note |',
    '|---|-----------|------|------|',
    '| 4 | James Madison | 1809–1817 | "Father of the Constitution" |',
    '| 5 | James Monroe | 1817–1825 | Era of Good Feelings |',
    '| 8 | Martin Van Buren | 1837–1841 | First President born in the United States of America |',
    '| 9 | William Henry Harrison | 1841 | Died in office after 31 days |',
  ].join('\n');

  const host = document.getElementById('messages') || document.body;
  const msg = document.createElement('div');
  msg.className = 'msg assistant';
  msg.innerHTML = '<div class="msg-main"><div class="bubble" id="tblTestBubble"></div></div>';
  host.appendChild(msg);
  const bubble = msg.querySelector('#tblTestBubble');
  bubble.innerHTML = escapeAndFormat(md);

  const wrap = bubble.querySelector('.tbl-wrap');
  const table = bubble.querySelector('table');
  if (!wrap || !table) return { ok: false, reason: 'no .tbl-wrap / table in render', html: bubble.innerHTML.slice(0, 300) };

  const br = bubble.getBoundingClientRect(), tr = table.getBoundingClientRect();
  const res = {
    appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : null,
    wrapClientW: wrap.clientWidth,
    wrapScrollW: wrap.scrollWidth,
    tableW: Math.round(tr.width),
    bubbleRight: Math.round(br.right),
    tableRight: Math.round(tr.right),
    overflowsWrap: wrap.scrollWidth > wrap.clientWidth + 1,
    tablePaintsOutsideBubble: tr.right > br.right + 1,
    tableCellsOverflowViewport: tr.right > document.documentElement.clientWidth + 1,
    pageOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    scrollLeftAfter: (wrap.scrollLeft = 40, wrap.scrollLeft),
    narrowTableScrolls: null,
  };
  // a narrow table must NOT become a scroller — it should fill the bubble
  const b2 = document.createElement('div');
  b2.className = 'bubble';
  msg.querySelector('.msg-main').appendChild(b2);
  b2.innerHTML = escapeAndFormat('| a | b |\n|---|---|\n| 1 | 2 |');
  res.narrowTableScrolls = (() => { const w = b2.querySelector('.tbl-wrap'); return w ? w.scrollWidth > w.clientWidth + 1 : 'no-wrap'; })();
  res.narrowTableFillsBubble = (() => {
    const w = b2.querySelector('.tbl-wrap'), t = b2.querySelector('table');
    return w && t ? Math.abs(t.getBoundingClientRect().width - w.clientWidth) <= 2 : null;
  })();
  msg.remove();
  return res;
})()
