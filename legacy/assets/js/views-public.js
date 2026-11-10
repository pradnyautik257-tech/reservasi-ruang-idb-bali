/* ==========================================================================
   views-public.js — login, beranda, daftar ruang
   ========================================================================== */
(function () {
  "use strict";

  var IDB = window.IDB;
  var ui = IDB.ui;
  var store = IDB.store;
  var views = (IDB.views = IDB.views || {});

  /* ======================= Login ======================= */
  views.login = {
    render: function () {
      var today = ui.todayISO();
      return '' +
        '<div class="auth">' +
          '<aside class="auth-aside">' +
            '<div class="auth-brand">' +
              '<span class="brand-mark">IDB</span>' +
              '<span class="brand-text"><strong>Bali</strong><small>Reservasi Ruang</small></span>' +
            '</div>' +
            '<div style="display:grid;gap:var(--space-m)">' +
              '<p class="eyebrow" style="color:#e3a08e">Sistem Reservasi Ruang Kampus</p>' +
              '<h1>Satu jadwal untuk <em>seluruh kampus.</em></h1>' +
              '<p class="lead">Cari ruang, ajukan pemakaian, lalu pantau keputusannya. Tanpa menanyakan jadwal lewat pesan satu per satu.</p>' +
              '<div class="auth-points">' +
                '<div class="auth-point">' + ui.icon("search") + '<span>Filter ruang berdasarkan tanggal, waktu, kapasitas, dan fasilitas.</span></div>' +
                '<div class="auth-point">' + ui.icon("shield") + '<span>Sistem memeriksa bentrok jadwal sebelum pengajuan dikirim.</span></div>' +
                '<div class="auth-point">' + ui.icon("list") + '<span>Riwayat dan status pengajuan tersimpan dalam satu daftar.</span></div>' +
              '</div>' +
            '</div>' +
            '<div class="auth-foot"><span>IDB Bali</span><span>PRD 1.0 · ' + ui.esc(ui.fmtDate(today, { short: true })) + '</span><span>Prototipe demo</span></div>' +
          '</aside>' +
          '<div class="auth-main">' +
            '<div class="auth-card">' +
              '<div style="display:grid;gap:var(--space-2xs)">' +
                '<p class="eyebrow">Masuk</p>' +
                '<h2>Selamat datang kembali</h2>' +
                '<p class="muted" style="font-size:14px">Gunakan akun kampus Anda untuk mengajukan dan memantau reservasi ruang.</p>' +
              '</div>' +
              '<div class="auth-error" id="auth-error" role="alert"></div>' +
              '<form id="login-form" novalidate style="display:grid;gap:var(--space-s)">' +
                '<div class="field" data-field="email">' +
                  '<label for="login-email">Email kampus <span class="req" aria-hidden="true">*</span></label>' +
                  '<input class="input" id="login-email" name="email" type="email" inputmode="email" autocomplete="username" placeholder="nama@student.idbbali.ac.id" required>' +
                  '<p class="field-error" id="err-email"></p>' +
                '</div>' +
                '<div class="field" data-field="password">' +
                  '<label for="login-password">Kata sandi <span class="req" aria-hidden="true">*</span></label>' +
                  '<div class="pass-wrap">' +
                    '<input class="input" id="login-password" name="password" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi" required>' +
                    '<button type="button" class="pass-toggle" id="pass-toggle" aria-pressed="false">Lihat</button>' +
                  '</div>' +
                  '<p class="field-error" id="err-password"></p>' +
                '</div>' +
                '<button class="btn btn-accent btn-block" type="submit" id="login-submit">Masuk ke sistem</button>' +
              '</form>' +
              '<div class="auth-demo">' +
                '<div class="auth-demo-head"><span>Akun demo</span><span class="mono" style="font-size:10.5px">sandi: demo1234</span></div>' +
                '<button type="button" class="demo-btn" data-demo="nia@student.idbbali.ac.id"><span class="avatar">NP</span><span class="grow"><strong>Nia Pramesti</strong><small>NIM 2101010234</small></span><span class="pill pill-role">Mahasiswa</span></button>' +
                '<button type="button" class="demo-btn" data-demo="ayu@idbbali.ac.id"><span class="avatar">AL</span><span class="grow"><strong>Dr. Ayu Lestari</strong><small>NIP 198804152012</small></span><span class="pill pill-role">Dosen</span></button>' +
                '<button type="button" class="demo-btn" data-demo="admin@idbbali.ac.id"><span class="avatar">MS</span><span class="grow"><strong>Made Sari</strong><small>Bagian Umum &amp; Sarana</small></span><span class="pill pill-role">Admin</span></button>' +
                '<button type="button" class="demo-btn" data-demo="operator@idbbali.ac.id"><span class="avatar">WT</span><span class="grow"><strong>Wayan Teknisi</strong><small>Teknologi Informasi</small></span><span class="pill pill-role">Operator</span></button>' +
              '</div>' +
              '<p class="inline-note">' + ui.icon("info") + '<span>Prototipe demo: data disimpan di peramban ini, bukan di server kampus. Jangan gunakan kata sandi asli.</span></p>' +
            '</div>' +
          '</div>' +
        '</div>';
    },
    mount: function (root, ctx) {
      var form = root.querySelector("#login-form");
      var errorBox = root.querySelector("#auth-error");
      var emailField = root.querySelector('[data-field="email"]');
      var passField = root.querySelector('[data-field="password"]');
      var emailInput = root.querySelector("#login-email");
      var passInput = root.querySelector("#login-password");

      function showError(msg) {
        errorBox.textContent = msg;
        errorBox.classList.add("is-on");
      }
      function clearError() {
        errorBox.textContent = "";
        errorBox.classList.remove("is-on");
      }

      root.querySelector("#pass-toggle").addEventListener("click", function () {
        var showing = passInput.type === "text";
        passInput.type = showing ? "password" : "text";
        this.textContent = showing ? "Lihat" : "Sembunyikan";
        this.setAttribute("aria-pressed", String(!showing));
      });

      [emailInput, passInput].forEach(function (input) {
        input.addEventListener("input", function () {
          input.closest(".field").removeAttribute("data-invalid");
          clearError();
        });
      });

      function submit() {
        var email = emailInput.value.trim();
        var pass = passInput.value;
        var bad = false;
        emailField.removeAttribute("data-invalid");
        passField.removeAttribute("data-invalid");
        if (!email) {
          emailField.setAttribute("data-invalid", "true");
          emailField.querySelector(".field-error").textContent = "Masukkan email kampus Anda.";
          bad = true;
        }
        if (!pass) {
          passField.setAttribute("data-invalid", "true");
          passField.querySelector(".field-error").textContent = "Masukkan kata sandi.";
          bad = true;
        }
        if (bad) {
          (email ? passInput : emailInput).focus();
          return;
        }
        var result = store.login(email, pass);
        if (!result.ok) {
          showError(result.error);
          passField.setAttribute("data-invalid", "true");
          passField.querySelector(".field-error").textContent = "Periksa kembali kata sandi Anda.";
          passInput.focus();
          passInput.select();
          return;
        }
        ui.toast("Selamat datang, " + result.user.name.split(" ")[0] + ".", "success");
        var next = IDB.app && IDB.app.consumeNext ? IDB.app.consumeNext(result.user) : null;
        location.hash = next || store.roleHome(result.user.role);
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        submit();
      });

      root.querySelectorAll("[data-demo]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          emailInput.value = btn.getAttribute("data-demo");
          passInput.value = "demo1234";
          clearError();
          submit();
        });
      });

      emailInput.focus();
    }
  };

  /* ======================= Shared bits ======================= */
  function timeOptions(selected, settings, opts) {
    opts = opts || {};
    var open = ui.toMinutes(settings.openHour);
    var close = ui.toMinutes(settings.closeHour);
    var out = '';
    if (opts.allowEmpty) {
      out += '<option value=""' + (!selected ? " selected" : "") + ">" + ui.esc(opts.placeholder || "Semua") + "</option>";
    }
    for (var t = open; t <= close; t += 30) {
      var value = ui.toTime(t);
      out += '<option value="' + value + '"' + (value === selected ? " selected" : "") + ">" + ui.timeLabel(value) + "</option>";
    }
    return out;
  }

  views.timeOptions = timeOptions;

  function facilityChips(selected, prefix) {
    var list = IDB.facilitiesCatalog;
    return '<div class="chips" role="group" aria-label="Filter fasilitas" id="' + prefix + '-facilities">' +
      list.map(function (f) {
        var on = selected.indexOf(f) !== -1;
        return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-facility="' + ui.esc(f) + '" aria-pressed="' + on + '">' + ui.esc(f) + "</button>";
      }).join("") + "</div>";
  }

  function readFacilityChips(container) {
    return Array.prototype.map.call(container.querySelectorAll('[data-facility][aria-pressed="true"]'), function (el) {
      return el.getAttribute("data-facility");
    });
  }

  function statsFor(user) {
    var today = ui.todayISO();
    var roomsActive = store.rooms().length;
    var myList = user ? store.reservations().filter(function (r) { return r.userId === user.id; }) : [];
    var activeMine = myList.filter(function (r) { return r.status === "menunggu" || r.status === "disetujui"; });
    var todayActive = store.reservations().filter(function (r) {
      return r.date === today && (r.status === "menunggu" || r.status === "disetujui");
    });
    var pending = store.reservations().filter(function (r) { return r.status === "menunggu"; });

    if (!user) {
      return [
        { value: roomsActive, label: "Ruang aktif" },
        { value: todayActive.length, label: "Agenda hari ini" },
        { value: "4", label: "Peran pengguna" },
        { value: "1", label: "Alur pengajuan" }
      ];
    }
    if (user.role === "admin") {
      return [
        { value: roomsActive, label: "Ruang aktif" },
        { value: pending.length, label: "Menunggu keputusan" },
        { value: todayActive.length, label: "Agenda hari ini" },
        { value: store.reservations().length, label: "Total pengajuan" }
      ];
    }
    if (user.role === "operator") {
      return [
        { value: roomsActive, label: "Ruang aktif" },
        { value: store.reservations().length, label: "Total pengajuan" },
        { value: store.audit().length, label: "Entri jejak" },
        { value: Math.max(1, Math.round(store.storageBytes() / 1024)) + " KB", label: "Data tersimpan" }
      ];
    }
    return [
      { value: roomsActive, label: "Ruang aktif" },
      { value: activeMine.length, label: "Reservasi aktif saya" },
      { value: myList.filter(function (r) { return r.status === "menunggu"; }).length, label: "Menunggu keputusan" },
      { value: todayActive.length, label: "Agenda kampus hari ini" }
    ];
  }

  function roomState(room, params) {
    var date = params.tanggal || ui.todayISO();
    var bookings = store.bookingsFor(room.id, date);
    if (params.mulai && params.selesai) {
      var free = store.isRoomFree(room.id, date, params.mulai, params.selesai);
      return {
        free: free,
        label: free ? "Tersedia pada jam ini" : "Terisi pada jam ini",
        bookings: bookings
      };
    }
    var now = new Date();
    var mins = now.getHours() * 60 + now.getMinutes();
    var busyNow = date === ui.todayISO() && bookings.some(function (b) {
      return mins >= ui.toMinutes(b.start) && mins < ui.toMinutes(b.end);
    });
    return {
      free: !busyNow,
      label: busyNow ? "Sedang dipakai" : (bookings.length ? bookings.length + " agenda terjadwal" : "Kosong sepanjang hari"),
      bookings: bookings
    };
  }

  function bookLink(room, params) {
    var q = ["ruang=" + encodeURIComponent(room.id)];
    var date = params.tanggal || ui.todayISO();
    q.push("tanggal=" + encodeURIComponent(date));
    if (params.mulai) q.push("mulai=" + encodeURIComponent(params.mulai));
    if (params.selesai) q.push("selesai=" + encodeURIComponent(params.selesai));
    if (params.kapasitas) q.push("peserta=" + encodeURIComponent(params.kapasitas));
    return "#/reservasi/baru?" + q.join("&");
  }

  function roomRow(room, params, user) {
    var state = roomState(room, params);
    var date = params.tanggal || ui.todayISO();
    var canBook = user && store.can(user.role, "book");
    var action = "";
    if (canBook) {
      action = '<a class="btn btn-primary btn-sm" href="' + bookLink(room, params) + '">Ajukan</a>';
    }
    if (canBook && !state.free) {
      action = '<a class="btn btn-ghost btn-sm" href="' + bookLink(room, { tanggal: date }) + '">Pilih waktu lain</a>';
    }

    return '' +
      '<article class="room" data-room="' + ui.esc(room.id) + '">' +
        ui.plate(room, room.status === "nonaktif" ? "is-off" : "") +
        '<div class="room-body">' +
          '<div class="room-title"><h3>' + ui.esc(room.name) + "</h3>" +
            (room.status === "nonaktif" ? '<span class="badge">Nonaktif</span>' : "") +
          "</div>" +
          '<div class="room-sub">' +
            "<span>" + ui.icon("building") + ui.esc(room.building) + " · Lt. " + room.floor + "</span>" +
            "<span>" + ui.icon("users") + room.capacity + " orang</span>" +
            "<span>" + ui.icon("calendar") + ui.esc(ui.fmtDateShort(date)) + "</span>" +
          "</div>" +
          '<div class="chips">' + room.facilities.slice(0, 4).map(function (f) {
            return '<span class="chip">' + ui.esc(f) + "</span>";
          }).join("") + (room.facilities.length > 4 ? '<span class="chip chip-more">+' + (room.facilities.length - 4) + "</span>" : "") + "</div>" +
        "</div>" +
        '<div class="room-avail">' +
          '<div class="room-state ' + (state.free ? "is-free" : "is-busy") + '"><span class="dot"></span>' + ui.esc(state.label) + "</div>" +
          ui.ribbon(room, date, state.bookings, store.settings()) +
        "</div>" +
        '<div class="room-actions">' +
          '<button type="button" class="btn btn-ghost btn-sm" data-detail="' + ui.esc(room.id) + '">Detail</button>' +
          action +
        "</div>" +
      "</article>";
  }

  function roomDetailModal(room, params, user) {
    var date = params.tanggal || ui.todayISO();
    var bookings = store.bookingsFor(room.id, date);
    var slots = store.nextFreeSlots(room.id, date, 3);
    var canBook = user && store.can(user.role, "book");
    var body = '' +
      '<div style="display:flex;gap:var(--space-s);align-items:flex-start;flex-wrap:wrap">' +
        ui.plate(room) +
        "<div style=\"flex:1 1 240px\">" +
          '<div class="room-sub" style="margin-bottom:6px">' +
            "<span>" + ui.icon("building") + ui.esc(room.building) + " · Lt. " + room.floor + "</span>" +
            "<span>" + ui.icon("users") + room.capacity + " orang</span>" +
          "</div>" +
          "<p class=\"tiny muted\">" + ui.esc(room.note || "") + "</p>" +
        "</div>" +
        '<span class="pill ' + (room.status === "aktif" ? "pill-disetujui" : "pill-dibatalkan") + '">' + (room.status === "aktif" ? "Aktif" : "Nonaktif") + "</span>" +
      "</div>" +
      '<div class="chips" style="margin-block:var(--space-s)">' + room.facilities.map(function (f) {
        return '<span class="chip">' + ui.esc(f) + "</span>";
      }).join("") + "</div>" +
      '<div class="dl" style="margin-bottom:var(--space-s)">' +
        "<div><span>Ketersediaan " + ui.esc(ui.fmtDateShort(date)) + "</span><span>" +
          (bookings.length ? bookings.map(function (b) {
            return ui.timeLabel(b.start) + "–" + ui.timeLabel(b.end) + " · " + ui.esc(b.activity) + " " + ui.pill(b.status);
          }).join("<br>") : "Belum ada reservasi pada tanggal ini.") +
        "</span></div>" +
        "<div><span>Slot kosong berikutnya</span><span>" +
          (slots.length ? slots.map(function (s) { return ui.timeLabel(s.start) + "–" + ui.timeLabel(s.end); }).join(" · ") : "Tidak ada slot memadai pada tanggal ini.") +
        "</span></div>" +
        "<div><span>Kode ruang</span><span>" + ui.esc(room.code) + "</span></div>" +
      "</div>" +
      '<div class="table-wrap" style="margin-top:var(--space-s)"><table class="table" style="min-width:0"><thead><tr><th>Waktu</th><th>Kegiatan</th><th>Status</th></tr></thead><tbody>' +
        (bookings.length ? bookings.map(function (b) {
          return "<tr><td class=\"mono\">" + ui.timeLabel(b.start) + "–" + ui.timeLabel(b.end) + "</td><td>" + ui.esc(b.activity) + "</td><td>" + ui.pill(b.status) + "</td></tr>";
        }).join("") : '<tr><td colspan="3" class="muted">Kosong sepanjang hari.</td></tr>') +
      "</tbody></table></div>";

    var footer = '<button type="button" class="btn btn-ghost" data-close="1">Tutup</button>' +
      (canBook ? '<a class="btn btn-primary" href="' + bookLink(room, { tanggal: date, mulai: slots[0] ? slots[0].start : "", selesai: slots[0] ? slots[0].end : "" }) + '">Ajukan reservasi</a>' : "");

    ui.openModal({
      title: room.name,
      subtitle: room.code + " · " + room.building + " · Kapasitas " + room.capacity + " orang",
      body: body,
      footer: footer,
      wide: true
    });
  }

  function bindRoomActions(root, params, user) {
    root.addEventListener("click", function (e) {
      var trigger = e.target.closest("[data-detail]");
      if (!trigger) return;
      var room = store.roomById(trigger.getAttribute("data-detail"));
      if (room) roomDetailModal(room, params, user);
    });
  }

  /* ======================= Beranda ======================= */
  views.home = {
    render: function (ctx) {
      var user = ctx.user;
      var s = store.settings();
      var today = ui.todayISO();
      var stats = statsFor(user);
      var featured = store.rooms().slice(0, 3);

      return '' +
        '<div class="wrap">' +
          '<section class="hero">' +
            '<div class="hero-copy">' +
              '<p class="eyebrow">Sistem Reservasi Ruang · IDB Bali</p>' +
              '<h1>Cari ruang. Ajukan. <em>Pantau.</em></h1>' +
              '<p class="lead">Satu tempat untuk melihat ketersediaan ruang kampus, mengajukan pemakaian, dan mengikuti keputusan admin sampai selesai.</p>' +
              '<div class="hero-meta">' +
                "<span>" + ui.icon("clock") + "Jam operasional " + ui.timeLabel(s.openHour) + "–" + ui.timeLabel(s.closeHour) + "</span>" +
                "<span>" + ui.icon("calendar") + "Hari ini " + ui.esc(ui.fmtDate(today, { weekday: true })) + "</span>" +
                "<span>" + ui.icon("users") + "Untuk mahasiswa, dosen, dan staf</span>" +
              "</div>" +
            "</div>" +
            '<form class="search-panel" id="home-search" novalidate>' +
              '<div class="row-between" style="margin-bottom:var(--space-s)">' +
                '<p class="eyebrow is-muted" style="font-size:10px">Cari ruang</p>' +
                '<span class="mono tiny muted">' + ui.esc(store.rooms().length) + " ruang</span>" +
              "</div>" +
              '<div class="form-grid">' +
                '<div class="field"><label for="h-date">Tanggal</label><input class="input" type="date" id="h-date" name="tanggal" value="' + today + '" min="' + today + '" max="' + ui.addDays(today, s.windowDays) + '"></div>' +
                '<div class="field"><label for="h-cap">Kapasitas minimal</label><input class="input" type="number" inputmode="numeric" min="1" id="h-cap" name="kapasitas" placeholder="contoh: 30"></div>' +
                '<div class="field"><label for="h-start">Mulai</label><select class="select" id="h-start" name="mulai">' + timeOptions("", s, { allowEmpty: true, placeholder: "Pilih waktu" }) + "</select></div>" +
                '<div class="field"><label for="h-end">Selesai</label><select class="select" id="h-end" name="selesai">' + timeOptions("", s, { allowEmpty: true, placeholder: "Pilih waktu" }) + "</select></div>" +
                '<div class="field" style="grid-column:1/-1"><span class="field-label">Fasilitas</span>' + facilityChips([], "home") + "</div>" +
                '<div class="search-actions">' +
                  '<span class="tiny muted grow">Kosongkan waktu untuk melihat semua ruang.</span>' +
                  '<button class="btn btn-primary" type="submit">Cari ruang ' + ui.icon("arrowRight") + "</button>" +
                "</div>" +
              "</div>" +
            "</form>" +
          "</section>" +

          '<section class="stats" aria-label="Ringkasan">' +
            stats.map(function (st) {
              return '<div class="stat"><div class="stat-value">' + ui.esc(st.value) + '</div><div class="stat-label">' + ui.esc(st.label) + "</div></div>";
            }).join("") +
          "</section>" +

          '<section class="section">' +
            '<div class="section-head">' +
              "<div><p class=\"eyebrow\">Ruang pilihan</p><h2>Tersedia untuk dicari hari ini</h2></div>" +
              '<div class="section-actions"><a class="link-arrow" href="#/ruang">Lihat semua ruang ' + ui.icon("arrowRight") + "</a></div>" +
            "</div>" +
            '<div class="room-list">' + featured.map(function (room) {
              return roomRow(room, { tanggal: today }, user);
            }).join("") + "</div>" +
          "</section>" +

          '<section class="section">' +
            '<div class="section-head"><div><p class="eyebrow">Alur</p><h2>Empat langkah, satu jadwal</h2></div>' +
              '<p class="section-note">Pengajuan tidak otomatis disetujui. Admin memeriksa kelengkapan dan bentrok jadwal sebelum memutuskan.</p>' +
            "</div>" +
            '<div class="steps">' +
              ["Masuk dengan akun kampus", "Cari ruang dan waktu", "Isi formulir pengajuan", "Pantau keputusan admin"].map(function (title, i) {
                var desc = [
                  "Peran akun menentukan menu dan data yang bisa Anda lihat.",
                  "Filter tanggal, waktu, kapasitas, dan fasilitas yang dibutuhkan.",
                  "Sistem memeriksa konflik jadwal sebelum pengajuan disimpan.",
                  "Status berubah dari Menunggu menjadi Disetujui, Ditolak, atau Dibatalkan."
                ][i];
                return '<div class="step"><div class="step-num">0' + (i + 1) + "</div><h3>" + title + "</h3><p>" + desc + "</p></div>";
              }).join("") +
            "</div>" +
          "</section>" +

          '<section class="section">' +
            '<div class="split split-policy">' +
              '<div class="panel">' +
                '<div class="panel-head"><div><p class="eyebrow">Kebijakan ringkas</p><h3>Aturan yang berlaku di prototipe ini</h3></div><span class="badge">Usulan</span></div>' +
                '<div class="dl">' +
                  "<div><span>Jam operasional</span><span>" + ui.timeLabel(s.openHour) + "–" + ui.timeLabel(s.closeHour) + " setiap hari</span></div>" +
                  "<div><span>Durasi</span><span>" + s.minHours + "–" + s.maxHours + " jam per pengajuan</span></div>" +
                  "<div><span>Pemesanan</span><span>Maksimal " + s.windowDays + " hari ke depan</span></div>" +
                  "<div><span>Pembatalan mandiri</span><span>Paling lambat " + s.cancelHours + " jam sebelum kegiatan</span></div>" +
                  "<div><span>Persetujuan</span><span>" + (s.autoApprove ? "Otomatis jika jadwal kosong" : "Diperiksa admin reservasi") + "</span></div>" +
                "</div>" +
              "</div>" +
              '<div class="panel" style="display:grid;gap:var(--space-s);align-content:start">' +
                '<p class="eyebrow">Catatan</p>' +
                '<p style="font-size:14px">' + ui.esc(s.announcement) + "</p>" +
                '<p class="tiny muted">Kebijakan resmi kampus masih perlu ditetapkan. Prototipe ini mengikuti usulan pada PRD 1.0.</p>' +
                (user && store.can(user.role, "book") ? '<a class="btn btn-accent" href="#/reservasi/baru">Ajukan reservasi ' + ui.icon("arrowRight") + "</a>" : "") +
              "</div>" +
            "</div>" +
          "</section>" +
        "</div>";
    },
    mount: function (root, ctx) {
      bindRoomActions(root, { tanggal: ui.todayISO() }, ctx.user);
      var form = root.querySelector("#home-search");
      var chips = root.querySelector("#home-facilities");

      chips.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-facility]");
        if (!btn) return;
        var on = btn.getAttribute("aria-pressed") === "true";
        btn.setAttribute("aria-pressed", String(!on));
        btn.classList.toggle("is-on", !on);
      });

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var params = new URLSearchParams();
        var date = form.querySelector("#h-date").value;
        var cap = form.querySelector("#h-cap").value;
        var start = form.querySelector("#h-start").value;
        var end = form.querySelector("#h-end").value;
        if (date) params.set("tanggal", date);
        if (cap) params.set("kapasitas", cap);
        if (start) params.set("mulai", start);
        if (end) params.set("selesai", end);
        var facilities = readFacilityChips(chips);
        if (facilities.length) params.set("fasilitas", facilities.join(","));
        location.hash = "#/ruang" + (params.toString() ? "?" + params.toString() : "");
      });
    }
  };

  /* ======================= Daftar ruang ======================= */
  views.rooms = {
    render: function (ctx) {
      var params = ctx.params;
      var s = store.settings();
      var today = ui.todayISO();
      var date = params.tanggal || today;
      var selectedFacilities = (params.fasilitas || "").split(",").filter(Boolean);
      var capacity = Number(params.kapasitas) || 0;
      var start = params.mulai || "";
      var end = params.selesai || "";

      var rooms = store.rooms().filter(function (room) {
        if (capacity && room.capacity < capacity) return false;
        if (selectedFacilities.length && !selectedFacilities.every(function (f) { return room.facilities.indexOf(f) !== -1; })) return false;
        return true;
      });

      var available = rooms.filter(function (room) {
        if (start && end) return store.isRoomFree(room.id, date, start, end);
        return true;
      });
      var shown = start && end ? available : rooms;

      var summaryChips = [];
      summaryChips.push({ label: ui.fmtDate(date, { weekday: true, short: true }), key: "tanggal" });
      if (start || end) summaryChips.push({ label: "Waktu " + (start ? ui.timeLabel(start) : "…") + "–" + (end ? ui.timeLabel(end) : "…"), key: "waktu" });
      if (capacity) summaryChips.push({ label: "≥ " + capacity + " orang", key: "kapasitas" });
      selectedFacilities.forEach(function (f) { summaryChips.push({ label: f, key: "fasilitas", value: f }); });

      return '' +
        '<div class="wrap">' +
          '<div class="page-head">' +
            '<p class="eyebrow">Daftar ruang</p>' +
            '<div class="row-between" style="align-items:flex-end">' +
              "<h1>Ruang &amp; ketersediaan</h1>" +
              '<p class="section-note" style="max-width:38ch">Pilih tanggal dan waktu untuk melihat ruang yang benar-benar kosong, bukan hanya daftar ruang.</p>' +
            "</div>" +
          "</div>" +
          '<h2 class="sr-only">Hasil pencarian ruang</h2>' +
        "</div>" +

        '<div class="filters" id="room-filters">' +
          '<form class="wrap filters-inner" id="filters-form" novalidate>' +
            '<div class="field f-date"><label for="f-date">Tanggal</label><input class="input" type="date" id="f-date" value="' + date + '" min="' + today + '" max="' + ui.addDays(today, s.windowDays) + '"></div>' +
            '<div class="field f-time"><label for="f-start">Mulai</label><select class="select" id="f-start">' + timeOptions(start, s, { allowEmpty: true, placeholder: "Semua" }) + "</select></div>" +
            '<div class="field f-time"><label for="f-end">Selesai</label><select class="select" id="f-end">' + timeOptions(end, s, { allowEmpty: true, placeholder: "Semua" }) + "</select></div>" +
            '<div class="field f-cap"><label for="f-cap">Kapasitas</label><input class="input" type="number" inputmode="numeric" min="1" id="f-cap" value="' + (capacity || "") + '" placeholder="Min."></div>' +
            '<div class="field f-fac"><label for="f-fac">Fasilitas</label><select class="select" id="f-fac"><option value="">Semua fasilitas</option>' +
              IDB.facilitiesCatalog.map(function (f) {
                return '<option value="' + ui.esc(f) + '"' + (selectedFacilities.length === 1 && selectedFacilities[0] === f ? " selected" : "") + ">" + ui.esc(f) + "</option>";
              }).join("") + "</select></div>" +
            '<div class="f-actions">' +
              '<button class="btn btn-primary btn-sm" type="submit">Terapkan</button>' +
              '<a class="btn btn-ghost btn-sm" href="#/ruang">Reset</a>' +
            "</div>" +
          "</form>" +
        "</div>" +

        '<div class="wrap">' +
          '<div class="filter-summary">' +
            '<span class="mono tiny muted" style="letter-spacing:.1em;text-transform:uppercase">Filter aktif</span>' +
            summaryChips.map(function (c) { return '<span class="filter-chip">' + ui.esc(c.label) + "</span>"; }).join("") +
            '<span class="grow"></span>' +
            '<span class="tiny muted">' + shown.length + " dari " + store.rooms().length + " ruang</span>" +
          "</div>" +

          '<div class="toolbar">' +
            '<div class="ribbon-legend"><span><span class="ribbon-key"></span>Kosong</span><span><span class="ribbon-key is-busy"></span>Terisi</span><span><span style="display:inline-block;width:2px;height:12px;background:var(--accent)"></span>Sekarang</span></div>' +
            '<span class="tiny muted">Klik Detail untuk melihat seluruh agenda ruang.</span>' +
          "</div>" +

          (shown.length ?
            '<div class="room-list">' + shown.map(function (room) { return roomRow(room, { tanggal: date, mulai: start, selesai: end, kapasitas: capacity }, ctx.user); }).join("") + "</div>" :
            emptyRooms(rooms.length > 0)) +
        "</div>";
    },
    mount: function (root, ctx) {
      var params = ctx.params || {};
      var date = params.tanggal || ui.todayISO();
      bindRoomActions(root, { tanggal: date, mulai: params.mulai, selesai: params.selesai }, ctx.user);

      var form = root.querySelector("#filters-form");
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var q = new URLSearchParams();
        var d = root.querySelector("#f-date").value;
        var st = root.querySelector("#f-start").value;
        var en = root.querySelector("#f-end").value;
        var cap = root.querySelector("#f-cap").value;
        var fac = root.querySelector("#f-fac").value;
        if (d) q.set("tanggal", d);
        if (st) q.set("mulai", st);
        if (en) q.set("selesai", en);
        if (cap) q.set("kapasitas", cap);
        if (fac) q.set("fasilitas", fac);
        location.hash = "#/ruang" + (q.toString() ? "?" + q.toString() : "");
      });

      var startSel = root.querySelector("#f-start");
      var endSel = root.querySelector("#f-end");
      startSel.addEventListener("change", function () {
        if (!startSel.value) return;
        var minEnd = ui.toMinutes(startSel.value) + 30;
        Array.prototype.forEach.call(endSel.options, function (opt) {
          if (!opt.value) return;
          opt.disabled = ui.toMinutes(opt.value) < minEnd;
        });
      });
    }
  };

  function emptyRooms(hasRooms) {
    return '' +
      '<div class="empty">' +
        '<div class="empty-icon">' + ui.icon("search") + "</div>" +
        "<h3>Tidak ada ruang yang cocok</h3>" +
        "<p>" + (hasRooms
          ? "Semua ruang pada filter ini sedang terpakai atau tidak memenuhi kapasitas dan fasilitas yang dipilih. Longgarkan filter atau pilih waktu lain."
          : "Belum ada data ruang yang aktif. Hubungi admin reservasi untuk melengkapi data ruang.") + "</p>" +
        '<div class="btn-group"><a class="btn btn-ghost" href="#/ruang">Hapus semua filter</a><a class="btn btn-primary" href="#/reservasi/baru">Ajukan tanpa filter</a></div>' +
      "</div>";
  }

  views.helpers = {
    roomRow: roomRow,
    roomDetailModal: roomDetailModal,
    roomState: roomState,
    statsFor: statsFor,
    facilityChips: facilityChips,
    readFacilityChips: readFacilityChips,
    timeOptions: timeOptions,
    bookLink: bookLink
  };
})();
