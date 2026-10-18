import React from 'react';
import { Question } from '../types/game';
import { EnvironmentTheme, THEME_CONFIGS } from '../game/environment';
import { CheckCircle2, XCircle, Zap, ArrowRight, Lightbulb, Compass, Award, HelpCircle } from 'lucide-react';

interface QuestionResultPopupProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  selectedGateIndex: number;
  isCorrect: boolean;
  scoreGained: number;
  currentCombo: number;
  nextTheme: EnvironmentTheme;
  onProceed: () => void;
}

export const QuestionResultPopup: React.FC<QuestionResultPopupProps> = ({
  question,
  questionIndex,
  totalQuestions,
  selectedGateIndex,
  isCorrect,
  scoreGained,
  currentCombo,
  nextTheme,
  onProceed,
}) => {
  const letters = ['A', 'B', 'C', 'D'];
  const nextTrackName = THEME_CONFIGS[nextTheme]?.name || 'Lintasan Berikutnya';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
      <div
        className={`w-full max-w-2xl rounded-3xl p-6 md:p-8 text-white shadow-2xl border transition-all ${
          isCorrect
            ? 'bg-slate-900/95 border-emerald-500/70 shadow-emerald-500/25 ring-1 ring-emerald-500/30'
            : 'bg-slate-900/95 border-rose-500/70 shadow-rose-500/25 ring-1 ring-rose-500/30'
        }`}
      >
        {/* Top Header Badge */}
        <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {isCorrect ? (
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/50 flex items-center justify-center text-rose-400 shadow-lg">
                <XCircle className="w-7 h-7" />
              </div>
            )}
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400 block">
                Soal & Jawaban {questionIndex + 1} dari {totalQuestions}
              </span>
              <h3 className={`text-xl md:text-2xl font-black ${isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
                {isCorrect ? 'Gerbang Berhasil Ditembus! Jawaban Tepat' : 'Kurang Tepat, Jangan Menyerah!'}
              </h3>
            </div>
          </div>

          {/* Points & Combo */}
          <div className="text-right shrink-0">
            {isCorrect ? (
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-lg">
                <Award className="w-5 h-5" />
                <span>+{scoreGained} Poin</span>
              </div>
            ) : (
              <span className="text-xs text-rose-300 font-bold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                +0 Poin
              </span>
            )}
            {currentCombo > 1 && (
              <div className="flex items-center justify-end gap-1 text-xs font-bold text-amber-300 mt-1">
                <Zap className="w-3.5 h-3.5 fill-amber-300" />
                <span>{currentCombo}x Combo Streak!</span>
              </div>
            )}
          </div>
        </div>

        {/* 1. Soal (Question Card) */}
        <div className="bg-slate-800/90 rounded-2xl p-4 md:p-5 border border-sky-500/30 mb-4 shadow-inner">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-300 uppercase tracking-wider mb-1.5">
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span>Pertanyaan yang Baru Saja Ditembus:</span>
          </div>
          <p className="text-base md:text-lg font-black text-white leading-relaxed">
            {question.question}
          </p>
        </div>

        {/* 2. Pilihan Jawaban (Answer Choices) */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Pilihan Gerbang Jawaban:</span>
            <span className="text-[11px] text-sky-400 normal-case">
              Pesawatmu menembus: <strong>Gerbang {letters[selectedGateIndex] || '?'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {question.options.map((opt, idx) => {
              const isSelected = selectedGateIndex === idx;
              const isRightAnswer = question.correctIndex === idx;

              let cardStyle = 'bg-slate-800/50 border-slate-700 text-slate-300';
              let badge = null;

              if (isRightAnswer) {
                cardStyle = 'bg-emerald-950/70 border-emerald-400 text-emerald-100 ring-2 ring-emerald-400/50 font-bold shadow-lg';
                badge = (
                  <span className="text-[10px] bg-emerald-500 text-slate-950 px-2.5 py-0.5 rounded font-black tracking-wide shrink-0">
                    KUNCI BENAR ✓
                  </span>
                );
              } else if (isSelected && !isCorrect) {
                cardStyle = 'bg-rose-950/70 border-rose-400 text-rose-100 ring-2 ring-rose-400/50 font-bold shadow-lg';
                badge = (
                  <span className="text-[10px] bg-rose-500 text-white px-2.5 py-0.5 rounded font-bold tracking-wide shrink-0">
                    PILIHANMU ✕
                  </span>
                );
              }

              return (
                <div
                  key={letters[idx]}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-2 text-xs md:text-sm transition-all ${cardStyle}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${
                        isRightAnswer
                          ? 'bg-emerald-500 text-slate-950'
                          : isSelected && !isCorrect
                          ? 'bg-rose-500 text-white'
                          : 'bg-slate-900 text-sky-300 border border-slate-700'
                      }`}
                    >
                      {letters[idx]}
                    </span>
                    <span className="leading-snug truncate">{opt}</span>
                  </div>
                  {badge}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Penjelasan Edukatif */}
        {question.explanation && (
          <div className="bg-sky-950/40 border border-sky-400/30 rounded-2xl p-3.5 mb-5 flex items-start gap-2.5 text-xs text-sky-100 leading-relaxed">
            <Lightbulb className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-bold block mb-0.5">Penjelasan Materi:</strong>
              {question.explanation}
            </div>
          </div>
        )}

        {/* 4. Lintasan Berikutnya & Tombol Lanjut */}
        <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-sky-300">
            <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>
              Lintasan Berikutnya: <strong className="text-white">{nextTrackName}</strong>
            </span>
          </div>

          <button
            type="button"
            autoFocus
            onClick={onProceed}
            className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 hover:from-sky-300 hover:to-emerald-300 text-slate-950 font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
          >
            <span>Lanjut ke Lintasan Berikutnya</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
