(() => {
  // Build three stacked panels for one proof screenshot at phone width:
  //   A BEFORE — pre-2026-10-05 render (table unwrapped, width:100%): the columns
  //              run past the response card and land on the page background.
  //   B AFTER  — the shipped render, table at scrollLeft 0 (card contains it).
  //   C AFTER  — the same card scrolled to the end (last column fully visible).
  const md = [
    '| 10 | Encyclopedic | Independence | Administration | Washingtonian |',
    '|----|--------------|--------------|----------------|---------------|',
    '| 3 | Thomas Jefferson | 1801–1809 | Declaration of Independence | Washingtonian |',
    '| 4 | James Madison | 1809–1817 | Father of the Constitution | Administration |',
  ].join('\n');
  const CSS = `<style>
    #proofPanels .cap{font:600 11px/1.4 system-ui,sans-serif;letter-spacing:.6px;text-transform:uppercase;color:#e6edf3;margin:14px 0 6px;padding-left:4px}
    #proofPanels{margin-top:8px}
  </style>`;

  const host = document.getElementById('messages') || document.body;
  document.querySelector('.sidebar')?.classList.remove('open');   // mobile overlay must not cover the proof
  document.getElementById('proofPanels')?.remove();
  const box = document.createElement('div');
  box.id = 'proofPanels';
  box.innerHTML = CSS;
  host.appendChild(box);

  const panel = (caption, preFix) => {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<div class="cap">${caption}</div>`;
    const msg = document.createElement('div');
    msg.className = 'msg assistant';
    msg.innerHTML = '<div class="msg-main"><div class="bubble"></div></div>';
    wrap.appendChild(msg);
    box.appendChild(wrap);
    const bubble = msg.querySelector('.bubble');
    bubble.innerHTML = escapeAndFormat(md);
    if (preFix) {
      const w = bubble.querySelector('.tbl-wrap');
      if (w) w.replaceWith(...w.childNodes);
    }
    return { caption, bubble, table: bubble.querySelector('table'), tblWrap: bubble.querySelector('.tbl-wrap') };
  };

  const a = panel('Before — table runs out of the response card', true);
  const b = panel('After — table scrolls inside the card (start)', false);
  const c = panel('After — scrolled to the end', false);
  a.bubble.style.cssText = 'width:100%!important;max-width:100%!important';   // old CSS width:100% table

  [b, c].forEach(p => p.tblWrap.scrollLeft = 0);
  c.tblWrap.scrollLeft = 9999;

  const rect = el => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }; };
  const out = {
    viewportW: document.documentElement.clientWidth,
    A_before: { bubble: rect(a.bubble), tableRight: rect(a.table).right },
    B_after: { bubble: rect(b.bubble), tblWrap: rect(b.tblWrap), scrollLeft: b.tblWrap.scrollLeft, maxScrollLeft: b.tblWrap.scrollWidth - b.tblWrap.clientWidth },
    C_after: { bubble: rect(c.bubble), tblWrap: rect(c.tblWrap), scrollLeft: c.tblWrap.scrollLeft },
  };
  box.scrollIntoView({ block: 'start' });
  out.panelTop = Math.round(box.getBoundingClientRect().top);
  return out;
})()
