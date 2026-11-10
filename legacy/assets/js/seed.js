/* ==========================================================================
   seed.js — data awal demo (ruang, pengguna, reservasi, log)
   Semua tanggal dibuat relatif terhadap hari ini agar demo selalu relevan.
   ========================================================================== */
(function () {
  "use strict";

  var IDB = (window.IDB = window.IDB || {});

  var MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function isoDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function at(daysFromToday, hh, mm) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysFromToday);
    var y = d.getFullYear(), m = pad(d.getMonth() + 1), day = pad(d.getDate());
    return y + "-" + m + "-" + day + "T" + pad(hh) + ":" + pad(mm) + ":00";
  }

  function localISO(dateStr, hh, mm) {
    return dateStr + "T" + pad(hh) + ":" + pad(mm) + ":00";
  }

  function dateOffset(days) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return isoDate(d);
  }

  var ROOMS = [
    {
      id: "r-aula", code: "A-01", name: "Aula Utama", building: "Gedung A", floor: 1,
      capacity: 200, status: "aktif",
      facilities: ["Proyektor", "Sound System", "Panggung", "AC", "Wi-Fi", "Live Streaming"],
      note: "Ruang serbaguna untuk upacara, seminar besar, dan kegiatan institusi."
    },
    {
      id: "r-audit", code: "A-03", name: "Auditorium Nusantara", building: "Gedung A", floor: 3,
      capacity: 120, status: "aktif",
      facilities: ["Proyektor", "Sound System", "AC", "Panggung", "Wi-Fi", "Live Streaming"],
      note: "Auditorium bertingkat dengan tata suara tetap dan ruang kontrol."
    },
    {
      id: "r-senat", code: "A-02", name: "Ruang Rapat Senat", building: "Gedung A", floor: 2,
      capacity: 24, status: "aktif",
      facilities: ["Proyektor", "Video Conference", "AC", "Whiteboard", "Wi-Fi"],
      note: "Ruang rapat formal dengan meja bundar dan perangkat video conference."
    },
    {
      id: "r-galeri", code: "B-01", name: "Galeri Seni Rupa", building: "Gedung B", floor: 1,
      capacity: 80, status: "aktif",
      facilities: ["Pencahayaan Pameran", "AC", "Wi-Fi", "Partisi"],
      note: "Ruang pamer dengan rel lampu dan partisi yang dapat ditata ulang."
    },
    {
      id: "r-studio1", code: "B-02", name: "Studio Desain 1", building: "Gedung B", floor: 2,
      capacity: 40, status: "aktif",
      facilities: ["Meja Gambar", "Proyektor", "AC", "Whiteboard", "Wi-Fi"],
      note: "Studio kerja untuk kelas desain dengan meja gambar tetap."
    },
    {
      id: "r-studio2", code: "B-03", name: "Studio Desain 2", building: "Gedung B", floor: 2,
      capacity: 40, status: "aktif",
      facilities: ["Meja Gambar", "Proyektor", "AC", "Wi-Fi"],
      note: "Studio kerja desain dengan penataan meja modular."
    },
    {
      id: "r-labkom", code: "B-04", name: "Laboratorium Komputer", building: "Gedung B", floor: 3,
      capacity: 36, status: "aktif",
      facilities: ["36 PC", "Proyektor", "AC", "Wi-Fi", "Printer"],
      note: "Lab dengan 36 workstation untuk kelas perangkat lunak dan ujian praktik."
    },
    {
      id: "r-foto", code: "C-01", name: "Studio Fotografi", building: "Gedung C", floor: 1,
      capacity: 20, status: "aktif",
      facilities: ["Green Screen", "Lighting Kit", "AC", "Wi-Fi"],
      note: "Studio dengan green screen, reflektor, dan lampu studio portabel."
    },
    {
      id: "r-kuliah1", code: "C-02", name: "Ruang Kuliah 2.01", building: "Gedung C", floor: 2,
      capacity: 45, status: "aktif",
      facilities: ["Proyektor", "AC", "Whiteboard", "Wi-Fi"],
      note: "Ruang kuliah standar dengan tata letak baris dan papan tulis penuh."
    },
    {
      id: "r-kuliah2", code: "C-03", name: "Ruang Kuliah 2.02", building: "Gedung C", floor: 2,
      capacity: 45, status: "aktif",
      facilities: ["Proyektor", "AC", "Whiteboard", "Wi-Fi"],
      note: "Ruang kuliah standar yang berdekatan dengan Ruang Kuliah 2.01."
    },
    {
      id: "r-diskusi", code: "C-04", name: "Ruang Diskusi C.03", building: "Gedung C", floor: 3,
      capacity: 12, status: "aktif",
      facilities: ["TV 55 inci", "Whiteboard", "AC", "Wi-Fi"],
      note: "Ruang kecil untuk kelompok tugas, bimbingan, dan rapat tim."
    },
    {
      id: "r-cowork", code: "C-05", name: "Co-working Space", building: "Gedung C", floor: 3,
      capacity: 60, status: "aktif",
      facilities: ["Wi-Fi", "AC", "Colokan Listrik", "Meja Lipat", "Kopi"],
      note: "Area kerja terbuka untuk komunitas mahasiswa dan kegiatan inkubasi."
    }
  ];

  var USERS = [
    {
      id: "u-nia", name: "Nia Pramesti", email: "nia@student.idbbali.ac.id",
      password: "demo1234", role: "mahasiswa", identity: "NIM 2101010234",
      initials: "NP", program: "Desain Komunikasi Visual"
    },
    {
      id: "u-bagus", name: "Bagus Wirawan", email: "bagus@student.idbbali.ac.id",
      password: "demo1234", role: "mahasiswa", identity: "NIM 2101010411",
      initials: "BW", program: "Bisnis Digital"
    },
    {
      id: "u-ayu", name: "Dr. Ayu Lestari", email: "ayu@idbbali.ac.id",
      password: "demo1234", role: "dosen", identity: "NIP 198804152012",
      initials: "AL", program: "Dosen Desain Komunikasi Visual"
    },
    {
      id: "u-arta", name: "Komang Arta", email: "arta@idbbali.ac.id",
      password: "demo1234", role: "dosen", identity: "NIP 199002072015",
      initials: "KA", program: "Staf Akademik"
    },
    {
      id: "u-sari", name: "Made Sari", email: "admin@idbbali.ac.id",
      password: "demo1234", role: "admin", identity: "Admin Reservasi",
      initials: "MS", program: "Bagian Umum dan Sarana"
    },
    {
      id: "u-wayan", name: "Wayan Teknisi", email: "operator@idbbali.ac.id",
      password: "demo1234", role: "operator", identity: "Operator Layanan",
      initials: "WT", program: "Teknologi Informasi"
    }
  ];

  var SETTINGS = {
    openHour: "07:00",
    closeHour: "22:00",
    minHours: 1,
    maxHours: 4,
    windowDays: 30,
    cancelHours: 24,
    autoApprove: false,
    announcement: "Pengajuan diproses admin pada hari kerja, pukul 08.00–16.00."
  };

  function makeSeed() {
    var year = new Date().getFullYear();
    var seq = 0;

    function code() {
      seq += 1;
      return "RSV-" + year + "-" + ("0000" + seq).slice(-4);
    }

    function history(at, by, action, note) {
      return { at: at, by: by, action: action, note: note || "" };
    }

    var reservations = [];

    function add(r) {
      var c = code();
      var h = [history(r.createdAt, r.userId, "Pengajuan dibuat", "Status awal: Menunggu")];
      if (r.status === "disetujui") {
        h.push(history(r.decidedAt, r.decidedBy || "u-sari", "Disetujui", r.decisionNote || "Sesuai ketersediaan ruang."));
      } else if (r.status === "ditolak") {
        h.push(history(r.decidedAt, r.decidedBy || "u-sari", "Ditolak", r.decisionNote || "Jadwal tidak tersedia."));
      } else if (r.status === "dibatalkan") {
        h.push(history(r.decidedAt, r.decidedBy || r.userId, "Dibatalkan", r.decisionNote || "Dibatalkan oleh pemohon."));
      }
      reservations.push({
        id: r.id || "v-" + c.toLowerCase(),
        code: c,
        userId: r.userId,
        roomId: r.roomId,
        activity: r.activity,
        category: r.category || "Akademik",
        date: r.date,
        start: r.start,
        end: r.end,
        participants: r.participants,
        contact: r.contact || "",
        note: r.note || "",
        status: r.status,
        createdAt: r.createdAt,
        decidedAt: r.decidedAt || null,
        decidedBy: r.decidedBy || null,
        decisionNote: r.decisionNote || "",
        history: h
      });
    }

    /* ---- hari ini ---- */
    add({
      userId: "u-nia", roomId: "r-senat", activity: "Rapat Himpunan Mahasiswa DKV",
      category: "Organisasi", date: dateOffset(0), start: "09:00", end: "11:00",
      participants: 18, contact: "0812-3456-7890", status: "disetujui",
      createdAt: at(-3, 10, 12), decidedAt: at(-2, 9, 5), decidedBy: "u-sari",
      decisionNote: "Ruang tersedia, agenda sesuai jam operasional."
    });
    add({
      userId: "u-ayu", roomId: "r-audit", activity: "Kuliah Tamu: Desain dan Industri Kreatif",
      category: "Akademik", date: dateOffset(0), start: "13:00", end: "15:30",
      participants: 96, contact: "0813-8899-1122", status: "disetujui",
      createdAt: at(-5, 14, 30), decidedAt: at(-4, 8, 42), decidedBy: "u-sari",
      decisionNote: "Disetujui untuk kegiatan akademik terjadwal."
    });
    add({
      userId: "u-bagus", roomId: "r-studio1", activity: "Latihan Paduan Suara Kampus",
      category: "Organisasi", date: dateOffset(0), start: "16:00", end: "18:00",
      participants: 24, contact: "0857-2200-3311", status: "menunggu",
      createdAt: at(0, 7, 15)
    });

    /* ---- besok ---- */
    add({
      userId: "u-bagus", roomId: "r-foto", activity: "Workshop Fotografi Produk",
      category: "Akademik", date: dateOffset(1), start: "10:00", end: "12:00",
      participants: 14, contact: "0857-2200-3311", status: "disetujui",
      createdAt: at(-2, 16, 40), decidedAt: at(-1, 10, 10), decidedBy: "u-sari"
    });
    add({
      userId: "u-ayu", roomId: "r-senat", activity: "Rapat Kurikulum Semester Ganjil",
      category: "Akademik", date: dateOffset(1), start: "09:00", end: "11:00",
      participants: 20, contact: "0813-8899-1122", status: "menunggu",
      createdAt: at(0, 8, 25)
    });

    /* ---- +2 ---- */
    add({
      userId: "u-ayu", roomId: "r-audit", activity: "Seminar Bisnis Digital",
      category: "Seminar", date: dateOffset(2), start: "08:00", end: "12:00",
      participants: 110, contact: "0813-8899-1122", status: "disetujui",
      createdAt: at(-6, 11, 5), decidedAt: at(-5, 9, 30), decidedBy: "u-sari"
    });
    add({
      userId: "u-nia", roomId: "r-labkom", activity: "Lomba UI/UX Antar Kelas",
      category: "Lomba", date: dateOffset(2), start: "13:00", end: "17:00",
      participants: 32, contact: "0812-3456-7890", status: "menunggu",
      createdAt: at(-1, 19, 12)
    });

    /* ---- +3 ---- */
    add({
      userId: "u-nia", roomId: "r-diskusi", activity: "Diskusi Kelompok Tugas Akhir",
      category: "Akademik", date: dateOffset(3), start: "14:00", end: "16:00",
      participants: 8, contact: "0812-3456-7890", status: "disetujui",
      createdAt: at(-4, 13, 0), decidedAt: at(-3, 9, 15), decidedBy: "u-sari"
    });
    add({
      userId: "u-ayu", roomId: "r-galeri", activity: "Pameran Karya Mahasiswa Semester 5",
      category: "Akademik", date: dateOffset(3), start: "09:00", end: "17:00",
      participants: 75, contact: "0813-8899-1122", status: "disetujui",
      createdAt: at(-7, 10, 20), decidedAt: at(-6, 14, 0), decidedBy: "u-sari",
      decisionNote: "Durasi delapan jam disetujui khusus untuk pameran."
    });
    add({
      userId: "u-bagus", roomId: "r-senat", activity: "Rapat BEM: Persiapan Ormawa Fair",
      category: "Organisasi", date: dateOffset(3), start: "14:00", end: "16:00",
      participants: 22, contact: "0857-2200-3311", status: "ditolak",
      createdAt: at(-2, 8, 5), decidedAt: at(-1, 9, 20), decidedBy: "u-sari",
      decisionNote: "Ruang rapat senat diprioritaskan untuk agenda pimpinan pada jam tersebut."
    });

    /* ---- +5 ---- */
    add({
      userId: "u-bagus", roomId: "r-kuliah1", activity: "Kelas Tambahan Desain Grafis",
      category: "Akademik", date: dateOffset(5), start: "07:30", end: "09:30",
      participants: 42, contact: "0857-2200-3311", status: "menunggu",
      createdAt: at(-1, 15, 45)
    });
    add({
      userId: "u-nia", roomId: "r-foto", activity: "Rekaman Podcast Kampus",
      category: "Lainnya", date: dateOffset(5), start: "13:00", end: "15:00",
      participants: 6, contact: "0812-3456-7890", status: "dibatalkan",
      createdAt: at(-6, 9, 0), decidedAt: at(-2, 10, 30), decidedBy: "u-nia",
      decisionNote: "Jadwal narasumber berubah."
    });

    /* ---- +7 ---- */
    add({
      userId: "u-nia", roomId: "r-cowork", activity: "English Club Mingguan",
      category: "Organisasi", date: dateOffset(7), start: "15:00", end: "17:00",
      participants: 30, contact: "0812-3456-7890", status: "menunggu",
      createdAt: at(0, 6, 50)
    });
    add({
      userId: "u-ayu", roomId: "r-labkom", activity: "Pelatihan Perangkat Lunak untuk Dosen",
      category: "Akademik", date: dateOffset(7), start: "09:00", end: "12:00",
      participants: 28, contact: "0813-8899-1122", status: "disetujui",
      createdAt: at(-9, 13, 15), decidedAt: at(-8, 9, 0), decidedBy: "u-sari"
    });

    /* ---- masa lalu ---- */
    add({
      userId: "u-bagus", roomId: "r-labkom", activity: "Turnamen E-Sport Antar Fakultas",
      category: "Lomba", date: dateOffset(-1), start: "15:00", end: "18:00",
      participants: 34, contact: "0857-2200-3311", status: "disetujui",
      createdAt: at(-8, 10, 0), decidedAt: at(-7, 11, 30), decidedBy: "u-sari"
    });
    add({
      userId: "u-ayu", roomId: "r-senat", activity: "Rapat Evaluasi Semester",
      category: "Akademik", date: dateOffset(-2), start: "10:00", end: "12:00",
      participants: 19, contact: "0813-8899-1122", status: "disetujui",
      createdAt: at(-10, 8, 0), decidedAt: at(-9, 8, 30), decidedBy: "u-sari"
    });

    var audit = [];
    reservations.forEach(function (r) {
      r.history.forEach(function (h, i) {
        audit.push({
          id: "log-" + r.code + "-" + i,
          at: h.at,
          actorId: h.by,
          action: h.action,
          target: r.code,
          detail: h.note,
          kind: i === 0 ? "create" : (r.status === "disetujui" ? "approve" : r.status)
        });
      });
    });
    audit.sort(function (a, b) { return a.at < b.at ? 1 : -1; });

    return {
      version: IDB.DB_VERSION,
      seq: seq,
      rooms: JSON.parse(JSON.stringify(ROOMS)),
      users: JSON.parse(JSON.stringify(USERS)),
      reservations: reservations,
      settings: JSON.parse(JSON.stringify(SETTINGS)),
      audit: audit,
      createdAt: new Date().toISOString()
    };
  }

  IDB.DB_VERSION = 1;
  IDB.MONTHS_ID = MONTHS_ID;
  IDB.seed = makeSeed;
  IDB.facilitiesCatalog = [
    "AC", "Wi-Fi", "Proyektor", "Whiteboard", "Sound System", "Panggung",
    "Live Streaming", "Video Conference", "Meja Gambar", "36 PC", "Printer",
    "Green Screen", "Lighting Kit", "Pencahayaan Pameran", "Partisi",
    "TV 55 inci", "Colokan Listrik", "Meja Lipat", "Kopi"
  ];
})();
