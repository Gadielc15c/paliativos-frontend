#!/usr/bin/env node
/**
 * Dev-only visual QA. Walks login, ?ui-check=1 and every app route in ?mock=1
 * mode at 390 / 768 / 1440 px in light and dark, and reports:
 *   (a) text overflow   – text that leaves its box (scrollWidth > clientWidth + 1
 *                         or the text range sticks out) without intentional ellipsis
 *   (b) crowded controls – sibling buttons / pills / button-links closer than 8px or overlapping
 *   (c) serif fonts      – any computed font-family stack that contains a serif face
 *   (d) small controls   – interactive controls shorter than 36px
 *   (e) page h-scroll    – document wider than the viewport
 *   (f) phone tables     – any visible <table> at 390px (phones get DataList cards)
 *   (g) page too tall    – Inicio (home*) taller than 1.6× the viewport on desktop (≥ 1024px).
 *                          Every route's full page height is also reported (in px and viewports)
 *                          at each width, so excessive scroll is visible per screen.
 * Screenshots go to .ui-shots/. Exit code 1 when anything is found.
 *
 * Usage: npm run ui:verify                (dev server must be running on :5173)
 *        UI_BASE=http://localhost:5173 UI_DATA=demo,worst node scripts/ui-verify.mjs
 */
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.UI_BASE || "http://localhost:5173";
const OUT = path.resolve(".ui-shots");
const WIDTHS = (process.env.UI_WIDTHS || "390,768,1440").split(",").map(Number);
const THEMES = (process.env.UI_THEMES || "light,dark").split(",");
const DATASETS = (process.env.UI_DATA || "demo,worst").split(",");
const ONLY = process.env.UI_ONLY ? process.env.UI_ONLY.split(",") : null;

