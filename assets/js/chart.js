/* Gráfico da taxa de serviço semanal (dados simulados, ver data.js).
   Desenha um SVG à medida da largura do contentor, para o texto nunca encolher. */
(function () {
  "use strict";
  var D = window.EXP;
  var host = document.getElementById("hero-chart");
  if (!D || !host) return;

  var NS = "http://www.w3.org/2000/svg";
  var MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  var DAY = 86400000;
  var WINDOW_MS = 30 * DAY;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var readout = document.getElementById("chart-readout");
  var DEFAULT_TEXT = "Passa o rato ou toca no gráfico para ver cada semana.";

  var weeks = D.semanas.map(function (w) {
    return { t: Date.parse(w.d + "T00:00:00Z"), v: w.serv };
  });
  var events = D.eventos.map(function (e) { return Date.parse(e + "T00:00:00Z"); });
  var t0 = weeks[0].t;
  var t1 = weeks[weeks.length - 1].t + 7 * DAY;

  var Y_MIN = 95, Y_MAX = 99.5, MEAN = D.kpi.servico;
  var animatedOnce = false;

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function fmtDate(ms) {
    var d = new Date(ms);
    return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear();
  }
  function pct(v) { return v.toFixed(2).replace(".", ",") + "%"; }
  function inWindow(t) {
    for (var i = 0; i < events.length; i++) {
      if (t >= events[i] && t < events[i] + WINDOW_MS) return true;
    }
    return false;
  }

  function draw() {
    var W = Math.max(280, Math.round(host.clientWidth));
    var H = W < 560 ? 270 : W < 900 ? 330 : 390;
    var wide = W >= 560;
    var m = { l: 46, r: wide ? 84 : 10, t: 30, b: 30 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    function x(t) { return m.l + ((t - t0) / (t1 - t0)) * pw; }
    function y(v) { return m.t + (1 - (v - Y_MIN) / (Y_MAX - Y_MIN)) * ph; }

    host.textContent = "";
    var svg = el("svg", {
      viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img",
      "aria-label": "Gráfico de linhas da taxa de serviço semanal de uma operação de expedição simulada, de setembro de 2025 a agosto de 2026. A taxa desce nos 30 dias a seguir à entrada de cada novo colaborador."
    }, host);

    var gWin = el("g", {}, svg), gGrid = el("g", {}, svg), gSeries = el("g", {}, svg), gHover = el("g", { "pointer-events": "none", visibility: "hidden" }, svg);

    // Zonas de 30 dias a seguir a cada entrada
    var wins = [];
    events.forEach(function (e, i) {
      var xa = x(e), xb = x(Math.min(e + WINDOW_MS, t1));
      var r = el("rect", { "class": "win", x: xa, y: m.t, width: Math.max(0, xb - xa), height: ph }, gWin);
      r.style.transitionDelay = (0.9 + i * 0.14) + "s";
      wins.push(r);
    });

    // Grelha e eixo Y
    [95, 96, 97, 98, 99].forEach(function (v) {
      el("line", { "class": "grid", x1: m.l, x2: W - m.r, y1: y(v), y2: y(v) }, gGrid);
      var t = el("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end", "class": "axis-label" }, gGrid);
      t.textContent = v + "%";
    });

    // Eixo X: início de cada mês
    var cur = new Date(t0);
    cur = Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), 1);
    var every = W < 560 ? 2 : 1, idx = 0;
    while (cur <= weeks[weeks.length - 1].t) {
      var d = new Date(cur);
      if (cur >= t0 - 3 * DAY && idx % every === 0) {
        var label = MONTHS[d.getUTCMonth()] + (d.getUTCMonth() === 0 || idx === 0 ? " " + String(d.getUTCFullYear()).slice(2) : "");
        var tx = el("text", { x: x(Math.max(cur, t0)), y: H - 8, "text-anchor": "start", "class": "axis-label" }, gGrid);
        tx.textContent = label;
      }
      idx++;
      cur = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
    }

    // Média
    el("line", { "class": "mean", x1: m.l, x2: W - m.r, y1: y(MEAN), y2: y(MEAN) }, gGrid);
    if (wide) {
      var mt = el("text", { x: W - m.r + 8, y: y(MEAN) + 4, "text-anchor": "start" }, gGrid);
      mt.textContent = "média " + MEAN.toFixed(1).replace(".", ",") + "%";
    }

    // Linhas verticais das entradas e legenda da primeira
    events.forEach(function (e) {
      el("line", { "class": "evt", x1: x(e), x2: x(e), y1: m.t - 6, y2: m.t + ph }, gGrid);
    });
    var fl = el("text", { "class": "flag", x: x(events[0]) + 5, y: m.t - 10 }, gGrid);
    fl.textContent = W < 560 ? "entrada de um novo colaborador" : "entrada de um novo colaborador e os 30 dias seguintes";

    // Série
    var d0 = weeks.map(function (w, i) { return (i ? "L" : "M") + x(w.t + 3.5 * DAY).toFixed(1) + " " + y(w.v).toFixed(1); }).join("");
    var line = el("path", { "class": "line", d: d0 }, gSeries);
    var endPt = weeks[weeks.length - 1];
    el("circle", { "class": "pulse-ring", cx: x(endPt.t + 3.5 * DAY), cy: y(endPt.v), r: 4 }, gSeries);
    el("circle", { "class": "pulse", cx: x(endPt.t + 3.5 * DAY), cy: y(endPt.v), r: 4 }, gSeries);

    // Interação
    var guide = el("line", { "class": "guide", y1: m.t, y2: m.t + ph }, gHover);
    var dot = el("circle", { "class": "dot", r: 5 }, gHover);
    var hit = el("rect", { x: m.l, y: m.t - 10, width: pw, height: ph + 10, fill: "transparent" }, svg);

    function show(clientX) {
      var rect = svg.getBoundingClientRect();
      var px = (clientX - rect.left) * (W / rect.width);
      var best = 0, bd = Infinity;
      for (var i = 0; i < weeks.length; i++) {
        var dd = Math.abs(x(weeks[i].t + 3.5 * DAY) - px);
        if (dd < bd) { bd = dd; best = i; }
      }
      var w = weeks[best], cx = x(w.t + 3.5 * DAY);
      guide.setAttribute("x1", cx); guide.setAttribute("x2", cx);
      dot.setAttribute("cx", cx); dot.setAttribute("cy", y(w.v));
      gHover.setAttribute("visibility", "visible");
      if (readout) {
        readout.textContent = "Semana de " + fmtDate(w.t) + ": taxa de serviço " + pct(w.v) +
          (inWindow(w.t + 3.5 * DAY) ? ", nos 30 dias a seguir a uma entrada." : ".");
      }
    }
    function hide() {
      gHover.setAttribute("visibility", "hidden");
      if (readout) readout.textContent = DEFAULT_TEXT;
    }
    hit.addEventListener("pointermove", function (e) { show(e.clientX); });
    hit.addEventListener("pointerdown", function (e) { show(e.clientX); });
    hit.addEventListener("pointerleave", hide);

    // Animação de entrada, uma só vez
    host.classList.remove("is-animating", "is-in");
    if (!animatedOnce && !reduceMotion && line.getTotalLength) {
      animatedOnce = true;
      var len = line.getTotalLength();
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;
      host.classList.add("is-animating");
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          line.style.strokeDashoffset = 0;
          host.classList.add("is-in");
        });
      });
    }
    animatedOnce = true;
  }

  if (readout) readout.textContent = DEFAULT_TEXT;
  draw();

  var lastW = host.clientWidth, timer;
  function onResize() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      if (Math.abs(host.clientWidth - lastW) > 1) { lastW = host.clientWidth; draw(); }
    }, 120);
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(host);
  else window.addEventListener("resize", onResize);
})();
