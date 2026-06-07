const F = window.Fatigue;
let current;
let attemptCtl;
const names = { goodman: "Goodman", gerber: "Gerber", soderberg: "Soderberg" };

function makeCase() {
  const material = F.pick([
    { name: "AISI 1020 cold-drawn steel", Sut: 68, Sy: 57, Se: 25, f: .86 },
    { name: "AISI 1035 hot-rolled steel", Sut: 70, Sy: 39.5, Se: 26, f: .84 },
    { name: "AISI 1045 cold-drawn steel", Sut: 91, Sy: 77, Se: 33, f: .82 },
    { name: "AISI 1095 hot-rolled steel", Sut: 120, Sy: 66, Se: 36, f: .80 }
  ]);
  const criterion = F.pick(["goodman", "gerber", "soderberg"]);
  const c = F.snConstants(material.Sut, material.Se, material.f);
  let sa, sm, Sar, N;
  for (let i = 0; i < 200; i++) {
    sa = F.rnd(material.Se * .75, c.S1000 * .72, .2);
    sm = F.rnd(0, material.Sut * .20, .2);
    Sar = F.equivalentReversed(criterion, material.Se, material.Sut, material.Sy, sa, sm);
    N = F.lifeCycles(Sar, material.Sut, material.Se, material.f);
    if (Number.isFinite(N) && N > 2500 && N < 800000) break;
  }
  const rpm = F.rnd(450, 1800, 50);
  return {
    title: `${names[criterion]} finite-life shaft case`,
    prompt: "A Shigley-style rotating component has already been reduced to effective alternating and mean normal stresses. The corrected endurance limit is provided.",
    criterion,
    material,
    sa,
    sm,
    Sar,
    a: c.a,
    b: c.b,
    S1000: c.S1000,
    N,
    rpm,
    hours: N / (rpm * 60),
    ny: F.yieldingSafetyNormal(material.Sy, sa, sm)
  };
}

function fieldsFor(c) {
  return [
    { id: "sar", label: "Equivalent completely reversed stress, σ<sub>ar</sub> (ksi)", value: c.Sar },
    { id: "a", label: "S-N coefficient, a", value: c.a },
    { id: "b", label: "S-N exponent, b", value: c.b },
    { id: "N", label: "Predicted life, N (cycles)", value: c.N }
  ];
}

function renderCase() {
  F.$("#caseTitle").textContent = current.title;
  F.$("#casePrompt").innerHTML = current.prompt;
  F.renderGiven(F.$("#givenGrid"), [
    { label: "Material", value: current.material.name },
    { label: "Criterion", value: names[current.criterion] },
    { label: "Corrected endurance limit", value: `S<sub>e</sub> = ${F.fmt(current.material.Se, 1)} ksi` },
    { label: "Ultimate strength", value: `S<sub>ut</sub> = ${F.fmt(current.material.Sut, 1)} ksi` },
    { label: "Yield strength", value: `S<sub>y</sub> = ${F.fmt(current.material.Sy, 1)} ksi` },
    { label: "10<sup>3</sup>-cycle strength fraction", value: `f = ${F.fmt(current.material.f, 2)}` },
    { label: "Alternating stress", value: `σ<sub>a</sub> = ${F.fmt(current.sa, 2)} ksi` },
    { label: "Mean stress", value: `σ<sub>m</sub> = ${F.fmt(current.sm, 2)} ksi` }
  ]);
  F.renderAnswers(F.$("#answerGrid"), fieldsFor(current));
  F.$("#solutionPanel").hidden = true;
  F.$("#equationPanel").hidden = true;
  drawSN(false);
  attemptCtl.reset();
}

