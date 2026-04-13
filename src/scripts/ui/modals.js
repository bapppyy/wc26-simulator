import { flag } from '../../lib/engine.js';
import { rerunDetailed } from '../../lib/engine.js';
import { tTeam } from '../../lib/i18n.js';
import { state } from '../state.js';
import { ui, defaultLang } from '../../i18n/ui';

function _d() {
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('wc26_lang')) || defaultLang;
  return (ui[lang] || ui[defaultLang]);
}

export function closeModal() {
  document.getElementById("modal").style.display = "none";
}

export function openMatchModal(m, rnd, simIdx) {
  if (!m) return;
  let sub = "";
  if (m.pen) sub = "Penalties: " + m.penA + "-" + m.penB;
  else if (m.et) sub = "Extra Time";
  document.getElementById("modalTitle").textContent =
    `${m.a} ${m.sa}–${m.sb} ${m.b}${sub ? " · " + sub : ""}`;

  const _evG = {}, _evA = {};
  for (const ev of (m.events || [])) {
    if (ev.type === "goal") {
      _evG[ev.scorer] = (_evG[ev.scorer] || 0) + 1;
      if (ev.assister) _evA[ev.assister] = (_evA[ev.assister] || 0) + 1;
    }
  }
  const _xiA = (m.xiA || []).map(p => ({ ...p, goals: _evG[p.n] || 0, assists: _evA[p.n] || 0 }));
  const _xiB = (m.xiB || []).map(p => ({ ...p, goals: _evG[p.n] || 0, assists: _evA[p.n] || 0 }));

  function xiHtml(xi, tname) {
    if (!xi || !xi.length)
      return `<div class="xic"><div class="xict">${flag(tname)} ${tTeam(tname)}</div><div style="font-size:12px;color:#aaa">No squad data</div></div>`;
    const posOrder = [["1-GK","GK"],["2-DF","DF"],["3-MF","MF"],["4-FW","FW"]];
    let rows = "";
    for (const [posCode, cat] of posOrder) {
      const players = xi.filter(p => p.p === posCode || p._cat === cat);
      for (const p of players) {
        const g = (p.goals || 0) > 0 ? `<span class="pstat-g">⚽${p.goals || 0}</span>` : "";
        const a = (p.assists || 0) > 0 ? `<span class="pstat-a">A${p.assists || 0}</span>` : "";
        const star = p.r === 0 ? `<span class="xistar">★</span>` : "";
        rows += `<div class="xir"><span class="xip">${cat}</span>${star}<span class="xin">${p.n}</span>${g}${a}<span class="xiovr">${p.o}</span></div>`;
      }
    }
    return `<div class="xic"><div class="xict">${flag(tname)} ${tTeam(tname)}</div>${rows}</div>`;
  }

  let evHtml = "";
  for (const ev of (m.events || [])) {
    let ico = "", cls = "", txt = "";
    if (ev.type === "goal") {
      ico = "⚽"; cls = "ig";
      txt = `<b>${flag(ev.team)}</b> — ⚽ ${ev.scorer}${ev.assister ? ` <span class="evs">🅰 ${ev.assister}</span>` : ""}${ev.et ? ` <span class="evs">(AET)</span>` : ""}`;
    } else if (ev.type === "yellow") {
      ico = "🟨"; cls = "iy";
      txt = `<b>${flag(ev.team)}</b> — ${ev.player}`;
    } else if (ev.type === "red") {
      ico = "🟥"; cls = "ir";
      txt = `<b>${flag(ev.team)}</b> — ${ev.player} <span class="evs">Red card</span>`;
    } else if (ev.type === "susp") {
      ico = "⚠"; cls = "ir";
      txt = `<b>${flag(ev.team)}</b> — ${ev.player} <span class="evs">${ev.reason}</span>`;
    } else if (ev.type === "sub") {
      ico = "🔄"; cls = "is";
      txt = `<b>${flag(ev.team)}</b> — Out: ${ev.out} → In: <b>${ev.in}</b>${ev.inOvr ? ` (${ev.inOvr})` : ""}  <span class="evs">Tactical</span>`;
    } else if (ev.type === "injury") {
      ico = "🤕"; cls = "ii";
      txt = `<b>${flag(ev.team)}</b> — ${ev.player} <span class="evs">injured</span>`;
    } else if (ev.type === "pen") {
      ico = "P"; cls = "ig";
      txt = `Penalty shootout: ${ev.team} wins ${ev.penA}-${ev.penB}`;
    } else continue;
    evHtml += `<div class="ev"><span class="evm">${ev.min}'</span><div class="evi ${cls}">${ico}</div><div class="evt">${txt}</div></div>`;
  }

  const fromSimBtn = simIdx
    ? `<button class="btn" style="font-size:11px;padding:3px 9px;margin-left:8px" onclick="openSimById(${simIdx});closeModal()">This Sim #${simIdx} →</button>`
    : "";

  document.getElementById("modalBody").innerHTML =
    `<div class="mhero"><div class="mht"><div class="mhf">${flag(m.a)}</div><div class="mhn">${tTeam(m.a)}</div></div>`
    + `<div><div class="mhsc">${m.sa}–${m.sb}</div><div class="mhsb">${sub || rnd || ""}</div>${fromSimBtn}</div>`
    + `<div class="mht"><div class="mhf">${flag(m.b)}</div><div class="mhn">${tTeam(m.b)}</div></div></div>`
    + `<div class="sec">Starting XI</div><div class="xig">${xiHtml(_xiA, m.a)}${xiHtml(_xiB, m.b)}</div>`
    + `<div class="sec">Match Events (${(m.events || []).length} events)</div>`
    + `<div class="evl">${evHtml || `<div style="color:#aaa;font-size:12px;padding:8px 0">Full events are recorded for the last simulation. For older sims use Sim Browser → 📋 Report.</div>`}</div>`;
  document.getElementById("modal").style.display = "flex";
}

