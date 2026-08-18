import React, { useState, useRef, useEffect } from 'react';
import { TerminalLog } from '../types';
import { Terminal, Trash2, ArrowRight, Play, CheckCircle2, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface BaseLogTerminalProps {
  logs: TerminalLog[];
  onClearLogs: () => void;
  onExecuteCommand: (cmd: string) => void;
}

export const BaseLogTerminal: React.FC<BaseLogTerminalProps> = ({
  logs,
  onClearLogs,
  onExecuteCommand
}) => {
  const [inputCmd, setInputCmd] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'INFO' | 'WARN' | 'ERR' | 'SYNTH'>('ALL');
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to latest log
  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCmd.trim()) return;
    soundFx.playClick();
    onExecuteCommand(inputCmd.trim());
    setInputCmd('');
  };

  const filteredLogs = logs.filter(log => filterType === 'ALL' || log.type === filterType);

  const renderLogIcon = (type: TerminalLog['type']) => {
    switch (type) {
      case 'ERR': return <ShieldAlert className="w-3.5 h-3.5 text-[#dc2626] shrink-0 mt-0.5" />;
      case 'WARN': return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />;
      case 'SYNTH': return <Play className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />;
      case 'SUCCESS': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
      default: return <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />;
    }
  };

  return (
    <div className="h-44 bg-[#000000] border-t border-[#18181b] flex flex-col font-mono text-xs select-none shrink-0 relative z-20">
      {/* Terminal Bar & Filters */}
      <div className="bg-[#050505] border-b border-[#18181b] px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#dc2626]" />
          <span className="font-orbitron font-bold text-white text-xs tracking-wide">
            BASE LOG INTERFACE // <span className="text-[#dc2626]">YOSYS RTL DIAGNOSTICS</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-tech">[{logs.length} LOG SEQUENCES]</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex items-center gap-1 text-[10px]">
            {(['ALL', 'INFO', 'WARN', 'ERR', 'SYNTH'] as const).map(type => (
              <button
                key={type}
                onClick={() => {
                  soundFx.playClick();
                  setFilterType(type);
                }}
                className={`px-2 py-0.5 rounded transition font-bold ${
                  filterType === type 
                    ? 'bg-[#dc2626] text-white shadow' 
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              soundFx.playClick();
              onClearLogs();
            }}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 rounded transition"
            title="Clear Console Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrolling Logs Output */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-[#000000] text-[11px] leading-relaxed">
        {filteredLogs.length === 0 ? (
          <div className="text-zinc-600 italic p-2 text-center">NO LOG SEQUENCES RECORDED IN QUEUE</div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="flex items-start gap-2 hover:bg-zinc-900/50 p-0.5 rounded transition">
              <span className="text-zinc-600 text-[10px] shrink-0 font-mono">[{log.timestamp}]</span>
              <span className="text-[#dc2626] text-[10px] font-bold shrink-0">[{log.source}]</span>
              {renderLogIcon(log.type)}
              <span className={`break-all ${
                log.type === 'ERR' ? 'text-[#dc2626] font-bold' :
                log.type === 'WARN' ? 'text-amber-400' :
                log.type === 'SYNTH' ? 'text-white font-bold' :
                log.type === 'SUCCESS' ? 'text-emerald-400 font-bold' : 'text-zinc-300'
              }`}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* Command Line Input */}
      <form onSubmit={handleSubmit} className="bg-[#050505] border-t border-[#18181b] px-3 py-1.5 flex items-center gap-2">
        <ArrowRight className="w-3.5 h-3.5 text-[#dc2626] animate-pulse" />
        <span className="text-[#dc2626] font-bold text-xs">KANSEN&gt;</span>
        <input
          type="text"
          value={inputCmd}
          onChange={(e) => setInputCmd(e.target.value)}
          placeholder="TYPE COMMAND (e.g., 'help', 'compile', 'test', 'status', 'clear', 'cert', 'info')..."
          className="flex-1 bg-transparent text-emerald-400 font-mono text-xs focus:outline-none placeholder-zinc-600"
        />
        <button
          type="submit"
          className="text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-2.5 py-0.5 rounded font-mono border border-zinc-800"
        >
          EXECUTE
        </button>
      </form>
    </div>
  );
};
