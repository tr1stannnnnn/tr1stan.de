/* ==========================================================================
   tr1stan.de - script.js
   Progressive enhancement only. Every page stays readable without this file.
   The "ready" class is set here (not inline), so a failed/blocked script
   never leaves the page with hidden content or a dead hamburger button.
   ========================================================================== */

(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("ready");

  var qs = function (sel, scope) {
    return (scope || document).querySelector(sel);
  };
  var qsa = function (sel, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(sel));
  };

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = motionQuery.matches;
  if (typeof motionQuery.addEventListener === "function") {
    motionQuery.addEventListener("change", function (e) {
      reduced = e.matches;
    });
  }

  var live = qs("#liveStatus");
  var say = function (message) {
    if (live) live.textContent = message;
  };

  /* ---------------------------------------------------------------- year */

  var year = qs("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  /* --------------------------------------------------------------- clock */

  var clock = qs("#clock");
  if (clock) {
    var formatter = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    var tick = function () {
      clock.textContent = formatter.format(new Date());
    };
    tick();
    window.setInterval(tick, 1000);
  }

  /* ---------------------------------------------- header + scroll progress */

  var header = qs("[data-header]");
  var progress = qs("#scrollProgress");
  var scrollQueued = false;

  var onScroll = function () {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 8);

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
      progress.style.setProperty("--p", Math.min(100, Math.max(0, pct)).toFixed(2) + "%");
    }
    scrollQueued = false;
  };

  window.addEventListener(
    "scroll",
    function () {
      if (scrollQueued) return;
      scrollQueued = true;
      window.requestAnimationFrame(onScroll);
    },
    { passive: true }
  );
  onScroll();

  /* ------------------------------------------------------- mobile nav */

  var navToggle = qs("#navToggle");
  var siteNav = qs("#siteNav");

  var closeNav = function () {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Navigation öffnen");
    siteNav.classList.remove("is-open");
  };

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var open = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!open));
      navToggle.setAttribute("aria-label", open ? "Navigation öffnen" : "Navigation schließen");
      siteNav.classList.toggle("is-open", !open);
    });

    qsa("a", siteNav).forEach(function (link) {
      link.addEventListener("click", closeNav);
    });

    document.addEventListener("click", function (event) {
      if (!siteNav.classList.contains("is-open")) return;
      if (siteNav.contains(event.target) || navToggle.contains(event.target)) return;
      closeNav();
    });
  }

  /* ------------------------------------------------------- command deck */

  var palette = qs("#commandPalette");
  var openBtn = qs("#openPalette");
  var closeBtn = qs("#closePalette");
  var cmdInput = qs("#cmdInput");
  var cmdEmpty = qs("#cmdEmpty");
  var cmdItems = qsa(".cmd-item");
  var lastFocus = null;

  var visibleItems = function () {
    return cmdItems.filter(function (item) {
      return !item.hidden;
    });
  };

  var select = function (item) {
    cmdItems.forEach(function (el) {
      el.classList.toggle("is-sel", el === item);
    });
    if (item && typeof item.scrollIntoView === "function") {
      item.scrollIntoView({ block: "nearest" });
    }
  };

  var move = function (step) {
    var list = visibleItems();
    if (!list.length) return;
    var current = list.indexOf(qs(".cmd-item.is-sel"));
    var next = (current + step + list.length) % list.length;
    select(list[next]);
  };

  var filter = function (term) {
    var needle = term.trim().toLowerCase();
    var hits = 0;

    cmdItems.forEach(function (item) {
      var haystack = (item.textContent + " " + (item.getAttribute("data-k") || "")).toLowerCase();
      var match = !needle || haystack.indexOf(needle) !== -1;
      item.hidden = !match;
      if (match) hits++;
    });

    if (cmdEmpty) cmdEmpty.hidden = hits > 0;
    select(visibleItems()[0] || null);
  };

  var openPalette = function () {
    if (!palette) return;
    lastFocus = document.activeElement;
    if (typeof palette.showModal === "function") {
      if (!palette.open) palette.showModal();
    } else {
      palette.setAttribute("open", "");
    }
    if (cmdInput) {
      cmdInput.value = "";
      filter("");
      cmdInput.focus();
    }
  };

  var closePalette = function () {
    if (!palette) return;
    if (palette.open && typeof palette.close === "function") {
      palette.close();
    } else {
      palette.removeAttribute("open");
    }
    if (lastFocus && typeof lastFocus.focus === "function") {
      lastFocus.focus({ preventScroll: true });
    }
  };

  if (palette) {
    if (openBtn) openBtn.addEventListener("click", openPalette);
    if (closeBtn) closeBtn.addEventListener("click", closePalette);
    if (cmdInput) {
      cmdInput.addEventListener("input", function () {
        filter(cmdInput.value);
      });
    }

    cmdItems.forEach(function (item) {
      item.addEventListener("click", closePalette);
      item.addEventListener("pointerenter", function () {
        select(item);
      });
    });

    palette.addEventListener("click", function (event) {
      // click on the backdrop (the dialog element itself) closes it
      if (event.target === palette) closePalette();
    });

    palette.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        move(-1);
      } else if (event.key === "Enter") {
        var sel = qs(".cmd-item.is-sel");
        if (sel) {
          event.preventDefault();
          sel.click();
        }
      }
    });
  }

  window.addEventListener("keydown", function (event) {
    var key = (event.key || "").toLowerCase();
    if ((event.ctrlKey || event.metaKey) && key === "k") {
      event.preventDefault();
      if (palette && palette.open) closePalette();
      else openPalette();
      return;
    }
    if (event.key === "Escape") closeNav();
  });

  /* ----------------------------------------------------- copy mail button */

  var fallbackCopy = function (text) {
    var field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.top = "-1000px";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    var done = false;
    try {
      done = document.execCommand("copy");
    } catch (err) {
      done = false;
    }
    field.remove();
    return done;
  };

  qsa("[data-copy]").forEach(function (button) {
    var label = button.getAttribute("data-label") || "Mail kopieren";
    var target = qs("[data-copy-text]", button) || button;
    var timer = 0;

    button.addEventListener("click", function () {
      var value = button.getAttribute("data-copy") || "";

      var success = function () {
        target.textContent = "Kopiert ✓";
        button.classList.add("is-done");
        say(value + " wurde in die Zwischenablage kopiert.");
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          target.textContent = label;
          button.classList.remove("is-done");
        }, 2200);
      };

      var failure = function () {
        target.textContent = "Bitte manuell kopieren";
        say("Kopieren nicht möglich. Die Adresse lautet " + value);
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          target.textContent = label;
        }, 3000);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(success, function () {
          if (fallbackCopy(value)) success();
          else failure();
        });
      } else if (fallbackCopy(value)) {
        success();
      } else {
        failure();
      }
    });
  });

  /* ------------------------------------------------------------- reveal */

  var revealItems = qsa("[data-reveal]");
  if (revealItems.length) {
    if ("IntersectionObserver" in window && !reduced) {
      var revealObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.08 }
      );
      revealItems.forEach(function (item) {
        revealObserver.observe(item);
      });
    } else {
      revealItems.forEach(function (item) {
        item.classList.add("is-visible");
      });
    }
  }

  /* ----------------------------------------------------- active section */

  var markers = qsa(".nav a[href^='#'], .rail a[href^='#']");
  var sectionIds = [];
  markers.forEach(function (link) {
    var id = link.getAttribute("href").slice(1);
    if (id && sectionIds.indexOf(id) === -1) sectionIds.push(id);
  });

  var sections = sectionIds
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var activeObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var hash = "#" + entry.target.id;
          markers.forEach(function (link) {
            link.classList.toggle("is-active", link.getAttribute("href") === hash);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (section) {
      activeObserver.observe(section);
    });
  }

  /* --------------------------------------------------- pointer sheen */

  if (window.matchMedia("(hover: hover)").matches) {
    qsa(".glow").forEach(function (panel) {
      panel.addEventListener(
        "pointermove",
        function (event) {
          var rect = panel.getBoundingClientRect();
          panel.style.setProperty("--mx", ((event.clientX - rect.left) / rect.width) * 100 + "%");
          panel.style.setProperty("--my", ((event.clientY - rect.top) / rect.height) * 100 + "%");
        },
        { passive: true }
      );
      panel.addEventListener("pointerleave", function () {
        panel.style.removeProperty("--mx");
        panel.style.removeProperty("--my");
      });
    });
  }

  /* ------------------------------------------------------ frame monitor
     Draws real frame timing (not decorative fake numbers): every sample is
     derived from the actual time between animation frames.
     -------------------------------------------------------------------- */

  var canvas = qs("#pulse");
  var readout = qs("#uplink");

  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var SAMPLES = 76;
    var data = [];
    var i;
    for (i = 0; i < SAMPLES; i++) data.push(0.5);

    var width = 0;
    var height = 0;

    var resize = function () {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    var draw = function () {
      if (!width || !height) return;
      ctx.clearRect(0, 0, width, height);

      var stepX = width / (SAMPLES - 1);
      var pointY = function (value) {
        return height - 6 - value * (height - 14);
      };

      // filled area
      var gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, "rgba(34, 229, 255, 0.34)");
      gradient.addColorStop(1, "rgba(34, 229, 255, 0)");

      ctx.beginPath();
      ctx.moveTo(0, height);
      for (i = 0; i < SAMPLES; i++) ctx.lineTo(i * stepX, pointY(data[i]));
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // line
      ctx.beginPath();
      for (i = 0; i < SAMPLES; i++) {
        var x = i * stepX;
        var y = pointY(data[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = "#63ffd0";
      ctx.lineWidth = 1.6;
      ctx.lineJoin = "round";
      ctx.stroke();

      // leading dot
      var lastX = (SAMPLES - 1) * stepX;
      var lastY = pointY(data[SAMPLES - 1]);
      ctx.beginPath();
      ctx.arc(lastX - 1, lastY, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = "#22e5ff";
      ctx.shadowColor = "rgba(34, 229, 255, 0.9)";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    var last = 0;
    var accumulator = 0;
    var fpsSum = 0;
    var fpsCount = 0;
    var rafId = 0;
    var visible = true;

    var loop = function (now) {
      rafId = window.requestAnimationFrame(loop);
      if (!last) {
        last = now;
        return;
      }
      var delta = now - last;
      last = now;
      if (delta <= 0 || delta > 1000) return;

      var fps = 1000 / delta;
      fpsSum += fps;
      fpsCount++;
      accumulator += delta;

      if (accumulator >= 90) {
        accumulator = 0;
        data.push(Math.max(0.06, Math.min(1, fps / 72)));
        data.shift();
        draw();

        if (readout && fpsCount) {
          readout.textContent = Math.round(fpsSum / fpsCount) + " fps";
          fpsSum = 0;
          fpsCount = 0;
        }
      }
    };

    var start = function () {
      if (rafId || reduced || !visible) return;
      last = 0;
      rafId = window.requestAnimationFrame(loop);
    };

    var stop = function () {
      if (!rafId) return;
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    };

    // static, calm baseline for reduced-motion users
    var drawStatic = function () {
      for (i = 0; i < SAMPLES; i++) {
        data[i] = 0.5 + Math.sin(i / 5) * 0.16 + Math.sin(i / 13) * 0.09;
      }
      draw();
      if (readout) readout.textContent = "static";
    };

    resize();
    if (reduced) drawStatic();
    else draw();

    window.addEventListener(
      "resize",
      function () {
        resize();
        if (reduced) drawStatic();
        else draw();
      },
      { passive: true }
    );

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop();
      else start();
    });

    // only burn frames while the console is actually on screen
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start();
        else stop();
      }).observe(canvas);
    } else {
      start();
    }
  }
})();
