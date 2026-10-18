import React, { useState, useEffect } from 'react';
import { FlightDifficulty } from '../types/game';
import { AircraftType, AIRCRAFT_MODELS } from '../game/aircraft';
import { AirplaneCanvasPreview } from './AirplaneCanvasPreview';
import { Footer } from './Footer';
import { syncService } from '../game/syncService';
import {
  Plane,
  Play,
  Rocket,
  Compass,
  Sparkles,
  Gamepad2,
  Lock,
  User,
  GraduationCap,
  KeyRound,
  HelpCircle,
  Wifi,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface StudentStartScreenProps {
  studentName: string;
  onStudentNameChange: (name: string) => void;
  studentClass: string;
  onStudentClassChange: (cls: string) => void;
  examCode: string;
  onExamCodeChange: (code: string) => void;
  difficulty: FlightDifficulty;
  onSelectDifficulty: (difficulty: FlightDifficulty) => void;
  selectedAircraftType: AircraftType;
  onSelectAircraftType: (type: AircraftType) => void;
  hasCompletedExam?: boolean;
  onStartFlight: () => void;
  onOpenTeacherPasscode: () => void;
}

export const StudentStartScreen: React.FC<StudentStartScreenProps> = ({
  studentName,
  onStudentNameChange,
  studentClass,
  onStudentClassChange,
  examCode,
  onExamCodeChange,
  difficulty,
  onSelectDifficulty,
  selectedAircraftType,
  onSelectAircraftType,
  hasCompletedExam = false,
  onStartFlight,
  onOpenTeacherPasscode,
}) => {
  const [showHowTo, setShowHowTo] = useState(false);
  const [errorValidation, setErrorValidation] = useState<string | null>(null);
  const [activeTeacherCode, setActiveTeacherCode] = useState<string>(() => syncService.getCachedSettings()?.examCode || 'PAS-1');

  useEffect(() => {
    syncService.fetchLatestSession().then((data) => {
      if (data?.settings?.examCode) {
        setActiveTeacherCode(data.settings.examCode);
        if (!examCode || examCode === 'PAS-1') {
          onExamCodeChange(data.settings.examCode);
        }
      }
    });

    const unsubscribe = syncService.onSettingsUpdate((settings) => {
      if (settings.examCode) {
        setActiveTeacherCode(settings.examCode);
        if (!examCode || examCode === 'PAS-1') {
          onExamCodeChange(settings.examCode);
        }
      }
    });

    return () => unsubscribe();
  }, [examCode, onExamCodeChange]);

  const renderVehicleIcon = (type: AircraftType) => {
    switch (type) {
      case 'JET':
        return <Rocket className="w-4 h-4 text-sky-400" />;
      case 'HELICOPTER':
        return <Compass className="w-4 h-4 text-amber-400" />;
      case 'SPACESHIP':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      default:
        return <Plane className="w-4 h-4 text-emerald-400" />;
    }
  };

  const handleLaunch = () => {
    if (hasCompletedExam) {
      setErrorValidation('Anda telah menyelesaikan ujian ini (hanya 1x bermain). Minta guru mereset jika ingin mengulang.');
      return;
    }
    if (!studentName.trim()) {
      setErrorValidation('Silakan masukkan Nama Lengkap Siswa terlebih dahulu!');
      return;
    }
    if (!studentClass.trim()) {
      setErrorValidation('Silakan masukkan Nama Kelas (contoh: 8A, 7B, 9C)!');
      return;
    }
    if (!examCode.trim()) {
      setErrorValidation('Silakan masukkan Kode Ujian yang diberikan oleh Guru!');
      return;
    }
    setErrorValidation(null);
    onStartFlight();
  };

  const currentVehicle = AIRCRAFT_MODELS.find((m) => m.id === selectedAircraftType) || AIRCRAFT_MODELS[0];

  return (
    <div className="absolute inset-0 z-40 bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950 flex flex-col items-center justify-between p-3 sm:p-5 overflow-y-auto select-none backdrop-blur-xs">
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between py-1.5 border-b border-sky-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-emerald-400 flex items-center justify-center text-slate-950 shadow-md">
            <Plane className="w-5 h-5 transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">SkyQuiz 3D</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full">
                Mode Siswa
              </span>
            </div>
            <p className="text-[11px] text-sky-200/80 font-medium">
              Terbang Menembus Angkasa, Jawab Soal Ujian
            </p>
          </div>
        </div>

        {/* Status & Teacher Switch */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold">
            <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Terkoneksi ke Guru</span>
          </div>

          <button
            type="button"
            onClick={() => setShowHowTo(!showHowTo)}
            className="text-xs text-sky-300 hover:text-white flex items-center gap-1 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700 hover:border-sky-400 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Panduan</span>
          </button>

          <button
            type="button"
            onClick={onOpenTeacherPasscode}
            className="text-xs text-amber-300 hover:text-white flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 rounded-xl border border-amber-500/30 transition-colors cursor-pointer"
            title="Masuk sebagai Guru"
          >
            <Lock className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Mode Guru</span>
          </button>
        </div>
      </div>

      {/* Main Form & Showcase */}
      <div className="w-full max-w-4xl my-auto py-3 space-y-4">
        {/* Help Banner */}
        {showHowTo && (
          <div className="bg-sky-950/70 border border-sky-400/40 rounded-2xl p-3.5 text-xs text-sky-100 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="space-y-1">
              <strong className="text-amber-300 font-bold text-xs block">💡 Panduan Siswa:</strong>
              <p>
                Pesawatmu akan terbang otomatis di angkasa. Arahkan pesawat ke salah satu gerbang bulat (A, B, C, D) di depan. Kamu juga bisa mengusap layar langsung untuk mengarahkan pesawat. Saat pesawat menembus gerbang, soal ujian akan muncul untuk dijawab. Siswa hanya bermain 1 kali tanpa bermain ulang, dan seluruh nilai otomatis terkirim ke Guru!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHowTo(false)}
              className="px-3 py-1 bg-sky-500 text-slate-950 font-bold rounded-lg shrink-0 cursor-pointer text-xs"
            >
              Mengerti
            </button>
          </div>
        )}

        {/* 1-Play Only Notice Banner (if already completed) */}
        {hasCompletedExam && (
          <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-200 flex items-start gap-3 shadow-lg animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-bold text-sm block mb-0.5">
                Ujian Telah Diselesaikan (1x Kesempatan)
              </strong>
              <p>
                Anda sudah menyelesaikan sesi soal ujian ini. Sesuai aturan ujian, Anda <strong>hanya dapat bermain 1 kali saja tanpa bermain ulang</strong>. Jika Guru mengizinkan pengulangan ujian, silakan minta Guru untuk melakukan <em>Reset Siswa</em> pada layar Menu Guru.
              </p>
            </div>
          </div>
        )}

        {/* Validation Error Alert */}
        {errorValidation && (
          <div className="p-3 rounded-2xl bg-rose-950/80 border border-rose-500/60 text-xs text-rose-200 text-center font-bold flex items-center justify-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorValidation}</span>
          </div>
        )}

        {/* 1. Student Identity Inputs: Nama, Kelas & Kode Ujian */}
        <div className="bg-slate-900/80 border border-sky-500/30 rounded-2xl p-4 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-sky-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                Nama Siswa <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={hasCompletedExam}
                placeholder="Tuliskan nama lengkap..."
                value={studentName}
                onChange={(e) => {
                  onStudentNameChange(e.target.value);
                  if (errorValidation) setErrorValidation(null);
                }}
                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-sky-400/30 transition-all ${
                  hasCompletedExam
                    ? 'opacity-60 cursor-not-allowed border-slate-800'
                    : 'border-slate-700 focus:border-sky-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-sky-300 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                Nama Kelas <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={hasCompletedExam}
                placeholder="Contoh: 8A, 7B, 9C..."
                value={studentClass}
                onChange={(e) => {
                  onStudentClassChange(e.target.value);
                  if (errorValidation) setErrorValidation(null);
                }}
                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all ${
                  hasCompletedExam
                    ? 'opacity-60 cursor-not-allowed border-slate-800'
                    : 'border-slate-700 focus:border-emerald-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-sky-300 mb-1.5 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Kode Ujian <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={hasCompletedExam}
                placeholder="Contoh: PAS-8A, UJIAN-1..."
                value={examCode}
                onChange={(e) => {
                  onExamCodeChange(e.target.value.toUpperCase());
                  if (errorValidation) setErrorValidation(null);
                }}
                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all ${
                  hasCompletedExam
                    ? 'opacity-60 cursor-not-allowed border-slate-800'
                    : 'border-slate-700 focus:border-amber-400'
                }`}
              />
            </div>

            {activeTeacherCode && (
              <div className="sm:col-span-3 mt-1 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Kode Ujian Otomatis dari Guru:
                  <strong className="text-amber-300 font-mono font-bold tracking-wider">{activeTeacherCode}</strong>
                </span>

                <button
                  type="button"
                  disabled={hasCompletedExam}
                  onClick={() => {
                    onExamCodeChange(activeTeacherCode);
                    if (errorValidation) setErrorValidation(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <span>Gunakan Kode Ini</span>
                  <span>⚡</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Pilihan Pesawat dengan Animasi 3D */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-sky-950/40 via-slate-900/60 to-slate-950 border border-sky-500/30 p-4 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Left Model Selector */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
                  Pilihan Pesawat Anda
                </span>
                <span className="text-xs text-slate-300 font-semibold">{currentVehicle.name}</span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
                Terbang dengan <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-amber-300">{currentVehicle.name}</span>
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed">
                {currentVehicle.tagline}. Anda dapat memutar sudut pesawat 3D dengan menyentuhnya.
              </p>

              {/* Vehicle Options Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {AIRCRAFT_MODELS.map((model) => {
                  const isSelected = selectedAircraftType === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => onSelectAircraftType(model.id)}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400 ring-2 ring-sky-400/40 text-white shadow-md'
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <div className="p-1 rounded-lg bg-slate-900 border border-slate-700 shrink-0">
                        {renderVehicleIcon(model.id)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[11px] font-bold block truncate">{model.name.replace('Pesawat ', '')}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right 3D Airplane Canvas */}
            <div className="md:col-span-5 h-40 sm:h-44 rounded-2xl bg-gradient-to-b from-sky-900/30 to-slate-900/80 border border-sky-400/20 relative overflow-hidden flex items-center justify-center">
              <AirplaneCanvasPreview
                aircraftType={selectedAircraftType}
                className="w-full h-full"
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-sky-300/70 bg-slate-950/70 px-2 py-0.5 rounded-md pointer-events-none border border-slate-800">
                ✨ Putar 3D
              </div>
            </div>
          </div>
        </div>

        {/* 3. Pilihan Kecepatan Jelajah (Clean & Focused) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div>
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              Pilih Kecepatan Terbang:
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Atur kecepatan laju pesawat sesuai kenyamananmu
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full sm:w-80">
            {(
              [
                { id: 'EASY', label: 'Santai', hint: '~19 dtk' },
                { id: 'MEDIUM', label: 'Sedang', hint: '~12 dtk' },
                { id: 'HARD', label: 'Cepat', hint: '~8 dtk' },
              ] as const
            ).map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectDifficulty(d.id)}
                className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                  difficulty === d.id
                    ? 'bg-sky-500 text-slate-950 font-black border-sky-400 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                <span className="text-xs font-bold block">{d.label}</span>
                <span className={`text-[9px] block ${difficulty === d.id ? 'text-slate-900' : 'text-slate-400'}`}>
                  {d.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Launch Button */}
      <div className="w-full max-w-md pt-2 pb-2">
        {hasCompletedExam ? (
          <div className="text-center space-y-1">
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 font-black text-sm md:text-base flex items-center justify-center gap-2.5 cursor-not-allowed opacity-80"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>Selesai (Hanya 1x Bermain) — Menunggu Reset Guru</span>
            </button>
            <p className="text-[11px] text-slate-400">
              Minta Guru menekan tombol <strong>Reset Siswa</strong> di dashboard guru untuk membuka kunci ujian.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleLaunch}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 hover:from-sky-300 hover:to-emerald-300 text-slate-950 font-black text-base md:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-sky-500/25 hover:shadow-emerald-500/35 active:scale-98 transition-all cursor-pointer uppercase tracking-wider"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Mulai Terbang & Jawab Soal Ujian!</span>
          </button>
        )}
      </div>

      {/* Creator Footer */}
      <Footer className="mt-2 rounded-2xl border border-slate-800/80 max-w-4xl" />
    </div>
  );
};
