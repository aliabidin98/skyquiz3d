import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Rocket, Disc } from 'lucide-react';

interface TouchControlsProps {
  onSteer: (x: number, y: number) => void;
  onBoost: (boosting: boolean) => void;
  visible: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({ onSteer, onBoost, visible }) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);

  // Maximum distance the stick knob can travel from center (in px)
  const MAX_RADIUS = 42;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!joystickBaseRef.current) return;

    activePointerIdRef.current = e.pointerId;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);

    updateJoystickPosition(e.clientX, e.clientY);
  };

  const updateJoystickPosition = useCallback((clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;

    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const rawDx = clientX - centerX;
    const rawDy = clientY - centerY;

    const distance = Math.hypot(rawDx, rawDy);
    let clampedX = rawDx;
    let clampedY = rawDy;

    if (distance > MAX_RADIUS) {
      clampedX = (rawDx / distance) * MAX_RADIUS;
      clampedY = (rawDy / distance) * MAX_RADIUS;
    }

    setKnobPos({ x: clampedX, y: clampedY });

    // Normalize to [-1, 1] range:
    // Screen X: positive is right
    // Screen Y: negative is up in screen coordinates, so invert for flight pitch
    const normalizedX = Number((clampedX / MAX_RADIUS).toFixed(3));
    const normalizedY = Number((-clampedY / MAX_RADIUS).toFixed(3));

    onSteer(normalizedX, normalizedY);
  }, [MAX_RADIUS, onSteer]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || activePointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateJoystickPosition(e.clientX, e.clientY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current === e.pointerId) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
      activePointerIdRef.current = null;
      setIsDragging(false);
      setKnobPos({ x: 0, y: 0 });
      onSteer(0, 0);
    }
  };

  useEffect(() => {
    // Reset joystick on unmount or hide
    return () => {
      onSteer(0, 0);
    };
  }, [onSteer]);

  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none flex justify-between items-end px-4 sm:px-8 pb-24 sm:pb-22 md:pb-16">
      {/* Left: Virtual Analog Joystick Stick Controller */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5">
        <div
          ref={joystickBaseRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-slate-950/75 border-2 border-sky-400/40 shadow-2xl relative flex items-center justify-center backdrop-blur-md touch-none cursor-pointer active:border-sky-300"
          title="Stick Analog Kemudi Pesawat (Geser 360°)"
        >
          {/* Outer Ring & Subtle Crosshairs */}
          <div className="absolute inset-2 rounded-full border border-sky-500/20 pointer-events-none" />
          <div className="absolute w-full h-[1px] bg-sky-400/20 pointer-events-none" />
          <div className="absolute h-full w-[1px] bg-sky-400/20 pointer-events-none" />

          {/* Directional Guides */}
          <span className="absolute top-1 text-[9px] font-black text-sky-400/50 pointer-events-none">▲</span>
          <span className="absolute bottom-1 text-[9px] font-black text-sky-400/50 pointer-events-none">▼</span>
          <span className="absolute left-1.5 text-[9px] font-black text-sky-400/50 pointer-events-none">◀</span>
          <span className="absolute right-1.5 text-[9px] font-black text-sky-400/50 pointer-events-none">▶</span>

          {/* Center deadzone circle */}
          <div className="w-5 h-5 rounded-full border border-sky-400/30 bg-slate-900/40 pointer-events-none" />

          {/* Movable Thumbstick Knob */}
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-sky-500 via-teal-400 to-sky-300 border-2 border-white/80 shadow-lg absolute pointer-events-none flex items-center justify-center transition-transform ${
              isDragging ? 'scale-105 duration-0' : 'duration-150 ease-out'
            }`}
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/40 border border-white/70 shadow-inner flex items-center justify-center">
              <Disc className="w-2.5 h-2.5 text-slate-950" />
            </div>
          </div>
        </div>

        <span className="text-[10px] font-black uppercase tracking-wider text-sky-300 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700/80">
          Stick Analog 360°
        </span>
      </div>

      {/* Right: Boost / Turbo Button */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5">
        <button
          type="button"
          aria-label="Turbo Boost Flight"
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white flex flex-col items-center justify-center gap-0.5 shadow-2xl border-2 border-amber-300 active:scale-90 transition-transform cursor-pointer"
          onPointerDown={(e) => {
            e.preventDefault();
            onBoost(true);
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            onBoost(false);
          }}
          onPointerCancel={() => onBoost(false)}
        >
          <Rocket className="w-6 h-6 animate-pulse" />
          <span className="text-[10px] font-black tracking-wider uppercase">TURBO</span>
        </button>

        <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700/80">
          Akselerasi
        </span>
      </div>
    </div>
  );
};
