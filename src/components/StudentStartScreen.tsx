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

    const unsubscribeSettings = syncService.onSettingsUpdate((settings) => {
      if (settings.examCode) {
        setActiveTeacherCode(settings.examCode);
        if (!examCode || examCode === 'PAS-1') {
          onExamCodeChange(settings.examCode);
        }
      }
    });

    return () => {
      unsubscribeSettings();
    };
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
      setErrorValidation('Anda telah menyelesaikan ujian ini (hanya 1x kesempatan bermain). Minta guru mereset jika ingin mengulang.');
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
            <span>Tersambung Online</span>
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
                Pesawatmu akan terbang di angkasa. Arahkan pesawat ke salah satu gerbang jawaban (A, B, C, D) di depan. Kamu juga bisa mengusap layar langsung untuk mengarahkan pesawat. Saat pesawat menembus gerbang, soal ujian akan terbuka untuk dijawab. Setiap siswa hanya dapat bermain 1 kali tanpa bermain ulang, dan seluruh nilai otomatis tersimpan ke Guru!
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
                Anda sudah menyelesaikan sesi soal ujian ini. Sesuai aturan ujian, Anda <strong>hanya dapat bermain 1 kali saja tanpa bermain ulang</strong>. Jika Guru mengizinkan pengulangan ujian, silakan minta Guru untuk melakukan <em>Reset Siswa</em> pada menu Guru.
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
        <div className="bg-slate-900/80 border border-sky-500/30 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-black uppercase tracking-wider text-sky-300">
                Identitas Peserta Ujian
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Isi data diri untuk rekap nilai otomatis guru
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Nama Siswa */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-sky-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-sky-400" />
                Nama Siswa <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={hasCompletedExam}
                placeholder="Ketik nama lengkap siswa..."
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

            {/* Nama Kelas */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-sky-300 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                Kelas <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={hasCompletedExam}
                placeholder="Contoh: 8A, 7B, 9C..."
                value={studentClass}
                onChange={(e) => {
                  onStudentClassChange(e.target.value.toUpperCase());
                  if (errorValidation) setErrorValidation(null);
                }}
                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all ${
                  hasCompletedExam
                    ? 'opacity-60 cursor-not-allowed border-slate-800'
                    : 'border-slate-700 focus:border-emerald-400'
                }`}
              />
            </div>

            {/* Kode Ujian */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Kode Ujian <span className="text-rose-400">*</span>
                </label>
                {activeTeacherCode && (
                  <button
                    type="button"
                    onClick={() => onExamCodeChange(activeTeacherCode)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  >
                    Gunakan: {activeTeacherCode}
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                disabled={hasCompletedExam}
                placeholder="Ketik kode dari guru..."
                value={examCode}
                onChange={(e) => {
                  onExamCodeChange(e.target.value.toUpperCase());
                  if (errorValidation) setErrorValidation(null);
                }}
                className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-xs text-white uppercase placeholder-slate-500 font-black tracking-wider focus:outline-none focus:ring-2 focus:ring-amber-400/30 transition-all ${
                  hasCompletedExam
                    ? 'opacity-60 cursor-not-allowed border-slate-800'
                    : 'border-slate-700 focus:border-amber-400'
                }`}
              />
            </div>
          </div>
        </div>

        {/* 2. Interactive Vehicle Showcase & Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
          {/* 3D Interactive Canvas Preview */}
          <div className="md:col-span-5 bg-slate-900/80 border border-sky-500/30 rounded-2xl p-3.5 flex flex-col items-center justify-between shadow-lg relative overflow-hidden group">
            <div className="w-full flex items-center justify-between mb-1 z-10">
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                {renderVehicleIcon(selectedAircraftType)}
                <span>{currentVehicle.name}</span>
              </span>
              <span className="text-[10px] text-sky-200/60 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                Putar 3D Bebas
              </span>
            </div>

            {/* 3D Canvas Box */}
            <div className="w-full h-44 sm:h-48 rounded-xl overflow-hidden relative border border-slate-800/80 bg-radial from-slate-900 to-slate-950">
              <AirplaneCanvasPreview
                aircraftType={selectedAircraftType}
              />
            </div>

            <div className="w-full mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
              <span className="truncate max-w-[200px]">{currentVehicle.tagline}</span>
              <span className="text-amber-400 font-bold shrink-0">3D Interaktif</span>
            </div>
          </div>

          {/* Right Selector Column: Vehicle Types & Difficulty */}
          <div className="md:col-span-7 space-y-3 flex flex-col justify-between">
            {/* Model Pesawat Selector (4 Choices) */}
            <div className="bg-slate-900/80 border border-sky-500/30 rounded-2xl p-3.5 shadow-lg space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-sky-300 block">
                Pilih Model Pesawat:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AIRCRAFT_MODELS.map((model) => {
                  const isSelected = selectedAircraftType === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      disabled={hasCompletedExam}
                      onClick={() => onSelectAircraftType(model.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400 ring-2 ring-sky-400/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/50'
                      } ${hasCompletedExam ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700 shrink-0">
                        {renderVehicleIcon(model.id)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{model.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{model.tagline}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tingkat Kesulitan */}
            <div className="bg-slate-900/80 border border-sky-500/30 rounded-2xl p-3.5 shadow-lg space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-sky-300 block flex items-center justify-between">
                <span>Tingkat Kesulitan Kendali:</span>
                <span className="text-[10px] text-slate-400 font-normal">Sensitivitas & Kecepatan</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'EASY', label: 'Mudah', desc: 'Santai & Stabil', color: 'border-emerald-500 text-emerald-400' },
                  { id: 'MEDIUM', label: 'Sedang', desc: 'Seimbang', color: 'border-sky-500 text-sky-400' },
                  { id: 'HARD', label: 'Sulit', desc: 'Tantangan Tinggi', color: 'border-rose-500 text-rose-400' },
                ].map((item) => {
                  const isSelected = difficulty === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={hasCompletedExam}
                      onClick={() => onSelectDifficulty(item.id as FlightDifficulty)}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? `bg-slate-800 ${item.color} ring-2 ring-current`
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      } ${hasCompletedExam ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <div className="text-xs font-black">{item.label}</div>
                      <div className="text-[10px] opacity-75">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button: Start Flight */}
        <div className="pt-1">
          <button
            type="button"
            disabled={hasCompletedExam}
            onClick={handleLaunch}
            className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-xl ${
              hasCompletedExam
                ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400 hover:from-sky-300 hover:via-teal-300 hover:to-emerald-300 text-slate-950 shadow-sky-500/25 hover:shadow-sky-500/40 cursor-pointer active:scale-[0.99]'
            }`}
          >
            {hasCompletedExam ? (
              <>
                <Lock className="w-5 h-5" />
                <span>Ujian Telah Selesai (1x Kesempatan Saja)</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Mulai Terbang & Kerjakan Ujian</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Creator Footer */}
      <Footer className="w-full max-w-4xl pt-1" />
    </div>
  );
};
