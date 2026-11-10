/* ==========================================================================
   views-reserve.js — formulir pengajuan, reservasi saya, halaman sukses
   ========================================================================== */
(function () {
  "use strict";

  var IDB = window.IDB;
  var ui = IDB.ui;
  var store = IDB.store;
  var views = IDB.views;

  var CATEGORIES = ["Akademik", "Organisasi", "Seminar", "Lomba", "Lainnya"];

  function errText(errors, key) { return errors[key] || ""; }

  function setError(root, key, message) {
    var wrap = root.querySelector('[data-field="' + key + '"]');
    if (!wrap) return;
    if (message) {
      wrap.setAttribute("data-invalid", "true");
      var p = wrap.querySelector(".field-error");
      if (p) p.textContent = message;
    } else {
      wrap.removeAttribute("data-invalid");
    }
  }

  /* ======================= Formulir baru ======================= */
  views.newReservation = {
    render: function (ctx) {
      var p = ctx.params || {};
      var s = store.settings();
      var today = ui.todayISO();
      var rooms = store.rooms();
      var selectedRoom = p.ruang && store.roomById(p.ruang) ? store.roomById(p.ruang) : rooms[0];
      var date = p.tanggal || today;
      var start = p.mulai || "";
      var end = p.selesai || "";
      var peserta = p.peserta || "";

      return '' +
        '<div class="wrap">' +
          '<div class="page-head">' +
            '<p class="eyebrow">Pengajuan baru</p>' +
            '<div class="row-between" style="align-items:flex-end">' +
              "<h1>Ajukan reservasi ruang</h1>" +
              '<p class="section-note" style="max-width:40ch">' + (s.autoApprove
                ? "Pengajuan akan otomatis <strong>Disetujui</strong> bila jadwal kosong, sesuai pengaturan kampus."
                : "Pengajuan akan berstatus <strong>Menunggu</strong> sampai admin reservasi memutuskan.") + "</p>" +
            "</div>" +
          "</div>" +
          '<h2 class="sr-only">Formulir pengajuan reservasi</h2>' +

          '<div id="form-alert" class="notice notice-bad" role="alert" hidden style="margin-bottom:var(--space-m)">' +
            ui.icon("alert") + "<div><strong>Ada isian yang perlu diperbaiki.</strong><span id=\"form-alert-text\"></span></div>" +
          "</div>" +

          '<form id="reservation-form" novalidate>' +
            '<div class="split split-form" style="align-items:start">' +
              '<div class="panel" style="display:grid;gap:var(--space-m)">' +
                '<div>' +
                  '<div class="panel-head"><h3>Detail kegiatan</h3><span class="badge">1 dari 2</span></div>' +
                  '<div class="form-grid">' +
                    '<div class="field" data-field="activity">' +
                      '<label for="r-activity">Nama kegiatan <span class="req" aria-hidden="true">*</span></label>' +
                      '<input class="input" id="r-activity" name="activity" maxlength="90" autocomplete="off" placeholder="Contoh: Rapat Himpunan Mahasiswa DKV" value="' + ui.esc(p.activity || "") + '">' +
                      '<p class="field-hint">Tuliskan nama yang dikenali peserta, 4–90 karakter.</p>' +
                      '<p class="field-error" id="err-activity"></p>' +
                    "</div>" +
                    '<div class="field" data-field="category">' +
                      '<label for="r-category">Jenis kegiatan <span class="req" aria-hidden="true">*</span></label>' +
                      '<select class="select" id="r-category" name="category">' +
                        '<option value="">Pilih jenis kegiatan</option>' +
                        CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("") +
                      "</select>" +
                      '<p class="field-error" id="err-category"></p>' +
                    "</div>" +
                    '<div class="form-grid cols-2">' +
                      '<div class="field" data-field="participants">' +
                        '<label for="r-participants">Jumlah peserta <span class="req" aria-hidden="true">*</span></label>' +
                        '<input class="input" id="r-participants" name="participants" type="text" inputmode="numeric" autocomplete="off" placeholder="Contoh: 30" value="' + ui.esc(peserta) + '">' +
                        '<p class="field-hint" id="capacity-hint">Sesuaikan dengan kapasitas ruang.</p>' +
                        '<p class="field-error" id="err-participants"></p>' +
                      "</div>" +
                      '<div class="field" data-field="contact">' +
                        '<label for="r-contact">Kontak pemohon</label>' +
                        '<input class="input" id="r-contact" name="contact" type="tel" inputmode="tel" autocomplete="tel" placeholder="0812-3456-7890" value="' + ui.esc(ctx.user.phone || "") + '">' +
                        '<p class="field-hint">Opsional, dipakai admin bila perlu konfirmasi.</p>' +
                        '<p class="field-error" id="err-contact"></p>' +
                      "</div>" +
                    "</div>" +
                    '<div class="field" data-field="note">' +
                      '<label for="r-note">Catatan tambahan</label>' +
                      '<textarea class="textarea" id="r-note" name="note" maxlength="300" placeholder="Kebutuhan khusus, peralatan tambahan, atau susunan acara singkat."></textarea>' +
                      '<p class="field-hint"><span id="note-count">0</span>/300 karakter</p>' +
                      '<p class="field-error" id="err-note"></p>' +
                    "</div>" +
                  "</div>" +
                "</div>" +

                '<div>' +
                  '<div class="panel-head"><h3>Ruang dan waktu</h3><span class="badge">2 dari 2</span></div>' +
                  '<div class="form-grid">' +
                    '<div class="field" data-field="roomId">' +
                      '<label for="r-room">Ruangan <span class="req" aria-hidden="true">*</span></label>' +
                      '<select class="select" id="r-room" name="roomId">' +
                        rooms.map(function (room) {
                          return '<option value="' + ui.esc(room.id) + '"' + (selectedRoom && selectedRoom.id === room.id ? " selected" : "") + ">" +
                            ui.esc(room.name + " · " + room.code + " · " + room.capacity + " orang") + "</option>";
                        }).join("") +
                      "</select>" +
                      '<p class="field-error" id="err-roomId"></p>' +
                    "</div>" +
                    '<div class="form-grid cols-3">' +
                      '<div class="field" data-field="date">' +
                        '<label for="r-date">Tanggal <span class="req" aria-hidden="true">*</span></label>' +
                        '<input class="input" id="r-date" name="date" type="date" value="' + ui.esc(date) + '" min="' + today + '" max="' + ui.addDays(today, s.windowDays) + '">' +
                        '<p class="field-error" id="err-date"></p>' +
                      "</div>" +
                      '<div class="field" data-field="start">' +
                        '<label for="r-start">Waktu mulai <span class="req" aria-hidden="true">*</span></label>' +
                        '<select class="select" id="r-start" name="start">' + views.timeOptions(start, s, { allowEmpty: true, placeholder: "Pilih" }) + "</select>" +
                        '<p class="field-error" id="err-start"></p>' +
                      "</div>" +
                      '<div class="field" data-field="end">' +
                        '<label for="r-end">Waktu selesai <span class="req" aria-hidden="true">*</span></label>' +
                        '<select class="select" id="r-end" name="end">' + views.timeOptions(end, s, { allowEmpty: true, placeholder: "Pilih" }) + "</select>" +
                        '<p class="field-error" id="err-end"></p>' +
                      "</div>" +
                    "</div>" +
                    '<div class="notice notice-info" id="availability-note" role="status">' +
                      ui.icon("calendar") + "<div><strong>Periksa ketersediaan</strong><span id=\"availability-text\">Lengkapi ruang, tanggal, dan waktu untuk memeriksa bentrok jadwal.</span></div>" +
                    "</div>" +
                    '<div id="day-bookings" class="tiny muted"></div>' +
                  "</div>" +
                "</div>" +
              "</div>" +

              '<aside class="summary-card" aria-label="Ringkasan pengajuan">' +
                '<p class="eyebrow" style="font-size:10px">Ringkasan</p>' +
                '<div class="summary-room">' +
                  ui.plate(selectedRoom) +
                  '<div style="min-width:0">' +
                    '<h3 style="font-size:15px" id="sum-room-name">' + ui.esc(selectedRoom ? selectedRoom.name : "—") + "</h3>" +
                    '<p class="tiny muted" id="sum-room-meta">' + ui.esc(selectedRoom ? selectedRoom.code + " · " + selectedRoom.building + " · " + selectedRoom.capacity + " orang" : "") + "</p>" +
                  "</div>" +
                "</div>" +
                '<div class="summary-rows">' +
                  '<div class="summary-row"><span>Kegiatan</span><span id="sum-activity">—</span></div>' +
                  '<div class="summary-row"><span>Tanggal</span><span id="sum-date">' + ui.esc(ui.fmtDate(date, { short: true })) + "</span></div>" +
                  '<div class="summary-row"><span>Waktu</span><span id="sum-time">—</span></div>' +
                  '<div class="summary-row"><span>Durasi</span><span id="sum-duration">—</span></div>' +
                  '<div class="summary-row"><span>Peserta</span><span id="sum-participants">—</span></div>' +
                "</div>" +
                '<div id="sum-status" class="pill pill-menunggu" style="justify-self:start">Menunggu pemeriksaan jadwal</div>' +
                '<div class="summary-total"><span>Status setelah dikirim</span><span>' + (s.autoApprove ? "Disetujui otomatis" : "Menunggu") + "</span></div>" +
                '<button class="btn btn-accent btn-block" type="submit" id="submit-reservation">Kirim pengajuan ' + ui.icon("arrowRight") + "</button>" +
                '<p class="tiny muted">Dengan mengirim, Anda menyatakan data yang diisi benar. Pengajuan dapat dibatalkan sesuai kebijakan.</p>' +
              "</aside>" +
            "</div>" +
          "</form>" +
        "</div>";
    },

    mount: function (root, ctx) {
      var form = root.querySelector("#reservation-form");
      var s = store.settings();
      var el = {
        activity: root.querySelector("#r-activity"),
        category: root.querySelector("#r-category"),
        participants: root.querySelector("#r-participants"),
        contact: root.querySelector("#r-contact"),
        note: root.querySelector("#r-note"),
        room: root.querySelector("#r-room"),
        date: root.querySelector("#r-date"),
        start: root.querySelector("#r-start"),
        end: root.querySelector("#r-end")
      };
      var alertBox = root.querySelector("#form-alert");
      var alertText = root.querySelector("#form-alert-text");
      var availNote = root.querySelector("#availability-note");
      var availText = root.querySelector("#availability-text");
      var dayBookings = root.querySelector("#day-bookings");
      var sum = {
        roomName: root.querySelector("#sum-room-name"),
        roomMeta: root.querySelector("#sum-room-meta"),
        activity: root.querySelector("#sum-activity"),
        date: root.querySelector("#sum-date"),
        time: root.querySelector("#sum-time"),
        duration: root.querySelector("#sum-duration"),
        participants: root.querySelector("#sum-participants"),
        status: root.querySelector("#sum-status")
      };
      var capacityHint = root.querySelector("#capacity-hint");
      var noteCount = root.querySelector("#note-count");
      var submitBtn = root.querySelector("#submit-reservation");
      var submitted = false;

      function payload() {
        return {
          activity: el.activity.value,
          category: el.category.value,
          participants: el.participants.value,
          contact: el.contact.value,
          note: el.note.value,
          roomId: el.room.value,
          date: el.date.value,
          start: el.start.value,
          end: el.end.value
        };
      }

      function room() { return store.roomById(el.room.value); }

      function updateTimeOptions() {
        var min = el.start.value ? ui.toMinutes(el.start.value) + s.minHours * 60 : 0;
        var max = el.start.value ? ui.toMinutes(el.start.value) + s.maxHours * 60 : 0;
        Array.prototype.forEach.call(el.end.options, function (opt) {
          if (!opt.value) return;
          var v = ui.toMinutes(opt.value);
          opt.disabled = el.start.value ? (v < min || v > max) : false;
        });
        if (el.end.value && el.end.selectedOptions[0] && el.end.selectedOptions[0].disabled) {
          el.end.value = "";
        }
      }

      function refresh(opts) {
        opts = opts || {};
        var data = payload();
        var r = room();

        if (r) {
          capacityHint.textContent = "Maksimal " + r.capacity + " orang untuk " + r.name + ".";
          sum.roomName.textContent = r.name;
          sum.roomMeta.textContent = r.code + " · " + r.building + " · " + r.capacity + " orang";
        }
        sum.activity.textContent = data.activity.trim() ? data.activity.trim().slice(0, 40) + (data.activity.length > 40 ? "…" : "") : "—";
        sum.date.textContent = data.date ? ui.fmtDate(data.date, { short: true }) : "—";
        sum.time.textContent = data.start && data.end ? ui.timeLabel(data.start) + "–" + ui.timeLabel(data.end) : "—";
        sum.participants.textContent = data.participants ? data.participants + " orang" : "—";

        var minutes = data.start && data.end ? ui.toMinutes(data.end) - ui.toMinutes(data.start) : 0;
        sum.duration.textContent = minutes > 0 ? ui.durationLabel(minutes) : "—";

        updateTimeOptions();

        if (r && data.date) {
          var bookings = store.bookingsFor(r.id, data.date);
          dayBookings.innerHTML = bookings.length
            ? "Agenda lain pada tanggal ini: " + bookings.map(function (b) {
                return ui.timeLabel(b.start) + "–" + ui.timeLabel(b.end) + " (" + ui.esc(b.activity) + ")";
              }).join(" · ")
            : "Belum ada agenda lain di " + ui.esc(r.name) + " pada tanggal ini.";
        } else {
          dayBookings.textContent = "";
        }

        if (!r || !data.date || !data.start || !data.end) {
          availNote.className = "notice notice-info";
          availText.textContent = "Lengkapi ruang, tanggal, dan waktu untuk memeriksa bentrok jadwal.";
          sum.status.className = "pill pill-menunggu";
          sum.status.textContent = "Menunggu pemeriksaan jadwal";
          return;
        }

        if (ui.toMinutes(data.end) <= ui.toMinutes(data.start)) {
          availNote.className = "notice notice-warn";
          availText.textContent = "Waktu selesai harus lebih akhir daripada waktu mulai.";
          sum.status.className = "pill pill-menunggu";
          sum.status.textContent = "Waktu belum valid";
          return;
        }

        var clashes = store.conflicts(r.id, data.date, data.start, data.end);
        if (clashes.length) {
          availNote.className = "notice notice-bad";
          availText.textContent = "Bentrok dengan " + clashes[0].code + " (" + ui.timeLabel(clashes[0].start) + "–" + ui.timeLabel(clashes[0].end) + "). Pilih waktu atau ruang lain.";
          sum.status.className = "pill pill-ditolak";
          sum.status.textContent = "Jadwal bentrok";
        } else {
          availNote.className = "notice notice-ok";
          availText.textContent = "Ruang tersedia pada " + ui.fmtDate(data.date, { weekday: true, short: true }) + ", " + ui.timeLabel(data.start) + "–" + ui.timeLabel(data.end) + ".";
          sum.status.className = "pill pill-disetujui";
          sum.status.textContent = "Ruang tersedia";
        }
      }

      var refreshDebounced = ui.debounce(refresh, 150);

      el.room.addEventListener("change", function () { setError(root, "roomId", ""); refresh(); });
      el.date.addEventListener("change", function () { setError(root, "date", ""); refresh(); });
      el.start.addEventListener("change", function () { setError(root, "start", ""); setError(root, "end", ""); refresh(); });
      el.end.addEventListener("change", function () { setError(root, "end", ""); refresh(); });

      [el.activity, el.category, el.participants, el.contact].forEach(function (input) {
        input.addEventListener("input", function () {
          setError(root, input.name, "");
          refreshDebounced();
        });
        input.addEventListener("change", function () {
          setError(root, input.name, "");
          refresh();
        });
        input.addEventListener("blur", function () {
          if (input.value.trim()) validateField(input.name);
          refresh();
        });
      });

      el.note.addEventListener("input", function () {
        noteCount.textContent = String(el.note.value.length);
        setError(root, "note", "");
      });

      function validateField(name) {
        var data = payload();
        var errors = store.validate(data).errors;
        var map = { activity: "activity", category: "category", participants: "participants", contact: "contact", note: "note", roomId: "roomId", date: "date", start: "start", end: "end" };
        if (map[name]) setError(root, name, errors[map[name]] || "");
      }

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (submitted) return;
        var data = payload();
        var result = store.validate(data);
        ["activity", "category", "participants", "contact", "note", "roomId", "date", "start", "end"].forEach(function (key) {
          setError(root, key, result.errors[key] || "");
        });

        if (!result.ok) {
          var keys = Object.keys(result.errors);
          alertBox.hidden = false;
          alertText.textContent = " " + keys.map(function (k) {
            return result.errors[k];
          }).slice(0, 2).join(" ");
          var first = keys[0];
          var firstEl = root.querySelector("#r-" + (first === "roomId" ? "room" : first));
          if (firstEl) {
            firstEl.focus();
            firstEl.scrollIntoView({ block: "center", behavior: "smooth" });
          }
          return;
        }

        alertBox.hidden = true;
        submitBtn.disabled = true;
        submitBtn.textContent = "Menyimpan…";
        var created = store.createReservation(data, ctx.user);
        if (!created.ok) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = "Kirim pengajuan " + ui.icon("arrowRight");
          ui.toast("Pengajuan tidak tersimpan. Periksa kembali isian Anda.", "error");
          var firstKey = Object.keys(created.errors || {})[0];
          if (firstKey) setError(root, firstKey, created.errors[firstKey]);
          return;
        }
        submitted = true;
        ui.toast("Pengajuan " + created.reservation.code + " tersimpan.", "success");
        location.hash = "#/reservasi/sukses?id=" + encodeURIComponent(created.reservation.id);
      });

      refresh();
    }
  };

  /* ======================= Reservasi saya ======================= */
  views.myReservations = {
    render: function (ctx) {
      var user = ctx.user;
      var status = ctx.params.status || "semua";
      var all = store.visibleReservations(user);
      var counts = store.counts(user);
      var list = status === "semua" ? all : all.filter(function (r) { return r.status === status; });
      var tabs = [
        { key: "semua", label: "Semua" },
        { key: "menunggu", label: "Menunggu" },
        { key: "disetujui", label: "Disetujui" },
        { key: "ditolak", label: "Ditolak" },
        { key: "dibatalkan", label: "Dibatalkan" }
      ];

      return '' +
        '<div class="wrap">' +
          '<div class="page-head">' +
            '<p class="eyebrow">Reservasi saya</p>' +
            '<div class="row-between" style="align-items:flex-end">' +
              '<div><h1>Riwayat &amp; status</h1><p class="lead" style="font-size:15px;margin-top:8px">Semua pengajuan milik Anda, lengkap dengan keputusan admin dan catatan perubahannya.</p></div>' +
              '<a class="btn btn-primary" href="#/reservasi/baru">' + ui.icon("plus") + " Ajukan baru</a>" +
            "</div>" +
          "</div>" +

          '<h2 class="sr-only">Daftar reservasi saya</h2>' +
          '<div class="tabs" role="tablist" aria-label="Filter status" style="margin-bottom:var(--space-m)">' +
            tabs.map(function (t) {
              var active = status === t.key;
              return '<a class="tab" role="tab" aria-selected="' + active + '" href="#/reservasi?status=' + t.key + '">' + t.label +
                '<span class="tab-count">' + (counts[t.key] || 0) + "</span></a>";
            }).join("") +
          "</div>" +

          (list.length ? reservationTable(list, user) : emptyReservations(status, counts.semua)) +
        "</div>";
    },
    mount: function (root, ctx) {
      bindReservationActions(root, ctx.user);
    }
  };

  function reservationTable(list, user) {
    var rows = list.map(function (r) {
      var room = store.roomById(r.roomId);
      var canCancel = store.canCancel(r, user).allowed;
      return "<tr>" +
        '<td><span class="cell-strong mono">' + ui.esc(r.code) + '</span><span class="cell-sub">Diajukan ' + ui.esc(ui.fmtDateShort(String(r.createdAt).slice(0, 10))) + "</span></td>" +
        '<td><span class="cell-strong">' + ui.esc(r.activity) + '</span><span class="cell-sub">' + ui.esc(r.category) + "</span></td>" +
        "<td>" + ui.esc(room ? room.name : "—") + '<span class="cell-sub">' + ui.esc(room ? room.code + " · " + room.building : "") + "</span></td>" +
        '<td class="mono">' + ui.esc(ui.fmtDateShort(r.date)) + '<span class="cell-sub">' + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end) + "</span></td>" +
        '<td class="num">' + r.participants + " orang</td>" +
        "<td>" + ui.pill(r.status) + "</td>" +
        '<td class="cell-actions"><button type="button" class="btn btn-ghost btn-sm" data-open="' + ui.esc(r.id) + '">Detail</button>' +
          (canCancel ? ' <button type="button" class="btn btn-quiet btn-sm" data-cancel="' + ui.esc(r.id) + '">Batalkan</button>' : "") +
        "</td></tr>";
    }).join("");

    var cards = list.map(function (r) {
      var room = store.roomById(r.roomId);
      var canCancel = store.canCancel(r, user).allowed;
      return '<article class="record">' +
        '<div class="record-top"><div><span class="record-code">' + ui.esc(r.code) + "</span><h3>" + ui.esc(r.activity) + "</h3></div>" + ui.pill(r.status) + "</div>" +
        '<div class="record-meta"><span>' + ui.esc(room ? room.name : "—") + "</span><span>" + ui.esc(ui.fmtDateShort(r.date)) + " · " + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end) + "</span><span>" + r.participants + " orang</span></div>" +
        '<div class="record-actions"><button type="button" class="btn btn-ghost btn-sm" data-open="' + ui.esc(r.id) + '">Detail</button>' +
          (canCancel ? '<button type="button" class="btn btn-quiet btn-sm" data-cancel="' + ui.esc(r.id) + '">Batalkan</button>' : "") +
        "</div></article>";
    }).join("");

    return '<div class="table-wrap"><table class="table"><thead><tr>' +
      "<th>Kode</th><th>Kegiatan</th><th>Ruang</th><th>Jadwal</th><th>Peserta</th><th>Status</th><th class=\"cell-actions\">Aksi</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>" +
      '<div class="record-list">' + cards + "</div>";
  }

  function emptyReservations(status, total) {
    if (!total) {
      return '' +
        '<div class="empty">' +
          '<div class="empty-icon">' + ui.icon("calendar") + "</div>" +
          "<h3>Belum ada pengajuan</h3>" +
          "<p>Mulai dengan mencari ruang yang kosong pada tanggal dan waktu yang Anda butuhkan, lalu kirim pengajuan pertama.</p>" +
          '<div class="btn-group"><a class="btn btn-primary" href="#/ruang">Cari ruang</a><a class="btn btn-ghost" href="#/reservasi/baru">Ajukan langsung</a></div>' +
        "</div>";
    }
    return '' +
      '<div class="empty">' +
        '<div class="empty-icon">' + ui.icon("filter") + "</div>" +
        "<h3>Tidak ada pengajuan berstatus " + ui.esc(status) + "</h3>" +
        "<p>Filter ini kosong. Pengajuan Anda yang lain tetap tersimpan dan dapat dilihat pada tab Semua.</p>" +
        '<div class="btn-group"><a class="btn btn-ghost" href="#/reservasi?status=semua">Lihat semua pengajuan</a></div>' +
      "</div>";
  }

  /* ======================= Detail & pembatalan ======================= */
  function detailModal(id, user, onDone) {
    var r = store.reservationById(id);
    if (!r) {
      ui.toast("Pengajuan tidak ditemukan.", "error");
      return;
    }
    var room = store.roomById(r.roomId);
    var owner = store.userById(r.userId);
    var canCancel = store.canCancel(r, user);
    var minutes = ui.toMinutes(r.end) - ui.toMinutes(r.start);

    var timeline = r.history.map(function (h, i) {
      var actor = h.by === "system" ? "Sistem" : (store.userById(h.by) ? store.userById(h.by).name : "Pengguna");
      return '<div class="timeline-item' + (i === r.history.length - 1 ? " is-accent" : "") + '">' +
        '<div class="timeline-when">' + ui.esc(ui.fmtDateTime(h.at)) + " · " + ui.esc(actor) + "</div>" +
        '<div class="timeline-what">' + ui.esc(h.action) + "</div>" +
        (h.note ? '<div class="timeline-note">' + ui.esc(h.note) + "</div>" : "") +
        "</div>";
    }).join("");

    var body = '' +
      '<div class="detail-code"><strong class="mono">' + ui.esc(r.code) + "</strong>" + ui.pill(r.status) + "</div>" +
      '<div class="dl">' +
        "<div><span>Kegiatan</span><span><strong>" + ui.esc(r.activity) + "</strong><br><span class=\"tiny muted\">" + ui.esc(r.category) + "</span></span></div>" +
        "<div><span>Ruang</span><span>" + ui.esc(room ? room.name + " · " + room.code : "—") + "<br><span class=\"tiny muted\">" + ui.esc(room ? room.building + " · Lt. " + room.floor + " · " + room.capacity + " orang" : "") + "</span></span></div>" +
        "<div><span>Jadwal</span><span>" + ui.esc(ui.fmtDate(r.date, { weekday: true })) + "<br>" + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end) + " · " + ui.durationLabel(minutes) + "</span></div>" +
        "<div><span>Peserta</span><span>" + r.participants + " orang</span></div>" +
        (owner ? "<div><span>Pemohon</span><span>" + ui.esc(owner.name) + '<br><span class="tiny muted">' + ui.esc(owner.email) + "</span></span></div>" : "") +
        (r.contact ? "<div><span>Kontak</span><span>" + ui.esc(r.contact) + "</span></div>" : "") +
        (r.note ? "<div><span>Catatan</span><span>" + ui.esc(r.note) + "</span></div>" : "") +
        "<div><span>Dikirim</span><span>" + ui.esc(ui.fmtDateTime(r.createdAt)) + "</span></div>" +
        (r.decidedAt ? "<div><span>Keputusan</span><span>" + ui.esc(ui.fmtDateTime(r.decidedAt)) + (r.decisionNote ? "<br><span class=\"tiny muted\">" + ui.esc(r.decisionNote) + "</span>" : "") + "</span></div>" : "") +
      "</div>" +
      '<div style="margin-top:var(--space-m)"><p class="eyebrow is-muted" style="margin-bottom:var(--space-xs)">Jejak perubahan</p><div class="timeline">' + timeline + "</div></div>" +
      (canCancel.allowed ? "" : '<p class="tiny muted" style="margin-top:var(--space-s)">' + ui.esc(canCancel.reason || "") + "</p>");

    var footer = '<button type="button" class="btn btn-ghost" data-close="1">Tutup</button>' +
      (canCancel.allowed ? '<button type="button" class="btn btn-danger" id="detail-cancel">Batalkan pengajuan</button>' : "");

    ui.openModal({
      title: r.activity,
      subtitle: room ? room.name + " · " + ui.fmtDateShort(r.date) : "",
      body: body,
      footer: footer,
      wide: true,
      onMount: function (wrap) {
        var cancelBtn = wrap.querySelector("#detail-cancel");
        if (cancelBtn) {
          cancelBtn.addEventListener("click", function () {
            ui.confirm({
              title: "Batalkan " + r.code + "?",
              message: "Pengajuan akan berstatus Dibatalkan dan tidak dapat dikembalikan ke Menunggu.",
              detail: "Ruang " + (room ? room.name : "") + " pada " + ui.fmtDateShort(r.date) + ", " + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end) + " akan dilepas untuk pengguna lain.",
              confirmLabel: "Ya, batalkan",
              cancelLabel: "Pertahankan",
              danger: true,
              requireNote: true,
              noteLabel: "Alasan pembatalan",
              noteHint: "Alasan dicatat pada jejak perubahan dan panel admin.",
              onConfirm: function (note) {
                var res = store.cancelByOwner(r.id, user, note);
                if (!res.ok) {
                  ui.toast(res.error, "error", { sticky: true });
                  return;
                }
                ui.toast("Pengajuan " + r.code + " dibatalkan.", "success");
                if (typeof onDone === "function") onDone();
                else IDB.app.render();
              }
            });
          });
        }
      }
    });
  }

  function bindReservationActions(root, user) {
    root.addEventListener("click", function (e) {
      var open = e.target.closest("[data-open]");
      if (open) {
        detailModal(open.getAttribute("data-open"), user, function () {
          ui.closeModal();
          IDB.app.render();
        });
        return;
      }
      var cancel = e.target.closest("[data-cancel]");
      if (cancel) {
        var r = store.reservationById(cancel.getAttribute("data-cancel"));
        if (!r) return;
        ui.confirm({
          title: "Batalkan " + r.code + "?",
          message: "Status akan berubah menjadi Dibatalkan dan slot ruang dilepas.",
          confirmLabel: "Ya, batalkan",
          cancelLabel: "Pertahankan",
          danger: true,
          requireNote: true,
          noteLabel: "Alasan pembatalan",
          noteHint: "Alasan dicatat pada jejak perubahan.",
          onConfirm: function (note) {
            var res = store.cancelByOwner(r.id, user, note);
            if (!res.ok) { ui.toast(res.error, "error", { sticky: true }); return; }
            ui.toast("Pengajuan " + r.code + " dibatalkan.", "success");
            IDB.app.render();
          }
        });
      }
    });
  }

  views.bindReservationActions = bindReservationActions;
  views.detailModal = detailModal;

  /* ======================= Sukses ======================= */
  views.success = {
    render: function (ctx) {
      var r = store.reservationById(ctx.params.id || "");
      if (!r || (r.userId !== ctx.user.id && ctx.user.role !== "admin")) {
        return '' +
          '<div class="wrap"><div class="empty" style="margin-top:var(--space-xl)">' +
            '<div class="empty-icon">' + ui.icon("alert") + "</div>" +
            "<h3>Pengajuan tidak ditemukan</h3>" +
            "<p>Nomor pengajuan mungkin sudah berubah atau bukan milik akun ini.</p>" +
            '<div class="btn-group"><a class="btn btn-primary" href="#/reservasi">Lihat reservasi saya</a><a class="btn btn-ghost" href="#/">Ke beranda</a></div>' +
          "</div></div>";
      }
      var room = store.roomById(r.roomId);
      var stepsByStatus = {
        menunggu: [
          ["Menunggu pemeriksaan", "Admin memeriksa jadwal dan kelengkapan pengajuan."],
          ["Keputusan admin", "Anda dapat memantau status terbaru beserta catatannya di halaman Reservasi saya."],
          ["Gunakan ruang sesuai jadwal", "Tunjukkan nomor reservasi bila petugas ruang meminta konfirmasi."]
        ],
        disetujui: [
          ["Disetujui admin", "Ruang sudah dipesan untuk jadwal ini. Slot tidak tersedia untuk pengguna lain."],
          ["Gunakan ruang sesuai jadwal", "Datang sesuai waktu dan tunjukkan nomor reservasi bila diminta."],
          ["Jaga kondisi ruang", "Kembalikan tata letak dan laporkan kerusakan kepada petugas."]
        ],
        ditolak: [
          ["Ditolak admin", "Pengajuan ini tidak dapat diterima. Alasan penolakan tercatat pada detail reservasi."],
          ["Lihat catatan admin", "Buka detail untuk membaca alasan, lalu sesuaikan jadwal atau ruang."],
          ["Ajukan jadwal lain", "Anda dapat mengirim pengajuan baru selama slot masih tersedia."]
        ],
        dibatalkan: [
          ["Dibatalkan", "Pengajuan dibatalkan dan slot ruang sudah dilepas untuk pengguna lain."],
          ["Cek riwayat", "Alasan pembatalan tercatat pada detail reservasi."],
          ["Ajukan ulang bila perlu", "Kirim pengajuan baru selama jadwal masih tersedia."]
        ]
      };
      var steps = stepsByStatus[r.status] || stepsByStatus.menunggu;
      var intro = r.status === "menunggu"
        ? "Admin reservasi akan memeriksa kelengkapan dan ketersediaan ruang. Anda tidak perlu mengirim ulang pengajuan."
        : "Pengajuan ini sudah diproses. Status dan catatan terbaru tersimpan pada riwayat reservasi Anda.";

      return '' +
        '<div class="wrap-narrow">' +
          '<div class="success">' +
            '<span class="success-mark">' + ui.icon("check") + "Pengajuan tercatat</span>" +
            "<h1>Terima kasih, pengajuan Anda sudah masuk.</h1>" +
            '<p class="lead">' + ui.esc(intro) + "</p>" +
            '<div class="success-code"><span>Nomor reservasi</span><strong>' + ui.esc(r.code) + "</strong>" +
              '<span style="letter-spacing:0;text-transform:none;font-family:var(--font-text);font-size:13px;color:var(--ink-2)">' +
                ui.esc(r.activity) + " · " + ui.esc(room ? room.name : "") + "<br>" +
                ui.esc(ui.fmtDate(r.date, { weekday: true })) + ", " + ui.timeLabel(r.start) + "–" + ui.timeLabel(r.end) + " · " + r.participants + " peserta" +
              "</span>" +
            "</div>" +
            '<div class="success-status is-' + ui.esc(r.status) + '">' +
              '<div class="success-status-head"><span class="eyebrow is-muted" style="font-size:9.5px">Status saat ini</span>' + ui.pill(r.status) + "</div>" +
              '<p class="tiny muted">' + (r.status === "menunggu"
                ? "Status dapat berubah menjadi Disetujui, Ditolak, atau Dibatalkan — setiap perubahan tercatat pada riwayat pengajuan."
                : "Status terbaru sudah tersimpan pada riwayat pengajuan Anda.") + "</p>" +
            "</div>" +
            '<div class="success-steps">' +
              steps.map(function (step, i) {
                return '<div class="success-step"><b>0' + (i + 1) + "</b><div><strong>" + ui.esc(step[0]) +
                  '</strong><br><span class="muted">' + ui.esc(step[1]) + "</span></div></div>";
              }).join("") +
            "</div>" +
            '<div class="btn-group">' +
              '<a class="btn btn-primary" href="#/reservasi">Lihat reservasi saya</a>' +
              '<a class="btn btn-ghost" href="#/reservasi/baru">Ajukan lagi</a>' +
              '<button type="button" class="btn btn-quiet" id="print-proof">Cetak bukti</button>' +
            "</div>" +
          "</div>" +
        "</div>";
    },
    mount: function (root) {
      var btn = root.querySelector("#print-proof");
      if (btn) btn.addEventListener("click", function () { window.print(); });
    }
  };
})();
