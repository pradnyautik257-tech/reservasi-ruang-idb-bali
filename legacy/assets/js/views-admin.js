/* ==========================================================================
   views-admin.js — panel admin reservasi: antrean, keputusan, data ruang
   ========================================================================== */
(function () {
  "use strict";

  var IDB = window.IDB;
  var ui = IDB.ui;
  var store = IDB.store;
  var views = IDB.views;

  var TABS = [
    { key: "menunggu", label: "Menunggu" },
    { key: "disetujui", label: "Disetujui" },
    { key: "ditolak", label: "Ditolak" },
    { key: "dibatalkan", label: "Dibatalkan" },
    { key: "semua", label: "Semua" }
  ];

  views.admin = {
    render: function (ctx) {
      var user = ctx.user;
      var params = ctx.params || {};
      var tab = params.tab === "ruang" ? "ruang" : "antrean";
      var status = params.status || (tab === "antrean" ? "menunggu" : "semua");
      var q = (params.q || "").trim().toLowerCase();

      var all = store.reservations();
      var counts = store.counts(user);
      var pending = all.filter(function (r) { return r.status === "menunggu"; });
      var today = ui.todayISO();
      var todayApproved = all.filter(function (r) { return r.status === "disetujui" && r.date === today; });

      var head = '' +
        '<div class="wrap">' +
          '<div class="admin-head">' +
            '<div><p class="eyebrow">Panel admin reservasi</p><h1>Antrean &amp; pengelolaan</h1></div>' +
            '<div class="queue-stats">' +
              '<div class="queue-stat"><strong>' + pending.length + "</strong><span>Menunggu</span></div>" +
              '<div class="queue-stat"><strong>' + todayApproved.length + "</strong><span>Disetujui hari ini</span></div>" +
              '<div class="queue-stat"><strong>' + store.rooms().length + "</strong><span>Ruang aktif</span></div>" +
            "</div>" +
          "</div>" +
          '<h2 class="sr-only">Daftar pengajuan reservasi</h2>' +
          '<div class="tabs" role="tablist" aria-label="Bagian panel admin">' +
            '<a class="tab" role="tab" aria-selected="' + (tab === "antrean") + '" href="#/admin?tab=antrean&status=menunggu">Antrean pengajuan</a>' +
            '<a class="tab" role="tab" aria-selected="' + (tab === "ruang") + '" href="#/admin?tab=ruang">Kelola ruang</a>' +
          "</div>" +
        "</div>";

      if (tab === "ruang") return head + roomSection();

      var list = all.filter(function (r) {
        if (status !== "semua" && r.status !== status) return false;
        if (!q) return true;
        var room = store.roomById(r.roomId);
        var owner = store.userById(r.userId);
        return [r.code, r.activity, r.category, room ? room.name : "", owner ? owner.name : ""].join(" ").toLowerCase().indexOf(q) !== -1;
      });

      var statusTabs = TABS.map(function (t) {
        var active = status === t.key;
        return '<a class="chip' + (active ? " is-on" : "") + '"' + (active ? ' aria-current="page"' : "") + ' href="#/admin?tab=antrean&status=' + t.key + (q ? "&q=" + encodeURIComponent(q) : "") + '">' +
          t.label + '<span class="chip-count">' + (counts[t.key] || 0) + "</span></a>";
      }).join("");

      return head + '' +
        '<div class="wrap">' +
          '<div class="btn-group" role="group" aria-label="Filter status" style="margin-top:var(--space-m)">' + statusTabs + "</div>" +
          '<form class="toolbar" id="admin-search" role="search">' +
            '<label class="search-inline grow" style="max-width:340px">' +
              '<span class="sr-only">Cari pengajuan</span>' +
              ui.icon("search") +
              '<input class="input" type="search" name="q" id="admin-q" placeholder="Cari kode, kegiatan, ruang, atau pemohon" value="' + ui.esc(params.q || "") + '">' +
            "</label>" +
            '<div class="row">' +
              '<span class="tiny muted">' + list.length + " pengajuan</span>" +
              '<button class="btn btn-ghost btn-sm" type="submit">Cari</button>' +
              (q ? '<a class="btn btn-quiet btn-sm" href="#/admin?tab=antrean&status=' + status + '">Hapus</a>' : "") +
            "</div>" +
          "</form>" +

          (list.length ? adminTable(list, status) : adminEmpty(status, q)) +
        "</div>";
    },
    mount: function (root, ctx) {
      var user = ctx.user;
      var params = ctx.params || {};

      root.addEventListener("click", function (e) {
        var approve = e.target.closest("[data-approve]");
        if (approve) { approveFlow(approve.getAttribute("data-approve"), user); return; }
        var reject = e.target.closest("[data-reject]");
        if (reject) { rejectFlow(reject.getAttribute("data-reject"), user); return; }
        var open = e.target.closest("[data-open]");
        if (open) { adminDetail(open.getAttribute("data-open"), user); return; }
        var editRoom = e.target.closest("[data-edit-room]");
        if (editRoom) { roomForm(editRoom.getAttribute("data-edit-room"), user); return; }
        var addRoom = e.target.closest("[data-add-room]");
        if (addRoom) { roomForm(null, user); return; }
      });

      var search = root.querySelector("#admin-search");
      if (search) {
        search.addEventListener("submit", function (e) {
          e.preventDefault();
          var value = root.querySelector("#admin-q").value.trim();
          var status = params.status || "menunggu";
          location.hash = "#/admin?tab=antrean&status=" + status + (value ? "&q=" + encodeURIComponent(value) : "");
        });
      }
    }
  };

  /* ---------------- Antrean ---------------- */
  function adminTable(list, status) {
    var rows = list.map(function (r) {
      var room = store.roomById(r.roomId);
      var owner = store.userById(r.userId);
      var pending = r.status === "menunggu";
      return "<tr>" +
        '<td><span class="cell-strong mono">' + ui.esc(r.code) + '</span><span class="cell-sub">' + ui.esc(ui.fmtDateTime(r.createdAt)) + "</span></td>" +
        '<td><span class="cell-strong">' + ui.esc(r.activity) + '</span><span class="cell-sub">' + ui.esc(r.category) + " · " + r.participants + " peserta</span></td>" +
        '<td><span class="cell-strong">' + ui.esc(owner ? owner.name : "—") + '</span><span class="cell-sub">' + ui.esc(owner ? owner.role === "mahasiswa" ? "Mahasiswa" : "Dosen / Staf" : "") + "</span></td>" +
        "<td>" + ui.esc(room ? room.name : "—") + '<span class="cell-sub">' + ui.esc(room ? room.code : "") + "</span></td>" +
        '<td class="mono">' + ui.esc(ui.fmtDateShort(r.date)) + '<span class="cell-sub">' + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end) + "</span></td>" +
        "<td>" + ui.pill(r.status) + "</td>" +
        '<td class="cell-actions"><button type="button" class="btn btn-ghost btn-sm" data-open="' + ui.esc(r.id) + '">Detail</button>' +
          (pending ? ' <button type="button" class="btn btn-primary btn-sm" data-approve="' + ui.esc(r.id) + '">Setujui</button>' +
            ' <button type="button" class="btn btn-quiet btn-sm" data-reject="' + ui.esc(r.id) + '">Tolak</button>' : "") +
        "</td></tr>";
    }).join("");

    var cards = list.map(function (r) {
      var room = store.roomById(r.roomId);
      var owner = store.userById(r.userId);
      var pending = r.status === "menunggu";
      return '<article class="record">' +
        '<div class="record-top"><div><span class="record-code">' + ui.esc(r.code) + "</span><h3>" + ui.esc(r.activity) + "</h3></div>" + ui.pill(r.status) + "</div>" +
        '<div class="record-meta"><span>' + ui.esc(owner ? owner.name : "") + "</span><span>" + ui.esc(room ? room.name : "") + "</span><span>" + ui.esc(ui.fmtDateShort(r.date)) + " · " + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end) + "</span></div>" +
        '<div class="record-actions"><button type="button" class="btn btn-ghost btn-sm" data-open="' + ui.esc(r.id) + '">Detail</button>' +
          (pending ? '<button type="button" class="btn btn-primary btn-sm" data-approve="' + ui.esc(r.id) + '">Setujui</button>' +
            '<button type="button" class="btn btn-quiet btn-sm" data-reject="' + ui.esc(r.id) + '">Tolak</button>' : "") +
        "</div></article>";
    }).join("");

    return '<div class="table-wrap"><table class="table"><thead><tr>' +
      "<th>Kode / dikirim</th><th>Kegiatan</th><th>Pemohon</th><th>Ruang</th><th>Jadwal</th><th>Status</th><th class=\"cell-actions\">Aksi</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<div class="record-list">' + cards + "</div>";
  }

  function adminEmpty(status, q) {
    if (q) {
      return '<div class="empty"><div class="empty-icon">' + ui.icon("search") + "</div>" +
        "<h3>Tidak ada hasil untuk “" + ui.esc(q) + "”</h3>" +
        "<p>Coba kata kunci lain, atau hapus pencarian untuk melihat seluruh antrean.</p>" +
        '<div class="btn-group"><a class="btn btn-ghost" href="#/admin?tab=antrean&status=' + ui.esc(status) + '">Hapus pencarian</a></div></div>';
    }
    if (status === "menunggu") {
      return '<div class="empty"><div class="empty-icon">' + ui.icon("check") + "</div>" +
        "<h3>Antrean bersih</h3>" +
        "<p>Tidak ada pengajuan yang menunggu keputusan. Semua permintaan sudah diproses.</p>" +
        '<div class="btn-group"><a class="btn btn-ghost" href="#/admin?tab=antrean&status=semua">Lihat semua pengajuan</a></div></div>';
    }
    return '<div class="empty"><div class="empty-icon">' + ui.icon("filter") + "</div>" +
      "<h3>Tidak ada pengajuan pada filter ini</h3>" +
      "<p>Ubah filter status atau lihat seluruh pengajuan.</p>" +
      '<div class="btn-group"><a class="btn btn-ghost" href="#/admin?tab=antrean&status=semua">Semua pengajuan</a></div></div>';
  }

  /* ---------------- Detail admin ---------------- */
  function adminDetail(id, user) {
    var r = store.reservationById(id);
    if (!r) return;
    var room = store.roomById(r.roomId);
    var owner = store.userById(r.userId);
    var pending = r.status === "menunggu";
    var minutes = ui.toMinutes(r.end) - ui.toMinutes(r.start);

    var clashes = store.conflicts(r.roomId, r.date, r.start, r.end, r.id);
    var clashHtml = clashes.length
      ? '<div class="notice notice-warn" style="margin-top:var(--space-s)">' + ui.icon("alert") +
        "<div><strong>Ada pengajuan lain pada slot ini</strong>" +
        clashes.map(function (c) {
          return "<br>" + ui.esc(c.code) + " · " + ui.timeLabel(c.start) + "–" + ui.timeLabel(c.end) + " · " + ui.statusMeta(c.status).label + " · " + ui.esc(c.activity);
        }).join("") + "</div></div>"
      : "";

    var timeline = r.history.map(function (h, i) {
      var actor = h.by === "system" ? "Sistem" : (store.userById(h.by) ? store.userById(h.by).name : "Pengguna");
      return '<div class="timeline-item' + (i === r.history.length - 1 ? " is-accent" : "") + '">' +
        '<div class="timeline-when">' + ui.esc(ui.fmtDateTime(h.at)) + " · " + ui.esc(actor) + "</div>" +
        '<div class="timeline-what">' + ui.esc(h.action) + "</div>" +
        (h.note ? '<div class="timeline-note">' + ui.esc(h.note) + "</div>" : "") + "</div>";
    }).join("");

    var body = '' +
      '<div class="detail-code"><strong class="mono">' + ui.esc(r.code) + "</strong>" + ui.pill(r.status) + "</div>" +
      '<div class="dl">' +
        "<div><span>Kegiatan</span><span><strong>" + ui.esc(r.activity) + '</strong><br><span class="tiny muted">' + ui.esc(r.category) + " · " + r.participants + " peserta</span></span></div>" +
        "<div><span>Pemohon</span><span>" + ui.esc(owner ? owner.name : "—") + '<br><span class="tiny muted">' + ui.esc(owner ? owner.email + (owner.identity ? " · " + owner.identity : "") : "") + "</span></span></div>" +
        "<div><span>Ruang</span><span>" + ui.esc(room ? room.name + " · " + room.code : "—") + '<br><span class="tiny muted">' + ui.esc(room ? room.capacity + " orang · " + room.building : "") + "</span></span></div>" +
        "<div><span>Jadwal</span><span>" + ui.esc(ui.fmtDate(r.date, { weekday: true })) + "<br>" + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end) + " · " + ui.durationLabel(minutes) + "</span></div>" +
        (r.contact ? "<div><span>Kontak</span><span>" + ui.esc(r.contact) + "</span></div>" : "") +
        (r.note ? "<div><span>Catatan pemohon</span><span>" + ui.esc(r.note) + "</span></div>" : "") +
        (r.decisionNote ? "<div><span>Catatan keputusan</span><span>" + ui.esc(r.decisionNote) + "</span></div>" : "") +
      "</div>" + clashHtml +
      '<div style="margin-top:var(--space-m)"><p class="eyebrow is-muted" style="margin-bottom:var(--space-xs)">Jejak perubahan</p><div class="timeline">' + timeline + "</div></div>";

    var footer = '<button type="button" class="btn btn-ghost" data-close="1">Tutup</button>';
    if (pending) {
      footer += '<button type="button" class="btn btn-quiet" id="admin-reject">Tolak</button>' +
        '<button type="button" class="btn btn-primary" id="admin-approve">Setujui pengajuan</button>';
    } else if (r.status === "disetujui") {
      footer += '<button type="button" class="btn btn-danger" id="admin-cancel">Batalkan</button>';
    }

    ui.openModal({
      title: r.activity,
      subtitle: ui.fmtDate(r.date, { weekday: true }) + " · " + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end),
      body: body,
      footer: footer,
      wide: true,
      onMount: function (wrap) {
        var approve = wrap.querySelector("#admin-approve");
        var reject = wrap.querySelector("#admin-reject");
        var cancel = wrap.querySelector("#admin-cancel");
        if (approve) approve.addEventListener("click", function () { ui.closeModal(); approveFlow(id, user); });
        if (reject) reject.addEventListener("click", function () { ui.closeModal(); rejectFlow(id, user); });
        if (cancel) cancel.addEventListener("click", function () { ui.closeModal(); cancelFlow(id, user); });
      }
    });
  }

  function decide(id, status, user, note) {
    var result = store.setStatus(id, status, user, note);
    if (!result.ok) {
      ui.toast(result.error, "error", { sticky: true });
      return false;
    }
    ui.toast("Pengajuan " + result.reservation.code + " " + (status === "disetujui" ? "disetujui." : status === "ditolak" ? "ditolak." : "dibatalkan."), "success");
    IDB.app.render();
    return true;
  }

  function approveFlow(id, user) {
    var r = store.reservationById(id);
    if (!r) return;
    var room = store.roomById(r.roomId);
    var pendingClash = store.conflicts(r.roomId, r.date, r.start, r.end, r.id).filter(function (c) {
      return c.status === "disetujui";
    });
    if (pendingClash.length) {
      ui.toast("Tidak dapat disetujui: " + pendingClash[0].code + " sudah disetujui pada jam tersebut.", "error", { sticky: true });
      return;
    }
    var body = '' +
      "<p>Setujui <strong>" + ui.esc(r.code) + "</strong> untuk <strong>" + ui.esc(r.activity) + "</strong>?</p>" +
      '<div class="dl" style="margin-top:var(--space-s)">' +
        "<div><span>Ruang</span><span>" + ui.esc(room ? room.name + " · " + room.code : "") + "</span></div>" +
        "<div><span>Jadwal</span><span>" + ui.esc(ui.fmtDate(r.date, { weekday: true, short: true })) + ", " + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end) + "</span></div>" +
        "<div><span>Peserta</span><span>" + r.participants + " orang</span></div>" +
      "</div>" +
      '<div class="field" style="margin-top:var(--space-s)"><label for="approve-note">Catatan untuk pemohon (opsional)</label>' +
      '<textarea class="textarea" id="approve-note" rows="3" placeholder="Contoh: Ruang tersedia, harap menjaga kebersihan dan mengembalikan tata letak."></textarea></div>';

    ui.openModal({
      title: "Setujui pengajuan",
      subtitle: r.code,
      body: body,
      footer: '<button type="button" class="btn btn-ghost" data-close="1">Batal</button>' +
        '<button type="button" class="btn btn-primary" id="approve-go">Setujui pengajuan</button>',
      onMount: function (wrap) {
        wrap.querySelector("#approve-go").addEventListener("click", function () {
          var note = wrap.querySelector("#approve-note").value.trim() || "Disetujui sesuai ketersediaan ruang.";
          ui.closeModal();
          decide(id, "disetujui", user, note);
        });
      }
    });
  }

  function rejectFlow(id, user) {
    var r = store.reservationById(id);
    if (!r) return;
    ui.confirm({
      title: "Tolak " + r.code + "?",
      message: "Pemohon akan melihat alasan penolakan pada halaman Reservasi saya.",
      detail: "Penolakan tidak dapat dibatalkan. Jika pemohon ingin mengubah jadwal, mereka perlu mengirim pengajuan baru.",
      confirmLabel: "Tolak pengajuan",
      cancelLabel: "Kembali",
      danger: true,
      requireNote: true,
      noteLabel: "Alasan penolakan",
      noteHint: "Jelaskan alasan yang bisa dipahami pemohon, misalnya jadwal bentrok atau ruang dialihkan.",
      onConfirm: function (note) {
        decide(id, "ditolak", user, note);
      }
    });
  }

  function cancelFlow(id, user) {
    var r = store.reservationById(id);
    if (!r) return;
    ui.confirm({
      title: "Batalkan " + r.code + "?",
      message: "Reservasi yang sudah disetujui akan dibatalkan dan slot ruang dilepas.",
      confirmLabel: "Batalkan reservasi",
      cancelLabel: "Pertahankan",
      danger: true,
      requireNote: true,
      noteLabel: "Alasan pembatalan oleh admin",
      noteHint: "Alasan dicatat pada jejak perubahan dan terlihat oleh pemohon.",
      onConfirm: function (note) {
        decide(id, "dibatalkan", user, note);
      }
    });
  }

  /* ---------------- Kelola ruang ---------------- */
  function roomSection() {
    var rooms = store.rooms(true);
    var rows = rooms.map(function (room) {
      return "<tr>" +
        '<td><span class="cell-strong mono">' + ui.esc(room.code) + "</span></td>" +
        '<td><span class="cell-strong">' + ui.esc(room.name) + '</span><span class="cell-sub">' + ui.esc(room.building) + " · Lt. " + room.floor + "</span></td>" +
        '<td class="num">' + room.capacity + " orang</td>" +
        "<td>" + room.facilities.length + " fasilitas</td>" +
        "<td>" + (room.status === "aktif" ? '<span class="pill pill-disetujui">Aktif</span>' : '<span class="pill pill-dibatalkan">Nonaktif</span>') + "</td>" +
        '<td class="cell-actions"><button type="button" class="btn btn-ghost btn-sm" data-edit-room="' + ui.esc(room.id) + '">Ubah</button></td>' +
      "</tr>";
    }).join("");

    var cards = rooms.map(function (room) {
      return '<article class="record"><div class="record-top"><div><span class="record-code">' + ui.esc(room.code) + "</span><h3>" + ui.esc(room.name) + "</h3></div>" +
        (room.status === "aktif" ? '<span class="pill pill-disetujui">Aktif</span>' : '<span class="pill pill-dibatalkan">Nonaktif</span>') + "</div>" +
        '<div class="record-meta"><span>' + ui.esc(room.building) + " · Lt. " + room.floor + "</span><span>" + room.capacity + " orang</span><span>" + room.facilities.length + " fasilitas</span></div>" +
        '<div class="record-actions"><button type="button" class="btn btn-ghost btn-sm" data-edit-room="' + ui.esc(room.id) + '">Ubah data</button></div></article>';
    }).join("");

    return '<div class="wrap">' +
      '<div class="toolbar">' +
        '<div><p class="eyebrow is-muted" style="font-size:10px">Data ruang</p><p class="tiny muted" style="margin-top:4px">' + rooms.length + " ruang terdaftar · perubahan langsung tampil pada pencarian.</p></div>" +
        '<button type="button" class="btn btn-primary btn-sm" data-add-room>' + ui.icon("plus") + " Tambah ruang</button>" +
      "</div>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Kode</th><th>Ruang</th><th>Kapasitas</th><th>Fasilitas</th><th>Status</th><th class="cell-actions">Aksi</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<div class="record-list">' + cards + "</div>" +
      '<p class="tiny muted" style="margin-top:var(--space-s)">Menonaktifkan ruang akan menyembunyikannya dari daftar pengajuan, tetapi reservasi yang sudah ada tetap tersimpan.</p>' +
    "</div>";
  }

  function facilityPicker(selected) {
    return '<div class="chips" role="group" aria-label="Fasilitas ruang" id="room-facilities">' +
      IDB.facilitiesCatalog.map(function (f) {
        var on = selected.indexOf(f) !== -1;
        return '<button type="button" class="chip' + (on ? " is-on" : "") + '" data-facility="' + ui.esc(f) + '" aria-pressed="' + on + '">' + ui.esc(f) + "</button>";
      }).join("") + "</div>";
  }

  function roomForm(roomId, user) {
    var room = roomId ? store.roomById(roomId) : null;
    var editing = !!room;
    var selected = room ? room.facilities.slice() : [];
    var body = '' +
      '<form id="room-form" novalidate>' +
        '<div class="form-grid">' +
          '<div class="field" data-field="name"><label for="rm-name">Nama ruangan <span class="req">*</span></label><input class="input" id="rm-name" value="' + ui.esc(room ? room.name : "") + '" placeholder="Contoh: Studio Animasi"></div>' +
          '<div class="form-grid cols-2">' +
            '<div class="field"><label for="rm-code">Kode <span class="req">*</span></label><input class="input mono" id="rm-code" value="' + ui.esc(room ? room.code : "") + '" placeholder="D-01"></div>' +
            '<div class="field"><label for="rm-capacity">Kapasitas <span class="req">*</span></label><input class="input" id="rm-capacity" type="text" inputmode="numeric" value="' + (room ? room.capacity : "") + '" placeholder="30"></div>' +
          "</div>" +
          '<div class="form-grid cols-3">' +
            '<div class="field"><label for="rm-building">Gedung</label><input class="input" id="rm-building" value="' + ui.esc(room ? room.building : "Gedung A") + '"></div>' +
            '<div class="field"><label for="rm-floor">Lantai</label><input class="input" id="rm-floor" type="text" inputmode="numeric" value="' + (room ? room.floor : 1) + '"></div>' +
            '<div class="field"><label for="rm-status">Status</label><select class="select" id="rm-status"><option value="aktif"' + (room && room.status === "aktif" ? " selected" : "") + ">Aktif</option><option value=\"nonaktif\"" + (room && room.status === "nonaktif" ? " selected" : "") + ">Nonaktif</option></select></div>" +
          "</div>" +
          '<div class="field"><span class="field-label">Fasilitas</span>' + facilityPicker(selected) + "</div>" +
          '<div class="field"><label for="rm-note">Catatan ruang</label><textarea class="textarea" id="rm-note" rows="2">' + ui.esc(room ? room.note : "") + "</textarea></div>" +
          '<p class="field-error" id="room-error" style="display:none"></p>' +
        "</div>" +
      "</form>";

    ui.openModal({
      title: editing ? "Ubah data ruang" : "Tambah ruang",
      subtitle: editing ? room.code + " · " + room.name : "Ruang baru langsung tersedia pada daftar pengajuan.",
      body: body,
      footer: '<button type="button" class="btn btn-ghost" data-close="1">Batal</button>' +
        '<button type="button" class="btn btn-primary" id="room-save">' + (editing ? "Simpan perubahan" : "Tambah ruang") + "</button>",
      wide: true,
      onMount: function (wrap) {
        var chips = wrap.querySelector("#room-facilities");
        chips.addEventListener("click", function (e) {
          var btn = e.target.closest("[data-facility]");
          if (!btn) return;
          var on = btn.getAttribute("aria-pressed") === "true";
          btn.setAttribute("aria-pressed", String(!on));
          btn.classList.toggle("is-on", !on);
        });

        wrap.querySelector("#room-save").addEventListener("click", function () {
          var facilities = Array.prototype.map.call(chips.querySelectorAll('[aria-pressed="true"]'), function (b) {
            return b.getAttribute("data-facility");
          });
          var data = {
            name: wrap.querySelector("#rm-name").value,
            code: wrap.querySelector("#rm-code").value,
            capacity: wrap.querySelector("#rm-capacity").value,
            building: wrap.querySelector("#rm-building").value,
            floor: wrap.querySelector("#rm-floor").value,
            status: wrap.querySelector("#rm-status").value,
            facilities: facilities,
            note: wrap.querySelector("#rm-note").value
          };
          var result = editing ? store.updateRoom(room.id, data, user) : store.addRoom(data, user);
          var errorEl = wrap.querySelector("#room-error");
          if (!result.ok) {
            errorEl.textContent = result.error;
            errorEl.style.display = "block";
            return;
          }
          ui.closeModal();
          ui.toast(editing ? "Data ruang diperbarui." : "Ruang baru ditambahkan.", "success");
          IDB.app.render();
        });
      }
    });
  }
})();
