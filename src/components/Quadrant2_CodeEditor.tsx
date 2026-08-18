import React, { useState } from 'react';
import { Play, RotateCcw, Copy, Download, Check, Code2, Sparkles } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface Quadrant2_CodeEditorProps {
  labTitle: string;
  verilogCode: string;
  onCodeChange: (newCode: string) => void;
  onExecuteSynthesis: () => void;
  onRunTestbench: () => void;
  onResetCode: () => void;
  isSynthesizing: boolean;
}

export const Quadrant2_CodeEditor: React.FC<Quadrant2_CodeEditorProps> = ({
  labTitle,
  verilogCode,
  onCodeChange,
  onExecuteSynthesis,
  onRunTestbench,
  onResetCode,
  isSynthesizing
}) => {
  const [copied, setCopied] = useState(false);

  const lines = verilogCode.split('\n');

  const handleCopy = () => {
    soundFx.playClick();
    navigator.clipboard.writeText(verilogCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    soundFx.playClick();
    const blob = new Blob([verilogCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${labTitle.toLowerCase().replace(/\s+/g, '_')}.v`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] border border-[#18181b] rounded overflow-hidden select-none relative group">
      {/* Header Bar */}
      <div className="bg-[#050505] border-b border-[#18181b] px-3 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-[#dc2626]" />
          <span className="font-orbitron font-bold text-white tracking-wide">
            QUADRANT II: <span className="text-[#dc2626]">HARDWARE RTL TERMINAL</span>
          </span>
          <span className="bg-[#dc2626]/20 text-[#dc2626] text-[10px] px-1.5 py-0.5 rounded border border-[#dc2626]/40 font-mono">
            VERILOG IEEE-1364
          </span>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition flex items-center gap-1 text-[10px]"
            title="Copy Verilog Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition"
            title="Download .v File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              soundFx.playClick();
              onResetCode();
            }}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-[#dc2626] transition"
            title="Reset Default Code"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Main Text Area with Line Numbers */}
      <div className="flex-1 flex bg-[#000000] overflow-hidden relative">
        {/* Line Numbers */}
        <div className="w-10 bg-[#050505] border-r border-[#18181b] text-zinc-600 font-mono text-xs py-2 select-none text-right pr-2 space-y-0.5">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>

        {/* Text Area Input */}
        <textarea
          value={verilogCode}
          onChange={(e) => onCodeChange(e.target.value)}
          spellCheck={false}
          className="flex-1 bg-transparent text-emerald-400 font-mono text-xs p-2 leading-5 focus:outline-none resize-none selection:bg-[#dc2626] selection:text-white overflow-auto"
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Action Trigger Console Footer */}
      <div className="bg-[#050505] border-t border-[#18181b] p-2 flex items-center justify-between gap-2">
        <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>SYNTAX CHECK: NO FATAL ERRORS</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              soundFx.playClick();
              onRunTestbench();
            }}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold font-mono rounded border border-zinc-800 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#dc2626]" />
            TESTBENCH
          </button>

          <button
            onClick={() => {
              soundFx.playSynthPass();
              onExecuteSynthesis();
            }}
            disabled={isSynthesizing}
            className={`px-4 py-1.5 font-orbitron font-bold text-xs rounded border transition flex items-center gap-2 shadow-lg ${
              isSynthesizing 
                ? 'bg-zinc-800 text-zinc-500 border-zinc-700 cursor-not-allowed'
                : 'bg-[#dc2626] text-white border-[#dc2626] hover:bg-[#b91c1c] shadow-[0_0_15px_rgba(220,38,38,0.5)]'
            }`}
          >
            <Play className={`w-3.5 h-3.5 ${isSynthesizing ? 'animate-spin' : 'transition'}`} />
            <span>{isSynthesizing ? 'SYNTHESIZING...' : 'EXECUTE SYNTHESIS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
