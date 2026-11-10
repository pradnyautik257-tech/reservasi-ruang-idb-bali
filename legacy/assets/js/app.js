/* ==========================================================================
   app.js — router, kerangka halaman, penjagaan peran
   ========================================================================== */
(function () {
  "use strict";

  var IDB = window.IDB;
  var ui = IDB.ui;
  var store = IDB.store;
  var views = IDB.views;

  var app = (IDB.app = {});
  var lastPath = null;

  var ROUTES = [
    { path: "/login", view: "login", public: true, chrome: false },
    { path: "/", view: "home" },
    { path: "/ruang", view: "rooms" },
    { path: "/reservasi/baru", view: "newReservation", roles: ["mahasiswa", "dosen"] },
    { path: "/reservasi/sukses", view: "success", roles: ["mahasiswa", "dosen", "admin"] },
    { path: "/reservasi", view: "myReservations", roles: ["mahasiswa", "dosen"] },
    { path: "/admin", view: "admin", roles: ["admin"] },
    { path: "/operator", view: "operator", roles: ["operator"] }
  ];

  var TITLES = {
    "/login": "Masuk",
    "/": "Beranda",
    "/ruang": "Ruang & ketersediaan",
    "/reservasi/baru": "Ajukan reservasi",
    "/reservasi/sukses": "Pengajuan tercatat",
    "/reservasi": "Reservasi saya",
    "/admin": "Panel admin",
    "/operator": "Panel operator"
  };

  function parseHash() {
    var raw = location.hash.replace(/^#/, "") || "/";
    var qIndex = raw.indexOf("?");
    var path = qIndex === -1 ? raw : raw.slice(0, qIndex);
    var params = {};
    if (qIndex !== -1) {
      new URLSearchParams(raw.slice(qIndex + 1)).forEach(function (value, key) {
        params[key] = value;
      });
    }
    if (path.length > 1) path = path.replace(/\/+$/, "");
    return { path: path || "/", params: params };
  }

  function findRoute(path) {
    return ROUTES.filter(function (r) { return r.path === path; })[0] || null;
  }

  function navItems(user) {
    var items = [
      { href: "#/", path: "/", label: "Beranda", icon: "home" },
      { href: "#/ruang", path: "/ruang", label: "Ruang", icon: "grid" }
    ];
    if (user.role === "admin") {
      items.push({ href: "#/admin", path: "/admin", label: "Panel admin", icon: "shield", badge: store.counts(user).menunggu });
    } else if (user.role === "operator") {
      items.push({ href: "#/operator", path: "/operator", label: "Operator", icon: "settings" });
    } else {
      items.push({ href: "#/reservasi", path: "/reservasi", label: "Reservasi saya", icon: "calendar" });
    }
    return items;
  }

  function isActive(itemPath, path) {
    if (itemPath === "/") return path === "/";
    if (itemPath === "/reservasi") return path.indexOf("/reservasi") === 0;
    return path === itemPath || path.indexOf(itemPath + "/") === 0;
  }

  function renderHeader(user, path) {
    var items = navItems(user);
    var nav = items.map(function (item) {
      return '<a class="nav-link" href="' + item.href + '"' + (isActive(item.path, path) ? ' aria-current="page"' : "") + ">" +
        item.label + (item.badge ? '<span class="nav-count">' + item.badge + "</span>" : "") + "</a>";
    }).join("");

    var mobile = items.concat([{ href: "#akun", path: "#akun", label: "Akun", icon: "user" }]).map(function (item) {
      var isAccount = item.href === "#akun";
      var tag = isAccount ? "button" : "a";
      var attrs = isAccount ? 'type="button" data-account' : 'href="' + item.href + '"' + (isActive(item.path, path) ? ' aria-current="page"' : "");
      return "<" + tag + ' class="mobile-link" ' + attrs + ">" + ui.icon(item.icon) + "<span>" + item.label + "</span></" + tag + ">";
    }).join("");

    return '' +
      '<header class="site-header">' +
      '<div class="wrap header-inner">' +
        '<a class="brand" href="' + store.roleHome(user.role) + '" aria-label="IDB Bali — beranda">' +
          '<span class="brand-mark">IDB</span>' +
          '<span class="brand-text"><strong>Bali</strong><small>Reservasi Ruang</small></span>' +
        "</a>" +
        '<nav class="site-nav" aria-label="Navigasi utama">' + nav + "</nav>" +
        '<div class="user-menu">' +
          '<button class="user-btn" type="button" id="user-btn" aria-expanded="false" aria-haspopup="true" aria-label="' + ui.esc("Menu akun " + user.name) + '">' +
            '<span class="avatar" aria-hidden="true">' + ui.esc(user.initials) + "</span>" +
            '<span class="user-meta"><strong>' + ui.esc(user.name) + "</strong><small>" + ui.esc(ui.roleLabel(user.role)) + "</small></span>" +
          "</button>" +
          '<div class="user-pop" id="user-pop" hidden>' +
            '<div class="user-pop-head"><strong>' + ui.esc(user.name) + "</strong><span>" + ui.esc(user.email) + "</span></div>" +
            (user.role === "mahasiswa" || user.role === "dosen"
              ? '<a href="#/reservasi">' + ui.icon("calendar") + " Reservasi saya</a>"
              : user.role === "admin"
                ? '<a href="#/admin">' + ui.icon("shield") + " Panel admin</a>"
                : '<a href="#/operator">' + ui.icon("settings") + " Panel operator</a>") +
            '<button type="button" data-logout>' + ui.icon("logout") + " Keluar</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
      '<nav class="mobile-nav" aria-label="Navigasi seluler">' + mobile + "</nav>" +
      "</header>";
  }

  function renderFooter() {
    return '' +
      '<footer class="site-footer">' +
      '<div class="wrap footer-inner">' +
        '<div style="display:grid;gap:var(--space-2xs);max-width:52ch">' +
          '<div class="footer-brand"><span class="brand-mark" style="width:30px;height:30px;font-size:10px">IDB</span>' +
            '<span class="brand-text"><strong style="font-size:17px">Bali</strong><small>Reservasi Ruang</small></span></div>' +
          '<p class="footer-note">Prototipe sistem reservasi ruang kampus berdasarkan PRD 1.0. Data disimpan di peramban Anda dan tidak terhubung ke layanan kampus.</p>' +
        "</div>" +
        '<div class="footer-meta">' +
          "<span>IDB Bali</span><span>PRD 1.0</span><span>Prototipe demo</span><span>" + new Date().getFullYear() + "</span>" +
        "</div>" +
      "</div></footer>";
  }

  function accountModal(user) {
    var body = '' +
      '<div style="display:flex;gap:var(--space-s);align-items:center">' +
        '<span class="avatar" style="width:48px;height:48px;font-size:15px">' + ui.esc(user.initials) + "</span>" +
        "<div><h3 style=\"font-size:17px\">" + ui.esc(user.name) + "</h3>" +
          '<p class="tiny muted">' + ui.esc(user.email) + "</p></div>" +
      "</div>" +
      '<div class="dl" style="margin-top:var(--space-s)">' +
        "<div><span>Peran</span><span>" + ui.esc(ui.roleLabel(user.role)) + "</span></div>" +
        "<div><span>Identitas</span><span>" + ui.esc(user.identity || "—") + "</span></div>" +
        "<div><span>Unit</span><span>" + ui.esc(user.program || "—") + "</span></div>" +
      "</div>";
    ui.openModal({
      title: "Akun",
      body: body,
      footer: '<button type="button" class="btn btn-ghost" data-close="1">Tutup</button>' +
        '<button type="button" class="btn btn-primary" data-logout>Keluar dari akun</button>'
    });
  }

  function forbidden(user) {
    return '' +
      '<div class="wrap">' +
        '<div class="empty" style="margin-top:var(--space-xl)">' +
          '<div class="empty-icon">' + ui.icon("shield") + "</div>" +
          "<h3>Halaman ini bukan untuk peran Anda</h3>" +
          "<p>Anda masuk sebagai <strong>" + ui.esc(ui.roleLabel(user.role)) + "</strong>. " +
            (user.role === "admin"
              ? "Fungsi pengajuan hanya tersedia untuk mahasiswa dan dosen. Gunakan panel admin untuk memproses permintaan."
              : user.role === "operator"
                ? "Operator layanan mengelola konfigurasi teknis, bukan pengajuan. Gunakan panel operator."
                : "Menu administrasi hanya dapat dibuka oleh admin reservasi.") +
          "</p>" +
          '<div class="btn-group"><a class="btn btn-primary" href="' + store.roleHome(user.role) + '">Kembali ke halaman utama</a>' +
            '<a class="btn btn-ghost" href="#/ruang">Lihat daftar ruang</a></div>' +
        "</div>" +
      "</div>";
  }

  function notFound() {
    return '' +
      '<div class="wrap"><div class="empty" style="margin-top:var(--space-xl)">' +
        '<div class="empty-icon">' + ui.icon("search") + "</div>" +
        "<h3>Halaman tidak ditemukan</h3>" +
        "<p>Tautan mungkin sudah berubah. Kembali ke beranda untuk melanjutkan.</p>" +
        '<div class="btn-group"><a class="btn btn-primary" href="#/">Ke beranda</a></div>' +
      "</div></div>";
  }

  function errorScreen(err) {
    return '' +
      '<div class="wrap"><div class="empty" style="margin-top:var(--space-xl)">' +
        '<div class="empty-icon">' + ui.icon("alert") + "</div>" +
        "<h3>Sistem tidak dapat menampilkan halaman</h3>" +
        "<p>Terjadi kesalahan saat memuat data. Muat ulang halaman; data yang tersimpan tidak hilang.</p>" +
        '<div class="btn-group"><button class="btn btn-primary" type="button" onclick="location.reload()">Muat ulang</button><a class="btn btn-ghost" href="#/">Ke beranda</a></div>' +
      "</div></div>";
  }

  function render(options) {
    options = options || {};
    var user = store.currentUser();
    var route = parseHash();
    var matched = findRoute(route.path);
    document.title = (TITLES[route.path] ? TITLES[route.path] + " — " : "") + "Reservasi Ruang — IDB Bali";
    var header = document.getElementById("site-header");
    var footer = document.getElementById("site-footer");
    var main = document.getElementById("main");

    document.body.removeAttribute("data-route");

    if (route.path === "/login") {
      if (user) {
        location.hash = store.roleHome(user.role);
        return;
      }
      header.innerHTML = "";
      footer.innerHTML = "";
      document.body.classList.add("is-auth");
      try {
        var loginPage = document.createElement("div");
        loginPage.id = "page";
        loginPage.innerHTML = views.login.render({ user: null, params: route.params });
        main.innerHTML = "";
        main.appendChild(loginPage);
        views.login.mount(loginPage, { user: null, params: route.params });
      } catch (err) {
        console.error(err);
        main.innerHTML = errorScreen(err);
      }
      if (options.focus !== false) {
        window.scrollTo(0, 0);
        ui.focusMain();
      }
      lastPath = route.path;
      return;
    }

    document.body.classList.remove("is-auth");

    if (!user) {
      try { sessionStorage.setItem("idb.next", location.hash); } catch (err) { /* ignore */ }
      location.hash = "#/login";
      return;
    }

    header.innerHTML = renderHeader(user, route.path);
    footer.innerHTML = renderFooter();

    var content;
    if (!matched) {
      content = notFound();
    } else if (matched.roles && matched.roles.indexOf(user.role) === -1) {
      content = forbidden(user);
    } else {
      try {
        var ctx = { user: user, params: route.params, path: route.path };
        content = views[matched.view].render(ctx);
        var page = document.createElement("div");
        page.id = "page";
        page.innerHTML = content;
        main.innerHTML = "";
        main.appendChild(page);
        views[matched.view].mount(page, ctx);
        bindGlobal(page, user);
        if (options.focus !== false && lastPath !== route.path) {
          window.scrollTo(0, 0);
          ui.focusMain();
        }
        lastPath = route.path;
        return;
      } catch (err) {
        console.error(err);
        content = errorScreen(err);
      }
    }

    var fallback = document.createElement("div");
    fallback.id = "page";
    fallback.innerHTML = content;
    main.innerHTML = "";
    main.appendChild(fallback);
    bindGlobal(fallback, user);
    if (options.focus !== false && lastPath !== route.path) {
      window.scrollTo(0, 0);
      ui.focusMain();
    }
    lastPath = route.path;
  }

  function bindGlobal(main, user) {
    Array.prototype.forEach.call(main.querySelectorAll("[data-logout]"), function (btn) {
      btn.addEventListener("click", function () {
        store.logout(false);
        ui.closeModal();
        ui.toast("Anda telah keluar.", "success");
        location.hash = "#/login";
      });
    });
    Array.prototype.forEach.call(main.querySelectorAll("[data-account]"), function (btn) {
      btn.addEventListener("click", function () { accountModal(user); });
    });
  }

  function bindHeader() {
    document.getElementById("site-header").addEventListener("click", function (e) {
      var logout = e.target.closest("[data-logout]");
      if (logout) {
        store.logout(false);
        ui.closeModal();
        location.hash = "#/login";
        return;
      }
      var account = e.target.closest("[data-account]");
      if (account) {
        var current = store.currentUser();
        if (current) accountModal(current);
        return;
      }
      var btn = e.target.closest("#user-btn");
      if (btn) {
        var pop = document.getElementById("user-pop");
        var open = pop.hidden;
        pop.hidden = !open;
        btn.setAttribute("aria-expanded", String(open));
        return;
      }
      if (!e.target.closest("#user-pop")) {
        var popover = document.getElementById("user-pop");
        var trigger = document.getElementById("user-btn");
        if (popover && !popover.hidden) {
          popover.hidden = true;
          if (trigger) trigger.setAttribute("aria-expanded", "false");
        }
      }
    });

    document.addEventListener("click", function (e) {
      if (e.target.closest(".user-menu")) return;
      var pop = document.getElementById("user-pop");
      var btn = document.getElementById("user-btn");
      if (pop && !pop.hidden) {
        pop.hidden = true;
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
    });

    document.addEventListener("click", function (e) {
      var logout = e.target.closest("#overlay-root [data-logout]");
      if (!logout) return;
      store.logout(false);
      ui.closeModal();
      ui.toast("Anda telah keluar.", "success");
      location.hash = "#/login";
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var pop = document.getElementById("user-pop");
        if (pop && !pop.hidden) {
          pop.hidden = true;
          var btn = document.getElementById("user-btn");
          if (btn) { btn.setAttribute("aria-expanded", "false"); btn.focus(); }
        }
      }
    });
  }

  function consumeNext(user) {
    var next = null;
    try {
      next = sessionStorage.getItem("idb.next");
      sessionStorage.removeItem("idb.next");
    } catch (err) { /* ignore */ }
    if (!next || next.indexOf("#/") !== 0) return null;
    var route = findRoute(next.replace(/^#/, "").split("?")[0]);
    if (!route || route.public) return null;
    if (route.roles && route.roles.indexOf(user.role) === -1) return null;
    return next;
  }

  app.consumeNext = consumeNext;
  app.render = render;

  app.start = function () {
    store.init();
    bindHeader();
    window.addEventListener("hashchange", function () {
      ui.closeModal(true);
      render();
    });
    if (!location.hash) {
      var user = store.currentUser();
      location.hash = user ? store.roleHome(user.role) : "#/login";
    }
    render({ focus: false });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", app.start);
  } else {
    app.start();
  }
})();
