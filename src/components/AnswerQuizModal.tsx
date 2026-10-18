import React, { useState } from 'react';
import { Question } from '../types/game';
import { EnvironmentTheme, THEME_CONFIGS } from '../game/environment';
import { soundEngine } from '../game/audio';
import { HelpCircle, ArrowRight, Compass, Sparkles, CheckCircle2 } from 'lucide-react';

interface AnswerQuizModalProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  topicTitle: string;
  gateLetter: string;
  currentCombo: number;
  nextTheme: EnvironmentTheme;
  scorePerQuestion?: number;
  useComboBonus?: boolean;
  onAnswerSubmitted: (isCorrect: boolean, selectedIndex: number, scoreGained: number) => void;
  onProceedToNextTrack: () => void;
}

export const AnswerQuizModal: React.FC<AnswerQuizModalProps> = ({
  question,
  questionIndex,
  totalQuestions,
  gateLetter,
  currentCombo,
  nextTheme,
  scorePerQuestion = 20,
  useComboBonus = false,
  onAnswerSubmitted,
  onProceedToNextTrack,
}) => {
  const letters = ['A', 'B', 'C', 'D'];
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  const nextTrackName = THEME_CONFIGS[nextTheme]?.name || 'Lintasan Berikutnya';

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;

    setSelectedOptionIndex(index);
    setIsAnswered(true);

    const isCorrect = index === question.correctIndex;
    let scoreGained = 0;

    if (isCorrect) {
      const baseScore = Number(scorePerQuestion) || 20;
      const comboExtra = useComboBonus ? currentCombo * 5 : 0;
      scoreGained = baseScore + comboExtra;
    }

    // Play subtle response sound
    soundEngine.playWhooshSound();

    onAnswerSubmitted(isCorrect, index, scoreGained);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 select-none overflow-y-auto">
      <div
        className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl p-5 md:p-7 text-white shadow-2xl border transition-all my-auto overflow-y-auto ${
          !isAnswered
            ? 'bg-slate-900/95 border-sky-500/50 shadow-sky-500/20'
            : 'bg-slate-900/95 border-emerald-500/60 shadow-emerald-500/20'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 mb-3.5 pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md shrink-0 border ${
              isAnswered ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-400' : 'bg-sky-500/20 border-sky-400/40 text-sky-400'
            }`}>
              {isAnswered ? <CheckCircle2 className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-sky-400 block">
                Soal Ujian • Nomor {questionIndex + 1} dari {totalQuestions}
              </span>
              <h5 className="text-lg sm:text-xl font-black text-white leading-tight">
                {!isAnswered
                  ? `Gerbang ${gateLetter} Ditembus! Jawab Soal Ujian`
                  : '✓ Jawaban Anda Berhasil Disimpan'}
              </h5>
            </div>
          </div>

          {isAnswered && (
            <div className="text-right shrink-0">
              <span className="text-[11px] text-emerald-300 font-bold bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-xl">
                Tercatat di Guru ✓
              </span>
            </div>
          )}
        </div>

        {/* 1. Panel Soal (Question Display - Full text with word wrap, never cut off) */}
        <div className="bg-slate-800/90 rounded-2xl p-4 sm:p-5 border border-sky-500/30 mb-4 shadow-inner shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Pertanyaan Soal Ujian:</span>
          </div>
          <p className="text-sm sm:text-base md:text-lg font-bold text-white leading-relaxed break-words whitespace-normal">
            {question.question}
          </p>
        </div>

        {/* 2. Pilihan Jawaban (Interactive Options - Evaluation results hidden to prevent cheating/spoilers) */}
        <div className="space-y-2 mb-4 flex-1">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {!isAnswered ? 'Pilih salah satu jawaban di bawah ini:' : 'Jawaban Anda telah terekam oleh sistem:'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {question.options.map((option, idx) => {
              const isSelected = selectedOptionIndex === idx;

              let btnStyle = 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-white cursor-pointer hover:border-sky-400 active:scale-[0.99]';
              let badge = null;

              if (isAnswered) {
                if (isSelected) {
                  // Clean neutral selected state without revealing correct/wrong
                  btnStyle = 'bg-sky-950/90 border-sky-400 text-sky-100 ring-2 ring-sky-400/50 font-bold shadow-lg';
                  badge = (
                    <span className="text-[10px] bg-sky-500 text-slate-950 px-2.5 py-0.5 rounded font-black tracking-wide shrink-0">
                      TERPILIH ✓
                    </span>
                  );
                } else {
                  btnStyle = 'bg-slate-800/30 border-slate-800/80 text-slate-500 opacity-50';
                }
              }

              return (
                <button
                  key={letters[idx]}
                  type="button"
                  disabled={isAnswered}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full p-3 sm:p-3.5 rounded-2xl border text-left flex items-start justify-between gap-2.5 min-h-[3.5rem] transition-all shadow-md ${btnStyle}`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 mt-0.5 shadow-sm ${
                        isAnswered && isSelected
                          ? 'bg-sky-500 text-slate-950'
                          : 'bg-slate-900 text-sky-300 border border-slate-700'
                      }`}
                    >
                      {letters[idx]}
                    </span>
                    <span className="text-xs sm:text-sm leading-relaxed break-words whitespace-normal text-slate-100 flex-1 pt-0.5">
                      {option}
                    </span>
                  </div>
                  {badge && <div className="shrink-0 mt-1">{badge}</div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Footer & Action Button */}
        {isAnswered && (
          <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-xs text-sky-300">
              <Compass className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>
                Lintasan Berikutnya: <strong className="text-white">{nextTrackName}</strong>
              </span>
            </div>

            <button
              type="button"
              autoFocus
              onClick={onProceedToNextTrack}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 hover:from-sky-300 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-sky-500/25 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
            >
              <span>Lanjut ke Lintasan Berikutnya</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