// Routes from src/app/routes/index.tsx (+ detail states reachable through query params).
const APP_ROUTES = [
  ["home", "/"],
  ["home-doctor", "/?role=doctor"],
  ["home-secretary", "/?role=secretary"],
  ["admin", "/admin"],
  ["patients-filter", "/patients?filter=overdue_followup"],
  ["billing-overdue", "/billing?status=overdue"],
  ["billing-movimientos", "/billing?tab=movimientos"],
  ["patient-finance", "/patients?patientId=patient-1&focus=1&tab=finance"],
  ["equipo-secretaries", "/equipo?role=secretary"],
  ["epi-alert-link", "/epidemiologia?category=respiratory"],
  ["patients", "/patients"],
  ["patient-detail", "/patients?patientId=patient-1"],
  ["patient-focus", "/patients?patientId=patient-1&focus=1"],
  ["billing", "/billing"],
  ["billing-detail", "/billing?invoiceId=invoice-1"],
  ["episodes", "/episodes"],
  ["episode-detail", "/episodes?episodeId=episode-1"],
  ["documents", "/documents"],
  ["reports", "/reports"],
  ["audit", "/audit"],
  ["config", "/config"],
  // Fase 1–3: epidemiology, SOAP editor + AI assistant, patient AI summary/timeline, staff.
  ["epi", "/epidemiologia"],
  ["epi-filtered", "/epidemiologia?period=12m&sex=female&codes=C34,R52,J18,R06"],
  ["epi-drill", "/epidemiologia?dx=C34.9&dxd=Tumor%20maligno%20de%20los%20bronquios%20o%20del%20pulm%C3%B3n"],
  ["epi-ask", "/epidemiologia?ask=%C2%BFCu%C3%A1les%20son%20los%205%20diagn%C3%B3sticos%20m%C3%A1s%20frecuentes%20del%20%C3%BAltimo%20mes%20en%20mujeres%3F"],
  ["epi-ask-trend", "/epidemiologia?ask=%C2%BFC%C3%B3mo%20evoluciona%20el%20dolor%20por%20mes%20este%20a%C3%B1o%3F"],
  ["epi-ask-insights", "/epidemiologia?ask=%C2%BFQu%C3%A9%20diagn%C3%B3sticos%20aumentaron%20este%20mes%3F"],
  ["epi-category", "/epidemiologia?cat=neoplasms&catl=Neoplasias&chapter=C00-D49"],
  ["epi-secretary", "/epidemiologia?role=secretary"],
  ["consultation", "/consultations/consultation-1"],
  ["consultation-compose", "/consultations/consultation-1?ai=compose"],
  ["consultation-ai", "/consultations/consultation-1?ai=review"],
  ["consultation-signed", "/consultations/consultation-2"],
  // Audio transcription: DEV-only ?rec= previews (no microphone needed).
  ["consultation-rec-consent", "/consultations/consultation-1?rec=consent"],
  ["consultation-recording", "/consultations/consultation-1?rec=recording"],
  ["consultation-rec-paused", "/consultations/consultation-1?rec=paused"],
  ["consultation-rec-uploading", "/consultations/consultation-1?rec=uploading"],
  ["consultation-transcript", "/consultations/consultation-1?rec=transcript"],
  ["patient-history", "/patients?patientId=patient-1&focus=1&tab=history"],
  ["patient-consults", "/patients?patientId=patient-1&focus=1&tab=consults"],
  ["equipo", "/equipo"],
  // Scroll pass: one analytics panel / epi view at a time.
  ["home-panel-quality", "/?panel=calidad"],
  ["home-panel-team", "/?panel=equipo"],
  ["epi-view-trends", "/epidemiologia?view=tendencias"],
  ["epi-view-distribution", "/epidemiologia?view=distribucion"],
  ["epi-view-insights", "/epidemiologia?view=hallazgos"],
  // Asistente (agent chat): DEV-only ?demo=chat preloads a conversation with every block and proposal state.
  ["assistant-empty", "/asistente"],
  ["assistant-chat", "/asistente?demo=chat"],
  ["assistant-panel", "/?assistant=open"],
  ["assistant-panel-chat", "/patients?assistant=open&demo=chat"],
  ["assistant-secretary", "/asistente?role=secretary"],
  // Nuevo paciente / Nueva consulta from anywhere (?quick= opens the sheet; &np=check shows validation + duplicate warning).
  ["new-patient", "/patients?quick=new-patient"],
  ["new-patient-check", "/patients?quick=new-patient&np=check"],
  ["new-patient-secretary", "/?quick=new-patient&role=secretary"],
  ["new-consultation", "/?quick=new-consultation"],
  ["patients-empty", "/patients?data=empty"],
];

function pages() {
  const list = [
    { name: "login", url: "/", data: null },
    { name: "ui-check", url: "/?ui-check=1", data: null },
  ];
  for (const data of DATASETS) {
    for (const [name, url] of APP_ROUTES) {
      const sep = url.includes("?") ? "&" : "?";
      list.push({ name: `${name}${data === "demo" ? "" : `-${data}`}`, url: `${url}${sep}mock=1&data=${data}`, data });
    }
  }
  return ONLY ? list.filter((p) => ONLY.some((o) => p.name.startsWith(o))) : list;
}