function finiteHint(result) {
  if (!Number.isFinite(result.answer)) return "Enter a numerical value.";
  if (result.id === "sar") {
    const plain = current.sa;
    if (Math.abs(result.answer - plain) / Math.max(1, plain) < .04 && current.sm > 0) return "This is just σ<sub>a</sub>. Convert the fluctuating stress to equivalent reversed stress using the selected criterion first.";
    return result.answer > result.value ? "Too high. Check the mean-stress conversion." : "Too low. Check the mean-stress conversion and denominator.";
  }
  if (result.id === "a") return "Use a = (fS<sub>ut</sub>)<sup>2</sup> / S<sub>e</sub> for the corrected S-N line.";
  if (result.id === "b") return "Use b = −(1/3)log<sub>10</sub>(fS<sub>ut</sub> / S<sub>e</sub>). The exponent should be negative.";
  if (result.id === "N") {
    if (result.answer < 1000 || result.answer > 1000000) return "This generated case should land between 10<sup>3</sup> and 10<sup>6</sup> cycles; recheck σ<sub>ar</sub> and the exponent.";
    return result.answer > result.value ? "Life is too high. That usually means σ<sub>ar</sub> was too low or the exponent sign was reversed." : "Life is too low. That usually means σ<sub>ar</sub> was too high or the S-N constants were mixed.";
  }
  return F.basicHint(result.id, result.answer, result.value);
}

function drawSN(reveal) {
  const svg = F.$("#snPlot");
  svg.replaceChildren();
  const W = 760, H = 470, pad = 58;
  const x = (logN) => pad + (logN - 3) / 3 * (W - 2 * pad);
  const yMin = current.material.Se * .72;
  const yMax = current.S1000 * 1.18;
  const y = (S) => H - pad - (S - yMin) / (yMax - yMin) * (H - 2 * pad);
  for (let i = 3; i <= 6; i++) {
    svg.append(line(x(i), pad, x(i), H - pad, "#deded7"));
    svg.append(text({ 3: "10³", 4: "10⁴", 5: "10⁵", 6: "10⁶" }[i], x(i), H - pad + 20, "#69716d", "middle"));
  }
  for (let i = 0; i <= 4; i++) {
    const S = yMin + (yMax - yMin) * i / 4;
    svg.append(line(pad, y(S), W - pad, y(S), "#deded7"));
    svg.append(text(F.fmtLoose(S, 0), pad - 8, y(S) + 3, "#69716d", "end"));
  }
  svg.append(line(pad, H - pad, W - pad, H - pad, "#17201c"));
  svg.append(line(pad, pad, pad, H - pad, "#17201c"));
  const path = document.createElementNS(F.svgNS, "path");
  path.setAttribute("d", `M${x(3)},${y(current.S1000)} L${x(6)},${y(current.material.Se)}`);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#315c6d");
  path.setAttribute("stroke-width", "3");
  svg.append(path);
  svg.append(text("cycles, N", W - pad, H - 16, "#17201c", "end"));
  svg.append(text("fatigue strength, S", pad + 8, pad - 18, "#17201c", "start"));
  if (reveal) {
    const logN = Math.log10(current.N);
    svg.append(line(pad, y(current.Sar), x(logN), y(current.Sar), "#ff5c35", "4 5"));
    svg.append(line(x(logN), y(current.Sar), x(logN), H - pad, "#ff5c35", "4 5"));
    svg.append(circle(x(logN), y(current.Sar)));
    svg.append(text(`σₐᵣ = ${F.fmt(current.Sar, 2)} ksi`, x(logN) + 12, y(current.Sar) - 14, "#b4371d", "start"));
    svg.append(text(`N = ${F.fmtLoose(current.N, 0)}`, x(logN) + 12, y(current.Sar) + 2, "#b4371d", "start"));
  }
}

function line(x1, y1, x2, y2, stroke, dash = "") {
  const n = document.createElementNS(F.svgNS, "line");
  n.setAttribute("x1", x1); n.setAttribute("y1", y1); n.setAttribute("x2", x2); n.setAttribute("y2", y2);
  n.setAttribute("stroke", stroke); n.setAttribute("stroke-width", stroke === "#17201c" ? 1.2 : 1);
  if (dash) n.setAttribute("stroke-dasharray", dash);
  return n;
}

function text(content, x, y, fill, anchor) {
  const n = document.createElementNS(F.svgNS, "text");
  n.setAttribute("x", x); n.setAttribute("y", y); n.setAttribute("fill", fill); n.setAttribute("text-anchor", anchor);
  n.setAttribute("font-family", "DM Mono"); n.setAttribute("font-size", "10");
  n.textContent = content;
  return n;
}

