/* ==========================================================================
   views-operator.js — panel operator: pengaturan, data, jejak audit, pengguna
   ========================================================================== */
(function () {
  "use strict";

  var IDB = window.IDB;
  var ui = IDB.ui;
  var store = IDB.store;
  var views = IDB.views;

  views.operator = {
    render: function (ctx) {
      var params = ctx.params || {};
      var tab = ["jadwal", "pengaturan", "data", "log", "pengguna"].indexOf(params.tab) !== -1 ? params.tab : "jadwal";
      var s = store.settings();
      var audit = store.audit();
      var users = store.data().users;

      var head = '' +
        '<div class="wrap">' +
          '<div class="admin-head">' +
            '<div><p class="eyebrow">Operator layanan</p><h1>Operasional &amp; pemeliharaan</h1></div>' +
            '<div class="queue-stats">' +
              '<div class="queue-stat"><strong>' + ui.esc((store.storageBytes() / 1024).toFixed(0)) + " KB</strong><span>Data tersimpan</span></div>" +
              '<div class="queue-stat"><strong>' + audit.length + "</strong><span>Jejak perubahan</span></div>" +
              '<div class="queue-stat"><strong>' + users.length + "</strong><span>Akun demo</span></div>" +
            "</div>" +
          "</div>" +
          '<h2 class="sr-only">Jadwal ruang dan pemeliharaan sistem</h2>' +
          '<div class="tabs" role="tablist" aria-label="Bagian operator">' +
            tabLink("jadwal", "Jadwal ruang", tab) +
            tabLink("pengaturan", "Pengaturan reservasi", tab) +
            tabLink("data", "Data &amp; cadangan", tab) +
            tabLink("log", "Jejak audit", tab, audit.length) +
            tabLink("pengguna", "Pengguna &amp; peran", tab, users.length) +
          "</div>" +
        "</div>";

      var content = "";
      if (tab === "jadwal") content = scheduleSection(params);
      else if (tab === "pengaturan") content = settingsSection(s);
      else if (tab === "data") content = dataSection(s);
      else if (tab === "log") content = logSection(audit, (params.q || "").trim());
      else content = usersSection(users, s);

      return head + '<div class="wrap">' + content + "</div>";
    },

    mount: function (root, ctx) {
      var params = ctx.params || {};
      var tab = params.tab || "jadwal";

      if (tab === "jadwal") {
        var dayForm = root.querySelector("#schedule-form");
        if (dayForm) {
          dayForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var date = root.querySelector("#sched-date").value || ui.todayISO();
            var room = root.querySelector("#sched-room").value;
            var q = new URLSearchParams({ tab: "jadwal", tanggal: date });
            if (room) q.set("ruang", room);
            location.hash = "#/operator?" + q.toString();
          });
        }
        root.addEventListener("click", function (e) {
          var trigger = e.target.closest("[data-sched-detail]");
          if (!trigger) return;
          views.detailModal(trigger.getAttribute("data-sched-detail"), ctx.user, function () {
            ui.closeModal();
          });
        });
      }

      if (tab === "log") {
        var logForm = root.querySelector("#log-search");
        if (logForm) {
          logForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var value = root.querySelector("#log-q").value.trim();
            location.hash = "#/operator?tab=log" + (value ? "&q=" + encodeURIComponent(value) : "");
          });
        }
      }

      if (tab === "pengaturan") {
        var form = root.querySelector("#settings-form");
        if (form) {
          form.addEventListener("submit", function (e) {
            e.preventDefault();
            var open = form.querySelector("#set-open").value;
            var close = form.querySelector("#set-close").value;
            var minHours = Number(form.querySelector("#set-min").value);
            var maxHours = Number(form.querySelector("#set-max").value);
            var windowDays = Number(form.querySelector("#set-window").value);
            var cancelHours = Number(form.querySelector("#set-cancel").value);
            var autoApprove = form.querySelector("#set-auto").checked;
            var announcement = form.querySelector("#set-announcement").value;
            var err = root.querySelector("#settings-error");

            if (ui.toMinutes(close) <= ui.toMinutes(open)) {
              err.textContent = "Jam tutup harus lebih akhir daripada jam buka.";
              err.style.display = "block";
              return;
            }
            if (minHours < 1 || maxHours < minHours) {
              err.textContent = "Durasi maksimal harus lebih besar atau sama dengan durasi minimal.";
              err.style.display = "block";
              return;
            }
            if (windowDays < 1 || windowDays > 90) {
              err.textContent = "Batas pemesanan harus antara 1 dan 90 hari.";
              err.style.display = "block";
              return;
            }
            if (cancelHours < 0 || cancelHours > 168) {
              err.textContent = "Batas pembatalan harus antara 0 dan 168 jam.";
              err.style.display = "block";
              return;
            }
            err.style.display = "none";
            store.updateSettings({
              openHour: open, closeHour: close, minHours: minHours, maxHours: maxHours,
              windowDays: windowDays, cancelHours: cancelHours, autoApprove: autoApprove,
              announcement: announcement
            }, ctx.user);
            ui.toast("Pengaturan reservasi disimpan.", "success");
            IDB.app.render();
          });
        }
      }

      if (tab === "data") {
        var exportBtn = root.querySelector("#export-data");
        if (exportBtn) {
          exportBtn.addEventListener("click", function () {
            var blob = new Blob([store.exportJSON()], { type: "application/json" });
            var a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "idb-reservasi-" + ui.todayISO() + ".json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
            store.log(ctx.user.id, "Data diekspor", "Berkas JSON", "Cadangan manual", "export");
            ui.toast("Cadangan JSON diunduh.", "success");
          });
        }

        var fileInput = root.querySelector("#import-file");
        if (fileInput) {
          fileInput.addEventListener("change", function () {
            var file = fileInput.files && fileInput.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function () {
              try {
                store.importJSON(String(reader.result));
                var user = store.userById(ctx.user.id);
                if (!user) { location.hash = "#/login"; return; }
                store.log(user.id, "Data diimpor", file.name, "Pemulihan dari cadangan", "import");
                ui.toast("Data berhasil dipulihkan dari cadangan.", "success");
                IDB.app.render();
              } catch (err) {
                ui.toast("Berkas tidak dapat dibaca: " + err.message, "error", { sticky: true });
              }
            };
            reader.readAsText(file);
          });
        }

        var resetBtn = root.querySelector("#reset-demo");
        if (resetBtn) {
          resetBtn.addEventListener("click", function () {
            resetDialog(ctx.user);
          });
        }
      }
    }
  };

  function tabLink(key, label, active, count) {
    return '<a class="tab" role="tab" aria-selected="' + (active === key) + '" href="#/operator?tab=' + key + '">' + label +
      (typeof count === "number" ? '<span class="tab-count">' + count + "</span>" : "") + "</a>";
  }

  /* ---------------- Jadwal ruang ---------------- */
  function scheduleSection(params) {
    var today = ui.todayISO();
    var date = params.tanggal || today;
    var roomFilter = params.ruang || "";
    var s = store.settings();
    var allRooms = store.rooms(true);
    var rooms = roomFilter ? allRooms.filter(function (r) { return r.id === roomFilter; }) : allRooms;
    var dayAll = store.reservations().filter(function (r) { return r.date === date; });
    var active = dayAll.filter(function (r) { return r.status === "menunggu" || r.status === "disetujui"; });
    var pending = dayAll.filter(function (r) { return r.status === "menunggu"; }).length;
    var usedRoomIds = {};
    var totalMinutes = 0;
    active.forEach(function (r) {
      usedRoomIds[r.roomId] = true;
      totalMinutes += Math.max(0, ui.toMinutes(r.end) - ui.toMinutes(r.start));
    });
    var roomCount = Object.keys(usedRoomIds).length;

    var roomOptions = '<option value="">Semua ruang (' + allRooms.length + ")</option>" + allRooms.map(function (room) {
      return '<option value="' + ui.esc(room.id) + '"' + (room.id === roomFilter ? " selected" : "") + ">" +
        ui.esc(room.name + " · " + room.code) + (room.status === "nonaktif" ? " (nonaktif)" : "") + "</option>";
    }).join("");

    return '' +
      '<div class="wrap">' +
        '<div class="day-controls">' +
          '<form id="schedule-form" class="day-form">' +
            '<div class="field"><label for="sched-date">Tanggal</label>' +
              '<div class="date-nav">' +
                '<a class="btn btn-ghost btn-sm" href="#/operator?tab=jadwal&tanggal=' + ui.addDays(date, -1) + (roomFilter ? "&ruang=" + encodeURIComponent(roomFilter) : "") + '" aria-label="Hari sebelumnya">' + ui.icon("arrowRight", "icon-flip") + "</a>" +
                '<input class="input" type="date" id="sched-date" value="' + ui.esc(date) + '">' +
                '<a class="btn btn-ghost btn-sm" href="#/operator?tab=jadwal&tanggal=' + ui.addDays(date, 1) + (roomFilter ? "&ruang=" + encodeURIComponent(roomFilter) : "") + '" aria-label="Hari berikutnya">' + ui.icon("arrowRight") + "</a>" +
              "</div>" +
            "</div>" +
            '<div class="field"><label for="sched-room">Ruang</label><select class="select" id="sched-room">' + roomOptions + "</select></div>" +
            '<button class="btn btn-primary btn-sm" type="submit">Tampilkan</button>' +
            (date !== today ? '<a class="btn btn-quiet btn-sm" href="#/operator?tab=jadwal' + (roomFilter ? "&ruang=" + encodeURIComponent(roomFilter) : "") + '">Hari ini</a>' : "") +
          "</form>" +
          '<p class="day-title"><strong>' + ui.esc(ui.fmtDate(date, { weekday: true })) + "</strong><span>" +
            (date === today ? "Hari ini" : ui.daysFromToday(date) > 0 ? "Dalam " + ui.daysFromToday(date) + " hari" : ui.daysFromToday(date) * -1 + " hari lalu") +
          "</span></p>" +
        "</div>" +

        '<div class="day-stats">' +
          '<div><strong>' + roomCount + "</strong><span>Ruang terpakai</span></div>" +
          '<div><strong>' + active.length + "</strong><span>Agenda aktif</span></div>" +
          '<div><strong>' + pending + "</strong><span>Menunggu keputusan</span></div>" +
          '<div><strong>' + (totalMinutes ? ui.durationLabel(totalMinutes) : "—") + "</strong><span>Total durasi</span></div>" +
        "</div>" +

        '<div class="schedule-legend">' +
          '<span><span class="schedule-key is-disetujui"></span>Disetujui</span>' +
          '<span><span class="schedule-key is-menunggu"></span>Menunggu</span>' +
          '<span><span class="schedule-key"></span>Kosong</span>' +
          '<span class="tiny muted">' + ui.timeLabel(s.openHour) + "–" + ui.timeLabel(s.closeHour) + " · geser ke samping pada layar kecil</span>" +
        "</div>" +

        (rooms.length ? scheduleBoard(rooms, date, s) :
          '<div class="empty"><div class="empty-icon">' + ui.icon("grid") + "</div><h3>Ruang tidak ditemukan</h3><p>Filter ruang ini tidak cocok dengan data ruang yang ada.</p><div class=\"btn-group\"><a class=\"btn btn-ghost\" href=\"#/operator?tab=jadwal\">Tampilkan semua ruang</a></div></div>") +

        '<div class="toolbar" style="margin-top:var(--space-l)">' +
          '<div><p class="eyebrow is-muted" style="font-size:10px">Reservasi pada tanggal ini</p>' +
            '<p class="tiny muted" style="margin-top:4px">Operator dapat melihat detail dan riwayat. Keputusan status dilakukan admin reservasi.</p></div>' +
          '<span class="tiny muted">' + dayAll.length + " reservasi</span>" +
        "</div>" +

        (dayAll.length ? dayTable(dayAll) : dayEmpty(date)) +
      "</div>";
  }

  function scheduleBoard(rooms, date, s) {
    var open = ui.toMinutes(s.openHour);
    var close = ui.toMinutes(s.closeHour);
    var span = Math.max(60, close - open);
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var showNow = date === ui.todayISO() && nowMin >= open && nowMin <= close;
    var scale = [0, 0.2, 0.4, 0.6, 0.8, 1].map(function (ratio) {
      return "<span>" + ui.timeLabel(ui.toTime(open + span * ratio)) + "</span>";
    }).join("");

    var rows = rooms.map(function (room) {
      var bookings = store.bookingsFor(room.id, date);
      var rowLabel = "Jadwal " + room.name + " pada " + ui.fmtDateShort(date) + (bookings.length ? "" : " — kosong");
      var blocks = bookings.map(function (b) {
        var start = Math.max(open, ui.toMinutes(b.start));
        var end = Math.min(close, ui.toMinutes(b.end));
        if (end <= start) return "";
        var left = ((start - open) / span) * 100;
        var width = ((end - start) / span) * 100;
        return '<button type="button" class="schedule-block is-' + b.status + '" style="left:' + left.toFixed(3) + "%;width:" + width.toFixed(3) + '%" ' +
          'data-sched-detail="' + ui.esc(b.id) + '" title="' + ui.esc(b.code + " · " + b.activity + " · " + ui.timeLabel(b.start) + "–" + ui.timeLabel(b.end) + " · " + b.status) + '">' +
          "<b>" + ui.timeLabel(b.start) + "–" + ui.timeLabel(b.end) + "</b>" +
          "<span>" + ui.esc(b.activity) + "</span>" +
        "</button>";
      }).join("");

      return '<div class="schedule-row">' +
        '<div class="schedule-room">' +
          ui.plate(room, room.status === "nonaktif" ? "is-off" : "") +
          '<div class="schedule-room-text">' +
            "<strong>" + ui.esc(room.name) + "</strong>" +
            "<span>" + ui.esc(room.code) + " · " + room.capacity + " orang" + (room.status === "nonaktif" ? " · nonaktif" : "") + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="schedule-track" role="group" aria-label="' + ui.esc(rowLabel) + '">' +
          '<span class="schedule-grid" aria-hidden="true"></span>' +
          blocks +
          (showNow ? '<span class="schedule-now" style="left:' + (((nowMin - open) / span) * 100).toFixed(3) + '%" aria-hidden="true"></span>' : "") +
        "</div>" +
      "</div>";
    }).join("");

    return '' +
      '<div class="schedule-shell">' +
        '<div class="schedule-scroll">' +
          '<div class="schedule">' +
            '<div class="schedule-head">' +
              '<div class="schedule-head-room">Ruang</div>' +
              '<div class="schedule-head-track">' + scale + "</div>" +
            "</div>" +
            rows +
          "</div>" +
        "</div>" +
      "</div>";
  }

  function dayTable(list) {
    var rows = list.map(function (r) {
      var room = store.roomById(r.roomId);
      var owner = store.userById(r.userId);
      return "<tr>" +
        '<td><span class="cell-strong mono">' + ui.esc(r.code) + "</span></td>" +
        '<td><span class="cell-strong">' + ui.esc(r.activity) + '</span><span class="cell-sub">' + ui.esc(r.category) + "</span></td>" +
        "<td>" + ui.esc(room ? room.name : "—") + '<span class="cell-sub">' + ui.esc(room ? room.code : "") + "</span></td>" +
        '<td class="mono">' + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end) + "</td>" +
        '<td><span class="cell-strong">' + ui.esc(owner ? owner.name : "—") + '</span><span class="cell-sub">' + r.participants + " peserta</span></td>" +
        "<td>" + ui.pill(r.status) + "</td>" +
        '<td class="cell-actions"><button type="button" class="btn btn-ghost btn-sm" data-sched-detail="' + ui.esc(r.id) + '">Detail</button></td>' +
      "</tr>";
    }).join("");

    var cards = list.map(function (r) {
      var room = store.roomById(r.roomId);
      var owner = store.userById(r.userId);
      return '<article class="record">' +
        '<div class="record-top"><div><span class="record-code">' + ui.esc(r.code) + "</span><h3>" + ui.esc(r.activity) + "</h3></div>" + ui.pill(r.status) + "</div>" +
        '<div class="record-meta"><span>' + ui.esc(room ? room.name : "") + "</span><span>" + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end) + "</span><span>" + ui.esc(owner ? owner.name : "") + "</span></div>" +
        '<div class="record-actions"><button type="button" class="btn btn-ghost btn-sm" data-sched-detail="' + ui.esc(r.id) + '">Detail</button></div>' +
      "</article>";
    }).join("");

    return '<div class="table-wrap"><table class="table"><thead><tr>' +
      "<th>Kode</th><th>Kegiatan</th><th>Ruang</th><th>Waktu</th><th>Pemohon</th><th>Status</th><th class=\"cell-actions\">Aksi</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<div class="record-list">' + cards + "</div>";
  }

  function dayEmpty(date) {
    return '<div class="empty"><div class="empty-icon">' + ui.icon("calendar") + "</div>" +
      "<h3>Belum ada reservasi pada " + ui.esc(ui.fmtDateShort(date)) + "</h3>" +
      "<p>Seluruh ruang kosong sepanjang jam operasional pada tanggal ini. Jadwal akan tampil otomatis begitu ada pengajuan.</p></div>";
  }

  /* ---------------- Pengaturan ---------------- */
  function settingsSection(s) {
    var hourOptions = function (selected) {
      var out = "";
      for (var t = 5 * 60; t <= 24 * 60; t += 30) {
        var v = ui.toTime(t);
        out += '<option value="' + v + '"' + (v === selected ? " selected" : "") + ">" + ui.timeLabel(v) + "</option>";
      }
      return out;
    };

    return '' +
      '<div class="split split-settings" style="margin-top:var(--space-m)">' +
        '<form class="panel" id="settings-form" novalidate style="display:grid;gap:var(--space-m)">' +
          '<div class="panel-head"><div><p class="eyebrow">Aturan operasional</p><h3>Pengaturan reservasi</h3></div><span class="badge">Berlaku global</span></div>' +
          '<div class="form-grid cols-2">' +
            '<div class="field"><label for="set-open">Jam buka</label><select class="select" id="set-open">' + hourOptions(s.openHour) + "</select></div>" +
            '<div class="field"><label for="set-close">Jam tutup</label><select class="select" id="set-close">' + hourOptions(s.closeHour) + "</select></div>" +
            '<div class="field"><label for="set-min">Durasi minimal (jam)</label><select class="select" id="set-min">' +
              [1, 2, 3, 4].map(function (n) { return '<option value="' + n + '"' + (s.minHours === n ? " selected" : "") + ">" + n + " jam</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label for="set-max">Durasi maksimal (jam)</label><select class="select" id="set-max">' +
              [1, 2, 3, 4, 5, 6, 8].map(function (n) { return '<option value="' + n + '"' + (s.maxHours === n ? " selected" : "") + ">" + n + " jam</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label for="set-window">Batas pemesanan ke depan</label><input class="input" id="set-window" type="text" inputmode="numeric" value="' + s.windowDays + '"><p class="field-hint">1–90 hari.</p></div>' +
            '<div class="field"><label for="set-cancel">Batas pembatalan mandiri (jam)</label><input class="input" id="set-cancel" type="text" inputmode="numeric" value="' + s.cancelHours + '"><p class="field-hint">0–168 jam sebelum kegiatan.</p></div>' +
          "</div>" +
          '<label class="check"><input type="checkbox" id="set-auto"' + (s.autoApprove ? " checked" : "") + "><span><strong>Setujui otomatis</strong><br><span class=\"tiny muted\">Jika aktif, pengajuan tanpa bentrok langsung berstatus Disetujui. PRD menyarankan keputusan admin, jadi gunakan dengan hati-hati.</span></span></label>" +
          '<div class="field"><label for="set-announcement">Pengumuman singkat</label><textarea class="textarea" id="set-announcement" rows="2" maxlength="160">' + ui.esc(s.announcement) + "</textarea><p class=\"field-hint\">Tampil pada beranda pengguna.</p></div>" +
          '<p class="field-error" id="settings-error" style="display:none"></p>' +
          '<div class="form-actions"><button class="btn btn-primary" type="submit">Simpan pengaturan</button></div>' +
        "</form>" +

        '<div class="panel" style="display:grid;gap:var(--space-s);align-content:start">' +
          '<p class="eyebrow">Dampak perubahan</p>' +
          '<div class="dl">' +
            "<div><span>Jam operasional</span><span>" + ui.timeLabel(s.openHour) + "–" + ui.timeLabel(s.closeHour) + "</span></div>" +
            "<div><span>Durasi</span><span>" + s.minHours + "–" + s.maxHours + " jam</span></div>" +
            "<div><span>Pemesanan</span><span>" + s.windowDays + " hari ke depan</span></div>" +
            "<div><span>Pembatalan</span><span>H-" + s.cancelHours + " jam</span></div>" +
            "<div><span>Persetujuan</span><span>" + (s.autoApprove ? "Otomatis" : "Manual oleh admin") + "</span></div>" +
          "</div>" +
          '<div class="notice notice-warn">' + ui.icon("alert") + "<div><strong>Perubahan tidak mengubah reservasi lama.</strong><span>Validasi baru hanya berlaku untuk pengajuan berikutnya.</span></div></div>" +
          '<div class="dl" style="margin-top:var(--space-2xs)">' +
            "<div><span>Versi data</span><span>v" + IDB.DB_VERSION + "</span></div>" +
            "<div><span>Mode</span><span>Prototipe lokal</span></div>" +
            "<div><span>Penyimpanan</span><span>localStorage peramban</span></div>" +
            "<div><span>Sesi</span><span>8 jam, berakhir otomatis</span></div>" +
          "</div>" +
        "</div>" +
      "</div>";
  }

  /* ---------------- Data ---------------- */
  function dataSection(s) {
    var size = store.storageBytes();
    var last = store.audit()[0];
    return '' +
      '<div class="settings-grid" style="margin-top:var(--space-m)">' +
        '<div class="panel" style="display:grid;gap:var(--space-s);align-content:start">' +
          '<div class="panel-head"><div><p class="eyebrow">Cadangan</p><h3>Ekspor &amp; impor</h3></div>' + ui.icon("database") + "</div>" +
          '<p class="tiny muted">Seluruh data prototipe (ruang, pengguna, reservasi, pengaturan, jejak audit) tersimpan di peramban ini. Ekspor berkala untuk menjaga cadangan.</p>' +
          '<div class="dl">' +
            "<div><span>Ukuran data</span><span>" + (size / 1024).toFixed(1) + " KB</span></div>" +
            "<div><span>Total reservasi</span><span>" + store.reservations().length + "</span></div>" +
            "<div><span>Terakhir diubah</span><span>" + ui.esc(last ? ui.fmtDateTime(last.at) : "—") + "</span></div>" +
          "</div>" +
          '<div class="btn-group">' +
            '<button class="btn btn-primary" type="button" id="export-data">' + ui.icon("download") + " Ekspor JSON</button>" +
            '<label class="btn btn-ghost" for="import-file" style="cursor:pointer">' + ui.icon("upload") + " Impor JSON</label>" +
            '<input class="sr-only" type="file" id="import-file" accept="application/json,.json">' +
          "</div>" +
          '<p class="tiny muted">Impor akan mengganti seluruh data saat ini. Pastikan berkas berasal dari sistem ini.</p>' +
        "</div>" +

        '<div class="danger-zone" style="align-content:start">' +
          "<h3>Zona berbahaya</h3>" +
          '<p class="tiny">Mengatur ulang akan menghapus semua reservasi dan perubahan yang dibuat, lalu memuat kembali data demo awal. Tindakan ini tidak dapat dibatalkan.</p>' +
          '<div class="dl" style="background:var(--surface);padding:0 var(--space-s)">' +
            "<div><span>Data dihapus</span><span>" + store.reservations().length + " reservasi · " + store.audit().length + " entri log</span></div>" +
            "<div><span>Akun</span><span>6 akun demo dipulihkan</span></div>" +
          "</div>" +
          '<div><button class="btn btn-danger" type="button" id="reset-demo">' + ui.icon("refresh") + " Reset ke data demo</button></div>" +
        "</div>" +
      "</div>" +

      '<div class="panel" style="margin-top:var(--space-m);display:grid;gap:var(--space-s)">' +
        '<div class="panel-head"><div><p class="eyebrow">Catatan teknis</p><h3>Batas prototipe</h3></div><span class="badge">Demo lokal</span></div>' +
        '<div class="dl">' +
          "<div><span>Penyimpanan</span><span>localStorage peramban. Data tidak dibagi antar perangkat dan hilang jika data situs dibersihkan.</span></div>" +
          "<div><span>Autentikasi</span><span>Kata sandi demo disimpan apa adanya untuk kemudahan uji. Produksi wajib memakai server, hash kata sandi, dan sesi aman.</span></div>" +
          "<div><span>Validasi</span><span>Pemeriksaan bentrok berjalan di sisi klien. Produksi perlu pemeriksaan ulang di server agar tidak dapat dilewati.</span></div>" +
          "<div><span>Retensi</span><span>Belum ditetapkan. PRD menandai kebijakan retensi dan pemulihan sebagai keputusan lanjutan.</span></div>" +
        "</div>" +
      "</div>";
  }

  /* ---------------- Log ---------------- */
  function logSection(audit, query) {
    var q = (query || "").toLowerCase();
    var filtered = q ? audit.filter(function (entry) {
      var actor = entry.actorId === "system" ? "Sistem" : (store.userById(entry.actorId) ? store.userById(entry.actorId).name : entry.actorId);
      return [actor, entry.action, entry.target, entry.detail].join(" ").toLowerCase().indexOf(q) !== -1;
    }) : audit;

    var rows = filtered.slice(0, 60).map(function (entry) {
      var actor = entry.actorId === "system" ? "Sistem" : (store.userById(entry.actorId) ? store.userById(entry.actorId).name : entry.actorId);
      return "<tr>" +
        '<td class="mono">' + ui.esc(ui.fmtDateTime(entry.at)) + "</td>" +
        '<td><span class="cell-strong">' + ui.esc(actor) + "</span></td>" +
        "<td>" + ui.esc(entry.action) + "</td>" +
        '<td class="mono">' + ui.esc(entry.target) + "</td>" +
        '<td class="tiny muted">' + ui.esc(entry.detail) + "</td>" +
      "</tr>";
    }).join("");

    var cards = filtered.slice(0, 60).map(function (entry) {
      var actor = entry.actorId === "system" ? "Sistem" : (store.userById(entry.actorId) ? store.userById(entry.actorId).name : entry.actorId);
      return '<article class="record"><div class="record-top"><div><span class="record-code">' + ui.esc(ui.fmtDateTime(entry.at)) + "</span><h3>" + ui.esc(entry.action) + "</h3></div>" +
        (entry.target ? '<span class="badge">' + ui.esc(entry.target) + "</span>" : "") + "</div>" +
        '<div class="record-meta"><span>' + ui.esc(actor) + "</span></div>" +
        (entry.detail ? '<p class="tiny muted">' + ui.esc(entry.detail) + "</p>" : "") + "</article>";
    }).join("");

    return '' +
      '<div class="toolbar">' +
        '<div><p class="eyebrow is-muted" style="font-size:10px">Jejak audit</p><p class="tiny muted" style="margin-top:4px">' +
          (q ? filtered.length + ' entri cocok dengan "' + ui.esc(query) + '"' : "Menampilkan 60 perubahan terakhir dari total " + audit.length + " entri") +
        ".</p></div>" +
        '<form class="search-inline" id="log-search" role="search" style="min-width:260px">' +
          '<label class="sr-only" for="log-q">Cari jejak audit</label>' +
          ui.icon("search") +
          '<input class="input" type="search" id="log-q" name="q" placeholder="Cari kode, pelaku, atau tindakan" value="' + ui.esc(query || "") + '">' +
        "</form>" +
      "</div>" +
      (filtered.length ?
        '<div class="table-wrap"><table class="table"><thead><tr><th>Waktu</th><th>Pelaku</th><th>Tindakan</th><th>Objek</th><th>Keterangan</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
        '<div class="record-list">' + cards + "</div>" :
        '<div class="empty"><div class="empty-icon">' + ui.icon("search") + "</div><h3>" + (q ? "Tidak ada entri yang cocok" : "Belum ada jejak") + "</h3>" +
          "<p>" + (q ? "Coba kata kunci lain seperti kode reservasi, nama pelaku, atau tindakan." : "Setiap perubahan status pengajuan, data ruang, atau pengaturan akan tercatat di sini.") + "</p>" +
          (q ? '<div class="btn-group"><a class="btn btn-ghost" href="#/operator?tab=log">Hapus pencarian</a></div>' : "") +
        "</div>");
  }

  /* ---------------- Pengguna ---------------- */
  function usersSection(users, s) {
    var rows = users.map(function (u) {
      return "<tr>" +
        '<td><span class="cell-strong">' + ui.esc(u.name) + '</span><span class="cell-sub mono">' + ui.esc(u.email) + "</span></td>" +
        "<td><span class=\"pill pill-role\">" + ui.esc(ui.roleLabel(u.role)) + "</span></td>" +
        '<td class="tiny muted">' + ui.esc(u.identity || "—") + "</td>" +
        '<td class="tiny muted">' + ui.esc(u.program || "—") + "</td>" +
      "</tr>";
    }).join("");

    var cards = users.map(function (u) {
      return '<article class="record"><div class="record-top"><div><span class="record-code">' + ui.esc(u.email) + "</span><h3>" + ui.esc(u.name) + "</h3></div>" +
        '<span class="pill pill-role">' + ui.esc(ui.roleLabel(u.role)) + "</span></div>" +
        '<div class="record-meta"><span>' + ui.esc(u.identity || "—") + "</span><span>" + ui.esc(u.program || "—") + "</span></div></article>";
    }).join("");

    return '' +
      '<div class="toolbar"><div><p class="eyebrow is-muted" style="font-size:10px">Akun demo</p><p class="tiny muted" style="margin-top:4px">Peran menentukan menu dan data yang dapat diakses.</p></div></div>' +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Nama / email</th><th>Peran</th><th>Identitas</th><th>Program / unit</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      '<div class="record-list">' + cards + "</div>" +
      '<div class="notice notice-info" style="margin-top:var(--space-m)">' + ui.icon("shield") +
        "<div><strong>Pengelolaan akun belum termasuk rilis inti.</strong><span>PRD menandai metode login kampus dan penanggung jawab data sebagai keputusan lanjutan. Prototipe ini memakai akun demo dengan kata sandi yang sama.</span></div>" +
      "</div>" +
      '<div class="panel" style="margin-top:var(--space-m)"><div class="panel-head"><div><p class="eyebrow">Kebijakan aktif</p><h3>Ringkasan aturan</h3></div></div>' +
        '<div class="dl">' +
          "<div><span>Persetujuan</span><span>" + (s.autoApprove ? "Otomatis untuk jadwal kosong" : "Manual oleh admin reservasi") + "</span></div>" +
          "<div><span>Pembatalan mandiri</span><span>H-" + s.cancelHours + " sebelum kegiatan</span></div>" +
          "<div><span>Durasi</span><span>" + s.minHours + "–" + s.maxHours + " jam</span></div>" +
          "<div><span>Pemesanan</span><span>" + s.windowDays + " hari ke depan</span></div>" +
        "</div>" +
      "</div>";
  }

  /* ---------------- Reset ---------------- */
  function resetDialog(user) {
    ui.openModal({
      title: "Reset ke data demo?",
      subtitle: "Semua perubahan akan hilang.",
      body: '<p>Ketik <span class="kbd">RESET</span> untuk mengonfirmasi. Tindakan ini menghapus reservasi, perubahan ruang, pengaturan, dan jejak audit yang dibuat selama uji coba.</p>' +
        '<div class="field" style="margin-top:var(--space-s)"><label for="reset-confirm">Konfirmasi</label><input class="input mono" id="reset-confirm" autocomplete="off" data-autofocus placeholder="RESET"></div>',
      footer: '<button type="button" class="btn btn-ghost" data-close="1">Batal</button>' +
        '<button type="button" class="btn btn-danger" id="reset-go" disabled>Reset data</button>',
      onMount: function (wrap) {
        var input = wrap.querySelector("#reset-confirm");
        var go = wrap.querySelector("#reset-go");
        input.addEventListener("input", function () {
          go.disabled = input.value.trim().toUpperCase() !== "RESET";
        });
        go.addEventListener("click", function () {
          store.reset();
          ui.closeModal();
          ui.toast("Data demo dipulihkan. Silakan masuk kembali.", "success");
          location.hash = "#/login";
        });
      }
    });
  }
})();
