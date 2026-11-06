/* Efeitos que seguem o rato e o scroll: rede de pontos no topo, cursor, brilho e inclinação dos cartões,
   botões "magnéticos", parallax e barra de progresso. Tudo desligado para quem pediu menos movimento,
   e o cursor e a inclinação só existem com rato (não em ecrãs de toque). */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var raf = window.requestAnimationFrame.bind(window);

  /* ---------- Rede de pontos (canvas) ---------- */
  var nets = [];
  var pointer = { x: -9999, y: -9999, on: false };

  function netColour() {
    var v = getComputedStyle(root).getPropertyValue("--net").trim();
    return v || "150, 190, 255";
  }

  function Net(canvas) {
    var ctx = canvas.getContext("2d");
    var self = { canvas: canvas, visible: true, nodes: [], w: 0, h: 0, dpr: 1, colour: netColour() };
    var LINK = 125, REACH = 190;

    function resize() {
      var r = canvas.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      self.dpr = Math.min(window.devicePixelRatio || 1, 2);
      self.w = r.width; self.h = r.height;
      canvas.width = Math.round(r.width * self.dpr);
      canvas.height = Math.round(r.height * self.dpr);
      ctx.setTransform(self.dpr, 0, 0, self.dpr, 0, 0);
      var n = Math.max(28, Math.min(86, Math.round(r.width * r.height / 13000)));
      self.nodes = [];
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, s = 0.12 + Math.random() * 0.22;
        self.nodes.push({ x: Math.random() * r.width, y: Math.random() * r.height, bx: Math.cos(a) * s, by: Math.sin(a) * s, vx: 0, vy: 0, r: 1.2 + Math.random() * 1.4 });
      }
      draw();
    }

    function step() {
      var rect = canvas.getBoundingClientRect();
      var mx = pointer.x - rect.left, my = pointer.y - rect.top;
      var near = pointer.on && mx > -REACH && my > -REACH && mx < self.w + REACH && my < self.h + REACH;
      for (var i = 0; i < self.nodes.length; i++) {
        var p = self.nodes[i];
        p.vx += (p.bx - p.vx) * 0.02; p.vy += (p.by - p.vy) * 0.02;
        if (near) {
          var dx = mx - p.x, dy = my - p.y, d = Math.sqrt(dx * dx + dy * dy);
          if (d < REACH && d > 1) {
            var f = (1 - d / REACH) * 0.09;
            p.vx += (dx / d) * f; p.vy += (dy / d) * f;
          }
        }
        var sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (sp > 1.6) { p.vx *= 1.6 / sp; p.vy *= 1.6 / sp; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < -10) p.x = self.w + 10; else if (p.x > self.w + 10) p.x = -10;
        if (p.y < -10) p.y = self.h + 10; else if (p.y > self.h + 10) p.y = -10;
      }
      self.mouse = near ? { x: mx, y: my } : null;
    }

    function draw() {
      ctx.clearRect(0, 0, self.w, self.h);
      var c = self.colour, ns = self.nodes, i, j;
      ctx.lineWidth = 1;
      for (i = 0; i < ns.length; i++) {
        for (j = i + 1; j < ns.length; j++) {
          var dx = ns[i].x - ns[j].x, dy = ns[i].y - ns[j].y, d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            ctx.strokeStyle = "rgba(" + c + "," + ((1 - Math.sqrt(d2) / LINK) * 0.34).toFixed(3) + ")";
            ctx.beginPath(); ctx.moveTo(ns[i].x, ns[i].y); ctx.lineTo(ns[j].x, ns[j].y); ctx.stroke();
          }
        }
      }
      if (self.mouse) {
        for (i = 0; i < ns.length; i++) {
          var mx = self.mouse.x - ns[i].x, my = self.mouse.y - ns[i].y, md = Math.sqrt(mx * mx + my * my);
          if (md < REACH) {
            ctx.strokeStyle = "rgba(" + c + "," + ((1 - md / REACH) * 0.75).toFixed(3) + ")";
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(ns[i].x, ns[i].y); ctx.lineTo(self.mouse.x, self.mouse.y); ctx.stroke();
          }
        }
      }
      ctx.fillStyle = "rgba(" + c + ",0.85)";
      for (i = 0; i < ns.length; i++) {
        ctx.beginPath(); ctx.arc(ns[i].x, ns[i].y, ns[i].r, 0, Math.PI * 2); ctx.fill();
      }
    }

    self.resize = resize;
    self.tick = function () { step(); draw(); };
    self.redraw = function () { self.colour = netColour(); draw(); };
    resize();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
    }
    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(resize, 150); });
    return self;
  }

  document.querySelectorAll("canvas.net").forEach(function (c) { nets.push(Net(c)); });

  if (!reduce && nets.length) {
    (function loop() {
      if (!document.hidden) {
        for (var i = 0; i < nets.length; i++) if (nets[i].visible) nets[i].tick();
      }
      raf(loop);
    })();
  }
  window.addEventListener("themechange", function () { nets.forEach(function (n) { n.redraw(); }); });

  if (reduce) return; /* sem movimento: fica só a rede parada e nada do resto */

  /* ---------- Barra de progresso do scroll ---------- */
  var bar = document.createElement("div");
  bar.className = "progress"; bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    raf(function () {
      var max = root.scrollHeight - window.innerHeight;
      bar.style.setProperty("--p", max > 0 ? Math.min(1, Math.max(0, window.pageYOffset / max)).toFixed(4) : 0);
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  if (!fine) return; /* o resto precisa de rato */

  /* ---------- Cursor, parallax, brilho, inclinação e botões magnéticos ---------- */
  var dot = document.createElement("div"), ring = document.createElement("div");
  dot.className = "cursor-dot"; ring.className = "cursor-ring";
  dot.setAttribute("aria-hidden", "true"); ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(dot); document.body.appendChild(ring);

  var hero = document.querySelector(".hero") || document.querySelector(".page-head");
  var rx = -100, ry = -100, tx = -100, ty = -100, running = false;
  var px = 0, py = 0, tpx = 0, tpy = 0;
  var glowSel = ".row, .skills > div, .panel, .notice, form.msg";
  var tiltSel = ".row, .skills > div";
  var magSel = ".btn, .btn-copy, .theme-toggle";
  var hoverSel = "a, button, input, textarea, select, label, .box";

  document.querySelectorAll(glowSel).forEach(function (n) { n.classList.add("glow"); });
  var mags = Array.prototype.slice.call(document.querySelectorAll(magSel));
  var lastGlow = null;

  function kick() { if (!running) { running = true; raf(frame); } }

  function frame() {
    rx += (tx - rx) * 0.2; ry += (ty - ry) * 0.2;
    ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
    dot.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
    var moved = Math.abs(tx - rx) > 0.15 || Math.abs(ty - ry) > 0.15;
    px += (tpx - px) * 0.08; py += (tpy - py) * 0.08;
    var pmoved = Math.abs(tpx - px) > 0.002 || Math.abs(tpy - py) > 0.002;
    if (hero) { hero.style.setProperty("--px", px.toFixed(3)); hero.style.setProperty("--py", py.toFixed(3)); }
    if (moved || pmoved) raf(frame); else running = false;
  }

  function resetGlow(el) {
    if (!el) return;
    el.style.removeProperty("--rx"); el.style.removeProperty("--ry");
  }

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    tx = e.clientX; ty = e.clientY;
    if (!root.classList.contains("has-cursor")) { rx = tx; ry = ty; root.classList.add("has-cursor"); }
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true;

    if (hero) {
      var hr = hero.getBoundingClientRect();
      if (e.clientY >= hr.top && e.clientY <= hr.bottom) {
        tpx = Math.max(-1, Math.min(1, (e.clientX - (hr.left + hr.width / 2)) / (hr.width / 2)));
        tpy = Math.max(-1, Math.min(1, (e.clientY - (hr.top + hr.height / 2)) / (hr.height / 2)));
      } else { tpx = 0; tpy = 0; }
    }

    var g = e.target.closest ? e.target.closest(".glow") : null;
    if (lastGlow && lastGlow !== g) resetGlow(lastGlow);
    lastGlow = g;
    if (g) {
      var r = g.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      g.style.setProperty("--mx", x.toFixed(0) + "px"); g.style.setProperty("--my", y.toFixed(0) + "px");
      if (g.matches(tiltSel)) {
        g.style.setProperty("--ry", (((x / r.width) - 0.5) * 7).toFixed(2) + "deg");
        g.style.setProperty("--rx", ((0.5 - (y / r.height)) * 5).toFixed(2) + "deg");
      }
    }

    for (var i = 0; i < mags.length; i++) {
      var m = mags[i], b = m.getBoundingClientRect();
      var cx = b.left + b.width / 2, cy = b.top + b.height / 2, dx = e.clientX - cx, dy = e.clientY - cy;
      var d = Math.sqrt(dx * dx + dy * dy), reach = Math.max(b.width, b.height) / 2 + 70;
      if (d < reach) { m.style.setProperty("--mgx", (dx * 0.28).toFixed(1) + "px"); m.style.setProperty("--mgy", (dy * 0.28).toFixed(1) + "px"); }
      else if (m.style.getPropertyValue("--mgx")) { m.style.removeProperty("--mgx"); m.style.removeProperty("--mgy"); }
    }

    ring.classList.toggle("is-hover", !!(e.target.closest && e.target.closest(hoverSel)));
    kick();
  }, { passive: true });

  window.addEventListener("pointerdown", function () { ring.classList.add("is-down"); });
  window.addEventListener("pointerup", function () { ring.classList.remove("is-down"); });
  root.addEventListener("pointerleave", function () {
    root.classList.remove("has-cursor"); pointer.on = false; tpx = 0; tpy = 0; resetGlow(lastGlow); lastGlow = null; kick();
  });
  root.addEventListener("pointerenter", function () { pointer.on = true; });
})();
