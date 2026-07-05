/* AM 369 Network — Public site logic */
(function () {
  "use strict";

  var state = { apps: [], blogs: [], directories: [], medicines: [], species: [], settings: {}, content: {}, filterSpecies: "All", query: "" };

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
    ["apps", "directories", "medicines", "blogs"].forEach(function (key) {
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
    renderApps(); renderBlogs(); renderDirectories(); renderMedicines();
  }

  /* ---------- load ---------- */
  function load() {
    return Promise.all([
      DataService.get("settings"), DataService.get("species"), DataService.get("content"),
      DataService.get("apps"), DataService.get("blogs"), DataService.get("directories"), DataService.get("medicines")
    ]).then(function (r) {
      state.settings = r[0] || {}; state.species = r[1] || []; state.content = r[2] || {};
      state.apps = r[3] || []; state.blogs = r[4] || []; state.directories = r[5] || []; state.medicines = r[6] || [];
      applySettings(); applyContent(); renderSpeciesOptions(); renderAll(); applyAllAdSlots();
      reveal(document); // hero + section heads
    }).catch(function (e) {
      console.error(e); toast("Could not load data. Refresh to retry.", "err");
    });
  }

  /* ---------- events ---------- */
  function wire() {
    var sel = $("#species-select");
    if (sel) sel.addEventListener("change", function () { state.filterSpecies = this.value; renderAll(); });
    var search = $("#global-search");
    if (search) search.addEventListener("input", debounce(function () { state.query = search.value.trim(); renderAll(); }, 180));
    var close = $("#bm-close"); if (close) close.addEventListener("click", closeBlog);
    var ov = $("#blog-modal"); if (ov) ov.addEventListener("click", function (e) { if (e.target === ov) closeBlog(); });
    var mclose = $("#mm-close"); if (mclose) mclose.addEventListener("click", closeMedicine);
    var mov = $("#med-modal"); if (mov) mov.addEventListener("click", function (e) { if (e.target === mov) closeMedicine(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeBlog(); closeMedicine(); } });
  }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); var a = arguments, self = this; t = setTimeout(function () { fn.apply(self, a); }, ms); }; }

  /* ---------- loader ---------- */
  function hideLoader() {
    var l = $("#loader"); if (!l) return;
    l.classList.add("hide"); setTimeout(function () { l.style.display = "none"; }, 700);
  }

  document.addEventListener("DOMContentLoaded", function () {
    wire();
    var minTime = new Promise(function (res) { setTimeout(res, 2850); }); // matches particle formation + drift-out
    Promise.all([load(), minTime]).then(hideLoader);
  });
})();
