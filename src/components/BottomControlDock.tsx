import React, { useState } from 'react';
import { Volume2, VolumeX, MousePointer, Gamepad2, Disc, HelpCircle, ChevronDown, ChevronUp, Gauge, LogOut, Plane, Rocket, Compass, Sparkles } from 'lucide-react';
import { AircraftType, AIRCRAFT_MODELS } from '../game/aircraft';

interface BottomControlDockProps {
  speed: number;
  isMuted: boolean;
  onToggleMute: () => void;
  mouseControl: boolean;
  onToggleMouseControl: () => void;
  touchControlsVisible: boolean;
  onToggleTouchControls: () => void;
  currentAircraftType: AircraftType;
  onSelectAircraftType: (type: AircraftType) => void;
  hideAircraftSelector?: boolean;
  onExitGame: () => void;
}

export const BottomControlDock: React.FC<BottomControlDockProps> = ({
  speed,
  isMuted,
  onToggleMute,
  mouseControl,
  onToggleMouseControl,
  touchControlsVisible,
  onToggleTouchControls,
  currentAircraftType,
  onSelectAircraftType,
  hideAircraftSelector = false,
  onExitGame,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const getModelIcon = (type: AircraftType) => {
    switch (type) {
      case 'JET':
        return <Rocket className="w-4 h-4 text-sky-400" />;
      case 'HELICOPTER':
        return <Compass className="w-4 h-4 text-amber-400" />;
      case 'SPACESHIP':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      default:
        return <Plane className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <>
      <div className="fixed bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center max-w-[min(840px,94vw)] w-auto transition-transform duration-300 select-none">
        {/* Collapse / Expand Toggle Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mb-1 px-3 py-0.5 bg-slate-900/90 hover:bg-slate-800 text-sky-200 hover:text-white rounded-full text-[11px] font-semibold flex items-center gap-1 shadow-lg border border-sky-500/30 transition-all cursor-pointer backdrop-blur-md active:scale-95"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Buka Menu HUD</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Sembunyikan HUD</span>
            </>
          )}
        </button>

        {/* Main Dock Container */}
        <div
          className={`w-auto bg-slate-900/90 text-white rounded-2xl shadow-2xl border border-sky-500/30 px-3 py-1.5 sm:px-4 sm:py-2 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 transition-all duration-300 ${
            isCollapsed ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          }`}
        >
          {/* Left: Speedometer & Flight Keys */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60">
              <Gauge className="w-4 h-4 text-sky-400" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none">Kecepatan</span>
                <span className="text-sm font-black text-sky-200 leading-none">{speed} km/h</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1 text-[11px] text-slate-300 bg-slate-800/50 px-2.5 py-1.5 rounded-xl">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-sky-300 font-mono text-[10px]">A</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-sky-300 font-mono text-[10px]">D</kbd>
              <span>/</span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-sky-300 font-mono text-[10px]">W</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-sky-300 font-mono text-[10px]">S</kbd>
              <span className="ml-1 text-slate-400">Kemudi</span>
              <span className="mx-1.5 text-slate-600">|</span>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-amber-300 font-mono text-[10px]">SPASI</kbd>
              <span className="ml-1 text-slate-400">Turbo</span>
            </div>
          </div>

          {/* Right: Controls & Aircraft Model Selector */}
          <div className="flex items-center gap-2">
            {/* Aircraft Model Dropdown - Hidden during student exams */}
            {!hideAircraftSelector && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  title="Ganti Model Pesawat"
                  className="p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl text-sky-300 hover:text-white border border-slate-700/60 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  {getModelIcon(currentAircraftType)}
                  <span className="hidden sm:inline">Model Wahana</span>
                </button>

                {showModelMenu && (
                  <div className="absolute bottom-full mb-2 right-0 bg-slate-900 border border-sky-500/30 rounded-2xl p-2.5 shadow-2xl min-w-[220px] flex flex-col gap-1.5 z-40 backdrop-blur-md">
                    <span className="text-[11px] font-bold text-sky-400 px-2 pb-1 border-b border-slate-800 uppercase tracking-wider">
                      Pilih Model Pesawat
                    </span>
                    {AIRCRAFT_MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onSelectAircraftType(model.id);
                          setShowModelMenu(false);
                        }}
                        className={`text-left text-xs px-2.5 py-2 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer ${
                          currentAircraftType === model.id
                            ? 'bg-sky-500 text-slate-950 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="p-1 rounded-lg bg-slate-950/60 shrink-0">
                          {getModelIcon(model.id)}
                        </div>
                        <div className="min-w-0">
                          <span className="block font-bold truncate">{model.name}</span>
                          <span className={`block text-[10px] truncate ${currentAircraftType === model.id ? 'text-slate-900' : 'text-slate-400'}`}>
                            {model.tagline}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Mouse Steer Toggle */}
            <button
              type="button"
              onClick={onToggleMouseControl}
              title={mouseControl ? 'Kendali Mouse Aktif' : 'Aktifkan Kemudi Mouse'}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                mouseControl
                  ? 'bg-sky-500 text-slate-950 border-sky-400'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/60'
              }`}
            >
              <MousePointer className="w-4 h-4" />
              <span className="hidden sm:inline">Mouse</span>
            </button>

            {/* Analog Stick Control Toggle */}
            <button
              type="button"
              onClick={onToggleTouchControls}
              title={touchControlsVisible ? 'Sembunyikan Kemudi Analog' : 'Aktifkan Kemudi Analog 360°'}
              className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                touchControlsVisible
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white border-slate-700/60'
              }`}
            >
              <Disc className="w-4 h-4 text-slate-950 sm:text-inherit" />
              <span className="hidden sm:inline">Analog</span>
            </button>

            {/* Sound Mute Toggle */}
            <button
              type="button"
              onClick={onToggleMute}
              title={isMuted ? 'Nyalakan Suara' : 'Matikan Suara'}
              className="p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            </button>

            {/* Help / Guide */}
            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              title="Panduan Bermain"
              className="p-2 bg-slate-800/80 hover:bg-slate-700/80 rounded-xl text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-amber-300" />
            </button>

            {/* Exit to Menu */}
            <button
              type="button"
              onClick={onExitGame}
              title="Ganti Topik / Keluar"
              className="p-2 bg-rose-500/20 hover:bg-rose-500/40 rounded-xl text-rose-300 hover:text-white border border-rose-500/30 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-950/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm select-none">
          <div className="bg-slate-900 border border-sky-500/40 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-xl font-black text-sky-400 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-amber-400" />
              Panduan Pilot Siswa
            </h3>
            <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
              <p>
                1. <strong>Terbang Menjelajah:</strong> Pesawatmu meluncur otomatis melewati pemandangan 3D (pantai, kota, pelangi, antariksa, antartika).
              </p>
              <p>
                2. <strong>Tembus Gerbang:</strong> Arahkan pesawatmu menembus salah satu gerbang portal bulat (A, B, C, D) di depan.
              </p>
              <p>
                3. <strong>Jawab Soal:</strong> Saat gerbang ditembus, menu pertanyaan akan terbuka untukmu menjawab soal kuis secara interaktif!
              </p>
              <p>
                4. <strong>Lintasan Baru:</strong> Setelah menjawab, pesawat akan langsung berpindah ke lintasan pemandangan baru berikutnya!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full mt-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl transition-all shadow-lg cursor-pointer"
            >
              Mengerti & Lanjutkan
            </button>
          </div>
        </div>
      )}
    </>
  );
};
