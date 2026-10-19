import React, { useState, useEffect } from 'react';
import { StudentSession, Question, ExamSettings } from '../types/game';
import { syncService } from '../game/syncService';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { Footer } from './Footer';
import {
  Users,
  Trophy,
  CheckCircle2,
  RotateCcw,
  Download,
  Share2,
  Play,
  LogOut,
  Sparkles,
  Plane,
  Rocket,
  Compass,
  FileSpreadsheet,
  BarChart3,
  Search,
  Copy,
  Check,
  BookOpen,
  KeyRound,
  Sliders,
  Shuffle,
  Award,
  Settings2,
  Wifi,
  Lock,
  UploadCloud,
  Code2,
  ExternalLink,
  HelpCircle,
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface TeacherDashboardProps {
  questions: Question[];
  onLaunchSimulator: () => void;
  onExitTeacherMode: () => void;
  onOpenQuestionManager: () => void;
}

const GAS_CODE_TEMPLATE = `/**
 * SKYQUIZ 3D - GOOGLE APPS SCRIPT WEB APP (Code.gs)
 * Panduan Pemasangan:
 * 1. Buat Spreadsheet baru di Google Sheets.
 * 2. Buka menu: Ekstensi > Apps Script.
 * 3. Hapus kode bawaan, tempelkan SELURUH skrip ini, lalu klik Simpan (Ctrl+S / Ikon Disket).
 * 4. Klik tombol biru di kanan atas: Terapkan (Deploy) > Deployment baru.
 * 5. Pilih jenis (roda gigi): Aplikasi Web (Web App).
 *    - Deskripsi: SkyQuiz 3D Penyimpanan Ujian
 *    - Jalankan sebagai: Saya (email Anda)
 *    - Siapa yang memiliki akses: Siapa saja (Anyone) -> PENTING AGAR BISA DIAKSES GAME!
 * 6. Klik Terapkan, beri izin akun Google jika muncul peringatan otorisasi.
 * 7. Salin URL Aplikasi Web (.exec) dan tempelkan ke kolom URL di SkyQuiz 3D!
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  
  if (action === 'getQuestions') {
    return getQuestionsFromSheet();
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    message: 'Google Apps Script SkyQuiz 3D aktif dan terhubung ke Spreadsheet!',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : '';
    var payload = JSON.parse(raw);
    var action = payload.action || 'syncStudent';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getOrCreateSheet(ss, 'Hasil Ujian Siswa');
    initStudentHeaders(sheet);
    
    if (action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Koneksi ke Google Apps Script berhasil!'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'syncStudents' || action === 'syncAll') {
      var students = payload.students || [];
      students.forEach(function(st) {
        appendOrUpdateStudentRecord(sheet, st, payload.examCode);
      });
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        count: students.length,
        message: 'Berhasil menyimpan ' + students.length + ' data siswa ke Google Sheet!'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'syncStudent') {
      var student = payload.student;
      if (!student) throw new Error('Data siswa tidak ditemukan dalam payload');
      appendOrUpdateStudentRecord(sheet, student, payload.examCode);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Hasil ujian ' + student.name + ' berhasil disimpan ke Google Sheet!'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Aksi tidak dikenal: ' + action
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
  }
  return s;
}

function initStudentHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    var headers = [
      'Waktu Simpan',
      'ID Siswa',
      'Nama Siswa',
      'Kelas',
      'Kode Ujian',
      'Model Pesawat',
      'Total Nilai',
      'Jumlah Benar',
      'Jumlah Salah',
      'Total Soal',
      'Akurasi (%)',
      'Status Ujian',
      'Waktu Mulai',
      'Detail Jawaban'
    ];
    sheet.appendRow(headers);
    var range = sheet.getRange(1, 1, 1, headers.length);
    range.setBackground('#0f172a');
    range.setFontColor('#38bdf8');
    range.setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
}

function appendOrUpdateStudentRecord(sheet, st, examCode) {
  var correctCount = 0;
  var wrongCount = 0;
  var details = [];
  
  if (Array.isArray(st.answers)) {
    st.answers.forEach(function(a, idx) {
      if (a.isCorrect) correctCount++;
      else wrongCount++;
      details.push('No.' + (idx + 1) + ': ' + (a.isCorrect ? '✅' : '❌') + ' (' + a.selectedOption + ')');
    });
  }
  
  var totalQ = st.totalQuestions || (correctCount + wrongCount) || 1;
  var acc = Math.round((correctCount / totalQ) * 100);
  var nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  
  sheet.appendRow([
    nowStr,
    st.id || '',
    st.name || '',
    st.studentClass || '',
    st.examCode || examCode || '',
    st.aircraftType || '',
    st.score || 0,
    correctCount,
    wrongCount,
    totalQ,
    acc + '%',
    st.status || 'COMPLETED',
    st.joinedAt ? Utilities.formatDate(new Date(st.joinedAt), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : nowStr,
    details.join(' | ')
  ]);
}

function getQuestionsFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Bank Soal') || ss.getSheets()[0];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Lembar soal masih kosong' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  var questions = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var qText = String(row[1] || row[0] || '').trim();
    if (!qText) continue;
    var optA = String(row[2] || '').trim();
    var optB = String(row[3] || '').trim();
    var optC = String(row[4] || '').trim();
    var optD = String(row[5] || '').trim();
    var opts = [optA, optB, optC, optD].filter(function(o) { return o.length > 0; });
    var key = String(row[6] || 'A').trim().toUpperCase();
    var cIdx = 0;
    if (key === 'B' || key === '2') cIdx = 1;
    else if (key === 'C' || key === '3') cIdx = 2;
    else if (key === 'D' || key === '4') cIdx = 3;
    var exp = String(row[7] || ('Jawaban yang benar adalah pilihan ' + key)).trim();
    
    questions.push({
      id: 'soal-gas-' + i,
      question: qText,
      options: opts,
      correctIndex: cIdx,
      explanation: exp
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    count: questions.length,
    questions: questions
  })).setMimeType(ContentService.MimeType.JSON);
}`;

const DEFAULT_GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwX4wzAwzRP9pa8IsLavaUHrbi870F6FSjyLILdLsab9ckaiyu45AxKyZu-mia9R6Uv3Q/exec';

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  questions,
  onLaunchSimulator,
  onExitTeacherMode,
  onOpenQuestionManager,
}) => {
  const [students, setStudents] = useState<StudentSession[]>(() => syncService.getLocalStudents());
  const [settings, setSettings] = useState<ExamSettings>(() => syncService.getCachedSettings());
  const [activeTab, setActiveTab] = useState<'REKAP' | 'MONITOR' | 'QUESTIONS' | 'SHEETS' | 'SETTINGS'>('REKAP');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedExamCodeFilter, setSelectedExamCodeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [serverIps, setServerIps] = useState<string[]>([]);

  // Form states for settings
  const [formExamCode, setFormExamCode] = useState<string>(settings?.examCode || 'PAS-1');
  const [formShuffle, setFormShuffle] = useState<boolean>(settings?.shuffleQuestions ?? false);
  const [formScorePerQuestion, setFormScorePerQuestion] = useState<number>(settings?.scorePerQuestion ?? 20);
  const [formUseCombo, setFormUseCombo] = useState<boolean>(settings?.useComboBonus ?? false);
  const [settingsSavedToast, setSettingsSavedToast] = useState<boolean>(false);

  // Google Sheets & Google Apps Script state
  const [formGasUrl, setFormGasUrl] = useState<string>(settings?.gasWebAppUrl || DEFAULT_GAS_WEB_APP_URL);
  const [formAutoSync, setFormAutoSync] = useState<boolean>(settings?.autoSyncToSheets ?? true);
  const [formSheetQuestionsUrl, setFormSheetQuestionsUrl] = useState<string>(settings?.googleSheetQuestionsUrl || '');
  const [isTestingGas, setIsTestingGas] = useState<boolean>(false);
  const [gasTestResult, setGasTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [isFetchingSheetQuestions, setIsFetchingSheetQuestions] = useState<boolean>(false);
  const [previewQuestions, setPreviewQuestions] = useState<Question[]>([]);
  const [sheetFetchError, setSheetFetchError] = useState<string | null>(null);
  const [copiedGasCode, setCopiedGasCode] = useState<boolean>(false);
  const [copiedHeaders, setCopiedHeaders] = useState<boolean>(false);
  const [sheetsToast, setSheetsToast] = useState<string | null>(null);
  const [showGasGuide, setShowGasGuide] = useState<boolean>(false);

  useEffect(() => {
    // Initial fetch
    syncService.fetchLatestSession().then((data) => {
      if (data?.students) {
        setStudents(data.students);
      }
      if (data?.settings) {
        setSettings(data.settings);
        setFormExamCode(data.settings.examCode);
        setFormShuffle(data.settings.shuffleQuestions);
        setFormScorePerQuestion(data.settings.scorePerQuestion);
        setFormUseCombo(data.settings.useComboBonus);
        if (data.settings.gasWebAppUrl) {
          setFormGasUrl(data.settings.gasWebAppUrl);
        } else {
          setFormGasUrl(DEFAULT_GAS_WEB_APP_URL);
        }
        if (typeof data.settings.autoSyncToSheets === 'boolean') setFormAutoSync(data.settings.autoSyncToSheets);
        if (data.settings.googleSheetQuestionsUrl) setFormSheetQuestionsUrl(data.settings.googleSheetQuestionsUrl);
      }
      if (data?.serverIps) {
        setServerIps(data.serverIps);
      }
    });

    // Real-time listener for WebSocket updates
    const unsubscribeStudents = syncService.onStudentsUpdate((updated) => {
      setStudents(updated);
    });

    const unsubscribeSettings = syncService.onSettingsUpdate((newSettings) => {
      setSettings(newSettings);
      setFormExamCode(newSettings.examCode);
      setFormShuffle(newSettings.shuffleQuestions);
      setFormScorePerQuestion(newSettings.scorePerQuestion);
      setFormUseCombo(newSettings.useComboBonus);
      if (newSettings.gasWebAppUrl) {
        setFormGasUrl(newSettings.gasWebAppUrl);
      } else {
        setFormGasUrl(DEFAULT_GAS_WEB_APP_URL);
      }
      if (typeof newSettings.autoSyncToSheets === 'boolean') setFormAutoSync(newSettings.autoSyncToSheets);
      if (newSettings.googleSheetQuestionsUrl) setFormSheetQuestionsUrl(newSettings.googleSheetQuestionsUrl);
    });

    // Active live polling interval (every 2 seconds) to guarantee multi-device sync
    const pollTimer = setInterval(() => {
      syncService.fetchLatestSession().then((data) => {
        if (data?.students) {
          setStudents(data.students);
        }
        if (data?.serverIps) {
          setServerIps(data.serverIps);
        }
      });
    }, 2000);

    return () => {
      unsubscribeStudents();
      unsubscribeSettings();
      clearInterval(pollTimer);
    };
  }, []);

  const handleGenerateExamCode = async () => {
    const updated = await syncService.generateExamCode('TBRSKY');
    if (updated) {
      setSettings(updated);
      setFormExamCode(updated.examCode);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = await syncService.updateSettings('TBRSKY', {
      examCode: formExamCode.trim().toUpperCase() || settings.examCode,
      shuffleQuestions: formShuffle,
      scorePerQuestion: Number(formScorePerQuestion) || 20,
      useComboBonus: formUseCombo,
    });
    if (updated) {
      setSettings(updated);
      setSettingsSavedToast(true);
      setTimeout(() => setSettingsSavedToast(false), 3000);
    }
  };

  const handleSaveGasSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated = await syncService.updateSettings('TBRSKY', {
      gasWebAppUrl: formGasUrl.trim(),
      autoSyncToSheets: formAutoSync,
      googleSheetQuestionsUrl: formSheetQuestionsUrl.trim(),
    });
    if (updated) {
      setSettings(updated);
      setSheetsToast('Pengaturan Google Sheet & GAS berhasil disimpan!');
      setTimeout(() => setSheetsToast(null), 3500);
    }
  };

  const handleTestGasConnection = async () => {
    if (!formGasUrl.trim()) {
      alert('Silakan masukkan URL Web App Google Apps Script terlebih dahulu!');
      return;
    }
    setIsTestingGas(true);
    setGasTestResult(null);
    try {
      const res = await syncService.testGasConnection(formGasUrl.trim());
      setGasTestResult(res);
      if (res.success) {
        setSheetsToast('Koneksi Google Apps Script berhasil!');
        setTimeout(() => setSheetsToast(null), 3000);
      }
    } catch (err: any) {
      setGasTestResult({ success: false, message: err?.message || 'Gagal terhubung' });
    } finally {
      setIsTestingGas(false);
    }
  };

  const handleSyncToGoogleSheets = async () => {
    const targetGasUrl = formGasUrl.trim() || settings.gasWebAppUrl;
    if (!targetGasUrl) {
      alert('Silakan masukkan URL Web App Google Apps Script terlebih dahulu di tab Google Sheet & GAS!');
      setActiveTab('SHEETS');
      return;
    }
    if (students.length === 0) {
      alert('Belum ada data nilai siswa untuk dikirim ke Google Sheet.');
      return;
    }

    setIsSyncingSheets(true);
    try {
      const res = await syncService.syncResultsToGoogleSheets('TBRSKY', targetGasUrl);
      if (res.success) {
        setSheetsToast(`Berhasil mengirim ${res.count || students.length} data siswa ke Google Sheet!`);
        setTimeout(() => setSheetsToast(null), 4000);
      } else {
        alert(res.error || 'Gagal mengirim data ke Google Sheet.');
      }
    } catch (err: any) {
      alert('Terjadi kesalahan: ' + (err?.message || String(err)));
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleFetchSheetQuestions = async () => {
    if (!formSheetQuestionsUrl.trim()) {
      alert('Masukkan tautan (URL) Google Sheet terlebih dahulu!');
      return;
    }
    setIsFetchingSheetQuestions(true);
    setSheetFetchError(null);
    try {
      const res = await syncService.fetchQuestionsFromGoogleSheet('TBRSKY', formSheetQuestionsUrl.trim());
      if (res.success && res.questions && res.questions.length > 0) {
        setPreviewQuestions(res.questions);
        setSheetsToast(`Berhasil membaca ${res.questions.length} soal dari Google Sheet!`);
        setTimeout(() => setSheetsToast(null), 4000);
      } else {
        setSheetFetchError(res.error || 'Tidak ada soal yang ditemukan.');
        alert(res.error || 'Tidak ada soal yang ditemukan.');
      }
    } catch (err: any) {
      setSheetFetchError(err?.message || 'Gagal mengambil soal');
    } finally {
      setIsFetchingSheetQuestions(false);
    }
  };

  const handleApplySheetQuestions = async () => {
    if (previewQuestions.length === 0) return;
    if (
      confirm(
        `Terapkan ${previewQuestions.length} soal dari Google Sheet ke dalam sesi ujian game? Soal aktif saat ini akan diganti dan langsung dibroadcast ke seluruh siswa.`
      )
    ) {
      const success = await syncService.updateQuestions('TBRSKY', previewQuestions);
      if (success) {
        setSheetsToast(`✅ ${previewQuestions.length} soal dari Google Sheet berhasil diterapkan ke ujian!`);
        setPreviewQuestions([]);
        setTimeout(() => setSheetsToast(null), 4000);
      } else {
        alert('Gagal menerapkan soal.');
      }
    }
  };

  const handleCopyGasCode = () => {
    navigator.clipboard.writeText(GAS_CODE_TEMPLATE);
    setCopiedGasCode(true);
    setTimeout(() => setCopiedGasCode(false), 3000);
  };

  const handleCopyHeaders = () => {
    const headersText = 'No\tPertanyaan\tPilihan A\tPilihan B\tPilihan C\tPilihan D\tKunci Jawaban\tPenjelasan';
    navigator.clipboard.writeText(headersText);
    setCopiedHeaders(true);
    setTimeout(() => setCopiedHeaders(false), 3000);
  };

  const handleDownloadCsvTemplate = () => {
    const csvContent =
      'No,Pertanyaan,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Kunci Jawaban,Penjelasan\n' +
      '1,Organ tubuh manusia yang berfungsi utama memompa darah ke seluruh tubuh adalah?,Paru-paru,Jantung,Hati,Ginjal,B,Jantung memompa darah ke seluruh tubuh melalui sistem peredaran darah.\n' +
      '2,Berapakah hasil akhir dari perhitungan matematika (15 x 4) + 25?,75,80,85,90,C,15 dikali 4 sama dengan 60 kemudian ditambah 25 menghasilkan 85.\n' +
      '3,Sinonim dari kata BRILLIANT dalam bahasa Inggris adalah?,Careless,Clever and smart,Angry,Heavy,B,Brilliant memiliki makna cerdas atau sangat pandai.\n' +
      '4,Danau vulkanik terbesar di Asia Tenggara yang terletak di Sumatera Utara adalah?,Danau Singkarak,Danau Maninjau,Danau Toba,Danau Poso,C,Danau Toba adalah danau kaldera vulkanik terbesar di Asia Tenggara.\n' +
      '5,Planet terbesar di dalam tata surya kita adalah?,Saturnus,Jupiter,Uranus,Neptunus,B,Jupiter merupakan planet berdiameter dan berbobot terbesar di tata surya.\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_soal_google_sheets_skyquiz.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleResetSession = async () => {
    if (confirm('Mulai sesi ujian baru? Semua data jawaban siswa pada sesi ini akan dibersihkan dan semua siswa dapat bermain ulang.')) {
      await syncService.resetSession('TBRSKY');
      setStudents([]);
    }
  };

  const handleResetSingleStudent = async (studentId: string, studentName: string) => {
    if (confirm(`Izinkan siswa "${studentName}" mengulang ujian dari awal? Data jawaban siswa ini akan direset.`)) {
      setResettingId(studentId);
      try {
        await syncService.resetStudent('TBRSKY', studentId);
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
      } finally {
        setResettingId(null);
      }
    }
  };

  const handleLockTeacherAccess = () => {
    if (confirm('Kunci Akses Guru? Anda perlu memasukkan kode guru (TBRSKY) kembali pada kunjungan berikutnya di perangkat ini.')) {
      try {
        localStorage.removeItem('skyquiz_teacher_authenticated');
        localStorage.removeItem('skyquiz_teacher_code');
      } catch {
        // ignore
      }
      onExitTeacherMode();
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(settings.examCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesClass = selectedClassFilter === 'ALL' || s.studentClass === selectedClassFilter;
    const matchesCode = selectedExamCodeFilter === 'ALL' || s.examCode === selectedExamCodeFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentClass && s.studentClass.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesClass && matchesCode && matchesSearch;
  });

  const classList = Array.from(new Set(students.map((s) => s.studentClass).filter(Boolean)));
  const examCodeList = Array.from(new Set(students.map((s) => s.examCode).filter(Boolean)));

  // Metrics
  const totalStudents = students.length;
  const completedStudents = students.filter((s) => s.status === 'COMPLETED').length;
  const avgScore =
    totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + (s.score || 0), 0) / totalStudents)
      : 0;
  const topScore =
    totalStudents > 0 ? Math.max(...students.map((s) => s.score || 0)) : 0;

  // Export functions
  const handleExportExcel = () => {
    if (students.length === 0) {
      alert('Belum ada data siswa untuk diekspor!');
      return;
    }

    const rows = filteredStudents.map((s, idx) => {
      const correctAnswers = (s.answers || []).filter((a) => a.isCorrect).length;
      const totalAnswers = (s.answers || []).length;
      const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      const rowData: Record<string, any> = {
        No: idx + 1,
        'Nama Siswa': s.name,
        Kelas: s.studentClass || '-',
        'Kode Ujian': s.examCode || settings.examCode,
        'Model Pesawat': s.aircraftType,
        'Skor Akhir': s.score || 0,
        'Jawaban Benar': correctAnswers,
        'Total Soal Dijawab': totalAnswers,
        'Akurasi (%)': `${accuracy}%`,
        Status: s.status === 'COMPLETED' ? 'Selesai' : 'Mengerjakan',
        'Waktu Mulai': new Date(s.joinedAt).toLocaleTimeString('id-ID'),
        'Waktu Update': new Date(s.lastUpdated).toLocaleTimeString('id-ID'),
      };

      questions.forEach((q, qIdx) => {
        const ans = (s.answers || []).find((a) => a.questionId === q.id || a.questionIndex === qIdx);
        rowData[`Soal ${qIdx + 1} (${['A', 'B', 'C', 'D'][q.correctIndex]})`] = ans
          ? ans.isCorrect
            ? `BENAR (${ans.selectedOption})`
            : `SALAH (${ans.selectedOption})`
          : 'Belum Dijawab';
      });

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Nilai Siswa');
    XLSX.writeFile(workbook, `SkyQuiz_Rekap_Nilai_${settings.examCode}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportCsv = () => {
    if (students.length === 0) {
      alert('Belum ada data siswa untuk diekspor!');
      return;
    }

    const headers = ['No', 'Nama Siswa', 'Kelas', 'Kode Ujian', 'Model Pesawat', 'Skor Akhir', 'Status', 'Waktu'];
    const rows = filteredStudents.map((s, idx) => [
      idx + 1,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.studentClass || '-'}"`,
      s.examCode || settings.examCode,
      s.aircraftType,
      s.score || 0,
      s.status,
      new Date(s.lastUpdated).toLocaleTimeString('id-ID'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SkyQuiz_Rekap_${settings.examCode}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // URLs for student link sharing
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000';
  const localIp = serverIps.length > 0 ? serverIps[0] : '';
  const localNetworkUrl = localIp
    ? `http://${localIp}:${window.location.port || '3000'}`
    : currentUrl;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30 px-3 sm:px-6 py-2.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20">
            <Plane className="w-5 h-5 text-white transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base text-white tracking-wide">
                SkyQuiz 3D
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30">
                Mode Guru
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Device Online Sync</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-300 font-semibold">{students.length} Siswa Terkoneksi</span>
            </p>
          </div>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Uji Simulator Button */}
          <button
            type="button"
            onClick={onLaunchSimulator}
            className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Buka simulator penerbangan 3D guru"
          >
            <Play className="w-3.5 h-3.5 fill-sky-300" />
            <span className="hidden sm:inline">Uji Simulator</span>
          </button>

          {/* QR Code / Share Link */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Bagikan Tautan & QR Siswa"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Bagikan QR Siswa</span>
          </button>

          {/* Google Sheets Tab Shortcut */}
          <button
            type="button"
            onClick={() => setActiveTab('SHEETS')}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'SHEETS'
                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-400/30'
            }`}
            title="Sumber Data Google Sheet & Google Apps Script"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Sheet & GAS</span>
          </button>

          {/* Reset All Session */}
          <button
            type="button"
            onClick={handleResetSession}
            className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset semua data ujian siswa"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Reset Sesi</span>
          </button>

          {/* Return to Main Menu (Keeps Passcode Saved) */}
          <button
            type="button"
            onClick={onExitTeacherMode}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Kembali ke Menu Utama (Akses tetap tersimpan)"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kembali</span>
          </button>

          {/* Explicit Lock / Logout Teacher */}
          <button
            type="button"
            onClick={handleLockTeacherAccess}
            className="p-1.5 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Kunci Akses Guru (Logout perangkat ini)"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Global Toast Notification */}
      {sheetsToast && (
        <div className="bg-emerald-500 text-slate-950 font-bold px-4 py-2 text-xs text-center flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-top">
          <CheckCircle className="w-4 h-4" />
          <span>{sheetsToast}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 p-3 sm:p-5 max-w-7xl w-full mx-auto space-y-3.5">
        {/* Prominent Auto-Generated Exam Code & Quick Broadcast Banner */}
        <div className="bg-gradient-to-r from-sky-950/70 via-slate-900 to-amber-950/40 border border-sky-400/40 rounded-2xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Kode Ujian Aktif:
                </span>
                <span className="font-mono text-base sm:text-lg font-black tracking-widest text-amber-300 bg-amber-400/15 border border-amber-400/40 px-3 py-0.5 rounded-lg">
                  {settings.examCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Berikan kode ini kepada siswa. Urutan Soal:{' '}
                <strong className={settings.shuffleQuestions ? 'text-emerald-400' : 'text-sky-300'}>
                  {settings.shuffleQuestions ? 'Diacak' : 'Berurutan'}
                </strong>{' '}
                • Nilai per Soal:{' '}
                <strong className="text-amber-300">{settings.scorePerQuestion} Poin</strong> (Skor Maks:{' '}
                {settings.scorePerQuestion * questions.length} Poin)
                {settings.gasWebAppUrl && (
                  <span className="ml-2 text-emerald-400 font-semibold">• G-Sheet Terhubung</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleGenerateExamCode}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Generate kode ujian acak baru secara otomatis"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Generate Kode Baru</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Tersalin' : 'Salin Kode'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SETTINGS')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                activeTab === 'SETTINGS'
                  ? 'bg-sky-500 text-slate-950 border-sky-400'
                  : 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-400/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Pengaturan Ujian</span>
            </button>
          </div>
        </div>

        {/* Minimal Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Siswa Terdata</span>
              <span className="text-xl font-black text-white">{totalStudents}</span>
            </div>
            <Users className="w-4 h-4 text-sky-400" />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Selesai Ujian</span>
              <span className="text-xl font-black text-emerald-400">
                {completedStudents} <span className="text-xs font-normal text-slate-400">/ {totalStudents}</span>
              </span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Rata-Rata Skor</span>
              <span className="text-xl font-black text-amber-400">{avgScore} pts</span>
            </div>
            <Award className="w-4 h-4 text-amber-400" />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Skor Tertinggi</span>
              <span className="text-xl font-black text-purple-400">{topScore} pts</span>
            </div>
            <Trophy className="w-4 h-4 text-purple-400" />
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('REKAP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'REKAP'
                  ? 'bg-sky-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Rekap Siswa</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MONITOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'MONITOR'
                  ? 'bg-sky-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Live Monitor</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('QUESTIONS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'QUESTIONS'
                  ? 'bg-sky-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Soal Ujian ({questions.length})</span>
            </button>

            {/* Google Sheets Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('SHEETS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'SHEETS'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Sheet & GAS</span>
              {settings.gasWebAppUrl && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Google Sheet Terhubung" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SETTINGS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'SETTINGS'
                  ? 'bg-sky-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Pengaturan Ujian</span>
            </button>
          </div>

          {/* Sub Toolbar with Filters / Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'REKAP' && (
              <>
                <select
                  value={selectedExamCodeFilter}
                  onChange={(e) => setSelectedExamCodeFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-amber-300 font-semibold text-xs rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                  title="Filter kelompok berdasarkan Kode Ujian"
                >
                  <option value="ALL">Semua Kode Ujian</option>
                  {examCodeList.map((code) => (
                    <option key={code} value={code}>
                      Kode: {code}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedClassFilter}
                  onChange={(e) => setSelectedClassFilter(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classList.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama siswa..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-xs rounded-lg pl-6 pr-2.5 py-1 text-white placeholder-slate-500 focus:outline-none w-28 sm:w-36"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Unduh Rekap Nilai ke Excel (.xlsx)"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                  title="Unduh CSV"
                >
                  CSV
                </button>

                {/* Direct Sync to Google Sheet Button */}
                <button
                  type="button"
                  onClick={handleSyncToGoogleSheets}
                  disabled={isSyncingSheets}
                  className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Kirim semua data nilai siswa langsung ke Google Sheet"
                >
                  <UploadCloud className="w-3 h-3 text-emerald-400" />
                  <span>{isSyncingSheets ? 'Mengirim...' : 'Kirim ke G-Sheet'}</span>
                </button>
              </>
            )}

            {activeTab === 'QUESTIONS' && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('SHEETS')}
                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                  <span>Tarik Soal Google Sheet</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenQuestionManager}
                  className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Editor Soal Manual</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: REKAP NILAI & JAWABAN SISWA */}
        {activeTab === 'REKAP' && (
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-800/60 text-slate-400 border-b border-slate-800 text-[11px] font-semibold">
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3">Kode Ujian</th>
                    <th className="py-2.5 px-3 text-center">Pesawat</th>
                    <th className="py-2.5 px-3 text-center">Skor Akhir</th>
                    <th className="py-2.5 px-3 text-center">Akurasi</th>
                    {questions.map((_, idx) => (
                      <th key={idx} className="py-2.5 px-2 text-center w-14">
                        U{idx + 1}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={10 + questions.length} className="py-12 text-center text-slate-500">
                        <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-semibold">Belum ada siswa yang bergabung pada sesi ini.</p>
                        <p className="text-xs text-slate-600 mt-1">
                          Berikan Kode Ujian <span className="font-mono text-amber-400">{settings.examCode}</span> kepada siswa untuk mulai.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const correctCount = (s.answers || []).filter((a) => a.isCorrect).length;
                      const totalAnswers = (s.answers || []).length;
                      const accuracy = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{s.name}</span>
                              {s.combo > 1 && (
                                <span className="text-[10px] bg-amber-400/20 text-amber-300 font-black px-1.5 py-0.2 rounded">
                                  🔥 {s.combo}x
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px]">
                              {s.studentClass || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {s.examCode || settings.examCode}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span className="text-[10px] font-mono font-bold text-sky-300 bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded">
                              {s.aircraftType}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-amber-300 font-mono text-sm whitespace-nowrap">
                            {s.score || 0}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`text-[11px] font-bold ${
                                accuracy >= 80 ? 'text-emerald-400' : accuracy >= 60 ? 'text-amber-400' : 'text-rose-400'
                              }`}
                            >
                              {accuracy}%
                            </span>
                          </td>

                          {/* Individual question answer indicators */}
                          {questions.map((q, qIdx) => {
                            const ans = (s.answers || []).find((a) => a.questionId === q.id || a.questionIndex === qIdx);
                            return (
                              <td key={qIdx} className="py-2.5 px-2 text-center">
                                {ans ? (
                                  <span
                                    title={`Soal ${qIdx + 1}: ${ans.selectedOption} (${ans.isCorrect ? 'Benar' : 'Salah'})`}
                                    className={`inline-block w-5 h-5 rounded-full text-[10px] font-bold leading-5 ${
                                      ans.isCorrect
                                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                                    }`}
                                  >
                                    {ans.isCorrect ? '✓' : '✕'}
                                  </span>
                                ) : (
                                  <span className="inline-block w-5 h-5 rounded-full bg-slate-800/60 text-slate-600 text-[10px] leading-5">
                                    -
                                  </span>
                                )}
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {s.status === 'COMPLETED' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                Selesai
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                Sedang Mengerjakan
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleResetSingleStudent(s.id, s.name)}
                              disabled={resettingId === s.id}
                              className="px-2 py-1 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 border border-slate-700 hover:border-rose-700/50 text-[10px] font-semibold rounded transition-colors cursor-pointer disabled:opacity-50"
                              title="Izinkan siswa ini mengulang ujian"
                            >
                              {resettingId === s.id ? 'Mereset...' : 'Ulangi'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: LIVE MONITOR */}
        {activeTab === 'MONITOR' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Left 2 Cols: Flight Racers Visualizer */}
            <div className="md:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="font-black text-sm text-white flex items-center gap-2">
                  <Plane className="w-4 h-4 text-sky-400" />
                  <span>Lintasan Balap Ujian Real-Time (Live Race)</span>
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">
                  {students.filter((s) => s.status === 'PLAYING').length} Mengudara • {completedStudents} Mendarat
                </span>
              </div>

              {students.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">
                  Belum ada siswa yang sedang terbang. Siswa akan muncul saat mulai menjawab soal.
                </div>
              ) : (
                <div className="space-y-3">
                  {students.map((s) => {
                    const answeredCount = s.answers?.length || 0;
                    const progressPct = Math.min(100, Math.round((answeredCount / (questions.length || 1)) * 100));

                    return (
                      <div key={s.id} className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{s.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                              {s.studentClass || '-'}
                            </span>
                            <span className="text-[10px] text-sky-400 font-mono">[{s.aircraftType}]</span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-amber-300 font-bold">{s.score} pts</span>
                            <span className="text-slate-400 text-[10px]">({progressPct}%)</span>
                          </div>
                        </div>

                        {/* Progress Race Track */}
                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden relative">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              s.status === 'COMPLETED'
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-sky-500 to-indigo-500'
                            }`}
                            style={{ width: `${Math.max(5, progressPct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Col: Top Leaderboard */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <h3 className="font-black text-sm text-amber-300 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Peringkat Teratas (Leaderboard)</span>
                </h3>
              </div>

              <div className="space-y-2">
                {students.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">Belum ada skor tercatat.</div>
                ) : (
                  [...students]
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .slice(0, 10)
                    .map((s, idx) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                              idx === 0
                                ? 'bg-amber-400 text-slate-950'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-950'
                                : idx === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div>
                            <span className="font-bold text-white block">{s.name}</span>
                            <span className="text-[10px] text-slate-400">{s.studentClass || '-'}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-black text-amber-300">{s.score} pts</div>
                          <span className={`text-[10px] font-bold ${s.status === 'COMPLETED' ? 'text-emerald-400' : 'text-sky-400'}`}>
                            {s.status === 'COMPLETED' ? '✓ Selesai' : `Soal ${(s.currentQuestionIndex || 0) + 1}/${questions.length}`}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: SOAL UJIAN */}
        {activeTab === 'QUESTIONS' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl">
              <div>
                <h4 className="text-sm font-bold text-white">Daftar Soal Ujian Aktif ({questions.length} Soal)</h4>
                <p className="text-xs text-slate-400">Soal-soal ini yang ditampilkan pada pesawat dan gerbang 3D siswa</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('SHEETS')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Impor dari Google Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenQuestionManager}
                  className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Editor Soal Manual</span>
                </button>
              </div>
            </div>

            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-slate-400 font-semibold">
                  <span className="text-sky-400 font-bold">Soal Ujian #{idx + 1}</span>
                  <span className="text-emerald-400 font-bold">Kunci Jawaban: {['A', 'B', 'C', 'D'][q.correctIndex]}</span>
                </div>
                <p className="font-semibold text-white break-words whitespace-normal leading-relaxed text-sm">
                  {q.question}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  {q.options.map((opt, oIdx) => (
                    <div
                      key={oIdx}
                      className={`p-2 rounded-lg border flex items-start gap-2 ${
                        oIdx === q.correctIndex
                          ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300 font-semibold'
                          : 'border-slate-800 bg-slate-950/50 text-slate-300'
                      }`}
                    >
                      <span className="font-bold text-slate-400 shrink-0 mt-0.5">{['A', 'B', 'C', 'D'][oIdx]}.</span>
                      <span className="break-words whitespace-normal leading-relaxed flex-1">{opt}</span>
                    </div>
                  ))}
                </div>
                {q.explanation && (
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <strong className="text-slate-300">Pembahasan:</strong> {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: GOOGLE SHEET & GOOGLE APPS SCRIPT (FULL SUITE) */}
        {activeTab === 'SHEETS' && (
          <div className="space-y-5">
            {/* Hero Banner Integrasi */}
            <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-sky-950/50 border border-emerald-500/30 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0 shadow-md">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base sm:text-lg text-white">
                      Sumber Data Google Sheet & Google Apps Script
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Cloud Sync
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Hubungkan SkyQuiz 3D langsung dengan Google Spreadsheet milik Anda. Tarik bank soal secara otomatis dan simpan seluruh hasil ujian siswa secara permanen di Google Sheet melalui Google Apps Script Web App.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowGasGuide(!showGasGuide)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Code2 className="w-4 h-4 text-sky-400" />
                  <span>{showGasGuide ? 'Tutup Panduan Skrip' : 'Panduan & Kode Script'}</span>
                  {showGasGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Accordion / Modal: Panduan Google Apps Script (Siap Pakai) */}
            {showGasGuide && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-black text-sm sm:text-base text-white">
                      Kode Google Apps Script (Code.gs) & Langkah Pemasangan
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyGasCode}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    {copiedGasCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGasCode ? 'Kode Tersalin!' : 'Salin Kode Google Apps Script'}</span>
                  </button>
                </div>

                {/* 5-Step Visual Guide */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">1</span>
                    <strong className="text-white block">Buat Google Sheet</strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">Buka sheets.new di browser untuk membuat spreadsheet baru.</p>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">2</span>
                    <strong className="text-white block">Buka Apps Script</strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">Pilih menu <em>Ekstensi</em> &gt; <em>Apps Script</em>.</p>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">3</span>
                    <strong className="text-white block">Tempel Skrip</strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">Hapus kode lama, tempelkan skrip di bawah, lalu klik Simpan (Ctrl+S).</p>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">4</span>
                    <strong className="text-white block">Deploy Web App</strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">Klik <em>Terapkan</em> &gt; <em>Deployment Baru</em> &gt; Jenis: <em>Aplikasi Web</em>. Akses: <strong>Siapa Saja (Anyone)</strong>.</p>
                  </div>
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[10px]">5</span>
                    <strong className="text-white block">Tempel URL di Game</strong>
                    <p className="text-slate-400 text-[11px] leading-relaxed">Salin URL web app berakhiran <code className="text-emerald-400">/exec</code> lalu tempel di kotak URL di bawah.</p>
                  </div>
                </div>

                {/* Script Code Preview Block */}
                <div className="relative">
                  <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 leading-relaxed select-text">
                    {GAS_CODE_TEMPLATE}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopyGasCode}
                    className="absolute top-3 right-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedGasCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Salin</span>
                  </button>
                </div>
              </div>
            )}

            {/* Dua Kolom Utama: Panel 1 Penyimpanan Nilai & Panel 2 Sumber Soal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* PANEL 1: PENYIMPANAN DATA UJIAN (Google Apps Script) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">1. Penyimpanan Data Ujian (GAS)</h4>
                        <p className="text-[11px] text-slate-400">Simpan otomatis rekap nilai dan rincian siswa ke Google Sheet</p>
                      </div>
                    </div>

                    {settings.gasWebAppUrl ? (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Terhubung
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Belum Dikonfigurasi
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleSaveGasSettings} className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-300 block">
                          URL Web App Google Apps Script (.exec):
                        </label>
                        {formGasUrl === DEFAULT_GAS_WEB_APP_URL ? (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Database Bawaan Aktif
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setFormGasUrl(DEFAULT_GAS_WEB_APP_URL)}
                            className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline font-semibold cursor-pointer"
                          >
                            Gunakan URL Bawaan
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="url"
                          value={formGasUrl}
                          onChange={(e) => setFormGasUrl(e.target.value)}
                          placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-400"
                        />
                        {formGasUrl !== DEFAULT_GAS_WEB_APP_URL && (
                          <button
                            type="button"
                            onClick={() => setFormGasUrl(DEFAULT_GAS_WEB_APP_URL)}
                            className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] font-bold rounded-xl whitespace-nowrap cursor-pointer transition-colors"
                            title="Kembalikan ke URL Google Apps Script bawaan"
                          >
                            Reset ke Bawaan
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Database Google Spreadsheet bawaan aktif dan siap menyimpan data hasil ujian siswa secara otomatis.
                      </p>
                    </div>

                    {/* Auto Sync Toggle */}
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-white block">Auto-Sync Hasil Ujian Siswa</span>
                        <span className="text-[11px] text-slate-400">
                          Otomatis kirim nilai ke Google Sheet seketika siswa menyelesaikan seluruh soal
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormAutoSync(!formAutoSync)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                          formAutoSync
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {formAutoSync ? '✓ Auto-Sync Aktif' : '✕ Manual Saja'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="submit"
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Simpan Pengaturan GAS</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleTestGasConnection}
                        disabled={isTestingGas}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Wifi className="w-3.5 h-3.5 text-sky-400" />
                        <span>{isTestingGas ? 'Menguji...' : 'Uji Koneksi GAS'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSyncToGoogleSheets}
                        disabled={isSyncingSheets || students.length === 0}
                        className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50 ml-auto"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{isSyncingSheets ? 'Mengirim...' : `Kirim Semua (${students.length})`}</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Connection Status / Last Sync Box */}
                <div className="p-3 bg-slate-950 border border-slate-800/90 rounded-xl space-y-1.5 text-xs">
                  {gasTestResult && (
                    <div
                      className={`p-2 rounded-lg flex items-center gap-2 font-semibold ${
                        gasTestResult.success
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                          : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                      }`}
                    >
                      {gasTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
                      <span>{gasTestResult.message}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Terakhir Disinkronkan:</span>
                    <strong className="text-slate-200">
                      {settings.lastSheetsSyncTime
                        ? new Date(settings.lastSheetsSyncTime).toLocaleString('id-ID')
                        : 'Belum pernah'}
                    </strong>
                  </div>
                  {settings.lastSheetsSyncStatus && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Status Sinkronisasi Terakhir:</span>
                      <span className="text-emerald-400 font-semibold">{settings.lastSheetsSyncStatus}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PANEL 2: SUMBER DATA SOAL (Tarik Soal dari Google Sheet) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">2. Sumber Data Soal (Google Sheet)</h4>
                        <p className="text-[11px] text-slate-400">Tarik dan perbarui soal ujian langsung dari Google Spreadsheet</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadCsvTemplate}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      title="Unduh berkas contoh format CSV untuk diunggah ke Google Sheets"
                    >
                      <Download className="w-3 h-3" />
                      <span>Format CSV</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        URL Berbagi / Tautan Google Sheet Soal:
                      </label>
                      <input
                        type="url"
                        value={formSheetQuestionsUrl}
                        onChange={(e) => setFormSheetQuestionsUrl(e.target.value)}
                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs.../edit?usp=sharing"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-sky-300 font-mono focus:outline-none focus:border-sky-400"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Pastikan izin spreadsheet diatur ke: <strong>"Siapa saja yang memiliki link dapat melihat"</strong>.
                      </p>
                    </div>

                    {/* Format Kolom Info */}
                    <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-300">Format Kolom Spreadsheet yang Didukung:</strong>
                        <button
                          type="button"
                          onClick={handleCopyHeaders}
                          className="text-[10px] text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedHeaders ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedHeaders ? 'Header Tersalin' : 'Salin Nama Kolom'}</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">No</span>
                        <span className="bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded font-bold">Pertanyaan</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Pilihan A</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Pilihan B</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Pilihan C</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Pilihan D</span>
                        <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-bold">Kunci Jawaban (A/B/C/D)</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Penjelasan</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleFetchSheetQuestions}
                        disabled={isFetchingSheetQuestions}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{isFetchingSheetQuestions ? 'Membaca Spreadsheet...' : 'Tarik & Tinjau Soal'}</span>
                      </button>

                      {previewQuestions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setPreviewQuestions([])}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-semibold cursor-pointer"
                        >
                          Bersihkan Pratinjau
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {sheetFetchError && (
                  <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{sheetFetchError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* PREVIEW HASIL TARIK SOAL GOOGLE SHEET */}
            {previewQuestions.length > 0 && (
              <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm sm:text-base text-white">
                        Pratinjau Soal dari Google Sheet ({previewQuestions.length} Soal Terbaca)
                      </h4>
                      <p className="text-xs text-slate-300">
                        Periksa soal di bawah ini sebelum menerapkannya ke dalam ujian aktif siswa.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplySheetQuestions}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer uppercase tracking-wider shrink-0"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Terapkan {previewQuestions.length} Soal ke Ujian Aktif</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                  {previewQuestions.map((q, idx) => (
                    <div key={idx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="text-sky-400 font-bold">Soal #{idx + 1}</span>
                        <span className="text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded text-[11px]">
                          Kunci: {['A', 'B', 'C', 'D'][q.correctIndex]}
                        </span>
                      </div>
                      <p className="font-semibold text-white leading-relaxed text-xs">{q.question}</p>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`p-1.5 rounded border text-[11px] flex items-center gap-1.5 ${
                              oIdx === q.correctIndex
                                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span className="text-slate-400 font-mono">{['A', 'B', 'C', 'D'][oIdx]}.</span>
                            <span className="truncate">{opt}</span>
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-800/60 truncate">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: PENGATURAN ACAK SOAL & SKOR */}
        {activeTab === 'SETTINGS' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">Pengaturan Ujian & Penilaian</h3>
                  <p className="text-xs text-slate-400">
                    Konfigurasi acak urutan soal, skor per soal, dan kode sesi untuk siswa
                  </p>
                </div>
              </div>

              {settingsSavedToast && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Pengaturan Berhasil Disimpan & Diterapkan!</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* 1. Pengaturan Acak Soal */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-sm font-bold text-white flex items-center gap-2">
                      <Shuffle className="w-4 h-4 text-sky-400" />
                      <span>Acak Urutan Soal Ujian (Randomize Questions)</span>
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Bila diaktifkan, setiap siswa yang masuk akan menerima urutan soal yang diacak secara acak untuk mencegah kecurangan.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormShuffle(!formShuffle)}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 border ${
                      formShuffle
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {formShuffle ? '✓ Acak Soal AKTIF' : '✕ Urutan Standar'}
                  </button>
                </div>
              </div>

              {/* 2. Pengaturan Skor per Soal */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-white flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Skor Nilai per Soal Benar</span>
                  </label>
                  <span className="text-xs font-black text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2.5 py-1 rounded-lg">
                    Total Maksimal: {Number(formScorePerQuestion || 0) * questions.length} Poin
                  </span>
                </div>

                <p className="text-xs text-slate-400">
                  Tentukan jumlah poin yang didapatkan siswa untuk setiap jawaban yang benar:
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[10, 20, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setFormScorePerQuestion(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        formScorePerQuestion === preset
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {preset} Poin {preset === 20 && questions.length === 5 ? '(Skala 100)' : ''}
                    </button>
                  ))}

                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-slate-400">Kustom:</span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={formScorePerQuestion}
                      onChange={(e) => setFormScorePerQuestion(Math.max(1, Number(e.target.value)))}
                      className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold text-center focus:outline-none focus:border-amber-400"
                    />
                    <span className="text-xs text-slate-400">pts</span>
                  </div>
                </div>

                {/* Combo Streak Bonus Toggle */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">
                      Bonus Poin Beruntun (Combo Streak)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Bila nonaktif, siswa hanya mendapatkan nilai tetap murni per soal tanpa tambahan streak.
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormUseCombo(!formUseCombo)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      formUseCombo
                        ? 'bg-purple-500 text-slate-950 border-purple-400'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {formUseCombo ? 'Bonus Aktif' : 'Skor Murni (Tanpa Bonus)'}
                  </button>
                </div>
              </div>

              {/* 3. Pengaturan Kode Ujian */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="text-sm font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span>Kustomisasi Kode Ujian Sesi Ini</span>
                </label>
                <p className="text-xs text-slate-400">
                  Anda bisa mengubah kode ujian secara manual (contoh: PAS-8A, IPA-01) atau menggunakan generate otomatis:
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    type="text"
                    value={formExamCode}
                    onChange={(e) => setFormExamCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: PAS-8A, UJIAN-1..."
                    className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-amber-300 font-mono font-black uppercase tracking-wider focus:outline-none focus:border-sky-400"
                  />

                  <button
                    type="button"
                    onClick={handleGenerateExamCode}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Generate Acak Otomatis</span>
                  </button>
                </div>
              </div>

              {/* Shortcut ke Google Sheets & GAS */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-950 to-sky-950/40 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-sm text-white">Integrasi Google Sheet & Google Apps Script</h5>
                    <p className="text-xs text-slate-400">
                      Tarik soal dari spreadsheet dan simpan seluruh rekap nilai siswa secara otomatis ke Google Drive.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('SHEETS')}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Buka Tab Google Sheet</span>
                </button>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('REKAP')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Kembali ke Rekap
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 hover:from-sky-300 hover:to-emerald-300 text-slate-950 font-black text-xs md:text-sm flex items-center gap-2 shadow-lg shadow-sky-500/25 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan & Terapkan Pengaturan</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* QR Code Modal for Students */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-5 text-white text-center shadow-2xl">
            <h3 className="text-base font-black mb-1">Pindai untuk Mulai Ujian</h3>
            <p className="text-xs text-slate-300 mb-2">
              Siswa membuka tautan ini di HP atau Laptop masing-masing
            </p>

            <div className="bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold py-1.5 px-3 rounded-lg mb-3">
              Kode Ujian: <strong>{settings.examCode}</strong>
            </div>

            <div className="bg-white p-3 rounded-xl inline-block shadow-lg">
              <QRCodeSVG value={localNetworkUrl} size={190} level="M" />
            </div>

            <div className="mt-3.5 space-y-2 text-left">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Tautan Browser Siswa:
                </label>
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs text-sky-300 font-mono">
                  <span className="truncate max-w-[210px]">{localNetworkUrl}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(localNetworkUrl)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer ml-1"
                    title="Salin Tautan"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {localNetworkUrl !== currentUrl && (
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Tautan Alternatif (Internet/Domain):
                  </label>
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs text-slate-300 font-mono">
                    <span className="truncate max-w-[210px]">{currentUrl}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyUrl(currentUrl)}
                      className="p-1 text-slate-400 hover:text-white cursor-pointer ml-1"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Creator Footer */}
      <Footer className="mt-8 border-t border-slate-800" />
    </div>
  );
};
