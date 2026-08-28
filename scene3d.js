/* ============================================================================
   tr1stan.de — die dreidimensionale Szene

   Eine Kamerafahrt durch einen Korridor zwischen zwei Bergketten, auf eine
   gestreifte Sonne am Horizont zu. Alles hier ist optional: geladen wird das
   Modul nur, wenn WebGL 2 da ist, die Bewegung erwünscht ist und das Gerät
   mitkommt. Fällt irgendetwas davon aus, bleibt die CSS-Szene stehen und diese
   Datei wird nie angefasst.

   Nur der Kern von three.js. Nichts aus examples/: kein EffectComposer, kein
   Bloom, keine Controls. Das Leuchten der Sonne ist eine Textur, kein Pass.
   ========================================================================== */

import * as THREE from "/vendor/three.module.min.js";

/* --- Maße der Welt --------------------------------------------------------
   Eine Kachel ist TILE_D tief; drei davon laufen im Kreis. Die Höhenfunktion
   ist in z exakt TILE_D-periodisch, deshalb passt die Naht beim Zurücksetzen
   auf den Vertex genau und es gibt keinen Sprung. */
var TILE_W = 1400;
var TILE_D = 300;
var TILES = 3;

var CORRIDOR = 48;      // halbe Breite des flachen Korridors
var RAMP = 62;          // darüber steigen die Berge an
var AMP = 62;           // Grundhöhe der Kämme

var SUN_Z = -1000;
var SUN_R = 260;
var SUN_Y = 92;

var FOG_NEAR = 130;
var FOG_FAR = 880;      // kürzer als die drei Kacheln tief sind, damit die
                        // hintere Kante des Terrains nie als Linie auftaucht

/* Die Kamera fliegt geradeaus, immer. Sie hebt sich nicht, sie nickt nicht,
   sie kippt nicht — beim Scrollen wird sie ausschließlich schneller. Höhe und
   Blickwinkel stehen deshalb fest.

   Damit bleibt der Horizont auf gleicher Bildschirmhöhe und die Sonne über die
   ganze Seite sichtbar. Sie stünde dann aber hinter dem Fließtext, und genau
   das war der Fehler aus v11. Zwei Dinge halten das auseinander: die Sonne
   wandert beim Scrollen sehr langsam zur Seite aus der Mitte heraus, und sie
   wird dabei so weit heruntergenommen, dass von ihr ein ruhiger Schein bleibt.
   Abgedunkelt wird die Szene, nie der Text aufgehellt. */
var CAM_Y = 9.5;
/* Die Drift wird am sichtbaren Ausschnitt gemessen, nicht in festen
   Welteinheiten: ein Hochformat sieht bei gleicher Entfernung nur einen
   Bruchteil der Breite, dort hätte ein fester Wert die Sonne aus dem Bild
   geschoben. Nach oben begrenzt, damit sie nicht über den Rand des Terrains
   hinauswandert und im Leeren stünde. */
var SUN_DRIFT_NDC = 0.62;
var SUN_DRIFT_MAX = 620;
var SUN_FADE_TO = 0.13;  // Restdeckkraft der Scheibe unter dem Hero
var GLOW_FADE_TO = 0.22;
var STAR_FADE_TO = 0.10;  // Sterne stehen jetzt die ganze Seite über im Bild

var C = {
  skyTop: "#06020C",
  skyMid: "#160628",
  skyHorizon: "#2F0B46",
  ground: 0x0b0316,
  grid: 0xe879f9,
  sunTop: "#FEF3C7",
  sunMid: "#FDA4D3",
  sunBottom: "#C026D3",
  star: 0xfbe4ff,
  fog: 0x2f0b46
};

/* --- Höhenfunktion --------------------------------------------------------
   Selbst geschrieben, keine Noise-Bibliothek: fünf Sinus mit verschiedenen
   Frequenzen. Die z-Anteile sind ganzzahlige Vielfache von 2π/TILE_D, damit
   die Kachel sich selbst nahtlos fortsetzt. In der Mitte hält eine weiche
   Maske den Korridor frei, nach außen werden die Kämme höher. */