/** Runs inside the page. Keep it self-contained. */
function audit() {
  const issues = [];
  const MIN_GAP = 8;
  const MIN_CONTROL = 36;

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false; // also skips .sr-only text
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
      if (n.hasAttribute("inert") || n.getAttribute("aria-hidden") === "true") return false;
      // Scrolled out of an inner scroller (chat log, sheet body): not on screen, not a sibling of the chrome above it.
      if (n !== el && !n.classList.contains("app-layout-content-area") && /(auto|scroll|hidden)/.test(cs.overflowY)) {
        const c = n.getBoundingClientRect(); const h = Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top);
        if (h < r.height - 1) return false; // cut by the scroller edge: mid-scroll, not a layout collision
      }
    }
    return true;
  };
  const describe = (el) => {
    const parts = [];
    for (let n = el, i = 0; n && n !== document.body && i < 4; n = n.parentElement, i++) {
      let s = n.tagName.toLowerCase();
      const cls = [...n.classList].filter((c) => !c.startsWith("_")).slice(0, 2);
      if (cls.length) s += "." + cls.join(".");
      parts.unshift(s);
    }
    const text = (el.innerText || el.value || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40);
    return `${parts.join(" > ")}${text ? ` "${text}"` : ""}`;
  };
  const inFixed = (el) => {
    for (let n = el; n; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.position === "fixed" || (cs.position === "sticky" && cs.bottom !== "auto")) return n; }
    return null;
  };

  // (a) text overflow -------------------------------------------------------
  const blockOf = (el) => {
    let n = el;
    while (n && getComputedStyle(n).display.startsWith("inline") && !["BUTTON", "A"].includes(n.tagName)) n = n.parentElement;
    return n || el;
  };
  const ellipsisFor = (el) => {
    for (let n = el, i = 0; n && i < 4; n = n.parentElement, i++) {
      const cs = getComputedStyle(n);
      if (cs.textOverflow === "ellipsis" && cs.overflowX !== "visible") return true;
      if (cs.webkitLineClamp && cs.webkitLineClamp !== "none") return true;
    }
    return false;
  };
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    if (!t.textContent.trim()) continue;
    const parent = t.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "OPTION", "TEXTAREA"].includes(parent.tagName)) continue;
    if (!visible(parent)) continue;
    const box = blockOf(parent);
    if (seen.has(box)) continue;
    const cs = getComputedStyle(box);
    if (["auto", "scroll"].includes(cs.overflowX)) continue; // intentional scroller
    if (ellipsisFor(parent)) continue;
    const range = document.createRange();
    range.selectNodeContents(t);
    const tr = range.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    const sticks = tr.right > br.right + 1 || tr.left < br.left - 1;
    const scrolls = box.scrollWidth > box.clientWidth + 1 && cs.overflowX !== "visible";
    if (sticks || scrolls) {
      seen.add(box);
      issues.push({ type: "overflow", el: describe(box), detail: `text ${Math.round(tr.width)}px in box ${Math.round(br.width)}px` });
    }
  }
  // Clipped single-line fields (title attr expected) – inputs are excluded on purpose.

  // (b) crowded sibling controls -------------------------------------------
  const CONTROL_SEL = [
    "button", "[role=button]", "[role=tab]", "input[type=submit]", "input[type=button]",
    ".button", ".pill", ".badge", "a[class*=button]", "a[class*=btn]", "a[class*=link]", "a[class*=chip]",
    "a[class*=action]", "select",
  ].join(",");
  const controls = [...document.querySelectorAll(CONTROL_SEL)].filter(visible);
  // A pill wrapping its own buttons counts once (the outer pill).
  const top = controls.filter((c) => !controls.some((o) => o !== c && o.contains(c)));
  const rects = top.map((el) => ({ el, r: el.getBoundingClientRect(), fixed: inFixed(el) }));
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const A = rects[i], B = rects[j];
      if (A.fixed !== B.fixed) continue; // floating / sticky chrome overlays page content by design
      const a = A.r, b = B.r;
      // Segments of one segmented control / tab bar are a single control by design.
      const tabsA = A.el.closest("[role=tablist]");
      if (tabsA && tabsA === B.el.closest("[role=tablist]")) continue;
      // Rows of one grouped list (iOS Settings style): square, full-width rows stacked inside one
      // container and separated by a hairline instead of a gap. Rounded buttons are never exempt.
      let common = A.el.parentElement;
      while (common && !common.contains(B.el)) common = common.parentElement;
      if (common) {
        const cw = common.getBoundingClientRect().width;
        const square = (el) => parseFloat(getComputedStyle(el).borderTopLeftRadius) === 0;
        const stacked = a.bottom <= b.top + 1 || b.bottom <= a.top + 1;
        if (stacked && square(A.el) && square(B.el) && a.width >= cw * 0.9 && b.width >= cw * 0.9) continue;
      }
      const vOverlap = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      const hOverlap = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      let gap = null;
      if (vOverlap > 0 && hOverlap > 0) gap = -Math.min(vOverlap, hOverlap);
      else if (vOverlap > Math.min(a.height, b.height) * 0.3) gap = Math.max(b.left - a.right, a.left - b.right);
      else if (hOverlap > Math.min(a.width, b.width) * 0.3) gap = Math.max(b.top - a.bottom, a.top - b.bottom);
      if (gap !== null && gap < MIN_GAP - 0.5) {
        issues.push({ type: "gap", el: `${describe(A.el)}  <->  ${describe(B.el)}`, detail: gap < 0 ? "overlap" : `${gap.toFixed(1)}px` });
      }
    }
  }

  // (c) serif fonts --------------------------------------------------------
  const SERIF = /(^|,)\s*("?)(serif|georgia|times|times new roman|calistoga|garamond|playfair[^,]*|merriweather|cambria|book antiqua|palatino[^,]*)\2\s*(,|$)/i;
  const fontSeen = new Set();
  for (const el of document.querySelectorAll("body, body *")) {
    for (const pseudo of [null, "::before", "::after"]) {
      const cs = getComputedStyle(el, pseudo);
      if (pseudo && (cs.content === "none" || cs.content === "normal")) continue;
      const ff = cs.fontFamily;
      if (SERIF.test(ff.toLowerCase()) && !fontSeen.has(ff + el.tagName)) {
        fontSeen.add(ff + el.tagName);
        issues.push({ type: "serif", el: describe(el) + (pseudo || ""), detail: ff });
      }
    }
  }

  // (d) small interactive controls ----------------------------------------
  const INTERACTIVE = [
    "button", "[role=button]", "[role=tab]", "[role=switch]", "select", "textarea",
    "input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range])",
    "a.button", "a[class*=button]", "a[class*=btn]", "nav a",
  ].join(",");
  for (const el of document.querySelectorAll(INTERACTIVE)) {
    if (!visible(el)) continue;
    const h = el.getBoundingClientRect().height;
    if (h < MIN_CONTROL - 0.5) issues.push({ type: "small", el: describe(el), detail: `${h.toFixed(1)}px tall` });
  }

  // (e) horizontal page scroll --------------------------------------------
  const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
  if (sw > window.innerWidth + 1) {
    const culprits = [...document.querySelectorAll("body *")]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.right > window.innerWidth + 1 && r.width > 0 && visible(el); })
      .filter((el, _, all) => !all.some((o) => o !== el && el.contains(o)))
      .slice(0, 3).map(describe);
    issues.push({ type: "hscroll", el: culprits.join(" | ") || "document", detail: `${sw}px > ${window.innerWidth}px` });
  }
  // (f) phones never get tables: rows must render as cards ------------------
  if (window.innerWidth <= 480) {
    for (const t of document.querySelectorAll("table")) if (visible(t)) issues.push({ type: "table", el: describe(t), detail: `table visible at ${window.innerWidth}px` });
  }
  return issues;
}