function circle(cx, cy) {
  const n = document.createElementNS(F.svgNS, "circle");
  n.setAttribute("cx", cx); n.setAttribute("cy", cy); n.setAttribute("r", 7);
  n.setAttribute("fill", "#ff5c35"); n.setAttribute("stroke", "#fff"); n.setAttribute("stroke-width", 3);
  return n;
}

function revealSolution() {
  F.solutionCards(F.$("#solutionGrid"), [
    { label: `${names[current.criterion]} equivalent stress`, value: `σ<sub>ar</sub> = ${F.fmt(current.Sar, 3)} ksi` },
    { label: "Strength at 10<sup>3</sup> cycles", value: `fS<sub>ut</sub> = ${F.fmt(current.S1000, 2)} ksi` },
    { label: "S-N coefficient", value: `a = ${F.fmt(current.a, 3)}` },
    { label: "S-N exponent", value: `b = ${F.fmt(current.b, 5)}` },
    { label: "Predicted life", value: `N = ${F.fmtLoose(current.N, 0)} cycles` },
    { label: "At assigned speed", value: `${F.fmt(current.hours, 2)} hr at ${F.fmtLoose(current.rpm, 0)} rpm` },
    { label: "Yielding factor", value: `n<sub>y</sub> = ${F.fmt(current.ny, 3)}` },
    { label: "Life classification", value: current.Sar <= current.material.Se ? "Infinite-life region" : "Finite-life region" },
    { label: "Sequence reminder", value: "Criterion conversion before S-N life" }
  ]);
  F.$("#solutionPanel").hidden = false;
  drawSN(true);
}

attemptCtl = F.setupAttempts({
  checkButton: F.$("#checkAnswer"),
  statusNode: F.$("#attemptStatus"),
  feedbackNode: F.$("#feedback"),
  onCheck: () => {
    const checked = fieldsFor(current).map((field) => F.checkField(field, field.id === "N" ? .04 : .025));
    const correct = checked.filter((r) => r.status === "correct").length;
    const solved = correct === checked.length;
    const misses = checked.filter((r) => r.status !== "correct").map((r) => `<li><b>${r.label}</b>: ${finiteHint(r)}</li>`);
    F.$("#feedback").className = `feedback ${solved ? "good" : "warn"}`;
    F.$("#feedback").innerHTML = solved ? "S-N calculation is correct." : `${correct} of ${checked.length} correct.${misses.length ? `<ul>${misses.join("")}</ul>` : ""}`;
    return { solved };
  },
  onReveal: revealSolution,
  onThirdAttempt: () => {
    const criterionEquation = {
      goodman: "Goodman: σ<sub>ar</sub> = σ<sub>a</sub> / (1 − σ<sub>m</sub>/S<sub>ut</sub>)",
      gerber: "Gerber: σ<sub>ar</sub> = σ<sub>a</sub> / [1 − (σ<sub>m</sub>/S<sub>ut</sub>)<sup>2</sup>]",
      soderberg: "Soderberg: σ<sub>ar</sub> = σ<sub>a</sub> / (1 − σ<sub>m</sub>/S<sub>y</sub>)"
    }[current.criterion];
    F.$("#equationPanel").innerHTML = `<strong>Equations for attempt three</strong><div class="equation-list">
      <div class="equation">${criterionEquation}</div>
      <div class="equation">S(10<sup>3</sup>) = fS<sub>ut</sub></div>
      <div class="equation">a = (fS<sub>ut</sub>)<sup>2</sup> / S<sub>e</sub></div>
      <div class="equation">b = −(1/3) log<sub>10</sub>(fS<sub>ut</sub> / S<sub>e</sub>)</div>
      <div class="equation">S = aN<sup>b</sup> &nbsp;⇒&nbsp; N = (S/a)<sup>1/b</sup>, using S = σ<sub>ar</sub></div>
    </div>`;
    F.$("#equationPanel").hidden = false;
  }
});

F.$("#newCase").addEventListener("click", () => {
  current = makeCase();
  renderCase();
});
current = makeCase();
renderCase();
