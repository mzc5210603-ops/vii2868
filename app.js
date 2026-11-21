/* ============ 水晶算珠 — 逻辑 ============ */
"use strict";

const CRYSTALS = [
  { id:"compound", name:"复利生长", sub:"一笔钱在时间里会长成什么样子" },
  { id:"goal",     name:"存钱目标", sub:"倒推每月需要存多少" },
  { id:"loan",     name:"贷款月供", sub:"等额本息，月供与利息总账" },
  { id:"fx",       name:"汇率换算", sub:"常用货币快速折算（静态参考汇率）" },
  { id:"discount", name:"折扣税费", sub:"打折之后、含税之前" },
];

/* ---------- tab ---------- */
const tabBar = document.getElementById("tabBar");
const card = document.getElementById("crystalCard");
CRYSTALS.forEach(c => {
  const t = document.createElement("button");
  t.className = "tab";
  t.textContent = c.name;
  t.addEventListener("click", () => mount(c, t));
  tabBar.appendChild(t);
  c._tab = t;
});

function mount(c, tab) {
  document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
  tab.classList.add("active");
  card.style.animation = "none";
  void card.offsetWidth;
  card.style.animation = "";
  RENDER[c.id](card, c);
}

/* ---------- 控件工厂 ---------- */
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
function field(grid, label, input, full) {
  const f = el("div", "cc-field" + (full ? " full" : ""));
  f.append(el("label", "", label), input);
  grid.appendChild(f);
}
function numInput(val, step) {
  const i = el("input", "cc-input");
  i.type = "number"; i.value = val;
  if (step) i.step = step;
  return i;
}
function selectBox(items) {
  const s = el("select", "cc-input");
  items.forEach(([v, l]) => {
    const o = el("option", "", l);
    o.value = v;
    s.appendChild(o);
  });
  return s;
}
function build(card, c) {
  card.innerHTML = "";
  card.append(el("h2", "cc-title", c.name), el("p", "cc-sub", c.sub));
  const grid = el("div", "cc-grid");
  card.appendChild(grid);
  return grid;
}
function result(grid) {
  const r = el("div", "cc-result", "—");
  grid.appendChild(r);
  return r;
}
const fmt = n => n.toLocaleString("zh-CN", { maximumFractionDigits:2 });
const money = n => "¥ " + fmt(Math.round(n * 100) / 100);

const RENDER = {};

/* ---------- 复利 ---------- */
RENDER.compound = (card, c) => {
  const grid = build(card, c);
  const pv = numInput(10000);
  const rate = numInput(5, 0.1);
  const years = numInput(10);
  const freq = selectBox([["1","每年"],["2","每半年"],["4","每季度"],["12","每月"]]);
  field(grid, "本金 ¥", pv);
  field(grid, "年利率 %", rate);
  field(grid, "年数", years);
  field(grid, "复利频率", freq);
  const out = result(grid);
  function calc() {
    const P = +pv.value, r = +rate.value / 100, t = +years.value, n = +freq.value;
    if (!(P > 0) || !(t > 0)) { out.textContent = "请填写完整数字"; return; }
    const F = P * Math.pow(1 + r / n, n * t);
    out.innerHTML =
      `<div class="cc-big">${money(F)}<small> 到期总额</small></div>` +
      `<div class="cc-lines">` +
      `<div><span>本金</span><span>${money(P)}</span></div>` +
      `<div><span>利息收益</span><span>${money(F - P)}</span></div>` +
      `<div><span>总增长</span><span>${((F / P - 1) * 100).toFixed(1)}%</span></div>` +
      `<div><span>翻倍需约</span><span>${r > 0 ? (72 / (r * 100)).toFixed(1) + " 年（72 法则）" : "—"}</span></div>` +
      `</div>`;
  }
  [pv, rate, years, freq].forEach(x => x.addEventListener("input", calc));
  calc();
};

/* ---------- 存钱目标 ---------- */
RENDER.goal = (card, c) => {
  const grid = build(card, c);
  const goal = numInput(200000);
  const years = numInput(5);
  const rate = numInput(3, 0.1);
  field(grid, "目标金额 ¥", goal);
  field(grid, "年数", years);
  field(grid, "年利率 %（可 0）", rate, true);
  const out = result(grid);
  function calc() {
    const F = +goal.value, t = +years.value, r = +rate.value / 100;
    if (!(F > 0) || !(t > 0)) { out.textContent = "请填写完整数字"; return; }
    let monthly;
    if (r === 0) monthly = F / (t * 12);
    else {
      const i = r / 12, n = t * 12;
      monthly = F * i / (Math.pow(1 + i, n) - 1);
    }
    out.innerHTML =
      `<div class="cc-big">${money(monthly)}<small> / 月</small></div>` +
      `<div class="cc-lines">` +
      `<div><span>每年需存</span><span>${money(monthly * 12)}</span></div>` +
      `<div><span>累计投入</span><span>${money(monthly * t * 12)}</span></div>` +
      `<div><span>利息帮你攒出</span><span>${money(F - monthly * t * 12)}</span></div>` +
      `</div>`;
  }
  [goal, years, rate].forEach(x => x.addEventListener("input", calc));
  calc();
};

