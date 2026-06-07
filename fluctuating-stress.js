const F = window.Fatigue;
let current;
let attemptCtl;

function makeCase() {
  const type = F.pick(["rotatingBending", "axialLink", "torsion", "cantilever"]);
  if (type === "rotatingBending") {
    const load = F.rnd(350, 1150, 25);
    const arm = F.rnd(4, 11, .5);
    const d = F.rnd(.65, 1.25, .05);
    const Kf = F.rnd(1.15, 1.85, .05);
    const M = load * arm;
    const s = F.bendingStressKsi(M, d, Kf);
    return {
      title: "Rotating shaft with steady transverse load",
      prompt: "A shoulder on a rotating shaft sees a steady transverse force. At the surface, the bending stress is completely reversed.",
      givens: [
        ["Force", `${F.fmtLoose(load, 0)} lbf`],
        ["Moment arm", `${F.fmtLoose(arm, 1)} in`],
        ["Shaft diameter", `${F.fmtLoose(d, 2)} in`],
        ["Fatigue stress concentration", `K<sub>f</sub> = ${F.fmtLoose(Kf, 2)}`]
      ],
      stressKind: "normal",
      max: s,
      min: -s,
      note: "Rotating bending turns a steady bending moment into a reversed surface stress.",
      equations: [
        "M = FL",
        "σ = K<sub>f</sub>(32M / πd<sup>3</sup>)",
        "For rotating bending: σ<sub>max</sub> = +σ and σ<sub>min</sub> = −σ"
      ]
    };
  }
  if (type === "axialLink") {
    const w = F.rnd(.7, 1.4, .05);
    const t = F.rnd(.18, .38, .02);
    const area = w * t;
    const Kf = F.rnd(1.05, 1.55, .05);
    const Ft = F.rnd(3.5, 10, .5) * 1000;
    const Fc = -F.rnd(5, 18, .5) * 1000;
    const smax = F.axialStressKsi(Ft, area, Kf);
    const smin = F.axialStressKsi(Fc, area, Kf);
    return {
      title: "Notched connecting link in tension and compression",
      prompt: "A flat link carries a fluctuating axial force. Treat tension as positive and compression as negative.",
      givens: [
        ["Rectangular width, b", `${F.fmtLoose(w, 2)} in`],
        ["Rectangular thickness, h", `${F.fmtLoose(t, 2)} in`],
        ["Maximum force", `+${F.fmtLoose(Ft / 1000, 1)} kip`],
        ["Minimum force", `${F.fmtLoose(Fc / 1000, 1)} kip`],
        ["Fatigue stress concentration", `K<sub>f</sub> = ${F.fmtLoose(Kf, 2)}`]
      ],
      stressKind: "normal",
      max: smax,
      min: smin,
      note: "This is the sign convention that makes negative mean stress possible.",
      equations: [
        "A = bh",
        "σ<sub>max</sub> = K<sub>f</sub>F<sub>max</sub> / A",
        "σ<sub>min</sub> = K<sub>f</sub>F<sub>min</sub> / A"
      ]
    };
  }
  if (type === "torsion") {
    const d = F.rnd(.55, 1.1, .05);
    const Kfs = F.rnd(1.1, 1.7, .05);
    const Tmin = F.rnd(80, 350, 10);
    const Tmax = Tmin + F.rnd(250, 850, 25);
    const tmax = F.torsionStressKsi(Tmax, d, Kfs);
    const tmin = F.torsionStressKsi(Tmin, d, Kfs);
    return {
      title: "Shaft in pulsating torsion",
      prompt: "A shaft torque fluctuates but never reverses. Use K<sub>fs</sub> on the nominal torsional stress before taking components.",
      givens: [
        ["Maximum torque", `${F.fmtLoose(Tmax, 0)} lbf-in`],
        ["Minimum torque", `${F.fmtLoose(Tmin, 0)} lbf-in`],
        ["Shaft diameter", `${F.fmtLoose(d, 2)} in`],
        ["Fatigue stress concentration", `K<sub>fs</sub> = ${F.fmtLoose(Kfs, 2)}`]
      ],
      stressKind: "shear",
      max: tmax,
      min: tmin,
      note: "Both shear stresses have the same sign, so the mean shear is positive.",
      equations: [
        "τ = K<sub>fs</sub>(16T / πd<sup>3</sup>)",
        "τ<sub>a</sub> = (τ<sub>max</sub> − τ<sub>min</sub>) / 2",
        "τ<sub>m</sub> = (τ<sub>max</sub> + τ<sub>min</sub>) / 2"
      ]
    };
  }
  const L = F.rnd(4, 10, .5);
  const d = F.rnd(.7, 1.25, .05);
  const Kf = F.rnd(1.1, 1.6, .05);
  const Fmin = F.rnd(120, 450, 10);
  const Fmax = Fmin + F.rnd(350, 950, 25);
  const smax = F.bendingStressKsi(Fmax * L, d, Kf);
  const smin = F.bendingStressKsi(Fmin * L, d, Kf);
  return {
    title: "Cantilever round bar with pulsating end load",
    prompt: "The bending stress changes magnitude but not sign. Apply K<sub>f</sub> to both endpoint stresses.",
    givens: [
      ["Maximum force", `${F.fmtLoose(Fmax, 0)} lbf`],
      ["Minimum force", `${F.fmtLoose(Fmin, 0)} lbf`],
      ["Moment arm", `${F.fmtLoose(L, 1)} in`],
      ["Diameter and K<sub>f</sub>", `${F.fmtLoose(d, 2)} in, K<sub>f</sub> = ${F.fmtLoose(Kf, 2)}`]
    ],
    stressKind: "normal",
    max: smax,
    min: smin,
    note: "Pulsating bending has nonzero alternating and mean components.",
    equations: [
      "M = FL",
      "σ = K<sub>f</sub>(32M / πd<sup>3</sup>)",
      "σ<sub>a</sub> = (σ<sub>max</sub> − σ<sub>min</sub>) / 2; σ<sub>m</sub> = (σ<sub>max</sub> + σ<sub>min</sub>) / 2"
    ]
  };
}

