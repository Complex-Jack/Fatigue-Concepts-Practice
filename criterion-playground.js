const F = window.Fatigue;
let current;
let attemptCtl;
let visibleCriteria = new Set();
let diagramReveal = false;

const names = { goodman: "Goodman", gerber: "Gerber", soderberg: "Soderberg", asme: "ASME elliptic" };
const colors = { goodman: "#315c6d", gerber: "#177458", soderberg: "#9a6417", asme: "#7a4e9d" };

function makeCase() {
  const material = F.pick([
    { name: "AISI 1020 hot-rolled steel", Sut: 55, Sy: 30, Se: 22 },
    { name: "AISI 1018 cold-drawn steel", Sut: 64, Sy: 54, Se: 28 },
    { name: "AISI 1045 hot-rolled steel", Sut: 81, Sy: 45, Se: 30 },
    { name: "AISI 1095 hot-rolled steel", Sut: 120, Sy: 66, Se: 36 }
  ]);
  const criterion = F.pick(["goodman", "gerber", "soderberg"]);
  const type = F.pick(["shaft", "link", "bracket"]);
  let sa, sm, context;
  if (type === "shaft") {
    sa = F.rnd(material.Se * .38, material.Se * .82, .2);
    sm = F.rnd(0, material.Sut * .22, .2);
    context = "A rotating shaft shoulder has already been reduced to effective alternating and mean bending stresses.";
  } else if (type === "link") {
    sa = F.rnd(material.Se * .34, material.Se * .75, .2);
    sm = F.rnd(-material.Sut * .16, material.Sut * .18, .2);
    context = "A notched axial link fluctuates between tension and compression. Negative mean normal stress is treated conservatively for fatigue.";
  } else {
    sa = F.rnd(material.Se * .28, material.Se * .68, .2);
    sm = F.rnd(material.Sut * .08, material.Sut * .28, .2);
    context = "A cantilever bracket sees pulsating bending after stress concentration has been applied.";
  }
  return {
    title: `${names[criterion]} criterion case`,
    prompt: context,
    criterion,
    material,
    sa,
    sm,
    nf: F.criterionSafety(criterion, material.Se, material.Sut, material.Sy, sa, sm),
    ny: F.yieldingSafetyNormal(material.Sy, sa, sm)
  };
}

function fieldsFor(c) {
  return [
    { id: "nf", label: `Fatigue factor of safety, n<sub>f</sub> (${names[c.criterion]})`, value: c.nf },
    { id: "ny", label: "First-cycle yielding factor of safety, n<sub>y</sub>", value: c.ny }
  ];
}

function renderCriterionControls() {
  const order = ["goodman", "gerber", "soderberg", "asme"];
  F.$("#criterionControls").innerHTML = order.map((id) => `
    <label class="criterion-toggle ${id === current.criterion ? "required" : ""}" style="--curve-color:${colors[id]}">
      <input type="checkbox" data-criterion="${id}" ${visibleCriteria.has(id) ? "checked" : ""} ${id === current.criterion ? "disabled" : ""}>
      <span>${names[id]}</span>
    </label>`).join("");
  F.$$("#criterionControls input:not(:disabled)").forEach((input) => input.addEventListener("change", () => {
    input.checked ? visibleCriteria.add(input.dataset.criterion) : visibleCriteria.delete(input.dataset.criterion);
    drawDiagram(diagramReveal);
  }));
}

function drawDiagram(reveal) {
  F.drawFatigueDiagram(F.$("#fatiguePlot"), {
    Se: current.material.Se,
    Sut: current.material.Sut,
    Sy: current.material.Sy,
    sa: current.sa,
    sm: current.sm,
    criterion: current.criterion,
    visibleCriteria: [...visibleCriteria],
    reveal
  });
}

function renderCase() {
  F.$("#caseTitle").textContent = current.title;
  F.$("#casePrompt").innerHTML = current.prompt;
  F.$("#diagramTitle").textContent = `${names[current.criterion]} assigned · compare all four`;
  F.renderGiven(F.$("#givenGrid"), [
    { label: "Material", value: current.material.name },
    { label: "Corrected endurance limit", value: `S<sub>e</sub> = ${F.fmt(current.material.Se, 1)} ksi` },
    { label: "Ultimate strength", value: `S<sub>ut</sub> = ${F.fmt(current.material.Sut, 1)} ksi` },
    { label: "Yield strength", value: `S<sub>y</sub> = ${F.fmt(current.material.Sy, 1)} ksi` },
    { label: "Alternating stress", value: `σ<sub>a</sub> = ${F.fmt(current.sa, 2)} ksi` },
    { label: "Mean stress", value: `σ<sub>m</sub> = ${F.fmt(current.sm, 2)} ksi` }
  ]);
  F.renderAnswers(F.$("#answerGrid"), fieldsFor(current));
  F.$("#solutionPanel").hidden = true;
  F.$("#equationPanel").hidden = true;
  diagramReveal = false;
  visibleCriteria = new Set(["goodman", "gerber", "soderberg", "asme"]);
  renderCriterionControls();
  drawDiagram(false);
  attemptCtl.reset();
}