/* Dämpfung, die nicht an der Bildrate hängt. Ein fester Faktor je Bild würde
   auf einem langsamen Gerät alles zäh machen und auf einem schnellen hart —
   dieselbe Kurve, aber über die Zeit gerechnet. */
function damp(current, target, per60, dt) {
  var k = 1 - Math.pow(1 - per60, Math.min(dt, 0.25) * 60);
  return current + (target - current) * k;
}

function smoothstep(a, b, x) {
  var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

var SUM = 1 + 0.62 + 0.38 + 0.24 + 0.14;

/* Nach außen gereicht, damit die Nahtlosigkeit nachgerechnet und nicht nur
   angeschaut werden kann: h(x, -TILE_DEPTH) muss h(x, 0) sein. */
export var TILE_DEPTH = TILE_D;

export function terrainHeight(x, z) {
  var t = (z / TILE_D) * Math.PI * 2;
  var f =
    1.00 * Math.sin(x * 0.0210 + t * 2 + 1.3) +
    0.62 * Math.sin(x * 0.0470 - t * 3 + 0.4) +
    0.38 * Math.sin(x * 0.0110 + t * 5 + 2.1) +
    0.24 * Math.sin(x * 0.0830 + t * 8 + 0.9) +
    0.14 * Math.sin(x * 0.1530 - t * 13 + 2.7);
  f /= SUM;

  var ax = Math.abs(x);
  var mask = smoothstep(CORRIDOR, CORRIDOR + RAMP, ax);
  var grow = 1 + (Math.max(0, ax - CORRIDOR) / 230);
  var h = AMP * grow * (0.46 + 0.54 * f);
  return mask * Math.max(h, -AMP * 0.12);
}

/* --- Texturen, alle im Code gezeichnet ----------------------------------- */
function makeCanvas(w, h) {
  var c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function skyTexture() {
  var c = makeCanvas(4, 512);
  var g = c.getContext("2d");
  var grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.00, C.skyTop);
  grad.addColorStop(0.32, C.skyMid);
  grad.addColorStop(0.50, C.skyHorizon);
  grad.addColorStop(1.00, C.skyHorizon);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 512);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Die Sonne: senkrechter Verlauf, untere Hälfte waagerecht gestreift. Das ist
   dieselbe Figur wie in der CSS-Szene, nur als Textur. */
function sunTexture() {
  var S = 512;
  var c = makeCanvas(S, S);
  var g = c.getContext("2d");

  g.save();
  g.beginPath();
  g.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
  g.clip();

  var grad = g.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0.00, C.sunTop);
  grad.addColorStop(0.52, C.sunMid);
  grad.addColorStop(1.00, C.sunBottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);

  // Streifen ab der Mitte, nach unten breiter werdende Lücken
  g.globalCompositeOperation = "destination-out";
  g.fillStyle = "#000";
  var y = S * 0.47;
  var gap = 3;
  var bar = 13;
  while (y < S) {
    g.fillRect(0, y, S, gap);
    y += gap + bar;
    gap += 1.5;
    bar -= 0.35;
    if (bar < 3) bar = 3;
  }
  g.restore();

  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Der Schein: ein radialer Verlauf als Textur, additiv gemischt. Das ersetzt
   den Bloom-Pass, den es hier ausdrücklich nicht geben soll. */
function glowTexture() {
  var S = 256;
  var c = makeCanvas(S, S);
  var g = c.getContext("2d");
  var grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0.00, "rgba(253,164,211,0.55)");
  grad.addColorStop(0.28, "rgba(232,121,249,0.28)");
  grad.addColorStop(0.60, "rgba(192,132,252,0.09)");
  grad.addColorStop(1.00, "rgba(192,132,252,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* Eine Sternschnuppe: heller Kopf rechts, nach links ausblendender Schweif,
   senkrecht ausgedünnt. Weiß ins helle Flieder, wie die Horizontlinie. */
function meteorTexture() {
  var W = 256, H = 16;
  var c = makeCanvas(W, H);
  var g = c.getContext("2d");

  var tail = g.createLinearGradient(0, 0, W, 0);
  tail.addColorStop(0.00, "rgba(251, 228, 255, 0)");
  tail.addColorStop(0.55, "rgba(251, 228, 255, 0.32)");
  tail.addColorStop(0.88, "rgba(255, 255, 255, 0.9)");
  tail.addColorStop(1.00, "rgba(255, 255, 255, 1)");
  g.fillStyle = tail;
  g.fillRect(0, 0, W, H);

  var head = g.createRadialGradient(W - 7, H / 2, 0, W - 7, H / 2, 8);
  head.addColorStop(0.0, "rgba(255, 255, 255, 1)");
  head.addColorStop(1.0, "rgba(255, 255, 255, 0)");
  g.fillStyle = head;
  g.fillRect(W - 24, 0, 24, H);

  g.globalCompositeOperation = "destination-in";
  var thin = g.createLinearGradient(0, 0, 0, H);
  thin.addColorStop(0.00, "rgba(0, 0, 0, 0)");
  thin.addColorStop(0.50, "rgba(0, 0, 0, 1)");
  thin.addColorStop(1.00, "rgba(0, 0, 0, 0)");
  g.fillStyle = thin;
  g.fillRect(0, 0, W, H);

  var t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}


/* --- Aufbau --------------------------------------------------------------- */
export function start(canvas, options) {
  var opts = options || {};
  var onFail = opts.onFail || function () {};
  var quality = opts.quality || "high";

  var renderer, scene, camera;
  var tiles = [];
  var geo = null, lineGeo = null;
  var disposables = [];
  var running = false, raf = 0, dead = false;

  var segX = quality === "low" ? 56 : 96;
  var segZ = quality === "low" ? 16 : 24;
  var maxPixelRatio = quality === "low" ? 1 : 2;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: (window.devicePixelRatio || 1) < 1.5 && quality !== "low",
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
      depth: true
    });
  } catch (err) {
    onFail("renderer");
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  scene = new THREE.Scene();
  var sky = skyTexture();
  disposables.push(sky);
  scene.background = sky;
  scene.fog = new THREE.Fog(C.fog, FOG_NEAR, FOG_FAR);

  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 1, 2600);
  camera.position.set(0, CAM_Y, 0);
  scene.add(camera);

  /* Terrain: eine Geometrie, dreimal benutzt. Nichts davon wird pro Bild neu
     gebaut — pro Bild bewegt sich nur die z-Position der drei Kacheln. */
  var solidMat = new THREE.MeshBasicMaterial({
    color: C.ground,
    fog: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
  var lineMat = new THREE.LineBasicMaterial({
    color: C.grid,
    fog: true,
    transparent: true,
    opacity: 0.92
  });
  disposables.push(solidMat, lineMat);

  function buildGeometry(sx, sz) {
    var g = new THREE.PlaneGeometry(TILE_W, TILE_D, sx, sz);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -TILE_D / 2);
    var pos = g.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    pos.needsUpdate = true;
    g.computeBoundingSphere();

    // Nur die Kanten des Rasters, nicht die Diagonalen der Dreiecke
    var idx = function (iz, ix) { return iz * (sx + 1) + ix; };
    var verts = [];
    var push = function (i) {
      verts.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    };
    for (var iz = 0; iz <= sz; iz++)
      for (var ix = 0; ix < sx; ix++) { push(idx(iz, ix)); push(idx(iz, ix + 1)); }
    for (var jx = 0; jx <= sx; jx++)
      for (var jz = 0; jz < sz; jz++) { push(idx(jz, jx)); push(idx(jz + 1, jx)); }

    var lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    lg.computeBoundingSphere();
    return { solid: g, lines: lg };
  }

  function makeTiles(sx, sz) {
    tiles.forEach(function (t) { scene.remove(t.group); });
    tiles.length = 0;
    if (geo) geo.dispose();
    if (lineGeo) lineGeo.dispose();

    var built = buildGeometry(sx, sz);
    geo = built.solid;
    lineGeo = built.lines;

    for (var i = 0; i < TILES; i++) {
      var group = new THREE.Group();
      group.add(new THREE.Mesh(geo, solidMat));
      group.add(new THREE.LineSegments(lineGeo, lineMat));
      group.position.z = -i * TILE_D;
      scene.add(group);
      tiles.push({ group: group, base: -i * TILE_D });
    }
  }
  makeTiles(segX, segZ);

  /* Sonne und Schein. Die Sonne steht hinter dem Terrain und wird von den
     Kämmen verdeckt — das erledigt der Tiefentest, nicht eine Maske. */
  var sunTex = sunTexture(), glowTex = glowTexture();
  var sunMat = new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, depthWrite: false, fog: false });
  var glowMat = new THREE.MeshBasicMaterial({
    map: glowTex, transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending
  });
  var quad = new THREE.PlaneGeometry(1, 1);
  disposables.push(sunTex, glowTex, sunMat, glowMat, quad);

  var sun = new THREE.Mesh(quad, sunMat);
  sun.scale.set(SUN_R * 2, SUN_R * 2, 1);
  sun.position.set(0, SUN_Y, SUN_Z);
  scene.add(sun);

  var glow = new THREE.Mesh(quad, glowMat);
  glow.scale.set(SUN_R * 4.2, SUN_R * 4.2, 1);
  glow.position.set(0, SUN_Y, SUN_Z - 12);
  scene.add(glow);

  /* Sterne: Punkte im oberen Bereich, leicht unterschiedlich hell, ohne Nebel
     — sie sollen nicht mit der Ferne verschwinden. */
  var starCount = quality === "low" ? 90 : 220;
  var sp = new Float32Array(starCount * 3);
  var sc = new Float32Array(starCount * 3);
  var base = new THREE.Color(C.star);
  for (var s = 0; s < starCount; s++) {
    var a = (Math.random() - 0.5) * 2.4;
    var r = 1500 + Math.random() * 400;
    var yy = 90 + Math.pow(Math.random(), 0.7) * 900;
    sp[s * 3] = Math.sin(a) * r;
    sp[s * 3 + 1] = yy;
    sp[s * 3 + 2] = -Math.cos(a) * r;
    var k = 0.35 + Math.random() * 0.65;
    sc[s * 3] = base.r * k;
    sc[s * 3 + 1] = base.g * k;
    sc[s * 3 + 2] = base.b * k;
  }
  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(sc, 3));
  var starMat = new THREE.PointsMaterial({
    size: 2, sizeAttenuation: false, vertexColors: true,
    transparent: true, opacity: 0.9, fog: false, depthWrite: false
  });
  disposables.push(starGeo, starMat);
  scene.add(new THREE.Points(starGeo, starMat));

  /* --- Sternschnuppen ------------------------------------------------------
     Drei Objekte, die immer wieder benutzt werden — pro Sternschnuppe entsteht
     nichts Neues. Sie fliegen auf einer festen Ebene vor der Kamera, weit über
     dem Horizont: damit liegen sie nie über dem Terrain und nie über der
     Sonnenscheibe, deren Oberkante auf dieser Ebene bei etwa 0,57 der halben
     Bildhöhe steht. Und sie starten nur, solange der Hero im Bild ist —
     darunter wäre der obere Himmel von Text überdeckt. */
  var MET_Z = -600;
  var MET_MIN_NDC = 0.60;   // nie tiefer als hier: darüber liegt nur Himmel
  var MET_MAX_NDC = 0.94;
  var MET_GAP_MIN = 8;      // Sekunden
  var MET_GAP_MAX = 15;

  var metTex = meteorTexture();
  var metMat = new THREE.MeshBasicMaterial({
    map: metTex, transparent: true, depthWrite: false, fog: false,
    blending: THREE.AdditiveBlending, opacity: 0
  });
  disposables.push(metTex, metMat);

  var metPool = [];
  for (var mi = 0; mi < 3; mi++) {
    var mm = new THREE.Mesh(quad, metMat.clone());
    mm.visible = false;
    mm.position.z = MET_Z;
    scene.add(mm);
    disposables.push(mm.material);
    metPool.push({ mesh: mm, live: false, t: 0, dur: 1, x0: 0, y0: 0, dx: 0, dy: 0, len: 0 });
  }
  var metWait = 2.5 + Math.random() * 4;

  function metHalf() {
    var hh = Math.abs(MET_Z) * Math.tan((camera.fov * Math.PI) / 360);
    return { h: hh, w: hh * camera.aspect };
  }

  function meteors(dt, e) {
    var half = metHalf();
    var active = 0, i, m;

    for (i = 0; i < metPool.length; i++) {
      m = metPool[i];
      if (!m.live) continue;
      active++;
      m.t += dt;
      var u = m.t / m.dur;
      if (u >= 1) { m.live = false; m.mesh.visible = false; continue; }

      var hx = m.x0 + m.dx * u;
      var hy = m.y0 + m.dy * u;
      // Ein- und Ausblenden, damit nichts hart erscheint oder abreißt
      var a = u < 0.12 ? u / 0.12 : (u > 0.62 ? (1 - u) / 0.38 : 1);
      var ang = Math.atan2(m.dy, m.dx);
      m.mesh.material.opacity = a * 0.95;
      m.mesh.rotation.z = ang;
      m.mesh.scale.set(m.len, m.len * 0.045, 1);
      // der Kopf sitzt am vorderen Ende der Textur
      m.mesh.position.x = hx - Math.cos(ang) * m.len * 0.5;
      m.mesh.position.y = hy - Math.sin(ang) * m.len * 0.5;
    }

    metWait -= dt;
    if (metWait > 0) return;

    // Unter dem Hero nicht starten: dort steht Text im oberen Himmel.
    if (e > 0.35 || active >= 2) { metWait = 1.5; return; }

    var free = null;
    for (i = 0; i < metPool.length; i++) if (!metPool[i].live) { free = metPool[i]; break; }
    if (!free) { metWait = 1.5; return; }

    var ndcY = MET_MIN_NDC + Math.random() * (MET_MAX_NDC - MET_MIN_NDC);
    var toLeft = Math.random() < 0.5;
    var x0 = (toLeft ? 1 : -1) * half.w * (0.55 + Math.random() * 0.5);
    var y0 = ndcY * half.h;

    // nie zwei am selben Ort
    for (i = 0; i < metPool.length; i++) {
      m = metPool[i];
      if (!m.live) continue;
      if (Math.abs(m.mesh.position.x - x0) < half.w * 0.45) { metWait = 2; return; }
    }

    var span = half.w * (0.7 + Math.random() * 0.6);
    var drop = Math.min((ndcY - MET_MIN_NDC) * half.h, span * 0.5);
    free.x0 = x0;
    free.y0 = y0;
    free.dx = (toLeft ? -1 : 1) * span;
    free.dy = -drop;
    free.len = half.w * (0.16 + Math.random() * 0.12);
    free.dur = 0.9 + Math.random() * 0.7;
    free.t = 0;
    free.live = true;
    free.mesh.visible = true;
    free.mesh.material.opacity = 0;
    metWait = MET_GAP_MIN + Math.random() * (MET_GAP_MAX - MET_GAP_MIN);
  }

  /* --- Fahrt ---------------------------------------------------------------
     Die Kamera steht still, das Terrain kommt auf sie zu. Die Geschwindigkeit
     ist ein gedämpfter Folger der Scrollrate: sie steigt schnell an und fällt
     langsam ab, es gibt nirgends eine Stufe. */
  var BASE = 34;
  var GAIN = 1.25;
  var MAX = 620;
  var UP = 0.16;
  var DOWN = 0.042;

  var speed = BASE;
  var offset = 0;
  var lastY = window.scrollY || window.pageYOffset || 0;
  var lastT = 0;

  var tiltX = 0, tiltY = 0, wantX = 0, wantY = 0;
  var ride = 0;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function onPointer(e) {
    var w = window.innerWidth || 1, h = window.innerHeight || 1;
    wantY = ((e.clientX / w) - 0.5) * -0.052;   // höchstens rund 3 Grad
    wantX = ((e.clientY / h) - 0.5) * -0.030;
  }

  /* --- Bildrate ------------------------------------------------------------
     Gemessen wird nur, während wirklich gerendert wird. Erst wird die
     Pixeldichte gesenkt, dann das Terrain vergröbert, und erst wenn das auch
     nicht reicht, gibt die Szene an das CSS zurück. */
  var step = 0;
  var frames = 0, slow = 0, veryslow = 0;

  function degrade() {
    step++;
    frames = 0; slow = 0; veryslow = 0;
    if (step === 1) {
      renderer.setPixelRatio(1);
      resize();
      return true;
    }
    if (step === 2) {
      segX = 56; segZ = 16;
      makeTiles(segX, segZ);
      return true;
    }
    return false;
  }

  function frame(t) {
    raf = 0;
    if (!running || dead) return;

    var dt = lastT ? Math.min((t - lastT) / 1000, 0.1) : 0.016;
    lastT = t;

    var y = window.scrollY || window.pageYOffset || 0;
    var rate = Math.abs(y - lastY) / Math.max(dt, 0.001);
    lastY = y;

    var target = Math.min(BASE + rate * GAIN, MAX);
    speed = damp(speed, target, target > speed ? UP : DOWN, dt);

    offset += speed * dt;
    if (offset >= TILE_D) offset -= TILE_D * Math.floor(offset / TILE_D);
    for (var i = 0; i < tiles.length; i++) {
      var z = tiles[i].base + offset;
      if (z > TILE_D) z -= TILE_D * TILES;
      tiles[i].group.position.z = z;
    }

    /* Die Kamera nickt beim Verlassen des Hero nach unten. Sonne, Berge und
       Horizont wandern damit über den oberen Rand hinaus und stehen nicht
       hinter dem Text; unten läuft nur noch der Boden weiter. Gedämpft, damit
       auch ein Sprung im Scrollstand — ein Anker, das Ende der Seite — als
       Bewegung ankommt und nicht als Schnitt. */
    /* Wie weit die Seite verlassen ist. Treibt nur noch die Dämpfung der Szene
       und die seitliche Drift der Sonne — nicht mehr die Kamera. */
    var prog = Math.min(1, y / (window.innerHeight * 1.1));
    ride = damp(ride, prog, 0.05, dt);
    var e = ride * ride * (3 - 2 * ride);

    /* Unter dem Hero steht Text auf Boden und Sonne. Also werden Boden und
       Sonne leiser, nicht der Text heller. Sichtbar bleibt beides durchgehend. */
    lineMat.opacity = 0.92 - 0.44 * e;
    sunMat.opacity = 1 - (1 - SUN_FADE_TO) * e;
    glowMat.opacity = 1 - (1 - GLOW_FADE_TO) * e;
    /* Die Sterne blieben früher über dem Hero. Jetzt, wo die Kamera nicht mehr
       wegnickt, stehen sie die ganze Seite über im Bild — als helle Punkte
       hinter Buchstaben. Also nehmen auch sie zurück. */
    starMat.opacity = 0.9 - (0.9 - STAR_FADE_TO) * e;

    var halfW = Math.abs(SUN_Z) * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
    var sx = Math.min(SUN_DRIFT_NDC * halfW, SUN_DRIFT_MAX) * e;
    sun.position.x = sx;
    glow.position.x = sx;

    /* Die Maus kippt die Kamera minimal — das ist die einzige Neigung, die es
       noch gibt, und sie hängt nicht am Scrollen. */
    if (fine) {
      tiltX = damp(tiltX, wantX, 0.05, dt);
      tiltY = damp(tiltY, wantY, 0.05, dt);
      camera.rotation.set(tiltX, tiltY, 0, "YXZ");
    }

    meteors(dt, e);

    renderer.render(scene, camera);

    /* Bildrate: gemessen wird nur, während tatsächlich gerendert wird. Unter
       36 Bildern je Sekunde wird vergröbert, aufgegeben wird erst, wenn auch
       danach noch weniger als 20 Bilder je Sekunde herauskommen. */
    frames++;
    if (dt > 0.028) slow++;
    if (dt > 0.050) veryslow++;
    if (frames >= 120) {
      var bad = slow / frames > 0.6;
      var hopeless = veryslow / frames > 0.6;
      frames = 0; slow = 0; veryslow = 0;
      if (bad && !degrade() && hopeless) { onFail("slow"); return; }
    }

    raf = window.requestAnimationFrame(frame);
  }

  function play() {
    if (running || dead) return;
    running = true;
    lastT = 0;
    lastY = window.scrollY || window.pageYOffset || 0;
    raf = window.requestAnimationFrame(frame);
  }

  function pause() {
    running = false;
    if (raf) window.cancelAnimationFrame(raf);
    raf = 0;
  }

  /* --- Fenstergröße, gedrosselt -------------------------------------------- */
  var resizeTimer = 0;
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 160);
  }

  function onVisibility() {
    if (document.hidden) pause(); else if (inView) play();
  }

  /* Der Canvas hängt fest am Viewport, ist also praktisch immer im Bild. Der
     Beobachter steht trotzdem hier: er hält das Rendern an, sobald der Canvas
     einmal nicht sichtbar sein sollte. */
  var inView = true;
  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (entries) {
      inView = entries[entries.length - 1].isIntersecting;
      if (inView && !document.hidden) play(); else pause();
    }, { threshold: 0 });
    io.observe(canvas);
  }

  function onContextLost(e) {
    e.preventDefault();
    pause();
    onFail("context-lost");
  }

  window.addEventListener("resize", onResize, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);
  canvas.addEventListener("webglcontextlost", onContextLost, false);
  if (fine) window.addEventListener("pointermove", onPointer, { passive: true });

  play();

  return {
    dispose: function () {
      if (dead) return;
      dead = true;
      pause();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", onContextLost, false);
      if (fine) window.removeEventListener("pointermove", onPointer);
      if (io) io.disconnect();
      window.clearTimeout(resizeTimer);
      if (geo) geo.dispose();
      if (lineGeo) lineGeo.dispose();
      disposables.forEach(function (d) { if (d && d.dispose) d.dispose(); });
      renderer.dispose();
    },
    quality: function () { return { segX: segX, segZ: segZ, step: step }; },
    /* Nur lesende Auskünfte. Sie kosten nichts und machen die Prüfung möglich:
       ohne sie liesse sich weder belegen, dass die Kamera wirklich geradeaus
       fliegt, noch wo die Sternschnuppen tatsächlich entlanglaufen. */
    view: function () {
      return {
        camY: camera.position.y, rotX: camera.rotation.x, rotY: camera.rotation.y,
        fov: camera.fov, ride: ride,
        sunX: sun.position.x, sunY: sun.position.y,
        sunOpacity: sunMat.opacity, glowOpacity: glowMat.opacity,
        starOpacity: starMat.opacity, lineOpacity: lineMat.opacity
      };
    },
    meteors: function () {
      var half = metHalf();
      var live = [];
      for (var i = 0; i < metPool.length; i++) {
        var m = metPool[i];
        if (!m.live) continue;
        var u = m.t / m.dur;
        var hx = m.x0 + m.dx * u, hy = m.y0 + m.dy * u;
        var ang = Math.atan2(m.dy, m.dx);
        live.push({
          headX: hx / half.w, headY: hy / half.h,
          tailX: (hx - Math.cos(ang) * m.len) / half.w,
          tailY: (hy - Math.sin(ang) * m.len) / half.h,
          opacity: m.mesh.material.opacity
        });
      }
      return { live: live, wait: metWait };
    },
    stats: function () {
      var r = renderer.info.render;
      return { calls: r.calls, triangles: r.triangles, lines: r.lines, points: r.points,
               segX: segX, segZ: segZ, pixelRatio: renderer.getPixelRatio() };
    }
  };
}
