/* AM 369 Network — Admin panel logic (browser demo CMS)
 * SECURITY NOTE: This is a CLIENT-SIDE lock only. It keeps the panel out of
 * casual view but is NOT real authentication. Anyone with the files can read
 * this code. For production, put auth + data behind a backend
 * (Google Apps Script or GitHub API) — see README. Never store secrets here.
 */
(function () {
  "use strict";

  var SESSION_KEY = "am369:admin:session";
  // Demo gate only. Change this, but understand it is visible in source.
  var DEMO_PASSCODE = "AnkiMunky321";

  var db = { apps: [], blogs: [], directories: [], species: [], images: [], settings: {} };
  var speciesNames = [];

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function uid(p) { return p + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function toast(msg, kind) {
    var host = $("#toasts"); var t = el("div", "toast " + (kind || ""), esc(msg));
    host.appendChild(t); setTimeout(function () { t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 300); }, 2600);
  }

  /* button processing helper — prevents double click, shows spinner */
  function withBusy(btn, label, fn) {
    if (btn.dataset.busy === "1") return;
    btn.dataset.busy = "1";
    var orig = btn.innerHTML; btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> ' + (label || "Working…");
    Promise.resolve().then(fn).then(function () {
      btn.innerHTML = orig; btn.disabled = false; btn.dataset.busy = "0";
    }).catch(function (e) {
      console.error(e); toast("Something went wrong.", "err");
      btn.innerHTML = orig; btn.disabled = false; btn.dataset.busy = "0";
    });
  }

  /* ---------- auth ---------- */
  function isAuthed() { return sessionStorage.getItem(SESSION_KEY) === "1"; }
  function login() {
    var val = $("#login-pass").value;
    if (val === DEMO_PASSCODE) {
      sessionStorage.setItem(SESSION_KEY, "1");
      $("#login").style.display = "none";
      boot();
    } else { toast("Wrong passcode.", "err"); }
  }
  function logout() { sessionStorage.removeItem(SESSION_KEY); location.reload(); }

  /* ---------- load ---------- */
  function loadAll() {
    return Promise.all([
      DataService.get("apps"), DataService.get("blogs"), DataService.get("directories"),
      DataService.get("species"), DataService.get("images"), DataService.get("settings")
    ]).then(function (r) {
      db.apps = r[0] || []; db.blogs = r[1] || []; db.directories = r[2] || [];
      db.species = r[3] || []; db.images = r[4] || []; db.settings = r[5] || {};
      speciesNames = db.species.map(function (s) { return s.name; });
    });
  }

  function save(key) { DataService.set(key, db[key]); }

  /* ---------- dashboard ---------- */
  function renderStats() {
    var host = $("#stats"); if (!host) return;
    var items = [
      ["Web Apps", db.apps.length], ["Blogs", db.blogs.length],
      ["Directories", db.directories.length], ["Species", db.species.length]
    ];
    host.innerHTML = items.map(function (i) {
      return '<div class="stat"><div class="n">' + i[1] + '</div><div class="l">' + i[0] + '</div></div>';
    }).join('');
  }

  /* ---------- generic table ---------- */
  function tableSearchFilter(list, q, fields) {
    if (!q) return list;
    q = q.toLowerCase();
    return list.filter(function (it) {
      return fields.some(function (f) {
        var v = it[f]; if (Array.isArray(v)) v = v.join(" ");
        return String(v || "").toLowerCase().indexOf(q) > -1;
      });
    });
  }

  function renderApps(q) {
    var body = $("#apps-tbody"); if (!body) return;
    var list = tableSearchFilter(db.apps, q, ["title", "category", "species"]);
    body.innerHTML = list.map(function (a) {
      return '<tr>' +
        '<td>' + esc(a.title) + (a.featured ? ' <span class="badge feat">Featured</span>' : '') + '</td>' +
        '<td>' + esc(a.category || "") + '</td>' +
        '<td>' + (a.species || []).join(", ") + '</td>' +
        '<td><span class="badge ' + (a.status === "active" ? "on" : "off") + '">' + esc(a.status || "") + '</span></td>' +
        '<td class="row-actions">' +
          '<button class="btn btn-ghost btn-sm" data-edit-app="' + a.id + '">Edit</button>' +
          '<button class="btn btn-danger btn-sm" data-del-app="' + a.id + '">Delete</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">No apps yet.</td></tr>';
  }

  function renderBlogs(q) {
    var body = $("#blogs-tbody"); if (!body) return;
    var list = tableSearchFilter(db.blogs, q, ["title", "category", "tags", "species"]);
    body.innerHTML = list.map(function (b) {
      return '<tr>' +
        '<td>' + esc(b.title) + (b.featured ? ' <span class="badge feat">Featured</span>' : '') + '</td>' +
        '<td>' + esc(b.category || "") + '</td>' +
        '<td>' + esc(b.date || "") + '</td>' +
        '<td><span class="badge ' + (b.status === "published" ? "on" : "off") + '">' + esc(b.status || "") + '</span></td>' +
        '<td class="row-actions">' +
          '<button class="btn btn-ghost btn-sm" data-edit-blog="' + b.id + '">Edit</button>' +
          '<button class="btn btn-danger btn-sm" data-del-blog="' + b.id + '">Delete</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="color:var(--muted)">No blogs yet.</td></tr>';
  }

  function renderDirs(q) {
    var body = $("#dirs-tbody"); if (!body) return;
    var list = tableSearchFilter(db.directories, q, ["title", "description"]);
    body.innerHTML = list.map(function (d) {
      return '<tr>' +
        '<td>' + esc(d.title) + '</td>' +
        '<td>' + ((d.children || []).length) + ' subfolders</td>' +
        '<td>' + (d.species || []).join(", ") + '</td>' +
        '<td class="row-actions">' +
          '<button class="btn btn-ghost btn-sm" data-edit-dir="' + d.id + '">Edit</button>' +
          '<button class="btn btn-danger btn-sm" data-del-dir="' + d.id + '">Delete</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="4" style="color:var(--muted)">No directories yet.</td></tr>';
  }

  function renderSpecies(q) {
    var body = $("#species-tbody"); if (!body) return;
    var list = tableSearchFilter(db.species, q, ["name", "description"]);
    body.innerHTML = list.map(function (s) {
      return '<tr><td>' + esc(s.name) + '</td><td>' + esc(s.description || "") + '</td>' +
        '<td class="row-actions">' +
          '<button class="btn btn-ghost btn-sm" data-edit-sp="' + s.id + '">Edit</button>' +
          '<button class="btn btn-danger btn-sm" data-del-sp="' + s.id + '">Delete</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="3" style="color:var(--muted)">No species yet.</td></tr>';
  }

  function renderAllTables() {
    renderStats(); renderApps(); renderBlogs(); renderDirs(); renderSpecies(); renderAdsForm(); renderDriveForm();
  }

  /* ---------- modal engine ---------- */
  function openModal(html) {
    var ov = $("#modal"); $("#modal-content").innerHTML = html; ov.classList.add("show");
  }
  function closeModal() { $("#modal").classList.remove("show"); }

  function speciesChips(selected) {
    selected = selected || [];
    return '<div class="chips" id="sp-chips">' +
      ['All'].concat(speciesNames).map(function (n) {
        var sel = selected.indexOf(n) > -1 ? " sel" : "";
        return '<span class="chip' + sel + '" data-sp="' + esc(n) + '">' + esc(n) + '</span>';
      }).join('') + '</div>';
  }
  function readChips() { return $$("#sp-chips .chip.sel").map(function (c) { return c.dataset.sp; }); }
  function wireChips() { $$("#sp-chips .chip").forEach(function (c) { c.addEventListener("click", function () { c.classList.toggle("sel"); }); }); }

  /* ---------- APP form ---------- */
  function appForm(a) {
    a = a || {};
    return '<h3>' + (a.id ? "Edit" : "Add") + ' Web App</h3>' +
      '<div class="field"><label>Title</label><input id="f-title" value="' + esc(a.title) + '"></div>' +
      '<div class="field"><label>App URL</label><input id="f-url" value="' + esc(a.url) + '" placeholder="https://script.google.com/..."></div>' +
      '<div class="field"><label>Description</label><textarea id="f-desc">' + esc(a.description) + '</textarea></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Category</label><input id="f-cat" value="' + esc(a.category) + '"></div>' +
        '<div class="field"><label>Button Text</label><input id="f-btn" value="' + esc(a.buttonText || "Open App") + '"></div>' +
      '</div>' +
      thumbField("f-thumb", a.thumbnail) +
      '<div class="field"><label>Species relevance</label>' + speciesChips(a.species) + '</div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Status</label><select id="f-status"><option value="active"' + (a.status !== "inactive" ? " selected" : "") + '>Active</option><option value="inactive"' + (a.status === "inactive" ? " selected" : "") + '>Inactive</option></select></div>' +
        '<div class="field"><label>Featured</label><select id="f-feat"><option value="no"' + (!a.featured ? " selected" : "") + '>No</option><option value="yes"' + (a.featured ? " selected" : "") + '>Yes</option></select></div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Save</button></div>';
  }
  function editApp(id) {
    var a = db.apps.find(function (x) { return x.id === id; });
    openModal(appForm(a)); wireChips();
    wireDriveUpload("f-thumb", "Apps", function () { return $("#f-cat") ? $("#f-cat").value : ""; });
    $("#m-cancel").onclick = closeModal;
    $("#m-save").onclick = function () {
      var btn = this;
      withBusy(btn, "Saving…", function () {
        var obj = {
          id: id || uid("app"),
          title: $("#f-title").value.trim(), url: $("#f-url").value.trim(),
          description: $("#f-desc").value.trim(), category: $("#f-cat").value.trim(),
          buttonText: $("#f-btn").value.trim() || "Open App", thumbnail: $("#f-thumb").value.trim(),
          species: readChips(), status: $("#f-status").value, featured: $("#f-feat").value === "yes"
        };
        if (!obj.title) { toast("Title required.", "err"); return; }
        if (id) { var i = db.apps.findIndex(function (x) { return x.id === id; }); db.apps[i] = obj; }
        else db.apps.push(obj);
        save("apps"); renderApps($("#apps-search").value); closeModal(); toast("App saved.", "ok");
      });
    };
  }

  /* ---------- BLOG form ---------- */
  function blogForm(b) {
    b = b || {};
    return '<h3>' + (b.id ? "Edit" : "Add") + ' Article</h3>' +
      '<div class="field"><label>Title</label><input id="f-title" value="' + esc(b.title) + '"></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Slug</label><input id="f-slug" value="' + esc(b.slug) + '"></div>' +
        '<div class="field"><label>Date</label><input id="f-date" type="date" value="' + esc(b.date || new Date().toISOString().slice(0,10)) + '"></div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Author</label><input id="f-author" value="' + esc(b.author || "Dr. Ankit Malik") + '"></div>' +
        '<div class="field"><label>Category</label><input id="f-cat" value="' + esc(b.category) + '"></div>' +
      '</div>' +
      thumbField("f-thumb", b.thumbnail) +
      '<div class="field"><label>Summary</label><textarea id="f-sum">' + esc(b.summary) + '</textarea></div>' +
      '<div class="field"><label>Body</label><textarea id="f-body" style="min-height:140px">' + esc(b.body) + '</textarea></div>' +
      '<div class="field"><label>Tags (comma separated)</label><input id="f-tags" value="' + esc((b.tags||[]).join(", ")) + '"></div>' +
      '<div class="field"><label>Species</label>' + speciesChips(b.species) + '</div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Status</label><select id="f-status"><option value="published"' + (b.status !== "draft" ? " selected" : "") + '>Published</option><option value="draft"' + (b.status === "draft" ? " selected" : "") + '>Draft</option></select></div>' +
        '<div class="field"><label>Featured</label><select id="f-feat"><option value="no"' + (!b.featured ? " selected" : "") + '>No</option><option value="yes"' + (b.featured ? " selected" : "") + '>Yes</option></select></div>' +
      '</div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Save</button></div>';
  }
  function editBlog(id) {
    var b = db.blogs.find(function (x) { return x.id === id; });
    openModal(blogForm(b)); wireChips();
    wireDriveUpload("f-thumb", "Blogs", function () { return $("#f-cat") ? $("#f-cat").value : ""; });
    $("#m-cancel").onclick = closeModal;
    $("#m-save").onclick = function () {
      var btn = this;
      withBusy(btn, "Saving…", function () {
        var title = $("#f-title").value.trim();
        var obj = {
          id: id || uid("blog"), title: title,
          slug: $("#f-slug").value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
          author: $("#f-author").value.trim() || "Dr. Ankit Malik", date: $("#f-date").value,
          category: $("#f-cat").value.trim(), thumbnail: $("#f-thumb").value.trim(),
          summary: $("#f-sum").value.trim(), body: $("#f-body").value.trim(),
          tags: $("#f-tags").value.split(",").map(function (t) { return t.trim(); }).filter(Boolean),
          species: readChips(), status: $("#f-status").value, featured: $("#f-feat").value === "yes"
        };
        if (!obj.title) { toast("Title required.", "err"); return; }
        if (id) { var i = db.blogs.findIndex(function (x) { return x.id === id; }); db.blogs[i] = obj; }
        else db.blogs.push(obj);
        save("blogs"); renderBlogs($("#blogs-search").value); closeModal(); toast("Article saved.", "ok");
      });
    };
  }

  /* ---------- DIRECTORY form ---------- */
  function dirForm(d) {
    d = d || {};
    var subs = (d.children || []).map(function (s) { return s.title; }).join("\n");
    return '<h3>' + (d.id ? "Edit" : "Add") + ' Directory</h3>' +
      '<div class="field"><label>Title</label><input id="f-title" value="' + esc(d.title) + '"></div>' +
      '<div class="field"><label>Description</label><textarea id="f-desc">' + esc(d.description) + '</textarea></div>' +
      thumbField("f-thumb", d.thumbnail) +
      '<div class="field"><label>Subfolders (one per line)</label><textarea id="f-subs" style="min-height:120px">' + esc(subs) + '</textarea></div>' +
      '<div class="field"><label>Species</label>' + speciesChips(d.species) + '</div>' +
      '<div class="modal-foot"><button class="btn btn-ghost" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Save</button></div>';
  }
  function editDir(id) {
    var d = db.directories.find(function (x) { return x.id === id; });
    openModal(dirForm(d)); wireChips();
    wireDriveUpload("f-thumb", "Directories", function () { return $("#f-title") ? $("#f-title").value : ""; });
    $("#m-cancel").onclick = closeModal;
    $("#m-save").onclick = function () {
      var btn = this;
      withBusy(btn, "Saving…", function () {
        var subs = $("#f-subs").value.split("\n").map(function (t) { return t.trim(); }).filter(Boolean)
          .map(function (t) { return { id: uid("sub"), title: t, description: "", thumbnail: "" }; });
        var obj = {
          id: id || uid("dir"), title: $("#f-title").value.trim(),
          description: $("#f-desc").value.trim(), thumbnail: $("#f-thumb").value.trim(),
          species: readChips().length ? readChips() : ["All"], children: subs
        };
        if (!obj.title) { toast("Title required.", "err"); return; }
        if (id) { var i = db.directories.findIndex(function (x) { return x.id === id; }); db.directories[i] = obj; }
        else db.directories.push(obj);
        save("directories"); renderDirs($("#dirs-search").value); closeModal(); toast("Directory saved.", "ok");
      });
    };
  }

  /* ---------- SPECIES form ---------- */
  function spForm(s) {
    s = s || {};
    return '<h3>' + (s.id ? "Edit" : "Add") + ' Species</h3>' +
      '<div class="field"><label>Name</label><input id="f-name" value="' + esc(s.name) + '"></div>' +
      '<div class="field"><label>Description</label><textarea id="f-desc">' + esc(s.description) + '</textarea></div>' +
      thumbField("f-thumb", s.thumbnail) +
      '<div class="modal-foot"><button class="btn btn-ghost" id="m-cancel">Cancel</button><button class="btn btn-primary" id="m-save">Save</button></div>';
  }
  function editSp(id) {
    var s = db.species.find(function (x) { return x.id === id; });
    openModal(spForm(s));
    wireDriveUpload("f-thumb", "Species", function () { return $("#f-name") ? $("#f-name").value : ""; });
    $("#m-cancel").onclick = closeModal;
    $("#m-save").onclick = function () {
      var btn = this;
      withBusy(btn, "Saving…", function () {
        var obj = { id: id || uid("sp"), name: $("#f-name").value.trim(), description: $("#f-desc").value.trim(), thumbnail: $("#f-thumb").value.trim() };
        if (!obj.name) { toast("Name required.", "err"); return; }
        if (id) { var i = db.species.findIndex(function (x) { return x.id === id; }); db.species[i] = obj; }
        else db.species.push(obj);
        save("species"); speciesNames = db.species.map(function (x) { return x.name; });
        renderSpecies($("#species-search").value); closeModal(); toast("Species saved.", "ok");
      });
    };
  }

  /* ---------- delete (with confirm) ---------- */
  function confirmDelete(name, onYes) {
    openModal('<h3>Delete ' + esc(name) + '?</h3><p style="color:var(--muted)">This cannot be undone in this browser session.</p>' +
      '<div class="modal-foot"><button class="btn btn-ghost" id="m-cancel">Cancel</button><button class="btn btn-danger" id="m-yes">Delete</button></div>');
    $("#m-cancel").onclick = closeModal;
    $("#m-yes").onclick = function () { withBusy(this, "Deleting…", function () { onYes(); closeModal(); }); };
  }

  /* ---------- Google Drive upload ---------- */
  function driveConfig() {
    var s = db.settings || {};
    return { url: s.driveUploadUrl || "", key: s.driveAdminKey || DEMO_PASSCODE };
  }
  function fileToBase64(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(r.result); };
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }
  function uploadToDrive(file, section, subfolder) {
    var cfg = driveConfig();
    if (!cfg.url) return Promise.reject(new Error("Set Drive Upload URL in Settings first."));
    return fileToBase64(file).then(function (dataUrl) {
      return fetch(cfg.url, {
        method: "POST",
        body: JSON.stringify({ key: cfg.key, filename: file.name, mimeType: file.type, dataBase64: dataUrl, section: section, subfolder: subfolder || "" })
      });
    }).then(function (r) { return r.json(); }).then(function (json) {
      if (!json.ok) throw new Error(json.error || "Upload failed");
      return json.url;
    });
  }
  /* Wires a "file + upload" control next to a thumbnail text field. */
  function wireDriveUpload(fieldId, section, subfolderGetter) {
    var wrap = document.getElementById(fieldId + "-wrap");
    if (!wrap) return;
    var fileInput = wrap.querySelector('input[type="file"]');
    var btn = wrap.querySelector("button");
    var textInput = document.getElementById(fieldId);
    btn.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files[0]; if (!file) return;
      withBusy(btn, "Uploading…", function () {
        return uploadToDrive(file, section, subfolderGetter ? subfolderGetter() : "").then(function (url) {
          textInput.value = url; toast("Uploaded to Drive.", "ok");
        });
      });
    });
  }
  function thumbField(id, value, label) {
    return '<div class="field"><label>' + (label || "Thumbnail URL") + '</label>' +
      '<input id="' + id + '" value="' + esc(value) + '">' +
      '<div id="' + id + '-wrap" style="display:flex;gap:8px;margin-top:8px;align-items:center">' +
        '<input type="file" accept="image/*" style="display:none">' +
        '<button type="button" class="btn btn-ghost btn-sm">Upload to Drive</button>' +
        '<span class="hint">or paste a URL above</span>' +
      '</div></div>';
  }

  /* ---------- drive settings ---------- */
  function renderDriveForm() {
    var host = $("#drive-form"); if (!host) return;
    var s = db.settings || {};
    host.innerHTML =
      '<div class="field"><label>Web App URL (from Apps Script deployment)</label><input id="drive-url" value="' + esc(s.driveUploadUrl || "") + '" placeholder="https://script.google.com/macros/s/.../exec"></div>' +
      '<div class="field"><label>Shared key (must match ADMIN_KEY in the script)</label><input id="drive-key" value="' + esc(s.driveAdminKey || "") + '"></div>' +
      '<p class="hint" style="margin-bottom:14px">Deploy <code>backend/DriveUploader.gs</code> from the repo as an Apps Script Web App, then paste its URL here. See README for step-by-step deployment.</p>' +
      '<button class="btn btn-primary" id="drive-save">Save Drive settings</button>';
    $("#drive-save").onclick = function () {
      var btn = this;
      withBusy(btn, "Saving…", function () {
        db.settings.driveUploadUrl = $("#drive-url").value.trim();
        db.settings.driveAdminKey = $("#drive-key").value.trim();
        save("settings"); toast("Drive settings saved.", "ok");
      });
    };
  }

  /* ---------- ads settings ---------- */
  function renderAdsForm() {
    var host = $("#ads-form"); if (!host) return;
    var ads = db.settings.ads || { enabled: false, slots: {} };
    var slots = ads.slots || {};
    function slotField(key, label) {
      var s = slots[key] || { enabled: false, code: "" };
      return '<div class="field"><label>' + label + '</label>' +
        '<select data-ad-en="' + key + '"><option value="no"' + (!s.enabled ? " selected" : "") + '>Off</option><option value="yes"' + (s.enabled ? " selected" : "") + '>On</option></select>' +
        '<textarea data-ad-code="' + key + '" placeholder="Paste ad network code here" style="margin-top:8px">' + esc(s.code) + '</textarea></div>';
    }
    host.innerHTML =
      '<div class="field"><label>Ads master switch</label><select id="ads-master"><option value="no"' + (!ads.enabled ? " selected" : "") + '>Disabled</option><option value="yes"' + (ads.enabled ? " selected" : "") + '>Enabled</option></select><div class="hint">When enabled, active slots below show on the public site.</div></div>' +
      slotField("homeTop", "Home — top banner") +
      slotField("homeInline", "Home — inline") +
      slotField("blogDetail", "Blog detail") +
      '<div class="modal-foot"><button class="btn btn-primary" id="ads-save">Save ad settings</button></div>';
    $("#ads-save").onclick = function () {
      var btn = this;
      withBusy(btn, "Saving…", function () {
        var newAds = { enabled: $("#ads-master").value === "yes", provider: (db.settings.ads && db.settings.ads.provider) || "custom", slots: {} };
        ["homeTop", "homeInline", "blogDetail", "sidebar"].forEach(function (k) {
          var enSel = $('[data-ad-en="' + k + '"]'); var codeTa = $('[data-ad-code="' + k + '"]');
          newAds.slots[k] = { enabled: enSel ? enSel.value === "yes" : false, code: codeTa ? codeTa.value : ((db.settings.ads && db.settings.ads.slots && db.settings.ads.slots[k] && db.settings.ads.slots[k].code) || "") };
        });
        db.settings.ads = newAds; save("settings"); toast("Ad settings saved.", "ok");
      });
    };
  }

  /* ---------- backup ---------- */
  function exportBackup(btn) {
    withBusy(btn, "Exporting…", function () {
      return DataService.exportAll().then(function (obj) {
        var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
        a.download = "am369-backup-" + new Date().toISOString().slice(0, 10) + ".json";
        a.click(); URL.revokeObjectURL(a.href); toast("Backup downloaded.", "ok");
      });
    });
  }
  function importBackup(file, btn) {
    withBusy(btn, "Importing…", function () {
      return file.text().then(function (txt) {
        var obj = JSON.parse(txt); DataService.importAll(obj);
        return loadAll().then(function () { renderAllTables(); toast("Backup imported.", "ok"); });
      }).catch(function () { toast("Invalid backup file.", "err"); });
    });
  }
  function resetSample(btn) {
    confirmDelete("all data and reset to samples", function () {
      DataService.resetToSeed().then(function () { return loadAll(); }).then(function () { renderAllTables(); toast("Reset to sample data.", "ok"); });
    });
  }

  /* ---------- navigation ---------- */
  function switchView(name) {
    $$(".view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + name); });
    $$(".sb-nav a").forEach(function (a) { a.classList.toggle("active", a.dataset.view === name); });
    $("#topbar-title").textContent = ({ dashboard: "Dashboard", apps: "Web Apps", blogs: "Blogs & Articles", directories: "Directories", species: "Species", settings: "Settings & Backup" })[name] || "Dashboard";
    $("#sidebar").classList.remove("open");
  }

  /* ---------- delegated clicks ---------- */
  function wireDelegates() {
    document.addEventListener("click", function (e) {
      var t = e.target.closest("[data-edit-app]"); if (t) return editApp(t.dataset.editApp);
      t = e.target.closest("[data-del-app]"); if (t) { var id = t.dataset.delApp; var a = db.apps.find(function (x){return x.id===id;}); return confirmDelete(a ? a.title : "app", function () { db.apps = db.apps.filter(function (x){return x.id!==id;}); save("apps"); renderApps($("#apps-search").value); renderStats(); toast("Deleted.", "ok"); }); }
      t = e.target.closest("[data-edit-blog]"); if (t) return editBlog(t.dataset.editBlog);
      t = e.target.closest("[data-del-blog]"); if (t) { var bid = t.dataset.delBlog; var b = db.blogs.find(function(x){return x.id===bid;}); return confirmDelete(b?b.title:"blog", function(){ db.blogs = db.blogs.filter(function(x){return x.id!==bid;}); save("blogs"); renderBlogs($("#blogs-search").value); renderStats(); toast("Deleted.","ok"); }); }
      t = e.target.closest("[data-edit-dir]"); if (t) return editDir(t.dataset.editDir);
      t = e.target.closest("[data-del-dir]"); if (t) { var did = t.dataset.delDir; var d = db.directories.find(function(x){return x.id===did;}); return confirmDelete(d?d.title:"directory", function(){ db.directories = db.directories.filter(function(x){return x.id!==did;}); save("directories"); renderDirs($("#dirs-search").value); renderStats(); toast("Deleted.","ok"); }); }
      t = e.target.closest("[data-edit-sp]"); if (t) return editSp(t.dataset.editSp);
      t = e.target.closest("[data-del-sp]"); if (t) { var sid = t.dataset.delSp; var s = db.species.find(function(x){return x.id===sid;}); return confirmDelete(s?s.name:"species", function(){ db.species = db.species.filter(function(x){return x.id!==sid;}); save("species"); speciesNames = db.species.map(function(x){return x.name;}); renderSpecies($("#species-search").value); renderStats(); toast("Deleted.","ok"); }); }
    });
  }

  /* ---------- boot ---------- */
  function boot() {
    loadAll().then(function () {
      renderAllTables();
      // nav
      $$(".sb-nav a").forEach(function (a) { a.addEventListener("click", function () { switchView(a.dataset.view); }); });
      // add buttons
      $("#add-app").onclick = function () { editApp(null); };
      $("#add-blog").onclick = function () { editBlog(null); };
      $("#add-dir").onclick = function () { editDir(null); };
      $("#add-sp").onclick = function () { editSp(null); };
      // searches
      $("#apps-search").oninput = function () { renderApps(this.value); };
      $("#blogs-search").oninput = function () { renderBlogs(this.value); };
      $("#dirs-search").oninput = function () { renderDirs(this.value); };
      $("#species-search").oninput = function () { renderSpecies(this.value); };
      // backup
      $("#btn-export").onclick = function () { exportBackup(this); };
      $("#btn-import").onclick = function () { $("#import-file").click(); };
      $("#import-file").onchange = function () { if (this.files[0]) importBackup(this.files[0], $("#btn-import")); this.value = ""; };
      $("#btn-reset").onclick = function () { resetSample(this); };
      // modal close
      $("#modal").addEventListener("click", function (e) { if (e.target === this) closeModal(); });
      switchView("dashboard");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    wireDelegates();
    $("#login-btn").onclick = login;
    $("#login-pass").addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });
    $("#logout").onclick = logout;
    $("#hamb").onclick = function () { $("#sidebar").classList.toggle("open"); };
    if (isAuthed()) { $("#login").style.display = "none"; boot(); }
  });
})();