function criterionHint(answer, c) {
  if (!Number.isFinite(answer)) return "Enter a numerical factor of safety.";
  const g = F.criterionSafety("goodman", c.material.Se, c.material.Sut, c.material.Sy, c.sa, c.sm);
  const ge = F.criterionSafety("gerber", c.material.Se, c.material.Sut, c.material.Sy, c.sa, c.sm);
  const s = F.criterionSafety("soderberg", c.material.Se, c.material.Sut, c.material.Sy, c.sa, c.sm);
  if (Math.abs(answer - g) / Math.max(1, g) < .035 && c.criterion !== "goodman") return "This matches Goodman closely, but the prompt asks for a different criterion.";
  if (Math.abs(answer - ge) / Math.max(1, ge) < .035 && c.criterion !== "gerber") return "This matches Gerber closely, but the prompt asks for a different criterion.";
  if (Math.abs(answer - s) / Math.max(1, s) < .035 && c.criterion !== "soderberg") return "This matches Soderberg closely, but the prompt asks for a different criterion.";
  if (c.sm < 0) return "The mean normal stress is compressive; the conservative fatigue calculation ignores the beneficial mean stress.";
  return answer > c.nf ? "Too high. Check the denominator terms and the requested boundary." : "Too low. Check whether the mean-stress term was applied twice or with the wrong strength.";
}

function revealSolution() {
  const smEff = Math.max(0, current.sm);
  F.solutionCards(F.$("#solutionGrid"), [
    { label: "Effective mean stress for fatigue", value: `σ<sub>m,eff</sub> = ${F.fmt(smEff, 2)} ksi` },
    { label: `${names[current.criterion]} fatigue factor`, value: `n<sub>f</sub> = ${F.fmt(current.nf, 3)}` },
    { label: "Yielding factor", value: `n<sub>y</sub> = ${F.fmt(current.ny, 3)}` },
    { label: "Maximum cycle stress", value: `σ<sub>max</sub> = ${F.fmt(current.sm + current.sa, 2)} ksi` },
    { label: "Minimum cycle stress", value: `σ<sub>min</sub> = ${F.fmt(current.sm - current.sa, 2)} ksi` },
    { label: "Governing check", value: current.nf < current.ny ? "Fatigue governs" : "Yielding governs" }
  ]);
  F.$("#solutionPanel").hidden = false;
  diagramReveal = true;
  drawDiagram(true);
}

attemptCtl = F.setupAttempts({
  checkButton: F.$("#checkAnswer"),
  statusNode: F.$("#attemptStatus"),
  feedbackNode: F.$("#feedback"),
  onCheck: () => {
    const checked = fieldsFor(current).map((field) => F.checkField(field));
    const correct = checked.filter((r) => r.status === "correct").length;
    const solved = correct === checked.length;
    const misses = checked.filter((r) => r.status !== "correct").map((r) => {
      const hint = r.id === "nf" ? criterionHint(r.answer, current) : F.basicHint(r.id, r.answer, r.value);
      return `<li><b>${r.label}</b>: ${hint}</li>`;
    });
    F.$("#feedback").className = `feedback ${solved ? "good" : "warn"}`;
    F.$("#feedback").innerHTML = solved ? "Both safety factors are correct." : `${correct} of ${checked.length} correct.${misses.length ? `<ul>${misses.join("")}</ul>` : ""}`;
    return { solved };
  },
  onReveal: revealSolution,
  onThirdAttempt: () => {
    F.$("#equationPanel").innerHTML = `<strong>Equations for attempt three</strong><div class="equation-list">
      <div class="equation">Goodman: 1/n<sub>f</sub> = σ<sub>a</sub>/S<sub>e</sub> + σ<sub>m</sub>/S<sub>ut</sub></div>
      <div class="equation">Gerber: 1 = n<sub>f</sub>σ<sub>a</sub>/S<sub>e</sub> + (n<sub>f</sub>σ<sub>m</sub>/S<sub>ut</sub>)<sup>2</sup></div>
      <div class="equation">Soderberg: 1/n<sub>f</sub> = σ<sub>a</sub>/S<sub>e</sub> + σ<sub>m</sub>/S<sub>y</sub></div>
      <div class="equation">ASME elliptic: 1/n<sub>f</sub><sup>2</sup> = (σ<sub>a</sub>/S<sub>e</sub>)<sup>2</sup> + (σ<sub>m</sub>/S<sub>y</sub>)<sup>2</sup></div>
      <div class="equation">Yielding: n<sub>y</sub> = S<sub>y</sub> / max(|σ<sub>max</sub>|, |σ<sub>min</sub>|)</div>
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
