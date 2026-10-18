import React, { useState, useEffect } from 'react';
import { Plane, GraduationCap, ShieldCheck, ArrowRight, Lock, Sparkles, X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Footer } from './Footer';

interface RoleSelectModalProps {
  onSelectStudent: () => void;
  onSelectTeacher: () => void;
  isOpen: boolean;
  onClose?: () => void;
}

export const RoleSelectModal: React.FC<RoleSelectModalProps> = ({
  onSelectStudent,
  onSelectTeacher,
  isOpen,
  onClose,
}) => {
  const [showPasscodeInput, setShowPasscodeInput] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);
  const [rememberPasscode, setRememberPasscode] = useState(true);
  const [isRemembered, setIsRemembered] = useState(false);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const savedAuth = localStorage.getItem('skyquiz_teacher_authenticated');
      const savedToken = localStorage.getItem('skyquiz_teacher_access_token');
      if (savedAuth === 'true' || savedToken === 'TBRSKY') {
        setIsRemembered(true);
      } else {
        setIsRemembered(false);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTeacherClick = () => {
    // If access code was already remembered on this device, directly open without prompt!
    if (isRemembered) {
      onSelectTeacher();
    } else {
      setShowPasscodeInput(true);
    }
  };

  const handleVerifyTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim().toUpperCase() === 'TBRSKY') {
      setPasscodeError(false);
      setShowPasscodeInput(false);

      if (rememberPasscode && typeof localStorage !== 'undefined') {
        localStorage.setItem('skyquiz_teacher_authenticated', 'true');
        localStorage.setItem('skyquiz_teacher_access_token', 'TBRSKY');
        setIsRemembered(true);
      }

      setPasscode('');
      onSelectTeacher();
    } else {
      setPasscodeError(true);
    }
  };

  const handleClearSavedCredentials = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('skyquiz_teacher_authenticated');
      localStorage.removeItem('skyquiz_teacher_access_token');
      setIsRemembered(false);
      setShowPasscodeInput(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto select-none animate-in fade-in">
      <div className="bg-slate-900 border border-sky-500/30 rounded-3xl max-w-lg w-full p-5 sm:p-6 text-white shadow-2xl relative my-auto">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-500/20 mb-3">
            <Plane className="w-7 h-7 transform -rotate-45" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Selamat Datang di <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-amber-300">SkyQuiz 3D</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Pilih peran Anda untuk memulai pembelajaran interaktif
          </p>
        </div>

        {!showPasscodeInput ? (
          <div className="space-y-3.5">
            {/* 1. Card Siswa */}
            <div
              onClick={onSelectStudent}
              className="group relative p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-sky-400 transition-all cursor-pointer shadow-md hover:shadow-sky-500/10 active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-500 flex items-center justify-center text-slate-950 shrink-0 group-hover:scale-105 transition-transform">
                  <Plane className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white group-hover:text-sky-300 transition-colors">
                      Masuk sebagai Siswa
                    </h3>
                    <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-full">
                      Pemain
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Masukkan nama, kelas, pilih model pesawat, lalu terbang dan jawab 5 soal di perangkatmu.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>

            {/* 2. Card Guru */}
            <div
              onClick={handleTeacherClick}
              className={`group relative p-4 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border transition-all cursor-pointer shadow-md active:scale-[0.99] ${
                isRemembered
                  ? 'border-emerald-500/50 hover:border-emerald-400 hover:shadow-emerald-500/15'
                  : 'border-slate-700/80 hover:border-amber-400 hover:shadow-amber-500/10'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-slate-950 shrink-0 group-hover:scale-105 transition-transform ${
                  isRemembered
                    ? 'bg-gradient-to-tr from-emerald-400 to-teal-400'
                    : 'bg-gradient-to-tr from-amber-400 to-orange-400'
                }`}>
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                      Mode Guru (Perangkat Utama)
                      {isRemembered ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </h3>
                    {isRemembered ? (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Tersimpan
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Host Kelas
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {isRemembered
                      ? 'Kode akses tersimpan di perangkat ini. Klik untuk langsung membuka Dashboard.'
                      : 'Pantau siswa secara real-time, proyeksikan ke proyektor, dan lihat rekap jawaban siswa.'}
                  </p>
                  {isRemembered && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleClearSavedCredentials}
                        className="text-[10px] text-slate-400 hover:text-amber-300 underline cursor-pointer"
                      >
                        Ganti Kode / Masukkan Ulang
                      </button>
                    </div>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          </div>
        ) : (
          /* Form Input Passcode Guru */
          <form onSubmit={handleVerifyTeacher} className="space-y-4 animate-in fade-in">
            <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-2xl flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-xs text-slate-200">
                Akses khusus guru untuk mengelola ujian dan melihat rekap hasil siswa.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                Masukkan Kode Akses Guru:
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  placeholder="Ketik kode akses guru..."
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setPasscodeError(false);
                  }}
                  className={`w-full bg-slate-950 border rounded-xl px-4 py-3 pr-11 text-sm text-center uppercase tracking-widest font-black text-white focus:outline-none transition-all ${
                    passcodeError
                      ? 'border-rose-500 focus:border-rose-500 ring-2 ring-rose-500/30'
                      : 'border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={showPassword ? 'Sembunyikan' : 'Lihat'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passcodeError && (
                <p className="text-[11px] text-rose-400 mt-1.5 text-center font-semibold">
                  Kode akses tidak sesuai. Silakan hubungi pengajar.
                </p>
              )}
            </div>

            {/* Checkbox Ingat Kode Akses */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none bg-slate-800/50 p-2.5 rounded-xl border border-slate-700/60">
              <input
                type="checkbox"
                checked={rememberPasscode}
                onChange={(e) => setRememberPasscode(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-600 cursor-pointer"
              />
              <span className="text-xs text-slate-200 font-medium">
                Simpan kode akses di perangkat ini (tidak perlu memasukkan lagi setiap keluar)
              </span>
            </label>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPasscodeInput(false);
                  setPasscode('');
                  setPasscodeError(false);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Kembali
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer uppercase tracking-wider"
              >
                <Sparkles className="w-4 h-4" />
                <span>Buka Dashboard</span>
              </button>
            </div>
          </form>
        )}
        {/* Creator Footer */}
        <Footer className="mt-5 pt-3 border-t border-slate-800" />
      </div>
    </div>
  );
};
