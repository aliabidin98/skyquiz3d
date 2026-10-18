import React from 'react';
import { Award, Zap, Navigation } from 'lucide-react';

interface QuestionOverlayProps {
  questionIndex: number;
  totalQuestions: number;
  topicTitle: string;
  score: number;
  combo: number;
}

export const QuestionOverlay: React.FC<QuestionOverlayProps> = ({
  questionIndex,
  totalQuestions,
  topicTitle,
  score,
  combo,
}) => {
  const progressPercent = ((questionIndex) / totalQuestions) * 100;

  return (
    <div className="absolute top-0 left-0 right-0 p-3 md:p-4 pointer-events-none z-20 flex flex-col items-center">
      {/* Sleek, minimal flight status bar leaving 100% of the 3D sky view open */}
      <div className="w-full max-w-2xl bg-slate-900/85 text-white rounded-2xl shadow-xl border border-sky-500/30 backdrop-blur-md px-4 py-2 flex flex-col gap-1.5 transition-all">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Topic & Question Progress */}
          <div className="flex items-center gap-2">
            <span className="bg-sky-500 text-slate-950 font-black text-[11px] px-2.5 py-0.5 rounded-md tracking-wider uppercase">
              {topicTitle}
            </span>
            <span className="text-sky-200 text-xs font-bold">
              Soal Ujian {questionIndex + 1} / {totalQuestions}
            </span>
          </div>

          {/* Right: Score & Combo */}
          <div className="flex items-center gap-3">
            {combo > 1 && (
              <div className="flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full text-xs font-bold">
                <Zap className="w-3.5 h-3.5 fill-amber-300" />
                <span>{combo}x Combo</span>
              </div>
            )}
            <div className="flex items-center gap-1 text-amber-400 font-extrabold text-sm">
              <Award className="w-4 h-4" />
              <span>{score.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-sky-400 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Dynamic Flight Hint */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-sky-300 font-medium pt-0.5">
          <Navigation className="w-3 h-3 text-amber-300 transform rotate-45" />
          <span>Arahkan pesawat dan tembus salah satu gerbang bulat di depan!</span>
        </div>
      </div>
    </div>
  );
};
