/* Homepage behaviour, isolated from shared script.js and the game cache.
   Semantic HTML is the source; navigation never depends on the scene.
   No framework, persistence, analytics or production API requests. */
(function () {
  "use strict";

  var root = document.documentElement;
  var motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduceMotion = motionPreference.matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  // Anchor scrolling alone does not consistently move keyboard focus.
  $$(".skip[href^='#']").forEach(function (link) {
    link.addEventListener("click", function () {
      var target = document.getElementById(link.getAttribute("href").slice(1));
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    });
  });

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


  /* Views are HTML first. Only the detail/overview swap is enhanced; the hash
     is the route, so copied links and browser back/forward stay meaningful. */
  var detail = $("#project-packet-flight"), overview = $("#projectOverview");
  var routeTimer = 0;
  function routeTarget(hash) {
    try { return document.getElementById(decodeURIComponent(hash.slice(1))); } catch (error) { return null; }
  }
  function routeFeedback(hash) {
    var kind = hash === "#log" ? "log" : hash.indexOf("project") !== -1 ? "projects" : "terminal";
    var label = hash === "#project-packet-flight" ? "PACKET//FLIGHT · Projektdetails geöffnet." : kind === "projects" ? "projects · Übersicht geöffnet." : kind === "log" ? "log · Entwicklungsnotizen geöffnet." : "Persönliche Inhalte und Terminal.";
    $("#routeStatus").textContent = label;
    window.clearTimeout(routeTimer); document.body.removeAttribute("data-route");
    if (!reduceMotion && !document.hidden) {
      void document.body.offsetWidth;
      document.body.setAttribute("data-route", kind);
      routeTimer = window.setTimeout(function () { document.body.removeAttribute("data-route"); }, 950);
    }
  }
  function renderRoute(hash, move) {
    var target = routeTarget(hash), isDetail = hash === "#project-packet-flight";
    if (!isDetail) detail.querySelector("video").pause();
    detail.hidden = !isDetail; overview.hidden = isDetail;
    $$(".home-nav a, .console-map > a").forEach(function (a) {
      var selected = a.hash === hash || (isDetail && a.hash === "#projects");
      if (selected) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
    });
    if (isDetail) $("#packetFlightTitle").closest("article").hidden = false;
    if (move && target) {
      var focus = target.tagName === "SECTION" ? target.querySelector("h2[tabindex]") || target : target;
      if (!focus.hasAttribute("tabindex")) focus.setAttribute("tabindex", "-1");
      focus.focus({ preventScroll: true });
      target.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" });
      routeFeedback(hash);
    }
  }
  function navigate(hash) {
    if (!routeTarget(hash)) return;
    if (location.hash !== hash) history.pushState(null, "", hash);
    renderRoute(hash, true);
  }
  document.addEventListener("click", function (event) {
    var a = event.target.closest("a[href^='#']");
    if (!a || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !routeTarget(a.hash)) return;
    event.preventDefault(); navigate(a.hash);
  });
  window.addEventListener("hashchange", function () { renderRoute(location.hash, true); });
  (function terminal() {
    var box = $("#term");
    if (!box) return;
    var out = $("#termOut"), form = $("#termForm"), input = $("#termIn"), chips = $("#termChips");
    if (!out || !form || !input || !chips) return;

    var MAX_LEN = 120;
    var instant = reduceMotion;
    var followOutput = true, newer = $("#newOutput");
    out.addEventListener("scroll", function () {
      followOutput = out.scrollHeight - out.scrollTop - out.clientHeight < 24;
      if (followOutput) newer.hidden = true;
    }, { passive: true });
    newer.addEventListener("click", function () { followOutput = true; newer.hidden = true; down(); out.focus({ preventScroll: true }); });

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
      var note = node.closest("details");
      if (note) jobs.push({ kind: "text", cls: "head", text: clean(note.querySelector("summary").textContent) });

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

    function down() { if (followOutput) out.scrollTop = out.scrollHeight; else newer.hidden = false; }
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
      if (instant) { hideCaret(); out.appendChild(makeLine(job)); showCaret(); return; }
      queue.push(job);
      if (!timer && !typing && !document.hidden) pump();
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
        "Fremde Hosts .. keine beim Seitenaufruf",
        "Fenster ....... " + window.innerWidth + " x " + window.innerHeight,
        "Sprache ....... " + (root.getAttribute("lang") || "de")
      ];
    }

    TOPICS.projects = function () { link("", "projects · Projektübersicht ansehen", "#projects", false); };
    TOPICS.log = function () { link("", "log · Entwicklungslog lesen", "#log", false); };
    var CMDS = {
      help: function () {
        print("Verfügbare Befehle:", "head");
        [["help", "diese Liste"],
         ["all", "persönliche Themen + kurze Wege zu Projects und Log"],
         ["projects", "Projektübersicht öffnen"],
         ["projects packet-flight", "PACKET//FLIGHT im Detail"],
         ["log", "Entwicklungslog öffnen"],
         ["about", "wie es anfing und warum es geblieben ist"],
         ["skills", "was ich mache"],
         ["honest", "ehrlich gesagt"],
         ["next", "was als Nächstes kommt"],
         ["contact", "Mailadresse und GitHub"],
         ["play", "PACKET//FLIGHT starten"],
         ["play --daily", "heutige Daily-Route spielen"],
         ["leaderboard", "Rangliste öffnen"],
         ["ls", "verfügbare Themen"],
         ["cat <name>", "ein Thema ausgeben"],
         ["whoami", "kurze Antwort"],
         ["neofetch", "Angaben zu dieser Seite"],
         ["clear", "Ausgabe leeren"],
         ["sudo", "besser nicht"],
         ["exit", "Versuch macht klug"]].forEach(function (r) {
          print("  " + pad(r[0], 24) + r[1]);
        });
        blank();
        print("Pfeiltasten blättern durch den Verlauf, Tabulator vervollständigt, Strg+L leert.", "note");
      },
      all: function () {
        TOPIC_ORDER.forEach(function (name, i) {
          if (i) blank();
          TOPICS[name]();
        });
        blank(); TOPICS.projects(); TOPICS.log();
        print("all zeigt persönliche Themen. projects und log öffnen die eigenen Ansichten.", "note");
      },
      projects: function (arg) {
        var name = String(arg || "").trim().toLowerCase();
        if (name && name !== "packet-flight") { print("projects: nutze projects oder projects packet-flight.", "note"); return; }
        TOPICS.projects(); navigate(name ? "#project-packet-flight" : "#projects");
      },
      log: function () { TOPICS.log(); navigate("#log"); },
      about: function () { TOPICS.about(); },
      skills: function () { TOPICS.skills(); },
      honest: function () { TOPICS.honest(); },
      next: function () { TOPICS.next(); },
      contact: function () { TOPICS.contact(); },
      play: function (arg) {
        if (arg && arg !== "--daily") { print("play: nutze play oder play --daily.", "note"); return; }
        window.location.assign(arg === "--daily" ? "/game.html?mode=daily" : "/game.html");
      },
      leaderboard: function () { window.location.assign("/game.html#leaderboard"); },
      ls: function () {
        print(TOPIC_ORDER.concat(["projects", "log"]).join("   "), "head");
        print("cat <name> liest ein Thema. cat projects / cat log zeigen kurze Verweise.", "note");
        print("Arcade: play, play --daily, leaderboard. help zeigt alle Befehle.", "note");
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
      } else if (v.slice(0, sp).toLowerCase() === "projects") {
        pool = ["packet-flight"]; prefix = v.slice(sp + 1).trim().toLowerCase(); base = "projects ";
      } else if (v.slice(0, sp).toLowerCase() === "play") {
        pool = ["--daily"]; prefix = v.slice(sp + 1).trim().toLowerCase(); base = "play ";
      } else { return false; }

      var hits = pool.filter(function (k) { return k.indexOf(prefix) === 0; });
      if (!hits.length || (hits.length === 1 && hits[0] === prefix)) return false;
      if (hits.length === 1) {
        input.value = base + hits[0] + (!base && hits[0] === "cat" ? " " : "");
        return true;
      }
      var common = hits[0];
      hits.forEach(function (h) { while (h.indexOf(common) !== 0) common = common.slice(0, -1); });
      if (common === prefix) return false;
      input.value = base + common;
      print(hits.join("   "), "note");
      return true;
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
      if (e.key === "Tab") {
        if (!e.shiftKey && input.value.trim() && complete()) { e.preventDefault(); skip(); }
        return;
      }
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
      if (!window.matchMedia("(pointer: fine)").matches || e.target.closest("a, button, input")) return;
      if (window.getSelection && String(window.getSelection()) !== "") return;
      try { input.focus({ preventScroll: true }); } catch (err) { input.focus(); }
    });

    ["help", "projects", "projects packet-flight", "log", "all", "about", "skills", "honest", "next", "contact", "neofetch", "clear", "play", "play --daily", "leaderboard"].forEach(function (name) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "term-chip" + (/^(projects|log)/.test(name) ? " term-chip--route" : "");
      b.textContent = name;
      b.addEventListener("click", function () {
        skip();
        run(name);
        // Keep native button focus; tapping a shortcut must not open the keyboard.
      });
      chips.appendChild(b);
    });

    print("tr1stan.de — schön, dass du hier bist.", "head");
    print("help zeigt die Befehle. Oder klick dich direkt durch.", "note");

    /* Erst jetzt gilt das Terminal als bereit. Bleibt die Klasse aus, nimmt
       der Schnipsel im Kopf der Seite has-js wieder ab und die Inhalte
       erscheinen als normaler Text. */
    motionPreference.addEventListener("change", function (event) { instant = event.matches; if (instant) skip(); });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { window.clearTimeout(timer); timer = 0; }
      else if (typing) { typing.t0 = now() - typing.at / CPS * 1000; step(); }
      else if (queue.length) pump();
    });
    root.classList.add("term-ready");
  })();


  /* Optional renderer. No navigation depends on WebGL. Weak devices/save-data
     use the complete CSS landscape without downloading three.js. */
  var scene = null, sceneAttempted = false;
  function releaseScene() {
    root.classList.remove("has-3d");
    if (scene) { scene.dispose(); scene = null; }
  }
  function optionalScene() {
    if (scene || sceneAttempted || reduceMotion || document.hidden) return;
    if ((navigator.connection && navigator.connection.saveData) || (navigator.deviceMemory && navigator.deviceMemory < 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4)) return;
    sceneAttempted = true;
    try {
      var probe = document.createElement("canvas"), gl = probe.getContext("webgl2");
      if (!gl) return;
      var lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
      import("/scene3d.js?v=landscape-1").then(function (module) {
        if (reduceMotion || document.hidden) { sceneAttempted = false; return; }
        scene = module.start($(".stage"), { composition: "landscape", quality: innerWidth < 760 ? "low" : "high", onFail: releaseScene });
        if (scene) requestAnimationFrame(function () { if (scene && !reduceMotion) root.classList.add("has-3d"); });
      }).catch(releaseScene);
    } catch (error) { releaseScene(); }
  }
  motionPreference.addEventListener("change", function (event) {
    reduceMotion = event.matches;
    if (reduceMotion) { releaseScene(); document.body.removeAttribute("data-route"); }
    else { sceneAttempted = false; optionalScene(); }
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { document.body.removeAttribute("data-route"); window.clearTimeout(routeTimer); detail.querySelector("video").pause(); }
    else optionalScene();
  });
  renderRoute(location.hash, false);
  if (location.hash) requestAnimationFrame(function () { renderRoute(location.hash, true); });
  optionalScene();
})();