function fieldsFor(c) {
  const comp = F.components(c.max, c.min);
  const prefix = c.stressKind === "shear" ? "τ" : "σ";
  return [
    { id: "max", label: `${prefix}<sub>max</sub> (ksi)`, value: comp.max },
    { id: "min", label: `${prefix}<sub>min</sub> (ksi)`, value: comp.min },
    { id: "a", label: `${prefix}<sub>a</sub> (ksi)`, value: comp.a },
    { id: "m", label: `${prefix}<sub>m</sub> (ksi)`, value: comp.m }
  ];
}

function drawCycle(c, showScale = false, revealSolution = false) {
  const svg = F.$("#cyclePlot");
  svg.replaceChildren();
  const W = 760, H = 430, pad = 54;
  const high = Math.max(c.max, c.min, 0);
  const low = Math.min(c.max, c.min, 0);
  const span = Math.max(8, high - low);
  const y = (v) => H - pad - (v - low) / span * (H - 2 * pad);
  const x = (i) => pad + i / 160 * (W - 2 * pad);
  for (let i = 0; i <= 4; i++) {
    const v = low + span * i / 4;
    svg.append(elLine(pad, y(v), W - pad, y(v), "#deded7"));
    if (showScale) {
      const label = document.createElementNS(F.svgNS, "text");
      label.setAttribute("x", pad - 8);
      label.setAttribute("y", y(v) + 3);
      label.setAttribute("text-anchor", "end");
      label.setAttribute("font-family", "DM Mono");
      label.setAttribute("font-size", "10");
      label.setAttribute("fill", "#69716d");
      label.textContent = F.fmtLoose(v, 1);
      svg.append(label);
    }
  }
  svg.append(elLine(pad, y(0), W - pad, y(0), "#17201c"));
  const pts = [];
  for (let i = 0; i <= 160; i++) {
    const val = (c.max + c.min) / 2 + (c.max - c.min) / 2 * Math.cos(i / 160 * Math.PI * 2);
    pts.push(`${i ? "L" : "M"}${x(i).toFixed(1)},${y(val).toFixed(1)}`);
  }
  const path = document.createElementNS(F.svgNS, "path");
  path.setAttribute("d", pts.join(" "));
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#315c6d");
  path.setAttribute("stroke-width", "3");
  svg.append(path);
  if (revealSolution) {
    const comp = F.components(c.max, c.min);
    svg.append(elLine(pad, y(comp.m), W - pad, y(comp.m), "#ff5c35", "4 5"));
    svg.append(textAt(`mean = ${F.fmt(comp.m, 2)} ksi`, W - pad - 180, y(comp.m) - 8, "#b4371d"));
  }
}