/* ---------- 贷款月供 ---------- */
RENDER.loan = (card, c) => {
  const grid = build(card, c);
  const amount = numInput(1000000);
  const rate = numInput(4.2, 0.01);
  const years = numInput(30);
  field(grid, "贷款总额 ¥", amount);
  field(grid, "年利率 %", rate);
  field(grid, "期限（年）", years, true);
  const out = result(grid);
  function calc() {
    const P = +amount.value, ar = +rate.value / 100, t = +years.value;
    if (!(P > 0) || !(t > 0)) { out.textContent = "请填写完整数字"; return; }
    const i = ar / 12, n = t * 12;
    let m;
    if (i === 0) m = P / n;
    else m = P * i * Math.pow(1 + i, n) / (Math.pow(1 + i, n) - 1);
    out.innerHTML =
      `<div class="cc-big">${money(m)}<small> 每月还款</small></div>` +
      `<div class="cc-lines">` +
      `<div><span>还款总期数</span><span>${n} 期</span></div>` +
      `<div><span>利息总额</span><span>${money(m * n - P)}</span></div>` +
      `<div><span>本息合计</span><span>${money(m * n)}</span></div>` +
      `<div><span>利息占比</span><span>${((m * n - P) / (m * n) * 100).toFixed(1)}%</span></div>` +
      `</div>`;
  }
  [amount, rate, years].forEach(x => x.addEventListener("input", calc));
  calc();
};

/* ---------- 汇率 ---------- */
const FX = [
  ["CNY","人民币 ¥",1],
  ["USD","美元 $",7.18],
  ["EUR","欧元 €",7.82],
  ["JPY","日元 ¥10",0.0482],
  ["GBP","英镑 £",9.12],
  ["HKD","港币 HK$",0.92],
];
RENDER.fx = (card, c) => {
  const grid = build(card, c);
  const val = numInput(100);
  const from = selectBox(FX.map(f => [f[0], f[1]]));
  const to = selectBox(FX.map((f, i) => [f[0], i === 1 ? f[1] + " →" : f[1]]));
  to.value = "USD";
  field(grid, "金额", val);
  field(grid, "从", from);
  field(grid, "到", to, true);
  const out = result(grid);
  function calc() {
    const v = +val.value;
    const f = FX.find(x => x[0] === from.value);
    const t = FX.find(x => x[0] === to.value);
    if (!(v > 0) || !f || !t) { out.textContent = "请填写金额"; return; }
    const r = v / f[2] * t[2];
    out.innerHTML =
      `<div class="cc-big">${v.toLocaleString()} ${from.value} = ${r.toFixed(2)} ${to.value}</div>` +
      `<div class="cc-lines">` +
      `<div><span>反向</span><span>1 ${to.value} = ${(1 / t[2] * f[2]).toFixed(4)} ${from.value}</span></div>` +
      `<div><span>参考口径</span><span>以人民币计的静态示例汇率</span></div>` +
      `</div>`;
  }
  [val, from, to].forEach(x => x.addEventListener("input", calc));
  calc();
};

/* ---------- 折扣税费 ---------- */
RENDER.discount = (card, c) => {
  const grid = build(card, c);
  const price = numInput(299);
  const disc = numInput(15);
  const tax = numInput(13, 0.5);
  field(grid, "原价 ¥", price);
  field(grid, "折扣 %", disc);
  field(grid, "税率 %（可选）", tax, true);
  const out = result(grid);
  function calc() {
    const p = +price.value, d = +disc.value, tx = +tax.value;
    if (!(p > 0)) { out.textContent = "请输入价格"; return; }
    const cut = p * d / 100;
    const after = p - cut;
    const taxed = after * (1 + tx / 100);
    out.innerHTML =
      `<div class="cc-big">${money(taxed)}<small> 实付（含税）</small></div>` +
      `<div class="cc-lines">` +
      `<div><span>立减</span><span>− ${money(cut)}</span></div>` +
      `<div><span>折后价</span><span>${money(after)}</span></div>` +
      `<div><span>税额</span><span>+ ${money(after * tx / 100)}</span></div>` +
      `<div><span>相当于</span><span>${(after / p * 10).toFixed(1)} 折</span></div>` +
      `</div>`;
  }
  [price, disc, tax].forEach(x => x.addEventListener("input", calc));
  calc();
};

mount(CRYSTALS[0], CRYSTALS[0]._tab);
