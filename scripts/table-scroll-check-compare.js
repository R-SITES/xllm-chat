(() => {
  // Two tables, each rendered twice in the same page at the same viewport:
  //   PRE_FIX  = the CSS exactly as it shipped before 2026-10-05
  //              (.bubble table{width:100%} and no scrolling container)
  //   SHIPPED  = the current CSS (table inside .tbl-wrap, which scrolls)
  // REPRO is a table whose min-content is wider than the bubble — the case in
  // the user's phone screenshot, where cells ran past the card edge and landed on
  // the page gradient. REALISTIC is the presidents table from that screenshot.
  const REPRO = [
    '| 10 | Encyclopedic | Independence | Administration | Washingtonian |',
    '|----|--------------|--------------|----------------|---------------|',
    '| 3 | Thomas Jefferson | 1801–1809 | Declaration of Independence | Washingtonian |',
    '| 4 | James Madison | 1809–1817 | Father of the Constitution | Administration |',
  ].join('\n');
  const REALISTIC = [
    '| # | President | Term | Nickname / Note |',
    '|---|-----------|------|-----------------|',
    '| 3 | Thomas Jefferson | 1801–1809 | Declaration of Independence |',
    '| 4 | James Madison | 1809–1817 | Father of the Constitution |',
    '| 8 | Martin Van Buren | 1837–1841 | First President born a United States citizen |',
    '| 9 | William Henry Harrison | 1841 | Died in office after 31 days |',
  ].join('\n');

  const host = document.getElementById('messages') || document.body;

  const run = (md, preFix) => {
    const msg = document.createElement('div');
    msg.className = 'msg assistant';
    msg.innerHTML = (preFix
      ? '<style>.bubble .tbl-wrap{overflow:visible!important;max-width:none!important} .bubble table{width:100%!important;min-width:0!important}</style>'
      : '') + '<div class="msg-main"><div class="bubble"></div></div>';
    host.appendChild(msg);
    const bubble = msg.querySelector('.bubble');
    bubble.innerHTML = escapeAndFormat(md);
    const table = bubble.querySelector('table');
    const wrap = bubble.querySelector('.tbl-wrap');
    const br = bubble.getBoundingClientRect(), tr = table.getBoundingClientRect();
    const minContent = (() => {
      const c = table.cloneNode(true);
      c.style.cssText = 'width:min-content;position:absolute;left:-9999px;visibility:hidden';
      document.body.appendChild(c); const w = c.getBoundingClientRect().width; c.remove();
      return Math.round(w);
    })();
    const r = {
      bubbleW: Math.round(br.width),
      bubbleInnerW: bubble.clientWidth,
      tableMinContent: minContent,
      tableW: Math.round(tr.width),
      tableBleedsPastBubble: Math.round(tr.right - br.right),   // >0 = painted outside the card
      textOutsideCard: (() => {                                  // any table cell crossing br.right
        const cells = [...table.querySelectorAll('td,th')];
        const n = cells.filter(c => c.getBoundingClientRect().right > br.right + 1).length;
        return n + '/' + cells.length;
      })(),
      wrapScrollable: wrap ? wrap.scrollWidth > wrap.clientWidth + 1 : 'no .tbl-wrap',
      wrapMaxScrollLeft: wrap ? wrap.scrollWidth - wrap.clientWidth : null,
      pageOverflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
    if (!preFix && wrap) {
      wrap.scrollLeft = 9999;
      r.scrollLeftAtEnd = wrap.scrollLeft;
      const last = table.querySelector('tr:last-child td:last-child').getBoundingClientRect();
      r.lastCellFullyVisibleAtEnd = last.right <= wrap.getBoundingClientRect().right + 1;
      wrap.scrollLeft = 0;
    }
    msg.remove();
    return r;
  };

  return {
    viewport: document.documentElement.clientWidth,
    REPRO_WIDE_TABLE: { PRE_FIX: run(REPRO, true), SHIPPED: run(REPRO, false) },
    REALISTIC_PRESIDENTS_TABLE: { PRE_FIX: run(REALISTIC, true), SHIPPED: run(REALISTIC, false) },
  };
})()