const LABELS = { overflow: "(a) text overflow", gap: "(b) crowded controls", serif: "(c) serif font", small: "(d) control < 36px", hscroll: "(e) page h-scroll", table: "(f) <table> on phone", tall: "(g) page too tall" };
// Height budget (in viewports) per route-name prefix, desktop only. Inicio is the owner's "tenemos scroll excesivo" screen.
const HEIGHT_BUDGET = [["home", 1.6]];

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const all = [];
  const errors = [];
  const heights = []; // { page, width, theme, px, vh }
  let visits = 0;
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({
        viewport: { width, height: width < 600 ? 844 : 900 },
        deviceScaleFactor: width < 600 ? 2 : 1,
        colorScheme: theme === "dark" ? "dark" : "light",
        reducedMotion: "reduce", // stable screenshots: entrance animations resolve instantly
      });
      await context.addInitScript((t) => {
        try { localStorage.setItem("app_theme", t); } catch { /* ignore */ }
      }, theme);
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
      for (const p of pages()) {
        visits++;
        await page.goto(BASE + p.url, { waitUntil: "networkidle" });
        await page.waitForTimeout(p.url.includes("ask=") || p.url.includes("ai=review") ? 1400 : p.url.includes("rec=transcript") ? 2200 : 700); // entrance animations / mock AI latency settle
        const issues = await page.evaluate(audit);
        const shot = `${width}-${theme}-${p.name}.png`;
        // Unroll the app shell (it scrolls internally) so the full-page shot shows every section.
        const unroll = await page.addStyleTag({ content: ".app-layout-container,.app-layout-main-content{height:auto!important}.app-layout-content-area{overflow:visible!important}.patients-list-column,.billing-list-column,.episodes-list{max-height:none!important}.preview-toolbar{display:none!important}.form-actions,.ai-review-bar{position:static!important}body{position:relative}.tab-bar{position:absolute!important}" });
        const vh = page.viewportSize().height;
        const px = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
        heights.push({ page: p.name, width, theme, px, vh: +(px / vh).toFixed(2) });
        const budget = width >= 1024 && HEIGHT_BUDGET.find(([prefix]) => p.name === prefix || p.name.startsWith(`${prefix}-`));
        if (budget && px > budget[1] * vh) issues.push({ type: "tall", el: "page", detail: `${px}px = ${(px / vh).toFixed(2)}× viewport > ${budget[1]}×` });
        await page.screenshot({ path: path.join(OUT, shot), fullPage: true });
        await unroll.evaluate((el) => el.remove());
        for (const i of issues) all.push({ ...i, page: p.name, width, theme, shot });
        process.stdout.write(`${issues.length ? "x" : "."}`);
      }
      await context.close();
    }
  }
  await browser.close();
  process.stdout.write("\n\n");

  const byType = Object.fromEntries(Object.keys(LABELS).map((k) => [k, all.filter((i) => i.type === k)]));
  // Collapse identical findings across widths/themes for readable output.
  const groups = new Map();
  for (const i of all) {
    const key = `${i.type}|${i.page}|${i.el}`;
    const g = groups.get(key) || { ...i, where: new Set() };
    g.where.add(`${i.width}${i.theme[0]}`);
    groups.set(key, g);
  }
  for (const [type, label] of Object.entries(LABELS)) {
    const list = [...groups.values()].filter((g) => g.type === type);
    console.log(`${label}: ${byType[type].length} (${list.length} unique)`);
    for (const g of list.slice(0, 40)) console.log(`   [${g.page} @ ${[...g.where].join(",")}] ${g.el} — ${g.detail}`);
    if (list.length > 40) console.log(`   … ${list.length - 40} more (see .ui-shots/report.json)`);
  }
  // Page heights (light theme; px and viewports), tallest first per width.
  const light = heights.filter((h) => h.theme === (THEMES.includes("light") ? "light" : THEMES[0]) && !h.page.endsWith("-worst"));
  if (light.length) {
    console.log("\nPage height (demo data, viewports = px / viewport height):");
    const names = [...new Set(light.map((h) => h.page))];
    const ws = [...new Set(light.map((h) => h.width))].sort((a, b) => a - b);
    console.log(`   ${"route".padEnd(28)}${ws.map((w) => `${w}px`.padStart(16)).join("")}`);
    for (const n of names) {
      const cells = ws.map((w) => { const h = light.find((x) => x.page === n && x.width === w); return (h ? `${h.px} (${h.vh.toFixed(1)}×)` : "—").padStart(16); });
      console.log(`   ${n.padEnd(28)}${cells.join("")}`);
    }
  }
  if (errors.length) {
    console.log(`\nPage errors: ${errors.length}`);
    for (const e of [...new Set(errors)].slice(0, 10)) console.log("   " + e);
  }
  console.log(`\n${visits} page visits, ${visits} screenshots in .ui-shots/. Total issues: ${all.length}`);
  await writeFile(path.join(OUT, "report.json"), JSON.stringify({ visits, total: all.length, issues: all, errors, heights }, null, 2));
  process.exit(all.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(2); });