function elLine(x1, y1, x2, y2, stroke, dash = "") {
  const line = document.createElementNS(F.svgNS, "line");
  line.setAttribute("x1", x1); line.setAttribute("y1", y1); line.setAttribute("x2", x2); line.setAttribute("y2", y2);
  line.setAttribute("stroke", stroke); line.setAttribute("stroke-width", stroke === "#17201c" ? 1.2 : 1);
  if (dash) line.setAttribute("stroke-dasharray", dash);
  return line;
}

function textAt(text, x, y, fill) {
  const t = document.createElementNS(F.svgNS, "text");
  t.setAttribute("x", x); t.setAttribute("y", y); t.setAttribute("fill", fill);
  t.setAttribute("font-family", "DM Mono"); t.setAttribute("font-size", "11");
  t.textContent = text;
  return t;
}

function newCase() {
  current = makeCase();
  F.$("#caseTitle").textContent = current.title;
  F.$("#casePrompt").innerHTML = current.prompt;
  F.renderGiven(F.$("#givenGrid"), current.givens.map(([label, value]) => ({ label, value })));
  F.renderAnswers(F.$("#answerGrid"), fieldsFor(current));
  F.$("#solutionPanel").hidden = true;
  F.$("#equationPanel").hidden = true;
  drawCycle(current, false, false);
  attemptCtl.reset();
}

attemptCtl = F.setupAttempts({
  checkButton: F.$("#checkAnswer"),
  statusNode: F.$("#attemptStatus"),
  feedbackNode: F.$("#feedback"),
  onCheck: () => {
    const fields = fieldsFor(current);
    const checked = fields.map((field) => F.checkField(field));
    const correct = checked.filter((r) => r.status === "correct").length;
    const solved = correct === checked.length;
    const items = checked.filter((r) => r.status !== "correct").map((r) => `<li><b>${r.label}</b>: ${F.basicHint(r.id, r.answer, r.value)}</li>`);
    F.$("#feedback").className = `feedback ${solved ? "good" : "warn"}`;
    F.$("#feedback").innerHTML = solved ? "All components are correct." : `${correct} of ${checked.length} correct.${items.length ? `<ul>${items.join("")}</ul>` : ""}`;
    return { solved };
  },
  onReveal: () => {
    const fields = fieldsFor(current);
    F.solutionCards(F.$("#solutionGrid"), [
      ...fields.map((field) => ({ label: field.label, value: F.fmt(field.value, 2) })),
      { label: "Key idea", value: current.note }
    ]);
    F.$("#solutionPanel").hidden = false;
    drawCycle(current, true, true);
  },
  onThirdAttempt: () => {
    F.$("#equationPanel").innerHTML = `<strong>Equations for attempt three</strong><div class="equation-list">${[
      ...current.equations,
      current.stressKind === "shear"
        ? "τ<sub>a</sub> = (τ<sub>max</sub> − τ<sub>min</sub>) / 2; τ<sub>m</sub> = (τ<sub>max</sub> + τ<sub>min</sub>) / 2"
        : "σ<sub>a</sub> = (σ<sub>max</sub> − σ<sub>min</sub>) / 2; σ<sub>m</sub> = (σ<sub>max</sub> + σ<sub>min</sub>) / 2"
    ].map((eq) => `<div class="equation">${eq}</div>`).join("")}</div>`;
    F.$("#equationPanel").hidden = false;
    drawCycle(current, true, false);
  }
});

F.$("#newCase").addEventListener("click", newCase);
newCase();
