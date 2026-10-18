import React from 'react';
import { AnswerRecord } from '../types/game';
import { Trophy, Star, CheckCircle2, RotateCcw, Home, Printer, Award, Lock, FileCheck } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Footer } from './Footer';

interface ReportModalProps {
  records: AnswerRecord[];
  finalScore: number;
  maxCombo: number;
  topicTitle: string;
  isStudentOnly?: boolean;
  onPlayAgain: () => void;
  onBackToMenu: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  records,
  finalScore,
  maxCombo,
  topicTitle,
  isStudentOnly = false,
  onPlayAgain,
  onBackToMenu,
}) => {
  const total = records.length;
  const correctCount = records.filter((r) => r.isCorrect).length;
  const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  let stars = 1;
  if (accuracy >= 80) stars = 3;
  else if (accuracy >= 50) stars = 2;

  React.useEffect(() => {
    if (stars >= 2) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [stars]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-sky-500/40 rounded-3xl max-w-2xl w-full p-5 sm:p-7 text-white shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
        {/* Header Ribbon */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-xl mb-2.5">
            <Trophy className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-amber-200 to-emerald-300">
            {isStudentOnly ? 'Ujian Telah Selesai Dikerjakan' : 'Rapor Hasil Soal Ujian'}
          </h2>
          <p className="text-xs text-sky-200/80 mt-1 font-semibold">{topicTitle}</p>

          {!isStudentOnly && (
            <div className="flex items-center justify-center gap-1.5 mt-2.5">
              {[1, 2, 3].map((starIdx) => (
                <Star
                  key={starIdx}
                  className={`w-6 h-6 transition-all ${
                    starIdx <= stars
                      ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                      : 'text-slate-700'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats Grid for Student vs Teacher */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Soal Diselesaikan</span>
            <span className="text-xl sm:text-2xl font-black text-sky-300">{total} Soal</span>
          </div>

          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Status Pengiriman</span>
            <span className="text-sm sm:text-base font-black text-emerald-400 flex items-center justify-center gap-1 mt-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Tersimpan di Guru</span>
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Kesempatan Main</span>
            <span className="text-sm sm:text-base font-black text-amber-300 mt-1 block">
              1x (Selesai)
            </span>
          </div>
        </div>

        {/* Notice for Student: Only 1 Attempt Allowed & Answers Recorded */}
        {isStudentOnly ? (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3 shadow-md">
            <FileCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-100 leading-relaxed space-y-1">
              <strong className="block text-emerald-300 font-bold text-sm">
                Jawaban Anda Telah Berhasil Terkirim ke Guru!
              </strong>
              <p className="text-slate-300">
                Sesuai dengan ketentuan ujian, hasil evaluasi dan kunci jawaban disembunyikan. Guru Anda dapat melihat rekap dan rincian jawaban melalui Dashboard Guru.
              </p>
            </div>
          </div>
        ) : (
          /* Detailed Question Review only for Teacher Simulator mode */
          <div className="mb-5">
            <h4 className="text-xs font-bold text-sky-300 mb-2.5 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Evaluasi Jawaban Simulator Guru
            </h4>
            <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {records.map((rec, index) => (
                <div
                  key={rec.questionId}
                  className={`p-3 rounded-xl border text-xs leading-relaxed ${
                    rec.isCorrect
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100'
                      : 'bg-rose-950/40 border-rose-500/30 text-rose-100'
                  }`}
                >
                  <div className="space-y-1 w-full min-w-0">
                    <p className="font-bold text-white break-words whitespace-normal leading-relaxed">
                      {index + 1}. {rec.questionText}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                      <span className="break-words">
                        Pilihan: <strong className={rec.isCorrect ? 'text-emerald-300' : 'text-rose-300'}>{rec.selectedOption}</strong>
                      </span>
                      {!rec.isCorrect && (
                        <span className="break-words">
                          Kunci Benar: <strong className="text-emerald-300">{rec.correctOption}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-slate-800">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Bukti</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToMenu}
              className="px-5 py-2 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Kembali ke Beranda</span>
            </button>

            {!isStudentOnly && (
              <button
                type="button"
                onClick={onPlayAgain}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Uji Ulang Simulator</span>
              </button>
            )}
          </div>
        </div>

        {/* Creator Footer */}
        <Footer className="mt-4 pt-3 border-t border-slate-800/80" />
      </div>
    </div>
  );
};
