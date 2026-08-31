/* ============================================================================
   tr1stan.de — behaviour
   Progressive enhancement only. Every block guards its own elements, so this
   file runs unchanged on the legal pages and on 404.

   The reveal effects deliberately set their start state from here, never from
   the stylesheet: if this script does not run, nothing is hidden and the page
   is simply fully visible.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* --------------------------------------------------------------------------
     Footer year
     ------------------------------------------------------------------------ */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* --------------------------------------------------------------------------
     Freeze the scene while the tab is in the background
     ------------------------------------------------------------------------ */
  (function pauseWhenHidden() {
    function sync() { root.classList.toggle("is-hidden", document.hidden); }
    document.addEventListener("visibilitychange", sync);
    sync();
  })();

  /* --------------------------------------------------------------------------
     Mobile navigation (legal pages and 404 — the home page has no nav)
     ------------------------------------------------------------------------ */
  (function mobileNav() {
    var toggle = $("#navToggle");
    var nav = $("#siteNav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Navigation schließen" : "Navigation öffnen");
      if (open) nav.setAttribute("data-open", "true");
      else nav.removeAttribute("data-open");
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (toggle.getAttribute("aria-expanded") !== "true") return;
      if (!nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });

    var wide = window.matchMedia("(min-width: 761px)");
    var onChange = function (e) { if (e.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener("change", onChange);
    else if (wide.addListener) wide.addListener(onChange);
  })();

  /* --------------------------------------------------------------------------
     Copy the mail address
     ------------------------------------------------------------------------ */
  (function copyMail() {
    var buttons = $$(".copy[data-copy]");
    if (!buttons.length) return;

    function legacyCopy(text) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var done = false;
      try { done = document.execCommand("copy"); } catch (err) { done = false; }
      document.body.removeChild(ta);
      return done;
    }

    buttons.forEach(function (btn) {
      var out = $("[data-copy-text]", btn) || btn;
      var idle = btn.getAttribute("data-label") || out.textContent;
      var timer = null;

      function feedback(done) {
        out.textContent = done ? "kopiert" : "fehlgeschlagen";
        var live = $("#liveStatus");
        if (live) {
          live.textContent = "";
          window.setTimeout(function () {
            live.textContent = done ? "Mail-Adresse kopiert." : "Kopieren nicht möglich.";
          }, 40);
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { out.textContent = idle; }, 2000);
      }

      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy") || "";
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(
            function () { feedback(true); },
            function () { feedback(legacyCopy(text)); }
          );
        } else {
          feedback(legacyCopy(text));
        }
      });
    });
  })();

  /* --------------------------------------------------------------------------
     Hero parallax

     Writes the scroll offset into a single custom property; the stylesheet
     decides what moves and by how much. Only transforms read it, so this never
     triggers layout. The scene scrolls away on its own — this only adds the
     sun sinking a little slower than the page. Off on phones and off entirely
     under reduced motion.
     ------------------------------------------------------------------------ */
  function heroParallax() {
    if (reduceMotion) return;
    if (!window.matchMedia("(min-width: 761px)").matches) return;

    var ticking = false;
    var last = -1;

    function update() {
      ticking = false;
      var y = window.scrollY || window.pageYOffset || 0;
      if (y === last) return;
      last = y;
      root.style.setProperty("--sc", y + "px");
    }

    function onScroll() {
      if (ticking || document.hidden) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("visibilitychange", function () { if (!document.hidden) onScroll(); });
    update();
  }

  /* --------------------------------------------------------------------------
     The pace of the floor

     The grid moves slowly on its own and speeds up while the page is being
     scrolled, then eases back down again. The speed is a damped follower of
     the scroll rate rather than a switch between an idle and a scrolling
     state, so there is no step anywhere in it — it rises quickly, falls slowly
     and never snaps.

     The phase is accumulated here and handed to the stylesheet as a length, so
     no keyframe is ever restarted mid-flight; restarting one is exactly what
     shows up as a jump. The property is written on the floor element, not on
     the root, which keeps style invalidation down to three nodes, and only a
     transform reads it: no layout, no repaint of the page while scrolling.

     Phones keep the plain CSS loop. A constant slow floor is fine there, and
     it costs one compositor animation instead of a frame loop. If the frame
     rate does drop on a desktop, the loop hands the floor back to CSS.
     ------------------------------------------------------------------------ */
  function floorRide() {
    if (reduceMotion) return;

    var floor = $(".floor");
    if (!floor || !$(".grid-floor")) return;
    if (!window.matchMedia("(min-width: 761px)").matches) return;
    if (!window.requestAnimationFrame) return;

    var BASE = 26;      // px per second with the page standing still
    var GAIN = 1.15;    // share of the scroll rate that is added on top
    var MAX = 560;      // ceiling, px per second
    var UP = 0.17;      // damping towards a faster target
    var DOWN = 0.045;   // ... and the slower fall back out of it

    var cell = 60;
    var phase = 0;
    var speed = BASE;
    var lastY = window.scrollY || window.pageYOffset || 0;
    var lastT = 0;
    var lastDepth = -1;
    var frames = 0;
    var slow = 0;
    var raf = 0;

    /* The phase has to wrap on exactly one cell, or the loop shows a step.
       --grid-cell is a clamp(), and an unregistered custom property is handed
       back verbatim, so reading it as a number gives nothing. A hidden probe
       that is one cell wide gives the resolved length instead — measured on
       load and on resize only, never while scrolling. */
    var probe = document.createElement("i");
    probe.style.cssText = "position:absolute;left:0;top:0;height:0;width:var(--grid-cell);visibility:hidden;pointer-events:none";
    floor.appendChild(probe);

    function readCell() {
      var w = probe.getBoundingClientRect().width;
      if (w > 0) cell = w;
    }

    function frame(t) {
      raf = 0;
      if (document.hidden) return;

      var dt = lastT ? Math.min((t - lastT) / 1000, 0.1) : 0.016;
      lastT = t;

      var y = window.scrollY || window.pageYOffset || 0;
      var rate = Math.abs(y - lastY) / Math.max(dt, 0.001);
      lastY = y;

      var target = Math.min(BASE + rate * GAIN, MAX);
      speed += (target - speed) * (target > speed ? UP : DOWN);

      phase = (phase + speed * dt) % cell;
      floor.style.setProperty("--run", phase.toFixed(2) + "px");

      // how far into the page we are: the floor calms down as it goes
      var depth = Math.min(y / (window.innerHeight * 1.4), 1);
      if (Math.abs(depth - lastDepth) > 0.01) {
        lastDepth = depth;
        floor.style.setProperty("--depth", depth.toFixed(3));
      }

      // Frame rate is only judged while the floor is actually being pushed;
      // that is the only time this loop costs more than the CSS loop would.
      if (speed > BASE * 1.5) {
        frames++;
        if (dt > 0.022) slow++;
        if (frames >= 90) {
          if (slow / frames > 0.5) return handBack();
          frames = 0;
          slow = 0;
        }
      }

      raf = window.requestAnimationFrame(frame);
    }

    function start() {
      if (raf || document.hidden) return;
      lastT = 0;
      lastY = window.scrollY || window.pageYOffset || 0;
      raf = window.requestAnimationFrame(frame);
    }

    function handBack() {
      root.classList.remove("js-grid");
      floor.style.removeProperty("--run");
      if (probe.parentNode) probe.parentNode.removeChild(probe);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      raf = 0;
    }

    function onVisibility() {
      if (document.hidden) {
        if (raf) window.cancelAnimationFrame(raf);
        raf = 0;
      } else {
        start();
      }
    }

    function onResize() { readCell(); }

    readCell();
    root.classList.add("js-grid");
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize, { passive: true });
    start();
  }

  /* --------------------------------------------------------------------------
     Terminal

     Ein echtes Eingabefeld, eine Ausgabe als Live-Region, ein Verlauf im
     Speicher. Nichts davon ist die einzige Quelle für einen Inhalt: alles, was
     hier ausgegeben wird, steht ohnehin als Text auf der Seite.

     Eingaben werden ausschliesslich als Text gesetzt, nie als Markup — auch
     nicht in der Rückmeldung auf einen unbekannten Befehl. Links in der Ausgabe
     baut das Skript selbst aus Elementen, nie aus einer Zeichenkette.
     ------------------------------------------------------------------------ */
  (function terminal() {
    var box = $("#term");
    if (!box) return;
    var out = $("#termOut"), form = $("#termForm"), input = $("#termIn"), chips = $("#termChips");
    if (!out || !form || !input || !chips) return;

    var MAX_LEN = 120;
    var instant = reduceMotion;

    var caret = document.createElement("span");
    caret.className = "term-caret";
    caret.setAttribute("aria-hidden", "true");

    var queue = [];
    var typing = null;
    var timer = 0;
    var history = [];
    var histAt = 0;

    /* ---- Inhalte -----------------------------------------------------------
       Sie stehen nicht hier, sondern genau einmal im Dokument. Das Terminal
       liest sie von dort und setzt sie als Text — nie als Markup. So gibt es
       keine zweite Stelle, die gepflegt werden müsste, und ohne JavaScript
       bleibt genau derselbe Text als lesbare Seite stehen. */
    var store = $("#store");

    function clean(t) { return String(t).replace(/\s+/g, " ").trim(); }

    function readTopic(name) {
      var node = store && store.querySelector('[data-topic="' + name + '"]');
      var jobs = [];
      if (!node) return jobs;

      Array.prototype.forEach.call(node.children, function (el) {
        var tag = el.tagName.toLowerCase();

        if (tag === "h2" || tag === "h3" || tag === "h4") {
          jobs.push({ kind: "text", cls: "head", text: clean(el.textContent) });
          return;
        }

        if (tag === "ol" || tag === "ul") {
          Array.prototype.forEach.call(el.children, function (li, i) {
            var lead = tag === "ol" ? ("0" + (i + 1)).slice(-2) + "  " : "-  ";
            jobs.push({ kind: "text", cls: "", text: lead + clean(li.textContent) });
          });
          return;
        }

        var a = el.querySelector("a[href]");
        if (a) {
          var label = clean(a.textContent);
          var whole = clean(el.textContent);
          var at = whole.indexOf(label);
          var href = a.getAttribute("href");
          jobs.push({
            kind: "link",
            before: at > 0 ? whole.slice(0, at) : "",
            label: label,
            href: href,
            external: /^https?:/i.test(href)
          });
          return;
        }

        jobs.push({ kind: "text", cls: "", text: clean(el.textContent) });
      });
      return jobs;
    }

    function emit(name) {
      var jobs = readTopic(name);
      if (!jobs.length) { print("Zu " + name + " steht nichts im Dokument.", "note"); return; }
      jobs.forEach(function (j) { push(j); });
    }

    var TOPIC_ORDER = ["about", "skills", "honest", "next", "contact"];

    var TOPICS = {};
    TOPIC_ORDER.forEach(function (name) {
      TOPICS[name] = function () { emit(name); };
    });

    /* Reines ASCII: die Schriftschnitte sind auf Latin beschnitten, ein
       Blockzeichen wuerde in eine Ersatzschrift fallen und die Spalten
       verschieben. */
    var ART = [
      "      .-~~~~~-.",
      "    .'  =====  '.",
      "   /  =========  \\",
      "  |  ===========  |",
      "   \\  =========  /",
      "    '.  =====  .'",
      "      '-.....-'",
      "  --+-----+-----+--",
      "     -+---+---+-"
    ];

    /* ---- Ausgabe ---------------------------------------------------------- */
    function makeLine(job) {
      var el = document.createElement("p");
      el.className = "term-line" + (job.cls ? " term-line--" + job.cls : "");
      if (job.kind === "link") {
        el.appendChild(document.createTextNode(job.before || ""));
        var a = document.createElement("a");
        a.href = job.href;
        a.textContent = job.label;
        if (job.external) a.rel = "noopener";
        el.appendChild(a);
        if (job.after) el.appendChild(document.createTextNode(job.after));
      } else {
        el.textContent = job.text;
      }
      return el;
    }

    function down() { out.scrollTop = out.scrollHeight; }
    function hideCaret() { if (caret.parentNode) caret.parentNode.removeChild(caret); }
    function showCaret() { out.appendChild(caret); down(); }

    function pump() {
      timer = 0;
      if (!queue.length) { showCaret(); return; }
      hideCaret();
      var job = queue.shift();
      var el = makeLine(job);
      out.appendChild(el);
      down();
      if (instant || job.kind === "link" || !job.text) {
        timer = window.setTimeout(pump, 0);
        return;
      }
      /* Waehrend eine Zeile tippt, ist sie vor der Vorlesehilfe verborgen; erst
         die fertige Zeile taucht in der Live-Region auf. Zeichen fuer Zeichen
         vorlesen zu lassen waere unbrauchbar. */
      el.setAttribute("aria-hidden", "true");
      el.textContent = "";
      typing = { el: el, text: job.text, at: 0, t0: now() };
      step();
    }

    /* Getippt wird nach der Uhr, nicht nach Zeitgebern. Ein setTimeout wartet
       auf den Hauptfaden; auf einem langsamen Geraet käme sonst je Bild nur ein
       Zeichen heraus und der Effekt würde zur Geduldsprobe. */
    function now() {
      return (window.performance && performance.now) ? performance.now() : Date.now();
    }
    var CPS = 320;

    function step() {
      timer = 0;
      if (!typing) return;
      var want = Math.ceil(((now() - typing.t0) / 1000) * CPS);
      typing.at = Math.min(typing.text.length, Math.max(typing.at + 1, want));
      typing.el.textContent = typing.text.slice(0, typing.at);
      down();
      if (typing.at >= typing.text.length) {
        typing.el.removeAttribute("aria-hidden");
        typing = null;
        timer = window.setTimeout(pump, 16);
        return;
      }
      timer = window.setTimeout(step, 9);
    }

    function skip() {
      if (!typing && !queue.length) return false;
      window.clearTimeout(timer);
      timer = 0;
      if (typing) {
        typing.el.textContent = typing.text;
        typing.el.removeAttribute("aria-hidden");
        typing = null;
      }
      hideCaret();
      while (queue.length) out.appendChild(makeLine(queue.shift()));
      showCaret();
      return true;
    }

    function push(job) {
      queue.push(job);
      if (!timer && !typing) pump();
    }
    function print(text, cls) { push({ kind: "text", text: String(text), cls: cls || "" }); }
    function link(before, label, href, external) {
      push({ kind: "link", before: before, label: label, href: href, external: !!external });
    }
    function blank() { print(""); }

    /* ---- Befehle ---------------------------------------------------------- */
    function pad(t, n) { while (t.length < n) t += " "; return t; }

    function facts() {
      var scene = root.classList.contains("has-3d") ? "three.js, WebGL 2" : "CSS-Szene";
      return [
        "tr1stan@web",
        "-------------------",
        "Seite ......... tr1stan.de",
        "Aufbau ........ statische Seite, kein Framework",
        "Themen ........ " + document.querySelectorAll(".store-topic").length,
        "Schriften ..... Inter Variable, JetBrains Mono Variable",
        "Szene ......... " + scene,
        "Cookies ....... keine",
        "Tracker ....... keine",
        "Fremde Hosts .. keine",
        "Fenster ....... " + window.innerWidth + " x " + window.innerHeight,
        "Sprache ....... " + (root.getAttribute("lang") || "de")
      ];
    }

    var CMDS = {
      help: function () {
        print("Verfügbare Befehle:", "head");
        [["help", "diese Liste"],
         ["all", "alle Themen nacheinander"],
         ["about", "wie es anfing und warum es geblieben ist"],
         ["skills", "was ich mache"],
         ["honest", "ehrlich gesagt"],
         ["next", "was als Nächstes kommt"],
         ["contact", "Mailadresse und GitHub"],
         ["ls", "verfügbare Themen"],
         ["cat <name>", "ein Thema ausgeben"],
         ["whoami", "kurze Antwort"],
         ["neofetch", "Angaben zu dieser Seite"],
         ["clear", "Ausgabe leeren"],
         ["sudo", "besser nicht"],
         ["exit", "Versuch macht klug"]].forEach(function (r) {
          print("  " + pad(r[0], 12) + r[1]);
        });
        blank();
        print("Pfeiltasten blättern durch den Verlauf, Tabulator vervollständigt, Strg+L leert.", "note");
      },
      all: function () {
        TOPIC_ORDER.forEach(function (name, i) {
          if (i) blank();
          TOPICS[name]();
        });
      },
      about: function () { TOPICS.about(); },
      skills: function () { TOPICS.skills(); },
      honest: function () { TOPICS.honest(); },
      next: function () { TOPICS.next(); },
      contact: function () { TOPICS.contact(); },
      ls: function () {
        print(TOPIC_ORDER.join("   "), "head");
        print("cat <name> gibt ein Thema aus, all gibt alle aus.", "note");
      },
      cat: function (arg) {
        var name = String(arg || "").trim().toLowerCase();
        if (!name) { print("cat: kein Thema angegeben. ls zeigt die Liste.", "note"); return; }
        if (Object.prototype.hasOwnProperty.call(TOPICS, name)) { TOPICS[name](); return; }
        print("cat: " + name + ": kein solches Thema. ls zeigt die Liste.", "note");
      },
      whoami: function () {
        print("tr1stan — private Seite über Technik, Basteleien und Automatisierung.");
      },
      neofetch: function () {
        var info = facts();
        var rows = Math.max(ART.length, info.length);
        var width = 0;
        ART.forEach(function (l) { if (l.length > width) width = l.length; });
        for (var i = 0; i < rows; i++) {
          print(pad(ART[i] || "", width + 3) + (info[i] || ""), "art");
        }
      },
      clear: function () {
        queue.length = 0;
        window.clearTimeout(timer);
        timer = 0;
        typing = null;
        out.textContent = "";
        showCaret();
      },
      sudo: function () {
        print("sudo: tr1stan steht nicht in der sudoers-Datei. Dieser Vorfall wird nicht gemeldet.", "note");
      },
      exit: function () {
        print("Von hier kommt man nicht raus. Einfach weiterscrollen.", "note");
      }
    };

    function run(raw) {
      var line = String(raw).replace(/\s+/g, " ").trim();
      if (line.length > MAX_LEN) line = line.slice(0, MAX_LEN);
      print("> " + line, "cmd");
      if (!line) return;
      history.push(line);
      if (history.length > 40) history.shift();
      histAt = history.length;
      var sp = line.indexOf(" ");
      var cmd = (sp === -1 ? line : line.slice(0, sp)).toLowerCase();
      var arg = sp === -1 ? "" : line.slice(sp + 1);
      if (Object.prototype.hasOwnProperty.call(CMDS, cmd)) CMDS[cmd](arg);
      else print("Unbekannter Befehl: " + line + ". help zeigt alle Befehle.", "note");
    }

    /* ---- Vervollstaendigung ------------------------------------------------ */
    function complete() {
      var v = input.value.replace(/^\s+/, "");
      var sp = v.indexOf(" ");
      var pool, prefix, base;
      if (sp === -1) {
        pool = Object.keys(CMDS); prefix = v.toLowerCase(); base = "";
      } else if (v.slice(0, sp).toLowerCase() === "cat") {
        pool = Object.keys(TOPICS); prefix = v.slice(sp + 1).trim().toLowerCase(); base = "cat ";
      } else { return; }

      var hits = pool.filter(function (k) { return k.indexOf(prefix) === 0; });
      if (!hits.length) return;
      if (hits.length === 1) {
        input.value = base + hits[0] + (!base && hits[0] === "cat" ? " " : "");
        return;
      }
      var common = hits[0];
      hits.forEach(function (h) { while (h.indexOf(common) !== 0) common = common.slice(0, -1); });
      input.value = base + common;
      print(hits.join("   "), "note");
    }

    /* ---- Bedienung -------------------------------------------------------- */
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = input.value;
      input.value = "";
      skip();
      run(v);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!history.length) return;
        histAt = Math.max(0, histAt - 1);
        input.value = history[histAt];
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!history.length) return;
        histAt = Math.min(history.length, histAt + 1);
        input.value = histAt === history.length ? "" : history[histAt];
        return;
      }
      if (e.key === "Tab") { e.preventDefault(); skip(); complete(); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === "l" || e.key === "L")) {
        e.preventDefault();
        CMDS.clear();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
      /* jeder weitere Tastendruck ueberspringt die Tippanimation sofort */
      skip();
    });

    /* Klick ins Terminal setzt den Fokus in die Eingabe, ohne die Seite zu
       verschieben. Beim Laden passiert das ausdruecklich nicht. */
    box.addEventListener("mouseup", function (e) {
      if (e.target.closest("a, button, input")) return;
      if (window.getSelection && String(window.getSelection()) !== "") return;
      try { input.focus({ preventScroll: true }); } catch (err) { input.focus(); }
    });

    ["help", "all", "about", "skills", "honest", "next", "contact", "neofetch", "clear"].forEach(function (name) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "term-chip";
      b.textContent = name;
      b.addEventListener("click", function () {
        skip();
        run(name);
        try { input.focus({ preventScroll: true }); } catch (err) { input.focus(); }
      });
      chips.appendChild(b);
    });

    print("tr1stan.de — hier stehen die Inhalte dieser Seite.", "head");
    print("Es gibt sie über Befehle: help zeigt alle, all gibt alles aus.", "note");

    /* Erst jetzt gilt das Terminal als bereit. Bleibt die Klasse aus, nimmt
       der Schnipsel im Kopf der Seite has-js wieder ab und die Inhalte
       erscheinen als normaler Text. */
    root.classList.add("term-ready");
  })();

  /* --------------------------------------------------------------------------
     Die dreidimensionale Bühne

     Sie ersetzt die CSS-Szene, aber nur wenn wirklich alles dafür spricht. Der
     Reihe nach: WebGL 2 muss da sein, die Bewegung erwünscht, dynamische
     Importe unterstützt. Erst dann wird three.js überhaupt angefordert — auf
     einem Gerät ohne WebGL lädt die Seite kein einziges Byte davon.

     Die CSS-Szene bleibt vollständig erhalten und läuft weiter, bis das erste
     Bild wirklich steht. Geht danach irgendetwas schief — Kontextverlust, zu
     wenig Bilder pro Sekunde, ein Ladefehler —, wird still zurückgeschaltet:
     Canvas aus, CSS-Szene an, keine Meldung, keine leere Fläche.
     ------------------------------------------------------------------------ */
  function stage3d() {
    var canvas = $(".stage");
    if (!canvas) return false;
    if (reduceMotion) return false;

    // Dynamischer Import in älteren Browsern ist ein Syntaxfehler beim Parsen,
    // deshalb steht er hinter einem Function-Konstruktor und nicht im Text.
    var load;
    try { load = new Function("u", "return import(u);"); } catch (err) { return false; }

    if (!hasWebGL2()) return false;

    var narrow = window.matchMedia("(max-width: 479px)").matches;
    var scene = null;
    var handedBack = false;

    function handBack() {
      if (handedBack) return;
      handedBack = true;
      root.classList.remove("has-3d");
      if (scene) { try { scene.dispose(); } catch (err) {} scene = null; }
      heroParallax();
      floorRide();
    }

    load("/scene3d.js?v=16").then(function (mod) {
      if (!mod || typeof mod.start !== "function") { handBack(); return; }
      scene = mod.start(canvas, {
        quality: narrow ? "low" : "high",
        onFail: handBack
      });
      if (!scene) { handBack(); return; }
      root.classList.add("has-3d");
    })["catch"](function () { handBack(); });

    return true;
  }

  function hasWebGL2() {
    try {
      var probe = document.createElement("canvas");
      var gl = probe.getContext("webgl2");
      if (!gl) return false;
      var lose = gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
      return true;
    } catch (err) {
      return false;
    }
  }

  if (!stage3d()) {
    heroParallax();
    floorRide();
  }

  /* --------------------------------------------------------------------------
     Scroll reveals

     Sections arrive out of depth rather than simply fading: a shade smaller, a
     little lower, unclear — then they settle. Transform and opacity only.

     Every element is armed from here with inline styles and released when its
     section comes into view. Nothing is hidden by the stylesheet, so without
     this script the page is simply fully visible. Under reduced motion nothing
     is armed at all.

     A section is released as a whole, so the heading always leads its own body
     text by its data-delay and never by whatever the observer happened to fire
     first.
     ------------------------------------------------------------------------ */
  (function reveals() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;

    var START = "translate3d(0, 22px, 0) scale(0.968)";
    var armed = [];
    var groups = [];

    function arm(el, delay) {
      el.style.transition = "none";
      el.style.opacity = "0";
      el.style.transform = START;
      armed.push({ el: el, delay: delay });
    }

    $$("[data-reveal]").forEach(function (el) {
      var base = parseInt(el.getAttribute("data-delay"), 10) || 0;
      if (el.hasAttribute("data-stagger") && el.children.length) {
        Array.prototype.forEach.call(el.children, function (child, i) {
          arm(child, base + Math.min(i * 55, 240));
        });
      } else {
        arm(el, base);
      }
    });

    if (!armed.length) return;

    // One forced reflow, so the start state is the value the transition
    // animates away from rather than something the browser skips over.
    void document.body.offsetWidth;
    armed.forEach(function (a) {
      a.el.style.transition = "";          // clears the delay with it
      a.el.classList.add("will-reveal");
      if (a.delay) a.el.style.transitionDelay = a.delay + "ms";
    });

    // group the armed elements under the section they belong to
    armed.forEach(function (a) {
      var box = (a.el.closest && a.el.closest("[data-group]")) || a.el;
      var g = null;
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].box === box) { g = groups[i]; break; }
      }
      if (!g) { g = { box: box, members: [] }; groups.push(g); }
      g.members.push(a.el);
    });

    var pending = groups.slice();

    function release(box) {
      for (var i = 0; i < pending.length; i++) {
        if (pending[i].box !== box) continue;
        pending[i].members.forEach(function (el) {
          el.style.opacity = "";
          el.style.transform = "";
        });
        pending.splice(i, 1);
        io.unobserve(box);
        break;
      }
      if (!pending.length) teardown();
    }

    /* An observer alone is not enough: jumping straight to the bottom never
       changes the state of the sections that were skipped over, so they would
       stay invisible for good. A cheap scroll sweep catches exactly those. */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) release(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    var ticking = false;
    function sweep() {
      ticking = false;
      var edge = window.innerHeight * 0.92;
      pending.slice().forEach(function (g) {
        if (g.box.getBoundingClientRect().top < edge) release(g.box);
      });
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(sweep);
    }
    function teardown() {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }

    groups.forEach(function (g) { io.observe(g.box); });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  })();
})();
