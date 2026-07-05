/* AM 369 Network — Public site logic */
(function () {
  "use strict";

  var state = { apps: [], blogs: [], directories: [], medicines: [], systems: [], species: [], settings: {}, content: {}, filterSpecies: "All", query: "" };

  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function lazyImg(url, alt) {
    if (!url) return '<div class="ph">🐾</div>';
    // data-src holds the real URL; ImageCache resolves it to a cached blob URL after mount
    return '<img loading="lazy" data-src="' + esc(url) + '" alt="' + esc(alt || "") + '" onerror="this.parentNode.innerHTML=\'<div class=&quot;ph&quot;>🐾</div>\'">';
  }
  // Upgrade every [data-src] image to a cached blob URL (memory -> IndexedDB -> network).
  function hydrateImages(root) {
    if (!window.ImageCache) return;
    var imgs = (root || document).querySelectorAll("img[data-src]");
    imgs.forEach(function (img) {
      var url = img.getAttribute("data-src");
      img.removeAttribute("data-src");
      ImageCache.getObjectURL(url).then(function (resolved) { img.src = resolved || url; });
    });
  }

  function toast(msg, kind) {
    var host = $("#toasts"); if (!host) return;
    var t = el("div", "toast " + (kind || ""), esc(msg));
    host.appendChild(t);
    setTimeout(function () { t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 300); }, 2600);
  }

  function matchSpecies(item) {
    if (state.filterSpecies === "All") return true;
    var sp = item.species || [];
    return sp.indexOf("All") > -1 || sp.indexOf(state.filterSpecies) > -1;
  }
  function matchQuery(item, fields) {
    if (!state.query) return true;
    var q = state.query.toLowerCase();
    return fields.some(function (f) {
      var v = item[f];
      if (Array.isArray(v)) v = v.join(" ");
      return String(v || "").toLowerCase().indexOf(q) > -1;
    });
  }

  /* ---------- renderers ---------- */
  function renderApps() {
    var host = $("#apps-grid"); if (!host) return;
    var list = state.apps.filter(function (a) {
      return a.status === "active" && matchSpecies(a) && matchQuery(a, ["title", "description", "category", "species"]);
    });
    host.innerHTML = "";
    if (!list.length) { host.appendChild(el("div", "empty", "No apps match your filters yet.")); return; }
    list.forEach(function (a) {
      var c = el("div", "card");
      c.innerHTML =
        '<div class="thumb">' + lazyImg(a.thumbnail, a.title) + '</div>' +
        '<h3>' + esc(a.title) + (a.featured ? '<span class="featured-flag">Featured</span>' : '') + '</h3>' +
        '<p>' + esc(a.description) + '</p>' +
        '<div class="tags">' + (a.species || []).map(function (s) { return '<span class="tag sp">' + esc(s) + '</span>'; }).join('') + '</div>';
      var btn = el("a", "btn btn-primary card-btn", esc(a.buttonText || "Open App"));
      btn.href = a.url || "#"; btn.target = "_blank"; btn.rel = "noopener";
      c.appendChild(btn);
      host.appendChild(c);
    });
    hydrateImages(host);
    reveal(host);
  }

  function renderBlogs() {
    var host = $("#blogs-grid"); if (!host) return;
    var list = state.blogs.filter(function (b) {
      return b.status === "published" && matchSpecies(b) && matchQuery(b, ["title", "summary", "category", "tags", "species"]);
    });
    host.innerHTML = "";
    if (!list.length) { host.appendChild(el("div", "empty", "No articles match your filters yet.")); return; }
    list.forEach(function (b) {
      var c = el("div", "card");
      c.innerHTML =
        '<div class="thumb">' + lazyImg(b.thumbnail, b.title) + '</div>' +
        '<h3>' + esc(b.title) + (b.featured ? '<span class="featured-flag">Featured</span>' : '') + '</h3>' +
        '<p>' + esc(b.summary) + '</p>' +
        '<div class="tags">' + (b.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>';
      var btn = el("button", "btn btn-ghost card-btn", "Read article");
      btn.addEventListener("click", function () { openBlog(b); });
      c.appendChild(btn);
      host.appendChild(c);
    });
    hydrateImages(host);
    reveal(host);
  }

  function renderDirectories() {
    var host = $("#dir-grid"); if (!host) return;
    var list = state.directories.filter(function (d) { return matchSpecies(d) && matchQuery(d, ["title", "description"]); });
    host.innerHTML = "";
    if (!list.length) { host.appendChild(el("div", "empty", "No directories match your filters yet.")); return; }
    list.forEach(function (d) {
      var c = el("div", "card dir-card");
      var subs = (d.children || []).map(function (s) { return '<div class="subfolder">' + esc(s.title) + '</div>'; }).join('');
      c.innerHTML =
        '<div class="thumb">' + lazyImg(d.thumbnail, d.title) + '</div>' +
        '<h3>' + esc(d.title) + '</h3>' +
        '<p>' + esc(d.description) + '</p>' +
        '<div class="subfolders">' + subs + '</div>';
      host.appendChild(c);
    });
    hydrateImages(host);
    reveal(host);
  }

  function renderMedicines() {
    var host = $("#medicines-grid"); if (!host) return;
    var list = state.medicines.filter(function (m) {
      return m.status === "active" && matchSpecies(m) && matchQuery(m, ["name", "genericName", "drugClass", "indications", "species"]);
    });
    host.innerHTML = "";
    if (!list.length) { host.appendChild(el("div", "empty", "No medicine records match your filters yet.")); return; }
    list.forEach(function (m) {
      var c = el("div", "card");
      c.innerHTML =
        '<h3>' + esc(m.name) + (m.featured ? '<span class="featured-flag">Featured</span>' : '') + '</h3>' +
        '<p>' + esc(m.drugClass) + '</p>' +
        '<div class="tags">' + (m.species || []).map(function (s) { return '<span class="tag sp">' + esc(s) + '</span>'; }).join('') + '</div>';
      var btn = el("button", "btn btn-ghost card-btn", "View record");
      btn.addEventListener("click", function () { openMedicine(m); });
      c.appendChild(btn);
      host.appendChild(c);
    });
    reveal(host);
  }

  function renderSystems() {
    var host = $("#systems-grid"); if (!host) return;
    var list = state.systems.filter(function (s) { return matchQuery(s, ["name"]); });
    host.innerHTML = "";
    if (!list.length) { host.appendChild(el("div", "empty", "No systems match your search.")); return; }
    list.forEach(function (s) {
      var c = el("div", "sys-card");
      var icon = s.image ? '<img data-src="' + esc(s.image) + '" alt="">' : esc(s.icon || "🩺");
      c.innerHTML =
        '<div class="sys-ic">' + icon + '</div>' +
        '<h4>' + esc(s.name) + '</h4>' +
        '<div class="count">' + (s.count != null ? esc(s.count) + " drugs" : "") + '</div>';
      c.addEventListener("click", function () {
        state.query = s.name; var search = $("#global-search"); if (search) search.value = "";
        var target = $("#medicines"); if (target) target.scrollIntoView({ behavior: "smooth" });
      });
      host.appendChild(c);
    });
    hydrateImages(host);
    reveal(host);
  }

  /* ---------- drawer ---------- */
  function buildDrawer() {
    // species chips inside drawer
    var spHost = $("#drawer-species");
    if (spHost) {
      spHost.innerHTML = state.species.map(function (s) {
        return '<button class="drawer-chip" data-sp="' + esc(s.name) + '">' + esc(s.name) + '</button>';
      }).join('');
      Array.prototype.forEach.call(spHost.querySelectorAll(".drawer-chip"), function (chip) {
        chip.addEventListener("click", function () {
          state.filterSpecies = chip.getAttribute("data-sp");
          var sel = $("#species-select"); if (sel) sel.value = state.filterSpecies;
          renderAll(); closeDrawer();
          var t = $("#medicines"); if (t) t.scrollIntoView({ behavior: "smooth" });
        });
      });
    }
    // web apps inside drawer
    var appHost = $("#drawer-apps");
    if (appHost) {
      var active = state.apps.filter(function (a) { return a.status === "active"; });
      appHost.innerHTML = active.length ? active.map(function (a) {
        return '<a class="drawer-link" href="' + esc(a.url || "#") + '" target="_blank" rel="noopener"><span class="ic">🧩</span>' + esc(a.title) + '</a>';
      }).join('') : '<div style="color:var(--muted);font-size:.8rem;padding:8px 14px">No web apps yet.</div>';
    }
  }
  function openDrawer() { $("#drawer").classList.add("open"); $("#drawer-scrim").classList.add("open"); document.body.style.overflow = "hidden"; }
  function closeDrawer() { $("#drawer").classList.remove("open"); $("#drawer-scrim").classList.remove("open"); document.body.style.overflow = ""; }

  function renderSpeciesOptions() {
    var sel = $("#species-select"); if (!sel) return;
    var opts = ['<option value="All">All Species</option>'];
    state.species.forEach(function (s) { opts.push('<option value="' + esc(s.name) + '">' + esc(s.name) + '</option>'); });
    sel.innerHTML = opts.join('');
  }

  /* ---------- medicine detail modal ---------- */
  function openMedicine(m) {
    var ov = $("#med-modal");
    $("#mm-title").textContent = m.name + (m.genericName && m.genericName !== m.name ? " (" + m.genericName + ")" : "");
    $("#mm-meta").textContent = m.drugClass;
    var rows = [
      ["Species", (m.species || []).join(", ")],
      ["Indications", (m.indications || []).join(", ")],
      ["Dosage", m.dosage],
      ["Route", m.route],
      ["Contraindications", m.contraindications],
      ["Withdrawal period", m.withdrawal],
      ["Notes", m.notes]
    ];
    $("#mm-body").innerHTML = rows.filter(function (r) { return r[1]; }).map(function (r) {
      return '<div class="med-row"><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div>';
    }).join('');
    ov.classList.add("show");
  }
  function closeMedicine() { $("#med-modal").classList.remove("show"); }

  /* ---------- blog modal ---------- */
  function openBlog(b) {
    var ov = $("#blog-modal");
    $("#bm-title").textContent = b.title;
    $("#bm-meta").textContent = b.author + " · " + b.date + " · " + b.category;
    $("#bm-body").textContent = b.body || "";
    // blog-detail ad slot
    applyAdSlot($("#bm-ad"), "blogDetail");
    ov.classList.add("show");
  }
  function closeBlog() { $("#blog-modal").classList.remove("show"); }

  /* ---------- ad slots (future-proof) ---------- */
  function applyAdSlot(node, slotName) {
    if (!node) return;
    var ads = state.settings.ads || {};
    var slot = (ads.slots || {})[slotName] || {};
    if (ads.enabled && slot.enabled && slot.code) {
      node.innerHTML = slot.code; node.setAttribute("data-filled", "1"); node.classList.remove("hidden");
    } else {
      node.innerHTML = "Ad space"; node.removeAttribute("data-filled"); node.classList.add("hidden");
    }
  }
  function applyAllAdSlots() {
    applyAdSlot($("#ad-top"), "homeTop");
    applyAdSlot($("#ad-inline"), "homeInline");
  }

  /* ---------- brand / settings ---------- */
  function applySettings() {
    var s = state.settings;
    document.title = (s.siteName || "AM 369 Network") + " — " + (s.tagline || "");
    var bn = $("#brand-name"); if (bn) bn.textContent = s.siteName || "AM 369 Network";
    var bd = $("#brand-designer"); if (bd) bd.textContent = s.designer || "Designed by Dr. Ankit Malik";
  }

  /* ---------- editable site content (every public-facing string) ---------- */
  function setText(id, val) { var e = document.getElementById(id); if (e && val != null) e.textContent = val; }
  function applyContent() {
    var c = state.content || {};
    var hero = c.hero || {};
    setText("hero-eyebrow", hero.eyebrow);
    setText("hero-title", hero.title);
    setText("hero-lead", hero.lead);
    var p1 = $("#hero-cta-primary"); if (p1) { if (hero.ctaPrimaryText) p1.textContent = hero.ctaPrimaryText; if (hero.ctaPrimaryHref) p1.href = hero.ctaPrimaryHref; }
    var p2 = $("#hero-cta-secondary"); if (p2) { if (hero.ctaSecondaryText) p2.textContent = hero.ctaSecondaryText; if (hero.ctaSecondaryHref) p2.href = hero.ctaSecondaryHref; }

    var sec = c.sections || {};
    ["apps", "directories", "medicines", "blogs", "systems"].forEach(function (key) {
      var s = sec[key]; if (!s) return;
      setText(key + "-eyebrow", s.eyebrow); setText(key + "-title", s.title);
    });

    var footer = c.footer || {};
    if (footer.line1) { var f1 = $("#footer-line1"); if (f1) f1.innerHTML = "<b>" + esc((state.settings.siteName || "AM 369 Network")) + "</b> — " + esc(footer.line1.replace(/^.*—\s*/, "")); }
    setText("footer-line2", footer.line2);

    var loader = c.loader || {};
    setText("loader-sub", loader.sub);
  }

  /* ---------- scroll-reveal motion (fade + rise, staggered, GPU-only) ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealObserver = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add("in-view"); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }) : null;

  // Call after any dynamic content is added to the DOM. Marks .reveal blocks
  // and staggers direct children of .stagger containers, then observes them.
  function reveal(root) {
    var scope = root || document;
    if (reduceMotion) return; // reduced motion: content is already visible, no animation classes needed
    var blocks = scope.querySelectorAll(".reveal:not(.reveal-done)");
    blocks.forEach(function (b) { b.classList.add("reveal-done"); if (revealObserver) revealObserver.observe(b); else b.classList.add("in-view"); });
    var staggers = scope.matches && scope.matches(".stagger") ? [scope] : scope.querySelectorAll(".stagger");
    staggers.forEach(function (host) {
      Array.prototype.forEach.call(host.children, function (child, i) {
        if (child.classList.contains("stagger-done")) return;
        child.classList.add("stagger-item", "stagger-done");
        child.style.transitionDelay = Math.min(i * 70, 560) + "ms";
        if (revealObserver) revealObserver.observe(child); else child.classList.add("in-view");
      });
    });
  }

  function renderAll() {
    renderSystems(); renderApps(); renderBlogs(); renderDirectories(); renderMedicines();
  }

  /* ---------- load ---------- */
  function load() {
    return Promise.all([
      DataService.get("settings"), DataService.get("species"), DataService.get("content"),
      DataService.get("apps"), DataService.get("blogs"), DataService.get("directories"),
      DataService.get("medicines"), DataService.get("systems")
    ]).then(function (r) {
      state.settings = r[0] || {}; state.species = r[1] || []; state.content = r[2] || {};
      state.apps = r[3] || []; state.blogs = r[4] || []; state.directories = r[5] || [];
      state.medicines = r[6] || []; state.systems = r[7] || [];
      applySettings(); applyContent(); renderSpeciesOptions(); buildDrawer(); renderAll(); applyAllAdSlots();
      reveal(document);
    }).catch(function (e) {
      console.error(e); toast("Could not load data. Refresh to retry.", "err");
    });
  }

  /* ---------- events ---------- */
  function wire() {
    var search = $("#global-search");
    if (search) search.addEventListener("input", debounce(function () { state.query = search.value.trim(); renderAll(); }, 180));
    var close = $("#bm-close"); if (close) close.addEventListener("click", closeBlog);
    var ov = $("#blog-modal"); if (ov) ov.addEventListener("click", function (e) { if (e.target === ov) closeBlog(); });
    var mclose = $("#mm-close"); if (mclose) mclose.addEventListener("click", closeMedicine);
    var mov = $("#med-modal"); if (mov) mov.addEventListener("click", function (e) { if (e.target === mov) closeMedicine(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeBlog(); closeMedicine(); closeDrawer(); } });

    // drawer
    var mt = $("#menu-toggle"); if (mt) mt.addEventListener("click", openDrawer);
    var dc = $("#drawer-close"); if (dc) dc.addEventListener("click", closeDrawer);
    var ds = $("#drawer-scrim"); if (ds) ds.addEventListener("click", closeDrawer);
    var dsp = $("#dl-species"); if (dsp) dsp.addEventListener("click", function () {
      var box = $("#drawer-species"); if (box) box.style.display = box.style.display === "none" ? "grid" : "none";
    });
    // close drawer when a drawer link with a hash is clicked
    Array.prototype.forEach.call(document.querySelectorAll(".drawer-nav a.drawer-link"), function (a) {
      a.addEventListener("click", function () { setTimeout(closeDrawer, 60); });
    });
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); var a = arguments, self = this; t = setTimeout(function () { fn.apply(self, a); }, ms); }; }

  /* ---------- loader ---------- */
  function hideLoader() {
    var l = $("#loader"); if (!l) return;
    l.classList.add("hide"); setTimeout(function () { l.style.display = "none"; }, 700);
  }

  /* ---------- auth gate ---------- */
  var AUTH_KEY = "am369:auth:v1";
  function currentAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch (e) { return null; } }
  function setAuth(obj) { try { localStorage.setItem(AUTH_KEY, JSON.stringify(obj)); } catch (e) {} applyAuthLabel(); }
  function applyAuthLabel() {
    var a = currentAuth(); var lbl = $("#drawer-user-label");
    if (lbl) lbl.textContent = a && a.type === "google" ? (a.name || a.email || "Signed in") : "Browsing as Guest";
  }
  function showGate() {
    var gate = $("#gate"); if (!gate) return;
    var auth = state.settings.auth || {};
    // if entry not required, or already chosen, skip gate
    if (auth.requireEntry === false || currentAuth()) { gate.classList.add("hide"); return; }
    // configure buttons
    var gbtn = $("#gate-google"), guest = $("#gate-guest");
    if (auth.googleEnabled && auth.googleClientId) { gbtn.style.display = "inline-flex"; initGoogle(auth.googleClientId); }
    if (auth.guestEnabled === false) { guest.style.display = "none"; }
    gate.classList.remove("hide");
    guest.addEventListener("click", function () { setAuth({ type: "guest", at: Date.now() }); gate.classList.add("hide"); });
    gbtn.addEventListener("click", function () {
      if (window.google && google.accounts && google.accounts.id) { google.accounts.id.prompt(); }
      else { toast("Google sign-in not configured yet.", "err"); }
    });
  }
  function initGoogle(clientId) {
    // Loads Google Identity Services; requires the site's domain added as an
    // authorized JavaScript origin in the Google Cloud OAuth client.
    if (document.getElementById("gis-script")) return;
    var s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.defer = true; s.id = "gis-script";
    s.onload = function () {
      try {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: function (resp) {
            var payload = parseJwt(resp.credential) || {};
            setAuth({ type: "google", name: payload.name, email: payload.email, at: Date.now() });
            var gate = $("#gate"); if (gate) gate.classList.add("hide");
            toast("Signed in.", "ok");
          }
        });
      } catch (e) { console.warn("GIS init failed", e); }
    };
    document.head.appendChild(s);
  }
  function parseJwt(token) {
    try { return JSON.parse(decodeURIComponent(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")).split("").map(function (c) { return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2); }).join(""))); }
    catch (e) { return null; }
  }

  document.addEventListener("DOMContentLoaded", function () {
    wire();
    var minTime = new Promise(function (res) { setTimeout(res, 2850); });
    Promise.all([load(), minTime]).then(function () {
      hideLoader();
      applyAuthLabel();
      showGate();
    });
  });
})();
