/**
 * Data contoh yang dipakai bersama oleh seed database lokal dan mode demo
 * berbasis localStorage. Modul ini sengaja bebas dari dependensi server
 * (Node.js/PGlite) agar aman diimpor komponen klien.
 */

export const FACILITY_NAMES = [
  "AC", "Wi-Fi", "Proyektor", "Whiteboard", "Sound System", "Panggung",
  "Live Streaming", "Video Conference", "Meja Gambar", "36 PC", "Printer",
  "Green Screen", "Lighting Kit", "Pencahayaan Pameran", "Partisi",
  "TV 55 inci", "Colokan Listrik", "Meja Lipat", "Kopi",
  "iMac", "Mesin Jahit", "Meja Potong", "Alat Cetak", "Peralatan Maket",
  "Koleksi Buku", "Sofa", "Kamera", "Backdrop Foto",
];

export const ROOMS = [
  { code: "AULA", name: "Aula", building: "Gedung Utama", floor: 1, capacity: 300, note: "Aula utama untuk upacara, seminar, wisuda, dan kegiatan besar kampus.", facilities: ["AC", "Wi-Fi", "Proyektor", "Sound System", "Panggung", "Live Streaming"] },
  { code: "SG", name: "Studio Gambar", building: "Gedung Utama", floor: 2, capacity: 40, note: "Studio menggambar dan melukis dengan pencahayaan alami untuk praktik mahasiswa seni dan desain.", facilities: ["AC", "Wi-Fi", "Meja Gambar", "Proyektor"] },
  { code: "LK", name: "Lab Komputer", building: "Gedung Utama", floor: 2, capacity: 36, note: "Laboratorium komputer untuk praktik desain digital, multimedia, dan tugas akhir.", facilities: ["AC", "Wi-Fi", "36 PC", "Proyektor", "Printer"] },
  { code: "LI", name: "Lab iMac", building: "Gedung Utama", floor: 2, capacity: 30, note: "Laboratorium iMac untuk praktik desain, ilustrasi digital, dan produksi multimedia.", facilities: ["AC", "Wi-Fi", "iMac", "Proyektor", "Printer"] },
  { code: "RK", name: "Ruang Kelas", building: "Gedung Utama", floor: 1, capacity: 45, note: "Ruang kelas representatif untuk perkuliahan teori, diskusi, dan presentasi.", facilities: ["AC", "Wi-Fi", "Proyektor", "Whiteboard"] },
  { code: "LFD", name: "Lab Fashion Design", building: "Gedung Utama", floor: 3, capacity: 30, note: "Laboratorium desain mode untuk praktik merancang, memotong, dan menjahit.", facilities: ["AC", "Wi-Fi", "Mesin Jahit", "Meja Potong", "Meja Gambar"] },
  { code: "GSG", name: "Gedung Serba Guna", building: "Gedung Serba Guna", floor: 1, capacity: 500, note: "Gedung serbaguna untuk kegiatan kampus, pameran, dan acara komunitas.", facilities: ["AC", "Wi-Fi", "Sound System", "Panggung", "Colokan Listrik", "Meja Lipat"] },
  { code: "RA", name: "Ruang Asistensi", building: "Gedung Utama", floor: 3, capacity: 25, note: "Ruang asistensi untuk bimbingan tugas, konsultasi, dan diskusi kelompok kecil.", facilities: ["AC", "Wi-Fi", "Whiteboard", "Meja Lipat", "TV 55 inci"] },
  { code: "SP", name: "Studio Pola", building: "Gedung Utama", floor: 3, capacity: 30, note: "Studio pola untuk praktik pembuatan pola dan konstruksi busana.", facilities: ["AC", "Wi-Fi", "Meja Gambar", "Meja Potong"] },
  { code: "SF", name: "Studio Foto", building: "Gedung Utama", floor: 2, capacity: 20, note: "Studio foto dengan backdrop dan pencahayaan untuk praktik fotografi.", facilities: ["AC", "Wi-Fi", "Green Screen", "Lighting Kit", "Kamera", "Backdrop Foto"] },
  { code: "LSD", name: "Lab Software Development", building: "Gedung Utama", floor: 3, capacity: 30, note: "Laboratorium pengembangan perangkat lunak untuk praktik pemrograman dan proyek digital.", facilities: ["AC", "Wi-Fi", "36 PC", "Proyektor", "Printer"] },
  { code: "RKM", name: "Ruang Kelas Magister", building: "Gedung Magister", floor: 1, capacity: 25, note: "Ruang kelas magister dengan peralatan presentasi dan kamera untuk pembelajaran digital.", facilities: ["AC", "Wi-Fi", "Proyektor", "Whiteboard", "Video Conference", "Kamera"] },
];

export const USERS = [
  { key: "nia", name: "Nia Pramesti", email: "nia@student.idbbali.ac.id", role: "mahasiswa", identity: "NIM 2101010234", program: "Desain Komunikasi Visual" },
  { key: "bagus", name: "Bagus Wirawan", email: "bagus@student.idbbali.ac.id", role: "mahasiswa", identity: "NIM 2101010411", program: "Bisnis Digital" },
  { key: "ayu", name: "Dr. Ayu Lestari", email: "ayu@idbbali.ac.id", role: "dosen", identity: "NIP 198804152012", program: "Dosen Desain Komunikasi Visual" },
  { key: "arta", name: "Komang Arta", email: "arta@idbbali.ac.id", role: "dosen", identity: "NIP 199002072015", program: "Staf Akademik" },
  { key: "sari", name: "Made Sari", email: "admin@idbbali.ac.id", role: "admin", identity: "Admin Reservasi", program: "Bagian Umum dan Sarana" },
];

