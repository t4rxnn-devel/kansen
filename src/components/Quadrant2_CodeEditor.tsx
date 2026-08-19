import React, { useState } from 'react';
import { Play, RotateCcw, Copy, Download, Check, Code2, Sparkles, ShieldAlert, AlertTriangle, CheckCircle } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import { runDesignRuleCheck } from '../utils/drcParser';

interface Quadrant2_CodeEditorProps {
  labTitle: string;
  verilogCode: string;
  onCodeChange: (newCode: string) => void;
  onExecuteSynthesis: () => void;
  onRunTestbench: () => void;
  onResetCode: () => void;
  isSynthesizing: boolean;
  satSolverMode?: 'HEURISTIC' | 'EXACT';
  onSetSatSolverMode?: (mode: 'HEURISTIC' | 'EXACT') => void;
}

export const Quadrant2_CodeEditor: React.FC<Quadrant2_CodeEditorProps> = ({
  labTitle,
  verilogCode,
  onCodeChange,
  onExecuteSynthesis,
  onRunTestbench,
  onResetCode,
  isSynthesizing,
  satSolverMode = 'HEURISTIC',
  onSetSatSolverMode
}) => {
  const [copied, setCopied] = useState(false);
  const [showDrcPanel, setShowDrcPanel] = useState(true);

  const lines = verilogCode.split('\n');
  const drcViolations = runDesignRuleCheck(verilogCode);

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

          <div className="flex items-center gap-1.5 bg-[#000000] px-1.5 py-0.5 rounded border border-zinc-800 text-[9px] font-mono ml-2">
            <span className="text-zinc-500 font-bold text-[8px] uppercase">SAT:</span>
            <select
              value={satSolverMode}
              onChange={(e) => {
                soundFx.playClick();
                if (onSetSatSolverMode) onSetSatSolverMode(e.target.value as 'HEURISTIC' | 'EXACT');
              }}
              className="bg-transparent text-white font-bold border-none outline-none text-[9px] cursor-pointer"
            >
              <option value="HEURISTIC" className="bg-[#050505] text-amber-500">HEURISTIC (DPLL+VSIDS)</option>
              <option value="EXACT" className="bg-[#050505] text-[#dc2626]">EXACT CDCL (CDCL+SAT)</option>
            </select>
          </div>
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
          {lines.map((_, i) => {
            // Find if there is any violation on this line
            const hasError = drcViolations.some(v => v.line === (i + 1));
            return (
              <div 
                key={i} 
                className={`${hasError ? 'text-[#dc2626] bg-[#dc2626]/10 font-bold border-r border-[#dc2626]' : ''}`}
                title={hasError ? 'DRC Violation on this line' : ''}
              >
                {i + 1}
              </div>
            );
          })}
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

      {/* DRC violations list drawer */}
      {showDrcPanel && (
        <div className="bg-[#020202] border-t border-[#18181b] p-2 max-h-[140px] overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-thin scrollbar-thumb-red-950">
          <div className="flex justify-between items-center text-[10px] font-bold text-red-500 border-b border-red-950 pb-1 mb-1">
            <span className="flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-[#dc2626]" />
              DRC REAL-TIME ANALYSIS ENGINE (VIOLATIONS SCANNER)
            </span>
            <button 
              onClick={() => setShowDrcPanel(false)}
              className="text-zinc-500 hover:text-white px-1 text-[9px]"
            >
              [X] CLOSE
            </button>
          </div>
          {drcViolations.length === 0 ? (
            <div className="text-emerald-400 py-1 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              No floating inputs, fan-out limit violations, multiple drivers, or undriven outputs detected. RTL is DRC-compliant!
            </div>
          ) : (
            <div className="space-y-1">
              {drcViolations.map((viol) => (
                <div 
                  key={viol.id}
                  className="flex flex-col gap-0.5 p-1.5 bg-red-950/15 border border-red-900/20 rounded hover:border-red-950 hover:bg-red-950/30 transition text-red-400 text-[10px]"
                >
                  <div className="flex justify-between font-bold items-center">
                    <span className="bg-red-950 text-red-500 px-1 rounded text-[8px] tracking-wide border border-red-900/30 uppercase">
                      {viol.rule} • Line {viol.line}
                    </span>
                    <span className="text-[9px] uppercase font-bold text-red-500">
                      {viol.type}
                    </span>
                  </div>
                  <div className="text-zinc-300 font-medium">{viol.message}</div>
                  {viol.codeSnippet && (
                    <div className="mt-1 text-zinc-500 font-mono text-[9px] bg-black/60 p-1 rounded border border-zinc-900 overflow-x-auto whitespace-nowrap">
                      {viol.codeSnippet}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Trigger Console Footer */}
      <div className="bg-[#050505] border-t border-[#18181b] p-2 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            soundFx.playClick();
            setShowDrcPanel(!showDrcPanel);
          }}
          className={`text-[10px] font-mono flex items-center gap-1.5 px-2 py-1 rounded transition border ${
            drcViolations.length > 0
              ? 'bg-red-950/40 text-red-400 border-red-900/50 hover:bg-red-950/60'
              : 'bg-emerald-950/20 text-emerald-400 border-emerald-900/40 hover:bg-emerald-950/40'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${drcViolations.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-emerald-400 animate-pulse'}`} />
          <span>DRC CHECK: {drcViolations.length} VIOLATIONS</span>
        </button>

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
