/* AM 369 Network — Particle text formation (start screen)
 * Dust particles begin scattered, converge into "AM 369 NETWORK", hold, then
 * drift apart as the loader fades. Respects prefers-reduced-motion (skips to
 * a static render). Colours are light-theme: soft graphite dust with subtle
 * cyan/blue/purple accents, matching the site's white/cream palette.
 */
(function () {
  "use strict";

  function run() {
    var canvas = document.getElementById("particle-canvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var W, H, dpr;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth = window.innerWidth;
      H = canvas.clientHeight = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener("resize", size);

    /* ---- sample target points from text drawn on an offscreen canvas ---- */
    function textPoints(text, fontPx, cx, cy, gap) {
      var off = document.createElement("canvas");
      off.width = W; off.height = H;
      var octx = off.getContext("2d");
      octx.fillStyle = "#000";
      octx.font = "700 " + fontPx + "px Inter, sans-serif";
      octx.textAlign = "center"; octx.textBaseline = "middle";
      octx.fillText(text, cx, cy);
      var data = octx.getImageData(0, 0, W, H).data;
      var pts = [];
      for (var y = 0; y < H; y += gap) {
        for (var x = 0; x < W; x += gap) {
          var a = data[(y * W + x) * 4 + 3];
          if (a > 120) pts.push({ x: x, y: y });
        }
      }
      return pts;
    }

    var isMobile = W < 720;
    var fontPx = isMobile ? Math.round(W * 0.135) : 118;
    var cy = H / 2 - (isMobile ? 10 : 0);
    var gap = isMobile ? 4 : 5;
    var targets = textPoints("AM 369", fontPx, W / 2, cy, gap);
    // sub-line "NETWORK" smaller, below
    var subFontPx = isMobile ? Math.round(W * 0.05) : 40;
    var subTargets = textPoints("N E T W O R K", subFontPx, W / 2, cy + fontPx * 0.62, Math.max(3, gap - 1));
    targets = targets.concat(subTargets);

    // cap particle count for perf
    var MAX = isMobile ? 900 : 1800;
    if (targets.length > MAX) {
      var step = Math.ceil(targets.length / MAX);
      targets = targets.filter(function (_, i) { return i % step === 0; });
    }

    var accentColors = ["#1FA9B0", "#3B6FD1", "#8A5FD1"];
    var particles = targets.map(function (t, i) {
      var angle = Math.random() * Math.PI * 2;
      var dist = 260 + Math.random() * 340;
      return {
        x: W / 2 + Math.cos(angle) * dist,
        y: H / 2 + Math.sin(angle) * dist,
        tx: t.x, ty: t.y,
        vx: 0, vy: 0,
        size: Math.random() * 1.6 + 0.6,
        color: i % 9 === 0 ? accentColors[i % 3] : "#2A2C26",
        settle: 0.028 + Math.random() * 0.02
      };
    });

    if (reduceMotion) {
      // static: draw settled immediately, no animation loop
      ctx.clearRect(0, 0, W, H);
      particles.forEach(function (p) {
        ctx.fillStyle = p.color; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(p.tx, p.ty, p.size, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      return;
    }

    var start = performance.now();
    var HOLD_AT = 1900;    // ms until fully formed
    var DRIFT_AT = 2300;   // ms when it starts gently drifting apart before fade

    function frame(now) {
      var t = now - start;
      ctx.clearRect(0, 0, W, H);
      var driftPhase = t > DRIFT_AT;
      particles.forEach(function (p) {
        var dx = p.tx - p.x, dy = p.ty - p.y;
        if (!driftPhase) {
          p.vx += dx * p.settle * 0.02;
          p.vy += dy * p.settle * 0.02;
          p.vx *= 0.86; p.vy *= 0.86;
          p.x += p.vx; p.y += p.vy;
        } else {
          // gentle outward drift + upward fade as loader closes
          p.x += (p.tx - W / 2) * 0.0025;
          p.y += -0.35;
        }
        ctx.globalAlpha = driftPhase ? Math.max(0, 1 - (t - DRIFT_AT) / 700) : Math.min(1, t / 900);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      if (t < DRIFT_AT + 750) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener("DOMContentLoaded", run);
})();
