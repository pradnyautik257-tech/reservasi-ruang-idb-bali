/* ==========================================================================
   ui.js — format, ikon, toast, modal, ribbon ketersediaan
   ========================================================================== */
(function () {
  "use strict";

  var IDB = window.IDB;
  var ui = (IDB.ui = {});

  var MONTHS = IDB.MONTHS_ID;
  var SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  var DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  ui.esc = function (value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  ui.parseDate = function (isoDate) {
    if (!isoDate) return null;
    var p = String(isoDate).split("-");
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  };

  ui.isoDate = function (date) {
    return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
  };

  ui.todayISO = function () { return ui.isoDate(new Date()); };

  ui.addDays = function (isoDate, days) {
    var d = ui.parseDate(isoDate);
    d.setDate(d.getDate() + days);
    return ui.isoDate(d);
  };

  ui.daysFromToday = function (isoDate) {
    var a = ui.parseDate(ui.todayISO());
    var b = ui.parseDate(isoDate);
    return Math.round((b - a) / 86400000);
  };

  ui.fmtDate = function (isoDate, opts) {
    if (!isoDate) return "—";
    opts = opts || {};
    var d = ui.parseDate(isoDate);
    var out = (opts.weekday ? DAYS[d.getDay()] + ", " : "") + d.getDate() + " " + (opts.short ? SHORT_MONTHS[d.getMonth()] : MONTHS[d.getMonth()]);
    if (opts.year !== false) out += " " + d.getFullYear();
    return out;
  };

  ui.fmtDateShort = function (isoDate) { return ui.fmtDate(isoDate, { short: true }); };

  ui.timeLabel = function (hhmm) { return String(hhmm || "").replace(":", "."); };

  ui.toMinutes = function (hhmm) {
    if (!hhmm) return 0;
    var p = String(hhmm).split(":");
    return Number(p[0]) * 60 + Number(p[1] || 0);
  };

  ui.toTime = function (minutes) {
    var m = Math.max(0, Math.min(24 * 60, Math.round(minutes)));
    return pad(Math.floor(m / 60)) + ":" + pad(m % 60);
  };

  ui.fmtDateTime = function (isoDateTime) {
    if (!isoDateTime) return "—";
    var d = new Date(isoDateTime);
    if (isNaN(d.getTime())) return "—";
    return d.getDate() + " " + SHORT_MONTHS[d.getMonth()] + " " + d.getFullYear() + ", " + pad(d.getHours()) + "." + pad(d.getMinutes());
  };

  ui.durationLabel = function (minutes) {
    var m = Number(minutes) || 0;
    var h = Math.floor(m / 60);
    var rest = m % 60;
    if (h && rest) return h + " jam " + rest + " menit";
    if (h) return h + " jam";
    return rest + " menit";
  };

  ui.relativeDay = function (isoDate) {
    var diff = ui.daysFromToday(isoDate);
    if (diff === 0) return "Hari ini";
    if (diff === 1) return "Besok";
    if (diff === -1) return "Kemarin";
    return ui.fmtDate(isoDate, { weekday: true, short: true });
  };

  ui.statusMeta = function (status) {
    var map = {
      menunggu: { label: "Menunggu", cls: "pill-menunggu" },
      disetujui: { label: "Disetujui", cls: "pill-disetujui" },
      ditolak: { label: "Ditolak", cls: "pill-ditolak" },
      dibatalkan: { label: "Dibatalkan", cls: "pill-dibatalkan" }
    };
    return map[status] || { label: status, cls: "" };
  };

  ui.pill = function (status) {
    var m = ui.statusMeta(status);
    return '<span class="pill ' + m.cls + '">' + ui.esc(m.label) + "</span>";
  };

  ui.roleLabel = function (role) {
    return { mahasiswa: "Mahasiswa", dosen: "Dosen / Staf", admin: "Admin Reservasi", operator: "Operator Layanan" }[role] || role;
  };

  ui.plate = function (room, extraClass) {
    return '<div class="plate ' + (extraClass || "") + '" aria-hidden="true">' + ui.esc(room.code) + "</div>";
  };

  /* ---------------- Ikon (stroke 1.6, 24 grid) ---------------- */
  var PATHS = {
    home: '<path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5"/><rect x="13.5" y="4" width="6.5" height="6.5"/><rect x="4" y="13.5" width="6.5" height="6.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5"/>',
    calendar: '<rect x="3.5" y="5.5" width="17" height="15"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 20c.6-3.3 2.9-5.2 5.5-5.2s4.9 1.9 5.5 5.2"/><path d="M16 5.6a3 3 0 0 1 0 5.8M17.5 14.9c2 .5 3.3 2.2 3.7 5.1"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    arrowRight: '<path d="M4 12h15M13 6l6 6-6 6"/>',
    arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
    check: '<path d="m4.5 12.5 5 5 10-11"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 3.5 21 19H3z"/><path d="M12 9v4.5M12 16.4v.2"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.2"/>',
    logout: '<path d="M14 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H14"/><path d="M17 8.5 20.5 12 17 15.5M10 12h10.5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 14.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4.9z"/>',
    shield: '<path d="M12 3.5 19 6v6c0 4.2-2.9 7.4-7 8.5-4.1-1.1-7-4.3-7-8.5V6z"/><path d="m9 12 2 2 4-4"/>',
    database: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
    download: '<path d="M12 4v11M7.5 11 12 15.5 16.5 11"/><path d="M4.5 19.5h15"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4.5 19.5h15"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4.5 19.5h4L20 8a2.1 2.1 0 0 0-3-3L5.5 16.5z"/><path d="m14.5 6 3 3"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l.8 12.2a1.5 1.5 0 0 0 1.5 1.3h6.4a1.5 1.5 0 0 0 1.5-1.3L17.5 7"/>',
    pin: '<path d="M12 21s6.5-5.6 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.3"/>',
    list: '<path d="M8 6.5h12M8 12h12M8 17.5h12"/><path d="M4 6.5h.01M4 12h.01M4 17.5h.01"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="m11 11 9-9M17 3l3 3M14.5 5.5l3 3"/>',
    user: '<circle cx="12" cy="8.5" r="3.7"/><path d="M5 20.5c0-3.4 3.1-5.8 7-5.8s7 2.4 7 5.8"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4"/>',
    file: '<path d="M6.5 3.5h7l4.5 4.5v12.5h-11.5z"/><path d="M13.5 3.5V8H18"/>',
    building: '<path d="M4.5 20.5V5.5h9v15M13.5 10H20v10.5M2.5 20.5h19"/><path d="M7.5 8.5h3M7.5 12h3M7.5 15.5h3"/>',
    filter: '<path d="M4 6h16l-6 7v6l-4 2v-8z"/>',
    eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.6"/>',
    copy: '<rect x="8.5" y="8.5" width="11" height="11"/><path d="M15.5 8.5v-4h-11v11h4"/>'
  };

  ui.icon = function (name, cls) {
    var path = PATHS[name] || "";
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + path + "</svg>";
  };

  /* ---------------- Toast ---------------- */
  ui.toast = function (message, type, options) {
    options = options || {};
    var root = document.getElementById("toast-root");
    if (!root) return;
    var node = document.createElement("div");
    node.className = "toast toast-" + (type || "info");
    var iconName = type === "error" ? "alert" : type === "success" ? "check" : "info";
    node.innerHTML = ui.icon(iconName) + "<div>" + ui.esc(message) + "</div>" +
      '<button type="button" aria-label="Tutup notifikasi">' + ui.icon("x") + "</button>";
    node.querySelector("button").addEventListener("click", function () { node.remove(); });
    root.appendChild(node);
    if (type !== "error" && !options.sticky) {
      window.setTimeout(function () { node.remove(); }, options.duration || 5000);
    }
    return node;
  };

  /* ---------------- Modal ---------------- */
  var lastFocus = null;
  var activeModal = null;

  ui.openModal = function (options) {
    ui.closeModal();
    var root = document.getElementById("overlay-root");
    lastFocus = document.activeElement;
    var wide = options.wide ? " is-wide" : "";
    var wrap = document.createElement("div");
    wrap.className = "modal";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.setAttribute("aria-labelledby", "modal-title");
    wrap.innerHTML =
      '<div class="modal-scrim" data-close="1"></div>' +
      '<div class="modal-panel' + wide + '">' +
        '<div class="modal-head">' +
          "<div><h2 id=\"modal-title\">" + ui.esc(options.title || "") + "</h2>" +
          (options.subtitle ? "<p>" + ui.esc(options.subtitle) + "</p>" : "") + "</div>" +
          '<button type="button" class="modal-close" data-close="1" aria-label="Tutup">' + ui.icon("x") + "</button>" +
        "</div>" +
        '<div class="modal-body">' + (options.body || "") + "</div>" +
        (options.footer ? '<div class="modal-foot">' + options.footer + "</div>" : "") +
      "</div>";
    root.appendChild(wrap);
    document.body.classList.add("modal-open");
    activeModal = wrap;

    wrap.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) ui.closeModal();
    });

    var focusables = wrap.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (focusables.length) {
      var preferred = wrap.querySelector("[data-autofocus]") || focusables[0];
      window.setTimeout(function () { preferred.focus(); }, 30);
    }

    wrap.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); ui.closeModal(); return; }
      if (e.key !== "Tab") return;
      var list = Array.prototype.filter.call(
        wrap.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        function (el) { return el.offsetParent !== null; }
      );
      if (!list.length) return;
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    if (typeof options.onMount === "function") options.onMount(wrap);
    return wrap;
  };

  ui.closeModal = function (skipFocus) {
    var current = document.querySelector("#overlay-root .modal");
    if (current) current.remove();
    document.body.classList.remove("modal-open");
    activeModal = null;
    if (!skipFocus && lastFocus && typeof lastFocus.focus === "function") {
      try { lastFocus.focus(); } catch (err) { /* ignore */ }
    }
    lastFocus = null;
  };

  ui.confirm = function (options) {
    var body = "<p>" + ui.esc(options.message || "") + "</p>" +
      (options.detail ? '<p class="tiny muted" style="margin-top:8px">' + ui.esc(options.detail) + "</p>" : "") +
      (options.requireNote ? '<div class="field" style="margin-top:var(--space-s)"><label for="confirm-note">' + ui.esc(options.noteLabel || "Catatan") + ' <span class="req">*</span></label><textarea class="textarea" id="confirm-note" rows="3" data-autofocus></textarea><p class="field-hint">' + ui.esc(options.noteHint || "") + "</p></div>" : "");
    var footer = '<button type="button" class="btn btn-ghost" data-close="1">' + ui.esc(options.cancelLabel || "Batal") + "</button>" +
      '<button type="button" class="btn ' + (options.danger ? "btn-danger" : "btn-primary") + '" id="confirm-go">' + ui.esc(options.confirmLabel || "Lanjutkan") + "</button>";
    ui.openModal({
      title: options.title || "Konfirmasi",
      body: body,
      footer: footer,
      onMount: function (wrap) {
        wrap.querySelector("#confirm-go").addEventListener("click", function () {
          var noteEl = wrap.querySelector("#confirm-note");
          if (options.requireNote && (!noteEl || !noteEl.value.trim())) {
            if (noteEl) {
              noteEl.focus();
              noteEl.style.borderColor = "var(--bad)";
            }
            return;
          }
          var note = noteEl ? noteEl.value.trim() : "";
          ui.closeModal();
          options.onConfirm(note);
        });
      }
    });
  };

  /* ---------------- Availability ribbon ---------------- */
  ui.ribbon = function (room, dateISO, bookings, settings, opts) {
    opts = opts || {};
    var open = ui.toMinutes(settings.openHour);
    var close = ui.toMinutes(settings.closeHour);
    var span = Math.max(60, close - open);
    var html = '<div class="ribbon" role="img" aria-label="' + ui.esc(ribbonLabel(room, dateISO, bookings, settings)) + '">';
    html += '<div class="ribbon-track">';

    (bookings || []).forEach(function (b) {
      if (b.status !== "menunggu" && b.status !== "disetujui") return;
      var s = Math.max(open, ui.toMinutes(b.start));
      var e = Math.min(close, ui.toMinutes(b.end));
      if (e <= s) return;
      var left = ((s - open) / span) * 100;
      var width = ((e - s) / span) * 100;
      html += '<span class="ribbon-booked" style="left:' + left.toFixed(2) + "%;width:" + width.toFixed(2) + '%" title="' +
        ui.esc(ui.timeLabel(b.start) + "–" + ui.timeLabel(b.end) + (b.status === "menunggu" ? " (menunggu)" : "") + " · " + (b.activity || "")) + '"></span>';
    });

    if (opts.showNow !== false && dateISO === ui.todayISO()) {
      var now = new Date();
      var mins = now.getHours() * 60 + now.getMinutes();
      if (mins >= open && mins <= close) {
        html += '<span class="ribbon-now" style="left:' + (((mins - open) / span) * 100).toFixed(2) + '%"></span>';
      }
    }

    html += "</div>";
    html += '<div class="ribbon-scale" aria-hidden="true"><span>' + ui.esc(ui.timeLabel(settings.openHour)) + "</span><span>" +
      ui.esc(ui.timeLabel(ui.toTime((open + close) / 2))) + "</span><span>" + ui.esc(ui.timeLabel(settings.closeHour)) + "</span></div>";
    html += "</div>";
    return html;
  };

  function ribbonLabel(room, dateISO, bookings, settings) {
    if (!bookings || !bookings.length) {
      return "Ketersediaan " + room.name + " pada " + ui.fmtDateShort(dateISO) + ": kosong sepanjang jam operasional.";
    }
    var parts = bookings.map(function (b) {
      return ui.timeLabel(b.start) + "–" + ui.timeLabel(b.end) + " " + (b.status === "menunggu" ? "menunggu" : "terisi");
    });
    return "Ketersediaan " + room.name + " pada " + ui.fmtDateShort(dateISO) + ": " + parts.join(", ") + ".";
  }

  ui.debounce = function (fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  };

  ui.scrollTop = function () {
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  ui.focusMain = function () {
    var main = document.getElementById("main");
    if (main) main.focus({ preventScroll: true });
  };
})();
