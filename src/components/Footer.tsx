import React from 'react';

interface FooterProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export const Footer: React.FC<FooterProps> = ({ className = '', variant = 'dark' }) => {
  return (
    <footer
      className={`w-full py-2.5 px-4 select-none border-t rounded-2xl backdrop-blur-md transition-all ${
        variant === 'dark'
          ? 'bg-slate-950/85 border-slate-800/80 text-slate-300 shadow-lg'
          : 'bg-slate-900/85 border-slate-700/80 text-slate-200 shadow-md'
      } ${className}`}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 text-xs">
        {/* Creator Identity */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-slate-400 font-medium text-[11px] sm:text-xs">
            Dibuat oleh:
          </span>
          <span className="font-extrabold text-white tracking-wide text-xs sm:text-[13px] bg-gradient-to-r from-sky-400 via-emerald-300 to-amber-300 bg-clip-text text-transparent">
            M. Nur Ali Abidin, S.Pd.
          </span>
        </div>

        {/* Social Media Links */}
        <div className="flex items-center flex-wrap justify-center gap-2 sm:gap-3">
          <span className="text-[11px] text-slate-400 font-semibold hidden md:inline">
            Medsos:
          </span>

          {/* Instagram Button */}
          <a
            href="https://www.instagram.com/aliabidin988"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-purple-500/15 via-pink-500/15 to-amber-500/15 hover:from-purple-500/25 hover:to-pink-500/25 border border-pink-500/35 hover:border-pink-400 text-pink-300 hover:text-white transition-all text-[11px] font-bold shadow-sm active:scale-95 group"
            title="Kunjungi Instagram @aliabidin988"
          >
            <svg
              className="w-3.5 h-3.5 fill-current text-pink-400 group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            <span className="text-slate-300">Instagram:</span>
            <span className="text-white font-extrabold">@aliabidin988</span>
          </a>

          {/* TikTok Button */}
          <a
            href="https://www.tiktok.com/@aliabidin98"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 hover:border-cyan-400 text-cyan-300 hover:text-white transition-all text-[11px] font-bold shadow-sm active:scale-95 group"
            title="Kunjungi TikTok @aliabidin98"
          >
            <svg
              className="w-3.5 h-3.5 fill-current text-cyan-400 group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-1.85-.28A6.34 6.34 0 0 0 2 15.46a6.34 6.34 0 0 0 10.82 4.47 6.28 6.28 0 0 0 1.94-4.52V8.29a8.16 8.16 0 0 0 4.83 1.87v-3.47z" />
            </svg>
            <span className="text-slate-300">TikTok:</span>
            <span className="text-white font-extrabold">@aliabidin98</span>
          </a>
        </div>
      </div>
    </footer>
  );
};