export function openFullReport(simIdx) {
  document.getElementById("modalTitle").textContent = `📋 Sim #${simIdx} — computing...`;
  document.getElementById("modalBody").innerHTML = `<div style="padding:20px;text-align:center;color:#888"><span class="sp"></span> Re-simulating...</div>`;
  document.getElementById("modal").style.display = "flex";
  setTimeout(() => {
    const detailed = rerunDetailed(simIdx);
    window._reportSim = { idx: simIdx, s: detailed };
    buildFullReportModal(detailed, simIdx);
  }, 30);
}

export function buildFullReportModal(s, idx) {
  const allMs = [
    ...Object.entries(s.grpMatches).flatMap(([gk, ms]) => ms.map(m => ({ ...m, round: `Grp${gk}`, roundFull: "Group " + gk }))),
    ...s.r32.map(m => ({ ...m, round: "R32", roundFull: "Round of 32" })),
    ...s.r16.map(m => ({ ...m, round: "R16", roundFull: "Round of 16" })),
    ...s.qf.map(m => ({ ...m, round: "QF", roundFull: "Quarter-Final" })),
    ...s.sf.map(m => ({ ...m, round: "YF", roundFull: "Semi-Final" })),
    ...(s.third ? [{ ...s.third, round: "3.Yer", roundFull: "3rd Place" }] : []),
    ...s.fin.map(m => ({ ...m, round: "Final", roundFull: "Final" })),
  ].filter(Boolean);

  let html = `<div style="font-size:12px;color:#888;margin-bottom:8px">${allMs.length} matches · Champion: ${flag(s.champion)}${tTeam(s.champion)} · Click match → detail</div>`;
  html += `<div style="display:flex;flex-direction:column;gap:3px;max-height:65vh;overflow-y:auto">`;
  for (const m of allMs) {
    const wA = m.w === m.a;
    const sub = m.pen ? " pen." + m.penA + "-" + m.penB : m.et ? " ET" : "";
    html += `<div onclick="openReportMatch(${idx},'${m.a}','${m.b}')" style="display:grid;grid-template-columns:48px 1fr 52px 1fr;gap:5px;align-items:center;padding:6px 10px;background:#f8f8f6;border-radius:7px;cursor:pointer;font-size:12px;margin-bottom:2px">`
      + `<span style="font-size:10px;color:#aaa;font-weight:600">${m.round}</span>`
      + `<div style="font-weight:${wA ? 700 : 400};color:${wA ? "#1a1a1a" : "#bbb"}">${flag(m.a)}${tTeam(m.a)}</div>`
      + `<div style="text-align:center;font-weight:700">${m.sa}–${m.sb}<span style="font-size:9px;color:#aaa;font-weight:400">${sub}</span></div>`
      + `<div style="text-align:right;font-weight:${!wA ? 700 : 400};color:${!wA ? "#1a1a1a" : "#bbb"}">${tTeam(m.b)}${flag(m.b)}</div></div>`;
  }
  html += `</div>`;
  document.getElementById("modalTitle").textContent = `📋 Sim #${idx} — Select Match`;
  document.getElementById("modalBody").innerHTML = html;
}

export function openReportMatch(simIdx, nameA, nameB) {
  if (!window._reportSim || window._reportSim.idx !== simIdx) {
    openFullReport(simIdx);
    return;
  }
  const s = window._reportSim.s;
  const allMs = [
    ...Object.values(s.grpMatches).flat(),
    ...s.r32, ...s.r16, ...s.qf, ...s.sf,
    ...(s.third ? [s.third] : []),
    ...s.fin,
  ].filter(Boolean);
  const m = allMs.find(m => m.a === nameA && m.b === nameB);
  if (!m) return;
  openMatchModal(m, m.roundFull || "", simIdx);
}

export function openHow() {
  const d = _d();
  const sec = (t, b) =>
    `<div><h3 style="font-size:13px;font-weight:700;margin-bottom:5px">${t}</h3>` +
    `<p style="font-size:12px;color:#555;line-height:1.6">${b}</p></div>`;
  document.getElementById("modalTitle").textContent = d['how.title'] || "How It Works?";
  document.getElementById("modalBody").innerHTML =
    `<div style="display:flex;flex-direction:column;gap:14px">` +
    sec(d['how.s1t'], d['how.s1d']) +
    sec(d['how.s2t'], d['how.s2d']) +
    sec(d['how.s3t'], d['how.s3d']) +
    sec(d['how.s4t'], d['how.s4d']) +
    sec(d['how.s5t'], d['how.s5d']) +
    `</div>`;
  document.getElementById("modal").style.display = "flex";
}
