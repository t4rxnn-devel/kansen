import React, { useState, useEffect } from 'react';
import { Cpu, ShieldAlert, Volume2, VolumeX, Eye, RotateCcw, Award, Clock, Terminal, UserCheck, Shield } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import { UserSession } from './UserIdentityModal';

interface TopHUDHeaderProps {
  fabCompletedCount: number;
  fabTotalCount: number;
  edaCompletedCount: number;
  edaTotalCount: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  scanlinesEnabled: boolean;
  onToggleScanlines: () => void;
  onResetProgress: () => void;
  onOpenCertificate: () => void;
  userSession: UserSession;
  onOpenIdentityModal: () => void;
  onTriggerTapeout: () => void;
}

export const TopHUDHeader: React.FC<TopHUDHeaderProps> = ({
  fabCompletedCount,
  fabTotalCount,
  edaCompletedCount,
  edaTotalCount,
  soundEnabled,
  onToggleSound,
  scanlinesEnabled,
  onToggleScanlines,
  onResetProgress,
  onOpenCertificate,
  userSession,
  onOpenIdentityModal,
  onTriggerTapeout
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const iso = now.toISOString().replace('T', ' ').replace('Z', '');
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      setTimeStr(`${iso}.${ms} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 47);
    return () => clearInterval(interval);
  }, []);

  const fabPercent = Math.round((fabCompletedCount / fabTotalCount) * 100);
  const edaPercent = Math.round((edaCompletedCount / edaTotalCount) * 100);

  return (
    <header className="bg-[#050505] border-b border-[#18181b] px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 select-none text-xs relative z-30 shadow-2xl">
      {/* Brand Identity & Security Tier */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-9 h-9 bg-[#000000] border border-[#dc2626] rounded clip-corner-tr shadow-[0_0_15px_rgba(220,38,38,0.4)]">
          <Cpu className="w-5 h-5 text-[#dc2626] animate-pulse" />
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#dc2626] rounded-full animate-ping" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-orbitron font-black text-sm tracking-wider text-white">
              KANSEN <span className="text-[#dc2626]">CONSOLE</span>
            </h1>
            <span className="bg-[#dc2626]/20 text-[#dc2626] text-[10px] font-bold px-1.5 py-0.5 rounded border border-[#dc2626]/40 font-mono">
              SOVEREIGN CONSOLE
            </span>
          </div>
          <p className="text-zinc-400 font-tech text-[11px] flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-[#dc2626]" />
            ENTERPRISE SOVEREIGN SECURITY PROTOCOL
          </p>
        </div>
      </div>

      {/* Progress Telemetry Bars */}
      <div className="flex items-center gap-4 bg-[#000000] px-3 py-1.5 rounded border border-[#18181b]">
        {/* User Identity Session Trigger */}
        <button
          onClick={() => {
            soundFx.playClick();
            onOpenIdentityModal();
          }}
          className="flex items-center gap-2 bg-[#050505] hover:bg-zinc-900 px-2.5 py-1 rounded border border-[#18181b] text-left transition"
          title="Switch Enterprise Session Identity"
        >
          <UserCheck className="w-3.5 h-3.5 text-[#dc2626]" />
          <div>
            <div className="text-[10px] font-bold text-white leading-none">{userSession.corporateName}</div>
            <div className="text-[9px] text-zinc-500 font-mono leading-tight">{userSession.securityId}</div>
          </div>
        </button>

        {/* Fab Cert Progress */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-zinc-400 font-bold flex items-center gap-1">
              FAB CERT: <span className={fabPercent === 100 ? 'text-emerald-400' : 'text-[#dc2626]'}>{fabPercent === 100 ? 'CERTIFIED' : 'INITIATE'}</span>
            </span>
            <span className="font-tech text-zinc-300">{fabCompletedCount}/{fabTotalCount} [{fabPercent}%]</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-950 rounded overflow-hidden border border-zinc-800">
            <div 
              className="h-full bg-[#dc2626] transition-all duration-500"
              style={{ width: `${fabPercent}%` }}
            />
          </div>
        </div>

        {/* RTL Synthesis Progress */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <div className="flex justify-between items-center text-[10px]">
            <span className="text-zinc-400 font-bold flex items-center gap-1">
              RTL LABS: <span className="text-white">VERILOG</span>
            </span>
            <span className="font-tech text-zinc-300">{edaCompletedCount}/{edaTotalCount} [{edaPercent}%]</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-950 rounded overflow-hidden border border-zinc-800">
            <div 
              className="h-full bg-[#dc2626] transition-all duration-500"
              style={{ width: `${edaPercent}%` }}
            />
          </div>
        </div>

        {/* Master Cert Badge trigger */}
        {fabCompletedCount === fabTotalCount ? (
          <button
            onClick={() => {
              soundFx.playSynthPass();
              onOpenCertificate();
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#dc2626] text-white border border-[#dc2626] rounded transition text-[11px] font-bold animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]"
          >
            <Award className="w-3.5 h-3.5" />
            COMPLIANCE AUDIT
          </button>
        ) : (
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenCertificate();
            }}
            className="flex items-center gap-1 px-2 py-1 bg-zinc-900 text-zinc-300 hover:text-white border border-zinc-800 rounded transition text-[10px]"
            title="Preview Fab Certification Seal"
          >
            <Award className="w-3 h-3 text-[#dc2626]" />
            AUDIT SEAL
          </button>
        )}
      </div>

      {/* Clock & Utility Controls */}
      <div className="flex items-center gap-3">
        {/* Real-time Ticking Clock */}
        <div className="hidden lg:flex items-center gap-1.5 text-zinc-300 font-tech bg-[#000000] px-2.5 py-1 rounded border border-[#18181b]">
          <Clock className="w-3.5 h-3.5 text-[#dc2626] animate-spin" style={{ animationDuration: '8s' }} />
          <span>{timeStr || 'SYSTEM READY'}</span>
        </div>

        {/* WASM Compiler Badge */}
        <div className="hidden xl:flex items-center gap-1.5 bg-zinc-900 text-emerald-400 text-[10px] px-2 py-1 rounded border border-zinc-800 font-mono">
          <Terminal className="w-3 h-3 text-emerald-400" />
          <span>WASM SIMD: ONLINE</span>
        </div>

        {/* Tapeout Quick Execution Button */}
        <button
          onClick={() => {
            soundFx.playSynthPass();
            onTriggerTapeout();
          }}
          className="px-2.5 py-1 bg-[#dc2626] hover:bg-[#b91c1c] text-white border border-[#dc2626] rounded font-orbitron font-bold text-[10px] tracking-wider transition shadow-[0_0_10px_rgba(220,38,38,0.4)] flex items-center gap-1"
        >
          <Shield className="w-3 h-3" />
          TAPE-OUT ZIP
        </button>

        {/* Quick Utilities */}
        <div className="flex items-center gap-1 bg-[#000000] p-1 rounded border border-[#18181b]">
          <button
            onClick={() => {
              soundFx.playClick();
              onToggleSound();
            }}
            className={`p-1.5 rounded transition ${soundEnabled ? 'text-[#dc2626] bg-[#dc2626]/20 border border-[#dc2626]/40' : 'text-zinc-500 hover:text-zinc-300'}`}
            title={soundEnabled ? 'Audio Effects ON' : 'Audio Effects MUTED'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              onToggleScanlines();
            }}
            className={`p-1.5 rounded transition ${scanlinesEnabled ? 'text-[#dc2626] bg-[#dc2626]/20 border border-[#dc2626]/40' : 'text-zinc-500 hover:text-zinc-300'}`}
            title="Toggle CRT Scanline Effect"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (confirm('RESET ALL FAB CERTIFICATION & LAB PROGRESS?')) {
                soundFx.playError();
                onResetProgress();
              }
            }}
            className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
            title="Reset All Progress"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
