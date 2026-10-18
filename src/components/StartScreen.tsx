import React, { useState } from 'react';
import { QuizTopic, FlightDifficulty } from '../types/game';
import { AircraftType, AIRCRAFT_MODELS } from '../game/aircraft';
import { AirplaneCanvasPreview } from './AirplaneCanvasPreview';
import {
  Plane,
  Play,
  Atom,
  Calculator,
  Languages,
  Compass,
  PlusCircle,
  Sparkles,
  Gamepad2,
  Trash2,
  HelpCircle,
  Rocket,
  FileSpreadsheet,
} from 'lucide-react';
import { deleteCustomTopic } from '../data/quizData';

interface StartScreenProps {
  topics: QuizTopic[];
  selectedTopic: QuizTopic;
  onSelectTopic: (topic: QuizTopic) => void;
  difficulty: FlightDifficulty;
  onSelectDifficulty: (difficulty: FlightDifficulty) => void;
  selectedAircraftType: AircraftType;
  onSelectAircraftType: (type: AircraftType) => void;
  onStartGame: () => void;
  onOpenCustomQuizModal: () => void;
  onRefreshTopics: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  topics,
  selectedTopic,
  onSelectTopic,
  difficulty,
  onSelectDifficulty,
  selectedAircraftType,
  onSelectAircraftType,
  onStartGame,
  onOpenCustomQuizModal,
  onRefreshTopics,
}) => {
  const [showHowTo, setShowHowTo] = useState(false);

  const renderTopicIcon = (iconName: string) => {
    switch (iconName) {
      case 'Atom':
        return <Atom className="w-5 h-5 text-sky-400" />;
      case 'Calculator':
        return <Calculator className="w-5 h-5 text-amber-400" />;
      case 'Languages':
        return <Languages className="w-5 h-5 text-purple-400" />;
      case 'Compass':
        return <Compass className="w-5 h-5 text-emerald-400" />;
      default:
        return <Plane className="w-5 h-5 text-sky-400" />;
    }
  };

  const renderVehicleIcon = (type: AircraftType) => {
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

  const handleDelete = (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    if (confirm('Hapus kuis kustom ini?')) {
      deleteCustomTopic(topicId);
      onRefreshTopics();
    }
  };

  const currentVehicle = AIRCRAFT_MODELS.find((m) => m.id === selectedAircraftType) || AIRCRAFT_MODELS[0];

  return (
    <div className="absolute inset-0 z-40 bg-gradient-to-b from-slate-950/90 via-slate-900/90 to-slate-950 flex flex-col items-center justify-between p-3 sm:p-5 overflow-y-auto select-none backdrop-blur-xs">
      {/* Top Header Bar */}
      <div className="w-full max-w-4xl flex items-center justify-between py-1.5 border-b border-sky-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-emerald-400 flex items-center justify-center text-slate-950 shadow-md">
            <Plane className="w-5 h-5 transform -rotate-45" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
              SkyQuiz 3D
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full">
                Simulator Edukasi
              </span>
            </h1>
            <p className="text-[11px] text-sky-200/80 font-medium">Terbang Menembus Angkasa, Jawab Kuis Seru</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenCustomQuizModal}
            className="text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Buat / Impor Excel</span>
            <span className="sm:hidden">Kuis</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHowTo(!showHowTo)}
            className="text-xs text-sky-300 hover:text-white flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-700 hover:border-sky-400 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Panduan</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-4xl my-auto py-3 space-y-4">
        {/* Help Banner */}
        {showHowTo && (
          <div className="bg-sky-950/70 border border-sky-400/40 rounded-2xl p-3.5 text-xs text-sky-100 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="space-y-1">
              <strong className="text-amber-300 font-bold text-xs block">🕹️ Cara Bermain:</strong>
              <p>
                Pesawat meluncur maju otomatis di udara 3D. Arahkan pesawat ke salah satu gerbang bulat. Saat menembus gerbang, penerbangan berhenti sejenak dan menu pertanyaan akan muncul untuk dijawab!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowHowTo(false)}
              className="px-3 py-1 bg-sky-500 text-slate-950 font-bold rounded-lg shrink-0 cursor-pointer text-xs"
            >
              Tutup
            </button>
          </div>
        )}

        {/* 1. Hero 3D Airplane Animation Showcase */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-sky-950/40 via-slate-900/60 to-slate-950 border border-sky-500/30 p-4 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Left Info & Vehicle Selector */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-md">
                  Pilih Wahana Terbang
                </span>
                <span className="text-xs text-slate-400 font-semibold">{currentVehicle.name}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                Kendalikan <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-amber-300">{currentVehicle.name}</span>
              </h2>

              <p className="text-xs text-slate-300 leading-relaxed">
                {currentVehicle.tagline}. Sentuh atau geser pesawat 3D untuk melihat sudut manuvernya!
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

            {/* Right 3D Animated Plane Canvas */}
            <div className="md:col-span-5 h-44 sm:h-48 rounded-2xl bg-gradient-to-b from-sky-900/30 to-slate-900/80 border border-sky-400/20 relative overflow-hidden flex items-center justify-center">
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

        {/* 2. Topik Kuis Pelajaran */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Pilih Materi Pelajaran
            </h3>

            <button
              type="button"
              onClick={onOpenCustomQuizModal}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xl transition-all cursor-pointer hover:bg-emerald-500/20"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Buat / Impor Excel</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {topics.map((topic) => {
              const isSelected = selectedTopic.id === topic.id;
              const isCustom = topic.id.startsWith('custom-');

              return (
                <div
                  key={topic.id}
                  onClick={() => onSelectTopic(topic)}
                  className={`relative group rounded-2xl p-3 border text-left cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-br from-sky-900/80 to-slate-900 border-sky-400 shadow-lg shadow-sky-500/20 ring-2 ring-sky-400/50 scale-[1.02]'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                      {renderTopicIcon(topic.icon)}
                    </div>
                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, topic.id)}
                        title="Hapus Kuis Kustom"
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-xs mb-0.5 leading-snug truncate">{topic.title}</h4>
                  <div className="flex items-center justify-between text-[10px] text-sky-300 font-semibold mt-2">
                    <span>{topic.questions.length} Soal</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300">
                      {isSelected ? '✓ Terpilih' : 'Pilih'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Kecepatan Jelajah */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              Kecepatan & Waktu Jelajah:
            </span>

            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'EASY', label: 'Santai', time: '~19 dtk' },
                  { id: 'MEDIUM', label: 'Sedang', time: '~12 dtk' },
                  { id: 'HARD', label: 'Cepat', time: '~8 dtk' },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => onSelectDifficulty(d.id)}
                  className={`px-3 py-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                    difficulty === d.id
                      ? 'bg-sky-500 text-slate-950 font-black border-sky-400 shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className="text-xs font-bold block">{d.label}</span>
                  <span className="text-[9px] opacity-75 block">{d.time}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Launch Button */}
      <div className="w-full max-w-md pt-2 pb-1">
        <button
          type="button"
          onClick={onStartGame}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400 hover:from-sky-300 hover:to-emerald-300 text-slate-950 font-black text-base md:text-lg flex items-center justify-center gap-2.5 shadow-xl shadow-sky-500/25 hover:shadow-emerald-500/35 active:scale-98 transition-all cursor-pointer uppercase tracking-wider"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>Luncurkan Pesawat Sekarang!</span>
        </button>
      </div>
    </div>
  );
};
