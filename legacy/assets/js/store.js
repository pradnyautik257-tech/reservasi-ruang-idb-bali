/* ==========================================================================
   store.js — penyimpanan lokal, autentikasi, aturan bisnis reservasi
   Data disimpan di localStorage. Ini prototipe demo, bukan server produksi.
   ========================================================================== */
(function () {
  "use strict";

  var IDB = window.IDB;
  var ui = IDB.ui;
  var store = (IDB.store = {});

  var DATA_KEY = "idb.reservasi.v1";
  var SESSION_KEY = "idb.session.v1";
  var SESSION_HOURS = 8;
  var ACTIVE = ["menunggu", "disetujui"];

  var state = null;

  function deepClone(value) { return JSON.parse(JSON.stringify(value)); }

  function load() {
    try {
      var raw = localStorage.getItem(DATA_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version === IDB.DB_VERSION && Array.isArray(parsed.rooms)) {
          return parsed;
        }
      }
    } catch (err) { /* corrupt storage falls through to seed */ }
    var fresh = IDB.seed();
    try { localStorage.setItem(DATA_KEY, JSON.stringify(fresh)); } catch (err) { /* ignore */ }
    return fresh;
  }

  function persist() {
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify(state));
    } catch (err) {
      ui.toast("Penyimpanan peramban penuh. Ekspor data lalu reset dari panel operator.", "error", { sticky: true });
    }
  }

  store.init = function () {
    state = load();
    var session = store.getSession();
    if (session && session.expiresAt < Date.now()) store.logout(true);
  };

  store.data = function () { return state; };

  store.reset = function () {
    state = IDB.seed();
    persist();
    store.logout(true);
  };

  store.exportJSON = function () { return JSON.stringify(state, null, 2); };

  store.importJSON = function (text) {
    var parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.rooms) || !Array.isArray(parsed.reservations) || !Array.isArray(parsed.users)) {
      throw new Error("Berkas tidak dikenali. Ekspor ulang dari panel operator.");
    }
    parsed.version = IDB.DB_VERSION;
    state = parsed;
    if (typeof state.seq !== "number") state.seq = state.reservations.length;
    persist();
  };

  store.storageBytes = function () {
    try { return new Blob([JSON.stringify(state)]).size; } catch (err) { return 0; }
  };

  /* ---------------- Session & auth ---------------- */
  store.getSession = function () {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) { return null; }
  };

  store.currentUser = function () {
    var session = store.getSession();
    if (!session) return null;
    if (session.expiresAt < Date.now()) { store.logout(true); return null; }
    return store.userById(session.userId) || null;
  };

  store.login = function (email, password) {
    var clean = String(email || "").trim().toLowerCase();
    var user = state.users.filter(function (u) { return u.email.toLowerCase() === clean; })[0];
    if (!user) return { ok: false, error: "Email belum terdaftar. Periksa kembali atau gunakan akun demo di bawah." };
    if (user.password !== password) return { ok: false, error: "Kata sandi tidak cocok. Coba lagi atau pilih akun demo." };
    var session = { userId: user.id, startedAt: Date.now(), expiresAt: Date.now() + SESSION_HOURS * 3600 * 1000 };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    store.log(user.id, "Masuk", user.email, "Sesi dimulai", "login");
    return { ok: true, user: user };
  };

  store.logout = function (silent) {
    var current = store.getSession();
    if (current && !silent) {
      var user = store.userById(current.userId);
      if (user) store.log(user.id, "Keluar", user.email, "Sesi diakhiri", "logout");
    }
    localStorage.removeItem(SESSION_KEY);
  };

  store.roleHome = function (role) {
    if (role === "admin") return "#/admin";
    if (role === "operator") return "#/operator";
    return "#/";
  };

  store.can = function (role, capability) {
    var map = {
      book: ["mahasiswa", "dosen"],
      manageReservations: ["admin"],
      manageRooms: ["admin"],
      manageSystem: ["operator"],
      viewOwn: ["mahasiswa", "dosen", "admin"]
    };
    return (map[capability] || []).indexOf(role) !== -1;
  };

  /* ---------------- Lookups ---------------- */
  store.userById = function (id) {
    return state.users.filter(function (u) { return u.id === id; })[0] || null;
  };

  store.roomById = function (id) {
    return state.rooms.filter(function (r) { return r.id === id; })[0] || null;
  };

  store.reservationById = function (id) {
    return state.reservations.filter(function (r) { return r.id === id; })[0] || null;
  };

  store.reservations = function () {
    return state.reservations.slice().sort(function (a, b) {
      return a.date === b.date ? (a.start < b.start ? -1 : 1) : (a.date < b.date ? 1 : -1);
    });
  };

  store.rooms = function (includeInactive) {
    return state.rooms.filter(function (r) { return includeInactive || r.status === "aktif"; });
  };

  store.settings = function () { return state.settings; };

  store.audit = function () {
    return state.audit.slice().sort(function (a, b) {
      return new Date(b.at).getTime() - new Date(a.at).getTime();
    });
  };

  store.visibleReservations = function (user) {
    if (!user) return [];
    if (user.role === "admin" || user.role === "operator") return store.reservations();
    return store.reservations().filter(function (r) { return r.userId === user.id; });
  };

  store.counts = function (user) {
    var list = store.visibleReservations(user);
    var counts = { semua: list.length, menunggu: 0, disetujui: 0, ditolak: 0, dibatalkan: 0 };
    list.forEach(function (r) { if (counts[r.status] !== undefined) counts[r.status] += 1; });
    return counts;
  };

  /* ---------------- Availability ---------------- */
  store.bookingsFor = function (roomId, dateISO, ignoreId) {
    return state.reservations.filter(function (r) {
      return r.roomId === roomId && r.date === dateISO && r.id !== ignoreId && ACTIVE.indexOf(r.status) !== -1;
    }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  };

  store.conflicts = function (roomId, dateISO, start, end, ignoreId) {
    var s = ui.toMinutes(start), e = ui.toMinutes(end);
    return store.bookingsFor(roomId, dateISO, ignoreId).filter(function (r) {
      var rs = ui.toMinutes(r.start), re = ui.toMinutes(r.end);
      return s < re && e > rs;
    });
  };

  store.isRoomFree = function (roomId, dateISO, start, end, ignoreId) {
    return store.conflicts(roomId, dateISO, start, end, ignoreId).length === 0;
  };

  store.nextFreeSlots = function (roomId, dateISO, count) {
    var st = state.settings;
    var duration = Math.max(60, st.minHours * 60);
    var open = ui.toMinutes(st.openHour), close = ui.toMinutes(st.closeHour);
    var bookings = store.bookingsFor(roomId, dateISO);
    var slots = [];
    var step = Math.max(60, duration);
    for (var t = open; t + duration <= close; t += step) {
      var start = ui.toTime(t), end = ui.toTime(t + duration);
      if (bookings.every(function (b) {
        return t + duration <= ui.toMinutes(b.start) || t >= ui.toMinutes(b.end);
      })) {
        slots.push({ start: start, end: end });
        if (slots.length >= (count || 2)) break;
      }
    }
    return slots;
  };

  /* ---------------- Validation ---------------- */
  store.validate = function (payload, options) {
    options = options || {};
    var errors = {};
    var st = state.settings;
    var room = store.roomById(payload.roomId);

    var activity = String(payload.activity || "").trim();
    if (!room) {
      errors.roomId = "Pilih ruangan yang akan digunakan.";
    } else if (room.status !== "aktif") {
      errors.roomId = "Ruangan ini sedang tidak aktif. Pilih ruangan lain.";
    }
    if (activity.length < 4) errors.activity = "Tuliskan nama kegiatan minimal 4 karakter.";
    else if (activity.length > 90) errors.activity = "Nama kegiatan maksimal 90 karakter.";
    if (!payload.category) errors.category = "Pilih jenis kegiatan.";

    if (!payload.date) {
      errors.date = "Pilih tanggal kegiatan.";
    } else {
      var offset = ui.daysFromToday(payload.date);
      if (isNaN(offset)) errors.date = "Tanggal tidak valid.";
      else if (offset < 0) errors.date = "Tanggal sudah lewat. Pilih hari ini atau setelahnya.";
      else if (offset > st.windowDays) errors.date = "Pemesanan dibuka maksimal " + st.windowDays + " hari ke depan.";
    }

    if (!payload.start) errors.start = "Tentukan waktu mulai.";
    if (!payload.end) errors.end = "Tentukan waktu selesai.";

    if (!errors.start && !errors.end) {
      var s = ui.toMinutes(payload.start), e = ui.toMinutes(payload.end);
      var open = ui.toMinutes(st.openHour), close = ui.toMinutes(st.closeHour);
      if (e <= s) {
        errors.end = "Waktu selesai harus lebih akhir daripada waktu mulai.";
      } else {
        if (s < open) errors.start = "Ruang dapat dipakai mulai pukul " + ui.timeLabel(st.openHour) + ".";
        if (e > close) errors.end = "Ruang harus dikosongkan sebelum pukul " + ui.timeLabel(st.closeHour) + ".";
        var mins = e - s;
        if (mins < st.minHours * 60) errors.end = "Durasi minimal " + st.minHours + " jam.";
        else if (mins > st.maxHours * 60) errors.end = "Durasi maksimal " + st.maxHours + " jam per pengajuan.";
      }
    }

    var participants = Number(payload.participants);
    if (!payload.participants && payload.participants !== 0) {
      errors.participants = "Isi jumlah peserta.";
    } else if (!isFinite(participants) || participants < 1) {
      errors.participants = "Jumlah peserta minimal 1 orang.";
    } else if (room && participants > room.capacity) {
      errors.participants = "Melebihi kapasitas " + room.name + " (" + room.capacity + " orang).";
    }

    if (payload.contact && !/^[+0-9 ()-]{8,20}$/.test(String(payload.contact).trim())) {
      errors.contact = "Nomor kontak hanya berisi angka, spasi, tanda hubung, dan +.";
    }
    if (String(payload.note || "").length > 300) {
      errors.note = "Catatan maksimal 300 karakter.";
    }

    if (!Object.keys(errors).length && room) {
      var clashes = store.conflicts(room.id, payload.date, payload.start, payload.end, options.ignoreId);
      if (clashes.length) {
        var first = clashes[0];
        errors.end = "Ruang sudah dipakai " + ui.timeLabel(first.start) + "–" + ui.timeLabel(first.end) +
          " (" + first.code + "). Pilih waktu atau ruang lain.";
      }
    }

    return { ok: Object.keys(errors).length === 0, errors: errors };
  };

  /* ---------------- Mutation ---------------- */
  store.nextCode = function () {
    var year = new Date().getFullYear();
    state.seq = (state.seq || 0) + 1;
    return "RSV-" + year + "-" + ("0000" + state.seq).slice(-4);
  };

  store.createReservation = function (payload, user) {
    var check = store.validate(payload);
    if (!check.ok) return check;

    var now = new Date().toISOString();
    var room = store.roomById(payload.roomId);
    var auto = state.settings.autoApprove;
    var res = {
      id: "v-" + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
      code: store.nextCode(),
      userId: user.id,
      roomId: room.id,
      activity: String(payload.activity).trim(),
      category: payload.category,
      date: payload.date,
      start: payload.start,
      end: payload.end,
      participants: Number(payload.participants),
      contact: String(payload.contact || "").trim(),
      note: String(payload.note || "").trim(),
      status: auto ? "disetujui" : "menunggu",
      createdAt: now,
      decidedAt: auto ? now : null,
      decidedBy: auto ? "system" : null,
      decisionNote: auto ? "Disetujui otomatis sesuai pengaturan kampus." : "",
      history: [{
        at: now,
        by: user.id,
        action: "Pengajuan dibuat",
        note: "Status awal: " + (auto ? "Disetujui otomatis" : "Menunggu")
      }]
    };
    if (auto) {
      res.history.push({ at: now, by: "system", action: "Disetujui otomatis", note: res.decisionNote });
    }
    state.reservations.push(res);
    store.log(user.id, "Pengajuan dibuat", res.code, room.name + " · " + ui.fmtDateShort(res.date) + " · " + ui.timeLabel(res.start) + "–" + ui.timeLabel(res.end), "create");
    if (auto) store.log("system", "Disetujui otomatis", res.code, "Sesuai pengaturan kampus", "approve");
    persist();
    return { ok: true, reservation: res };
  };

  store.canCancel = function (res, user) {
    if (!res || !user) return { allowed: false, reason: "Anda tidak berwenang membatalkan pengajuan ini." };
    if (res.status === "ditolak" || res.status === "dibatalkan") {
      return { allowed: false, reason: "Pengajuan ini sudah berstatus akhir." };
    }
    if (user.role === "admin") return { allowed: true };
    if (res.userId !== user.id) return { allowed: false, reason: "Hanya pemohon atau admin yang dapat membatalkan." };
    if (res.status === "menunggu") return { allowed: true };
    var start = new Date(res.date + "T" + res.start + ":00");
    var hours = (start.getTime() - Date.now()) / 3600000;
    if (hours < state.settings.cancelHours) {
      return {
        allowed: false,
        reason: "Pembatalan mandiri ditutup " + state.settings.cancelHours + " jam sebelum kegiatan. Hubungi admin reservasi."
      };
    }
    return { allowed: true };
  };

  store.setStatus = function (id, status, actor, note) {
    var res = store.reservationById(id);
    if (!res) return { ok: false, error: "Pengajuan tidak ditemukan." };

    var allowedFrom = {
      disetujui: ["menunggu"],
      ditolak: ["menunggu"],
      dibatalkan: ["menunggu", "disetujui"]
    };
    if ((allowedFrom[status] || []).indexOf(res.status) === -1) {
      return { ok: false, error: "Status tidak dapat diubah dari " + ui.statusMeta(res.status).label + " ke " + ui.statusMeta(status).label + "." };
    }

    if (status === "disetujui") {
      var approvedClash = store.conflicts(res.roomId, res.date, res.start, res.end, res.id).filter(function (c) {
        return c.status === "disetujui";
      });
      if (approvedClash.length) {
        return {
          ok: false,
          error: "Tidak dapat disetujui: " + approvedClash[0].code + " sudah disetujui pada " +
            ui.timeLabel(approvedClash[0].start) + "–" + ui.timeLabel(approvedClash[0].end) + "."
        };
      }
    }

    var now = new Date().toISOString();
    res.status = status;
    res.decidedAt = now;
    res.decidedBy = actor.id;
    res.decisionNote = note || "";
    res.history.push({
      at: now,
      by: actor.id,
      action: ui.statusMeta(status).label,
      note: note || ""
    });
    store.log(actor.id, ui.statusMeta(status).label, res.code, note || "", status);
    persist();
    return { ok: true, reservation: res };
  };

  store.cancelByOwner = function (id, user, note) {
    var check = store.canCancel(store.reservationById(id), user);
    if (!check.allowed) return { ok: false, error: check.reason };
    return store.setStatus(id, "dibatalkan", user, note || "Dibatalkan oleh pemohon.");
  };

  /* ---------------- Rooms ---------------- */
  store.updateRoom = function (id, patch, actor) {
    var room = store.roomById(id);
    if (!room) return { ok: false, error: "Ruangan tidak ditemukan." };
    var capacity = Number(patch.capacity);
    if (!patch.name || String(patch.name).trim().length < 3) return { ok: false, error: "Nama ruangan minimal 3 karakter." };
    if (!isFinite(capacity) || capacity < 1) return { ok: false, error: "Kapasitas minimal 1 orang." };
    room.name = String(patch.name).trim();
    room.code = String(patch.code || room.code).trim();
    room.building = String(patch.building || room.building).trim();
    room.floor = Number(patch.floor) || room.floor;
    room.capacity = capacity;
    room.facilities = patch.facilities || room.facilities;
    room.status = patch.status === "nonaktif" ? "nonaktif" : "aktif";
    room.note = String(patch.note || "").trim();
    store.log(actor.id, "Data ruang diperbarui", room.code, room.name, "room");
    persist();
    return { ok: true, room: room };
  };

  store.addRoom = function (data, actor) {
    var name = String(data.name || "").trim();
    var capacity = Number(data.capacity);
    if (name.length < 3) return { ok: false, error: "Nama ruangan minimal 3 karakter." };
    if (!isFinite(capacity) || capacity < 1 || capacity > 1000) return { ok: false, error: "Kapasitas harus antara 1 dan 1000." };
    var code = String(data.code || "").trim().toUpperCase();
    if (!code) return { ok: false, error: "Kode ruangan wajib diisi, misalnya D-01." };
    if (state.rooms.some(function (r) { return r.code.toLowerCase() === code.toLowerCase(); })) {
      return { ok: false, error: "Kode ruangan " + code + " sudah dipakai." };
    }
    var room = {
      id: "r-" + code.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).slice(2, 6),
      code: code,
      name: name,
      building: String(data.building || "Gedung A").trim(),
      floor: Number(data.floor) || 1,
      capacity: capacity,
      status: "aktif",
      facilities: data.facilities || [],
      note: String(data.note || "").trim()
    };
    state.rooms.push(room);
    store.log(actor.id, "Ruang ditambahkan", room.code, room.name, "room");
    persist();
    return { ok: true, room: room };
  };

  store.updateSettings = function (patch, actor) {
    Object.keys(patch).forEach(function (key) {
      if (key !== "facilities") state.settings[key] = patch[key];
    });
    store.log(actor.id, "Pengaturan diperbarui", "Sistem", Object.keys(patch).join(", "), "settings");
    persist();
    return { ok: true, settings: state.settings };
  };

  /* ---------------- Audit ---------------- */
  store.log = function (actorId, action, target, detail, kind) {
    state.audit.push({
      id: "log-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      at: new Date().toISOString(),
      actorId: actorId,
      action: action,
      target: target || "",
      detail: detail || "",
      kind: kind || "info"
    });
    if (state.audit.length > 400) state.audit = state.audit.slice(-400);
  };

  store.storageBytes = store.storageBytes;
})();