export interface SeedReservation {
  user: string;
  room: string;
  activity: string;
  category: string;
  offset: number;
  start: string;
  end: string;
  participants: number;
  contact: string;
  status: "menunggu" | "disetujui" | "ditolak" | "dibatalkan";
  createdDaysAgo: number;
  decidedDaysAgo?: number;
  note?: string;
  cancelledByOwner?: boolean;
}

export const SEED_RESERVATIONS: SeedReservation[] = [
  { user: "nia", room: "RA", activity: "Rapat Himpunan Mahasiswa DKV", category: "Organisasi", offset: 0, start: "09:00", end: "11:00", participants: 18, contact: "0812-3456-7890", status: "disetujui", createdDaysAgo: 3, decidedDaysAgo: 2, note: "Ruang tersedia, agenda sesuai jam operasional." },
  { user: "ayu", room: "AULA", activity: "Kuliah Tamu: Desain dan Industri Kreatif", category: "Akademik", offset: 0, start: "13:00", end: "15:30", participants: 96, contact: "0813-8899-1122", status: "disetujui", createdDaysAgo: 5, decidedDaysAgo: 4, note: "Disetujui untuk kegiatan akademik terjadwal." },
  { user: "bagus", room: "RK", activity: "Latihan Paduan Suara Kampus", category: "Organisasi", offset: 0, start: "16:00", end: "18:00", participants: 24, contact: "0857-2200-3311", status: "menunggu", createdDaysAgo: 0 },
  { user: "bagus", room: "SF", activity: "Workshop Fotografi Produk", category: "Akademik", offset: 1, start: "10:00", end: "12:00", participants: 14, contact: "0857-2200-3311", status: "disetujui", createdDaysAgo: 2, decidedDaysAgo: 1 },
  { user: "ayu", room: "RA", activity: "Rapat Kurikulum Semester Ganjil", category: "Akademik", offset: 1, start: "09:00", end: "11:00", participants: 20, contact: "0813-8899-1122", status: "menunggu", createdDaysAgo: 0 },
  { user: "ayu", room: "AULA", activity: "Seminar Bisnis Digital", category: "Seminar", offset: 2, start: "08:00", end: "12:00", participants: 110, contact: "0813-8899-1122", status: "disetujui", createdDaysAgo: 6, decidedDaysAgo: 5 },
  { user: "nia", room: "LK", activity: "Lomba UI/UX Antar Kelas", category: "Lomba", offset: 2, start: "13:00", end: "17:00", participants: 32, contact: "0812-3456-7890", status: "menunggu", createdDaysAgo: 1 },
  { user: "nia", room: "RKM", activity: "Diskusi Kelompok Tugas Akhir", category: "Akademik", offset: 3, start: "14:00", end: "16:00", participants: 8, contact: "0812-3456-7890", status: "disetujui", createdDaysAgo: 4, decidedDaysAgo: 3 },
  { user: "ayu", room: "GSG", activity: "Pameran Karya Mahasiswa Semester 5", category: "Akademik", offset: 3, start: "09:00", end: "17:00", participants: 75, contact: "0813-8899-1122", status: "disetujui", createdDaysAgo: 7, decidedDaysAgo: 6, note: "Durasi delapan jam disetujui khusus untuk pameran." },
  { user: "bagus", room: "RA", activity: "Rapat BEM: Persiapan Ormawa Fair", category: "Organisasi", offset: 3, start: "14:00", end: "16:00", participants: 22, contact: "0857-2200-3311", status: "ditolak", createdDaysAgo: 2, decidedDaysAgo: 1, note: "Ruang rapat senat diprioritaskan untuk agenda pimpinan pada jam tersebut." },
  { user: "bagus", room: "AULA", activity: "Kelas Tambahan Desain Grafis", category: "Akademik", offset: 5, start: "07:30", end: "09:30", participants: 42, contact: "0857-2200-3311", status: "menunggu", createdDaysAgo: 1 },
  { user: "nia", room: "SF", activity: "Rekaman Podcast Kampus", category: "Lainnya", offset: 5, start: "13:00", end: "15:00", participants: 6, contact: "0812-3456-7890", status: "dibatalkan", createdDaysAgo: 6, decidedDaysAgo: 2, note: "Jadwal narasumber berubah.", cancelledByOwner: true },
  { user: "nia", room: "GSG", activity: "English Club Mingguan", category: "Organisasi", offset: 7, start: "15:00", end: "17:00", participants: 30, contact: "0812-3456-7890", status: "menunggu", createdDaysAgo: 0 },
  { user: "ayu", room: "LK", activity: "Pelatihan Perangkat Lunak untuk Dosen", category: "Akademik", offset: 7, start: "09:00", end: "12:00", participants: 28, contact: "0813-8899-1122", status: "disetujui", createdDaysAgo: 9, decidedDaysAgo: 8 },
  { user: "bagus", room: "LK", activity: "Turnamen E-Sport Antar Fakultas", category: "Lomba", offset: -1, start: "15:00", end: "18:00", participants: 34, contact: "0857-2200-3311", status: "disetujui", createdDaysAgo: 8, decidedDaysAgo: 7 },
  { user: "ayu", room: "RA", activity: "Rapat Evaluasi Semester", category: "Akademik", offset: -2, start: "10:00", end: "12:00", participants: 19, contact: "0813-8899-1122", status: "disetujui", createdDaysAgo: 10, decidedDaysAgo: 9 },
];
