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
} from 'lucide-react';

interface TeacherDashboardProps {
  questions: Question[];
  onLaunchSimulator: () => void;
  onExitTeacherMode: () => void;
  onOpenQuestionManager: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  questions,
  onLaunchSimulator,
  onExitTeacherMode,
  onOpenQuestionManager,
}) => {
  const [students, setStudents] = useState<StudentSession[]>([]);
  const [settings, setSettings] = useState<ExamSettings>(() => syncService.getCachedSettings());
  const [activeTab, setActiveTab] = useState<'REKAP' | 'MONITOR' | 'QUESTIONS' | 'SETTINGS'>('REKAP');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [selectedExamCodeFilter, setSelectedExamCodeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [resettingId, setResettingId] = useState<string | null>(null);

  // Form states for settings
  const [formExamCode, setFormExamCode] = useState<string>(settings?.examCode || 'PAS-1');
  const [formShuffle, setFormShuffle] = useState<boolean>(settings?.shuffleQuestions ?? false);
  const [formScorePerQuestion, setFormScorePerQuestion] = useState<number>(settings?.scorePerQuestion ?? 20);
  const [formUseCombo, setFormUseCombo] = useState<boolean>(settings?.useComboBonus ?? false);
  const [settingsSavedToast, setSettingsSavedToast] = useState<boolean>(false);

  useEffect(() => {
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
      }
    });

    const unsubscribeStudents = syncService.onStudentsUpdate((updated) => {
      setStudents(updated);
    });

    const unsubscribeSettings = syncService.onSettingsUpdate((newSettings) => {
      setSettings(newSettings);
      setFormExamCode(newSettings.examCode);
      setFormShuffle(newSettings.shuffleQuestions);
      setFormScorePerQuestion(newSettings.scorePerQuestion);
      setFormUseCombo(newSettings.useComboBonus);
    });

    return () => {
      unsubscribeStudents();
      unsubscribeSettings();
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

  const handleResetSession = async () => {
    if (confirm('Mulai sesi ujian baru? Semua data jawaban siswa pada sesi ini akan dibersihkan dan semua siswa dapat bermain ulang.')) {
      await syncService.resetSession('TBRSKY');
      setStudents([]);
    }
  };

  const handleResetSingleStudent = async (studentId: string, studentName: string) => {
    if (confirm(`Reset kesempatan siswa "${studentName}"? Siswa ini akan diizinkan bermain dan mengerjakan ujian kembali.`)) {
      setResettingId(studentId);
      await syncService.resetStudent('TBRSKY', studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      setResettingId(null);
    }
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(settings.examCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const classList = Array.from(new Set(students.map((s) => s.studentClass).filter(Boolean)));
  const examCodeList = Array.from(new Set(students.map((s) => s.examCode).filter(Boolean)));

  const filteredStudents = students.filter((s) => {
    const matchClass = selectedClassFilter === 'ALL' || s.studentClass === selectedClassFilter;
    const matchExamCode = selectedExamCodeFilter === 'ALL' || s.examCode === selectedExamCodeFilter;
    const matchSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentClass.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.examCode && s.examCode.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchClass && matchExamCode && matchSearch;
  });

  const totalStudents = students.length;
  const completedCount = students.filter((s) => s.status === 'COMPLETED').length;
  const averageScore =
    totalStudents > 0
      ? Math.round(students.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalStudents)
      : 0;

  // Export Rekap ke Excel
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      alert('Belum ada data siswa untuk diekspor!');
      return;
    }

    const rows = filteredStudents.map((s, index) => {
      const correctTotal = s.answers.filter((a) => a.isCorrect).length;
      const accuracy = questions.length > 0 ? `${Math.round((correctTotal / questions.length) * 100)}%` : '0%';

      const rowData: Record<string, string | number> = {
        'No': index + 1,
        'Nama Siswa': s.name,
        'Kelas': s.studentClass,
        'Kode Ujian': s.examCode || settings.examCode,
        'Wahana': s.aircraftType,
        'Skor': s.score,
        'Benar': `${correctTotal}/${questions.length}`,
        'Akurasi': accuracy,
        'Status': s.status === 'COMPLETED' ? 'Selesai (1x Main)' : 'Sedang Terbang',
      };

      questions.forEach((q, qIdx) => {
        const ans = s.answers.find((a) => a.questionId === q.id || a.questionIndex === qIdx);
        const colKey = `Soal ${qIdx + 1} (${['A', 'B', 'C', 'D'][q.correctIndex]})`;
        if (ans) {
          rowData[colKey] = `${ans.isCorrect ? 'BENAR' : 'SALAH'} (${ans.selectedOption})`;
        } else {
          rowData[colKey] = '-';
        }
      });

      return rowData;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap_Ujian_Siswa');
    XLSX.writeFile(workbook, `Rekap_Nilai_Ujian_SkyQuiz_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportCsv = () => {
    if (filteredStudents.length === 0) {
      alert('Belum ada data siswa!');
      return;
    }

    let csv = 'No,Nama Siswa,Kelas,Kode Ujian,Wahana,Skor,Benar,Akurasi,Status\n';
    filteredStudents.forEach((s, idx) => {
      const correctTotal = s.answers.filter((a) => a.isCorrect).length;
      const accuracy = questions.length > 0 ? `${Math.round((correctTotal / questions.length) * 100)}%` : '0%';
      csv += `${idx + 1},"${s.name}","${s.studentClass}","${s.examCode || settings.examCode}","${s.aircraftType}",${s.score},${correctTotal}/${questions.length},${accuracy},${s.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Nilai_Ujian_SkyQuiz_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderVehicleIcon = (type: string) => {
    switch (type) {
      case 'JET':
        return <Rocket className="w-3.5 h-3.5 text-sky-400" />;
      case 'HELICOPTER':
        return <Compass className="w-3.5 h-3.5 text-amber-400" />;
      case 'SPACESHIP':
        return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Plane className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none justify-between">
      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 px-4 py-2.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
            <Plane className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-tight text-white">SkyQuiz Host</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-sky-300 border border-slate-700 px-1.5 py-0.2 rounded">
                Mode Guru
              </span>
            </div>
          </div>
        </div>

        {/* Compact Right Action Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Uji Simulator Button */}
          <button
            type="button"
            onClick={onLaunchSimulator}
            className="px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-400/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Buka simulator penerbangan 3D guru"
          >
            <Play className="w-3.5 h-3.5 fill-sky-300" />
            <span className="hidden sm:inline">Uji Simulator</span>
          </button>

          {/* QR Code / Share Link */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Tautkan Perangkat Siswa"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">QR Siswa</span>
          </button>

          {/* Reset All Session */}
          <button
            type="button"
            onClick={handleResetSession}
            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset semua data ujian siswa"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Reset Semua Siswa</span>
          </button>

          {/* Exit / Switch */}
          <button
            type="button"
            onClick={onExitTeacherMode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Ganti Peran"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

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
                  Kode Ujian Otomatis:
                </span>
                <span className="font-mono text-base sm:text-lg font-black tracking-widest text-amber-300 bg-amber-400/15 border border-amber-400/40 px-3 py-0.5 rounded-lg">
                  {settings.examCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Siswa memasukkan kode ini untuk masuk. Pengaturan saat ini: Urutan Soal{' '}
                <strong className={settings.shuffleQuestions ? 'text-emerald-400' : 'text-sky-300'}>
                  {settings.shuffleQuestions ? 'Diacak' : 'Berurutan'}
                </strong>{' '}
                • Nilai per Soal:{' '}
                <strong className="text-amber-300">{settings.scorePerQuestion} Poin</strong> (Total Maks:{' '}
                {settings.scorePerQuestion * questions.length} Poin)
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
              <span>Pengaturan Soal & Skor</span>
            </button>
          </div>
        </div>

        {/* Minimal Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Siswa</span>
              <span className="text-xl font-black text-white">{totalStudents}</span>
            </div>
            <Users className="w-4 h-4 text-sky-400" />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Selesai (1x Main)</span>
              <span className="text-xl font-black text-emerald-400">{completedCount}</span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Rata-Rata Nilai</span>
              <span className="text-xl font-black text-amber-300">{averageScore}</span>
            </div>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Kelompok Kode</span>
              <span className="text-xl font-black text-purple-400">{examCodeList.length} Kode</span>
            </div>
            <KeyRound className="w-4 h-4 text-purple-400" />
          </div>
        </div>

        {/* Minimalist Tab Bar & Grouping Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 bg-slate-900/70 border border-slate-800/80 p-2.5 rounded-xl">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('REKAP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'REKAP'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Rekap Jawaban ({filteredStudents.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MONITOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'MONITOR'
                  ? 'bg-sky-500 text-slate-950'
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
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Soal Ujian ({questions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SETTINGS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'SETTINGS'
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>Pengaturan Ujian</span>
            </button>
          </div>

          {/* Sub Toolbar with Exam Code & Class Filters */}
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
                    placeholder="Cari siswa/kode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-slate-800 border border-slate-700 text-xs rounded-lg pl-6 pr-2.5 py-1 text-white placeholder-slate-500 focus:outline-none w-28 sm:w-36"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Unduh Excel (.xlsx)"
                >
                  <Download className="w-3 h-3" />
                  <span>Excel</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium cursor-pointer"
                  title="Unduh CSV"
                >
                  CSV
                </button>
              </>
            )}

            {activeTab === 'QUESTIONS' && (
              <button
                type="button"
                onClick={onOpenQuestionManager}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Ubah Soal Ujian / Impor Excel</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: REKAP JAWABAN SISWA */}
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
                    <th className="py-2.5 px-3 text-center">Skor</th>
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
                      <td colSpan={9 + questions.length} className="text-center py-10 text-slate-500">
                        <Users className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                        <p className="text-xs">Belum ada siswa yang terdata pada filter ini</p>
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, index) => {
                      const correctCount = s.answers.filter((a) => a.isCorrect).length;
                      const accuracy =
                        questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

                      return (
                        <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3 text-center text-slate-500">{index + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-1.5">
                            {index === 0 && s.score > 0 && <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            <span>{s.name}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{s.studentClass}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              {s.examCode || settings.examCode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-block p-1 rounded bg-slate-800">
                              {renderVehicleIcon(s.aircraftType)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-300">{s.score}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                accuracy >= 80
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : accuracy >= 50
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-rose-500/20 text-rose-300'
                              }`}
                            >
                              {correctCount}/{questions.length} ({accuracy}%)
                            </span>
                          </td>

                          {questions.map((q, qIdx) => {
                            const ans = s.answers.find(
                              (a) => a.questionId === q.id || a.questionIndex === qIdx
                            );
                            return (
                              <td key={qIdx} className="py-2.5 px-2 text-center">
                                {ans ? (
                                  <span
                                    title={`Soal Ujian ${qIdx + 1}: ${ans.isCorrect ? 'Benar' : 'Salah'}\nPilihan Siswa: ${ans.selectedOption}`}
                                    className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold ${
                                      ans.isCorrect
                                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/50'
                                        : 'bg-rose-950 text-rose-400 border border-rose-600/50'
                                    }`}
                                  >
                                    {ans.isCorrect ? '✓' : '✗'}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-3 text-center">
                            {s.status === 'COMPLETED' ? (
                              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                                Selesai (1x)
                              </span>
                            ) : (
                              <span className="text-[10px] text-sky-400 font-semibold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30 animate-pulse">
                                Terbang
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              disabled={resettingId === s.id}
                              onClick={() => handleResetSingleStudent(s.id, s.name)}
                              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer mx-auto"
                              title="Reset siswa ini agar bisa bermain & mengerjakan ujian lagi"
                            >
                              <RotateCcw className={`w-3 h-3 ${resettingId === s.id ? 'animate-spin' : ''}`} />
                              <span>Reset Siswa</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {students.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500">
                Belum ada siswa aktif.
              </div>
            ) : (
              students.map((s) => {
                const currentQ = s.answers.length;
                const isDone = s.status === 'COMPLETED';

                return (
                  <div
                    key={s.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {renderVehicleIcon(s.aircraftType)}
                        <div>
                          <h4 className="font-bold text-xs text-white leading-tight">{s.name}</h4>
                          <span className="text-[10px] text-slate-400">
                            Kelas {s.studentClass} • <strong className="text-amber-300">{s.examCode || settings.examCode}</strong>
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-amber-300">{s.score} pts</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {questions.map((_, idx) => {
                        const ans = s.answers[idx];
                        let bg = 'bg-slate-800';
                        if (ans) bg = ans.isCorrect ? 'bg-emerald-400' : 'bg-rose-400';
                        else if (idx === currentQ) bg = 'bg-sky-400 animate-pulse';

                        return <div key={idx} className={`h-1.5 flex-1 rounded-full ${bg}`} />;
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span className={`text-[10px] font-bold ${isDone ? 'text-emerald-400' : 'text-sky-400'}`}>
                        {isDone ? '✓ Selesai Ujian' : `Soal ${currentQ + 1} / ${questions.length}`}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleResetSingleStudent(s.id, s.name)}
                        className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 text-[10px] font-bold flex items-center gap-1 border border-amber-500/30 transition-colors cursor-pointer"
                        title="Reset siswa ini agar bisa mengulang ujian"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>Reset Siswa</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 3: SOAL UJIAN */}
        {activeTab === 'QUESTIONS' && (
          <div className="space-y-3">
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
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: PENGATURAN ACAK SOAL & SKOR */}
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
            <h3 className="text-sm font-black mb-1">Pindai untuk Bergabung</h3>
            <p className="text-[11px] text-slate-400 mb-2">Siswa memindai QR code ini di ponsel/tablet</p>

            <div className="bg-amber-400/15 border border-amber-400/30 text-amber-300 text-xs font-mono font-bold py-1.5 px-3 rounded-lg mb-3">
              Kode Ujian: <strong>{settings.examCode}</strong>
            </div>

            <div className="bg-white p-3 rounded-xl inline-block shadow-lg">
              <QRCodeSVG value={currentUrl} size={180} level="M" />
            </div>

            <div className="mt-3 p-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-[11px] text-sky-300 font-mono">
              <span className="truncate max-w-[200px]">{currentUrl}</span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg cursor-pointer"
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
