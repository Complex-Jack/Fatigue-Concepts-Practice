const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const NS = "http://www.w3.org/2000/svg";
const el = (name, attrs = {}) => {
  const node = document.createElementNS(NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
};

const rnd = (min, max, step = 1) => Math.round((min + Math.random() * (max - min)) / step) * step;
const pick = (items) => items[Math.floor(Math.random() * items.length)];
const fmt = (v, digits = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
const fmtLoose = (v, digits = 2) => Number(v).toLocaleString(undefined, { maximumFractionDigits: digits });
const ksi = "ksi";
const mpsi = "MPa";

function bendingStressKsi(M_lbf_in, d_in, Kf = 1) {
  return Kf * 32 * M_lbf_in / (Math.PI * d_in ** 3) / 1000;
}

function torsionStressKsi(T_lbf_in, d_in, Kfs = 1) {
  return Kfs * 16 * T_lbf_in / (Math.PI * d_in ** 3) / 1000;
}

function axialStressKsi(F_lbf, area_in2, Kf = 1) {
  return Kf * F_lbf / area_in2 / 1000;
}

function components(maxValue, minValue) {
  return {
    max: maxValue,
    min: minValue,
    a: (maxValue - minValue) / 2,
    m: (maxValue + minValue) / 2
  };
}

function criterionSafety(criterion, Se, Sut, Sy, sa, smRaw) {
  const sm = Math.max(0, smRaw);
  if (sa <= 0) return Infinity;
  if (sm === 0) return Se / sa;
  if (criterion === "goodman") return 1 / (sa / Se + sm / Sut);
  if (criterion === "soderberg") return 1 / (sa / Se + sm / Sy);
  if (criterion === "asme") return 1 / Math.sqrt((sa / Se) ** 2 + (sm / Sy) ** 2);
  const A = (sm / Sut) ** 2;
  const B = sa / Se;
  return (-B + Math.sqrt(B ** 2 + 4 * A)) / (2 * A);
}

function equivalentReversed(criterion, Se, Sut, Sy, sa, smRaw) {
  const sm = Math.max(0, smRaw);
  if (sm === 0) return sa;
  if (criterion === "goodman") return sa / (1 - sm / Sut);
  if (criterion === "soderberg") return sa / (1 - sm / Sy);
  if (criterion === "asme") return sa / Math.sqrt(1 - (sm / Sy) ** 2);
  return sa / (1 - (sm / Sut) ** 2);
}

function snConstants(Sut, Se, f) {
  const S1000 = f * Sut;
  const a = S1000 ** 2 / Se;
  const b = -(1 / 3) * Math.log10(S1000 / Se);
  return { S1000, a, b };
}

function lifeCycles(Sar, Sut, Se, f) {
  const c = snConstants(Sut, Se, f);
  if (Sar <= Se) return Infinity;
  if (Sar >= c.S1000) return Math.pow(Sar / c.a, 1 / c.b);
  return Math.pow(Sar / c.a, 1 / c.b);
}

function yieldingSafetyNormal(Sy, sa, sm) {
  const smax = sm + sa;
  const smin = sm - sa;
  return Sy / Math.max(Math.abs(smax), Math.abs(smin));
}

function yieldingSafetyShear(Sy, ta, tm) {
  const tmax = tm + ta;
  const tmin = tm - ta;
  const tauAllow = Sy / 2;
  return tauAllow / Math.max(Math.abs(tmax), Math.abs(tmin));
}

function percentError(answer, correct) {
  if (!Number.isFinite(answer)) return Infinity;
  const scale = Math.max(1, Math.abs(correct));
  return Math.abs(answer - correct) / scale;
}

function classifyAnswer(answer, correct, relTol = 0.025, closeTol = 0.08) {
  const err = percentError(answer, correct);
  if (err <= relTol) return "correct";
  if (err <= closeTol) return "close";
  return "incorrect";
}

function direction(answer, correct) {
  if (!Number.isFinite(answer)) return "missing";
  return answer > correct ? "high" : "low";
}

function basicHint(id, answer, correct) {
  if (!Number.isFinite(answer)) return "Enter a numerical value.";
  const d = direction(answer, correct);
  if (Math.abs(answer - 2 * correct) / Math.max(1, Math.abs(correct)) < 0.08) return "Looks like a range may have been used where an amplitude was needed.";
  if (Math.abs(answer - correct / 2) / Math.max(1, Math.abs(correct)) < 0.08) return "Looks like the value may have been divided by 2 one extra time.";
  return `This value is ${d}; recheck signs, stress concentration factors, and whether the value is a max/min, mean, or alternating component.`;
}

function renderGiven(container, items) {
  container.innerHTML = items.map((item) => `<div class="given"><span>${item.label}</span><strong>${item.value}</strong>${item.note ? `<span>${item.note}</span>` : ""}</div>`).join("");
}

function renderAnswers(container, fields) {
  container.innerHTML = fields.map((field) => `
    <label class="answer-field" data-id="${field.id}">
      <span>${field.label}</span>
      <input id="${field.id}" inputmode="decimal" autocomplete="off">
    </label>`).join("");
}

function answerValue(id) {
  const text = $(`#${id}`).value.trim();
  return text === "" ? NaN : Number(text);
}

function checkField(field, relTol = 0.025) {
  const answer = answerValue(field.id);
  const status = classifyAnswer(answer, field.value, relTol);
  const node = document.querySelector(`[data-id="${field.id}"]`);
  node.classList.remove("correct", "close", "incorrect");
  node.classList.add(status);
  return { ...field, answer, status };
}

function solutionCards(container, rows) {
  container.innerHTML = rows.map((row) => `<div class="solution-card"><span>${row.label}</span><strong>${row.value}</strong></div>`).join("");
}

function setupAttempts({ checkButton, statusNode, feedbackNode, maxAttempts = 3, onCheck, onReveal, onThirdAttempt }) {
  let attempts = 0;
  function reset() {
    attempts = 0;
    checkButton.disabled = false;
    statusNode.textContent = `Attempt 1 of ${maxAttempts}`;
    feedbackNode.className = "feedback";
    feedbackNode.innerHTML = "Ready for your answer.";
  }
  function check() {
    if (attempts >= maxAttempts) return;
    attempts += 1;
    const finalAttempt = attempts >= maxAttempts;
    const result = onCheck({ attempts, finalAttempt });
    if (result.solved || finalAttempt) {
      checkButton.disabled = true;
      statusNode.textContent = result.solved ? "Solved" : "Solutions revealed";
      onReveal(result.solved);
    } else {
      statusNode.textContent = `Attempt ${attempts + 1} of ${maxAttempts}`;
      if (attempts === maxAttempts - 1 && onThirdAttempt) onThirdAttempt();
    }
  }
  checkButton.addEventListener("click", check);
  return { reset };
}

function drawFatigueDiagram(svg, { Se, Sut, Sy, sa, sm, criterion, visibleCriteria = [criterion], reveal }) {
  svg.replaceChildren();
  const W = 760, H = 470, pad = 58;
  const xMax = Math.max(Sut * 1.08, Sy * 1.08, sm * 1.4, 80);
  const yMax = Math.max(Se * 1.45, sa * 1.55, 40);
  const x = (v) => pad + v / xMax * (W - 2 * pad);
  const y = (v) => H - pad - v / yMax * (H - 2 * pad);
  const grid = el("g");
  for (let i = 0; i <= 5; i++) {
    const xv = xMax * i / 5;
    const yv = yMax * i / 5;
    grid.append(el("line", { x1: x(xv), y1: pad, x2: x(xv), y2: H - pad, stroke: "#deded7" }));
    grid.append(el("line", { x1: pad, y1: y(yv), x2: W - pad, y2: y(yv), stroke: "#deded7" }));
    const xt = el("text", { x: x(xv), y: H - pad + 20, fill: "#69716d", "text-anchor": "middle", "font-family": "DM Mono", "font-size": 10 });
    xt.textContent = fmtLoose(xv, 0);
    const yt = el("text", { x: pad - 8, y: y(yv) + 3, fill: "#69716d", "text-anchor": "end", "font-family": "DM Mono", "font-size": 10 });
    yt.textContent = fmtLoose(yv, 0);
    grid.append(xt, yt);
  }
  grid.append(el("line", { x1: pad, y1: H - pad, x2: W - pad, y2: H - pad, stroke: "#17201c", "stroke-width": 1.2 }));
  grid.append(el("line", { x1: pad, y1: pad, x2: pad, y2: H - pad, stroke: "#17201c", "stroke-width": 1.2 }));
  const xl = el("text", { x: W - pad, y: H - 16, fill: "#17201c", "text-anchor": "end", "font-family": "DM Mono", "font-size": 11 });
  xl.textContent = "mean stress, σₘ";
  const yl = el("text", { x: pad + 10, y: pad - 18, fill: "#17201c", "font-family": "DM Mono", "font-size": 11 });
  yl.textContent = "alternating stress, σₐ";
  svg.append(grid, xl, yl);

  const colors = { goodman: "#315c6d", gerber: "#177458", soderberg: "#9a6417", asme: "#7a4e9d" };
  visibleCriteria.forEach((active) => {
    const path = el("path", { fill: "none", stroke: colors[active], "stroke-width": active === criterion ? 3.5 : 2, "stroke-dasharray": active === criterion ? "" : "7 5" });
    let d = "";
    if (active === "gerber") {
      for (let i = 0; i <= 80; i++) {
        const xm = Sut * i / 80;
        const ya = Se * (1 - (xm / Sut) ** 2);
        d += `${i ? "L" : "M"}${x(xm).toFixed(1)},${y(Math.max(0, ya)).toFixed(1)} `;
      }
    } else if (active === "asme") {
      for (let i = 0; i <= 80; i++) {
        const xm = Sy * i / 80;
        const ya = Se * Math.sqrt(Math.max(0, 1 - (xm / Sy) ** 2));
        d += `${i ? "L" : "M"}${x(xm).toFixed(1)},${y(ya).toFixed(1)} `;
      }
    } else {
      const xEnd = active === "soderberg" ? Sy : Sut;
      d = `M${x(0)},${y(Se)} L${x(xEnd)},${y(0)}`;
    }
    path.setAttribute("d", d);
    svg.append(path);
    const labelPos = {
      goodman: [Sut * .68, Se * .31],
      gerber: [Sut * .55, Se * .73],
      soderberg: [Sy * .58, Se * .42],
      asme: [Sy * .48, Se * .80]
    }[active];
    svg.append(labelAt(active === "asme" ? "ASME elliptic" : active[0].toUpperCase() + active.slice(1), x(labelPos[0]), y(labelPos[1]), colors[active]));
  });
  svg.append(el("circle", { cx: x(Math.max(0, sm)), cy: y(sa), r: 7, fill: "#ff5c35", stroke: "#fff", "stroke-width": 3 }));
  if (reveal) {
    const pt = el("text", { x: x(Math.max(0, sm)) + 12, y: y(sa) - 12, fill: "#b4371d", "font-family": "DM Mono", "font-size": 10 });
    pt.textContent = `(${fmt(Math.max(0, sm), 1)}, ${fmt(sa, 1)})`;
    svg.append(pt);
  }
}

function labelAt(text, x, y, color = "#315c6d") {
  const t = el("text", { x, y, fill: color, "font-family": "DM Mono", "font-size": 11 });
  t.textContent = text;
  return t;
}

window.Fatigue = {
  $, $$, svgNS: NS, rnd, pick, fmt, fmtLoose, ksi, mpsi,
  bendingStressKsi, torsionStressKsi, axialStressKsi, components,
  criterionSafety, equivalentReversed, snConstants, lifeCycles,
  yieldingSafetyNormal, yieldingSafetyShear,
  classifyAnswer, basicHint, renderGiven, renderAnswers, answerValue,
  checkField, solutionCards, setupAttempts, drawFatigueDiagram
};
