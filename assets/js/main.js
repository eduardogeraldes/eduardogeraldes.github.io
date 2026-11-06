/* Pormenores de interação: ano no rodapé, animações de entrada, números que sobem,
   altura do painel incorporado, copiar e-mail e formulário de contacto. */
(function () {
  "use strict";

  var EMAIL = "eduardogeraldes2002@gmail.com";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.querySelectorAll("[data-year]").forEach(function (n) {
    n.textContent = new Date().getFullYear();
  });

  // Modo escuro / claro. A escolha fica guardada neste browser; sem escolha, abre em escuro.
  document.querySelectorAll(".theme-toggle").forEach(function (btn) {
    var html = document.documentElement;
    function label() {
      var text = html.getAttribute("data-theme") === "light" ? "Mudar para o modo escuro" : "Mudar para o modo claro";
      btn.setAttribute("aria-label", text);
      btn.setAttribute("title", text);
    }
    btn.addEventListener("click", function () {
      var next = html.getAttribute("data-theme") === "light" ? "dark" : "light";
      html.setAttribute("data-theme", next);
      try { localStorage.setItem("modo", next); } catch (e) {}
      label();
      window.dispatchEvent(new Event("themechange"));
    });
    label();
  });

  // Entrada dos blocos ao rolar a página. Sem JavaScript, ou com "reduzir movimento", tudo aparece logo.
  (function reveal() {
    var sel = ".section h2, .about-band h2, .prose h2, .section > p, .rows .row, .stats li, .about > div > p, .timeline, .skills > div, .notice, .embed, .downloads, form.msg, .contact > div:first-child";
    var items = Array.prototype.slice.call(document.querySelectorAll(sel));
    if (!items.length || reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (n) { n.classList.add("in"); });
      return;
    }
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var group = new Map();
    items.forEach(function (n) {
      var parent = n.parentElement, k = group.get(parent) || 0;
      group.set(parent, k + 1);
      n.style.setProperty("--i", Math.min(k, 4));
      n.classList.add("reveal");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = e.target;
        n.classList.add("in");
        io.unobserve(n);
        // Depois de entrar, devolve ao bloco as transições normais (por exemplo, a elevação ao passar o rato)
        if (n.matches(".row, .skills > div")) {
          setTimeout(function () { n.classList.remove("reveal", "in"); }, 1300);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (n) {
      var r = n.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0 && window.pageYOffset < 10) {
        // Já está à vista ao abrir a página: mostra sem esperar
        n.classList.add("in");
        if (n.matches(".row, .skills > div")) n.classList.remove("reveal", "in");
      } else {
        io.observe(n);
      }
    });
  })();

  // Números que sobem até ao valor final quando entram no ecrã
  (function counters() {
    var nums = Array.prototype.slice.call(document.querySelectorAll("[data-to]"));
    if (!nums.length || reduceMotion || !("IntersectionObserver" in window)) return;
    function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
    nums.forEach(function (n) { n.textContent = "0"; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = e.target, to = parseInt(n.getAttribute("data-to"), 10), start = null, dur = 1500;
        io.unobserve(n);
        function step(ts) {
          if (start === null) start = ts;
          var p = Math.min(1, (ts - start) / dur), k = 1 - Math.pow(1 - p, 3);
          n.textContent = fmt(Math.round(to * k));
          if (p < 1) requestAnimationFrame(step); else n.textContent = fmt(to);
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  })();

  // Ajusta a altura do painel incorporado ao seu conteúdo (só funciona no mesmo domínio, como no GitHub Pages)
  document.querySelectorAll("iframe[data-autoheight]").forEach(function (frame) {
    function fit() {
      try {
        var doc = frame.contentDocument;
        if (!doc || !doc.documentElement) return;
        frame.style.height = Math.ceil(doc.documentElement.scrollHeight) + "px";
      } catch (e) { /* mantém a altura do CSS */ }
    }
    // O painel tem o seu próprio modo escuro: acompanha o modo do site (e continua a ter o botão dele)
    function syncTheme() {
      try {
        var d = frame.contentDocument, t = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
        if (!d || !d.documentElement) return;
        d.documentElement.setAttribute("data-theme", t);
        var b = d.getElementById("theme");
        if (b) b.textContent = t === "dark" ? "Modo claro" : "Modo escuro";
        fit();
      } catch (e) { /* mantém o que estiver */ }
    }
    window.addEventListener("themechange", syncTheme);
    frame.addEventListener("load", function () {
      syncTheme();
      fit();
      try {
        if (window.ResizeObserver && frame.contentDocument) new ResizeObserver(fit).observe(frame.contentDocument.body);
      } catch (e) {}
    });
    window.addEventListener("resize", fit);
  });

  // Copiar e-mail
  document.querySelectorAll("[data-copy-email]").forEach(function (btn) {
    var live = document.getElementById(btn.getAttribute("data-live") || "");
    btn.addEventListener("click", function () {
      function done(ok) {
        var msg = ok ? "E-mail copiado." : "Não foi possível copiar. Seleciona o endereço e copia com Ctrl+C.";
        if (live) live.textContent = msg;
        var old = btn.textContent;
        if (ok) { btn.textContent = "Copiado"; setTimeout(function () { btn.textContent = old; if (live) live.textContent = ""; }, 2200); }
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(EMAIL).then(function () { done(true); }, function () { done(false); });
      } else {
        var ta = document.createElement("textarea");
        ta.value = EMAIL; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) {}
        document.body.removeChild(ta);
        done(ok);
      }
    });
  });

  // Formulário: abre o programa de e-mail com a mensagem preenchida
  var form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var name = form.elements["nome"], mail = form.elements["email"], msg = form.elements["mensagem"];
      var ok = true;
      function check(field, valid) {
        var wrap = field.closest(".field");
        wrap.classList.toggle("has-error", !valid);
        field.setAttribute("aria-invalid", valid ? "false" : "true");
        if (!valid && ok) { field.focus(); }
        if (!valid) ok = false;
      }
      check(name, name.value.trim().length > 1);
      check(mail, /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value.trim()));
      check(msg, msg.value.trim().length > 4);
      if (!ok) return;

      var subject = "Contacto através do portefólio: " + name.value.trim();
      var body = msg.value.trim() + "\n\n" + name.value.trim() + "\n" + mail.value.trim();
      var live = document.getElementById("form-live");
      if (live) live.textContent = "A abrir o teu programa de e-mail. Se nada abrir, copia o endereço acima e escreve diretamente.";
      window.location.href = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  }
})();
