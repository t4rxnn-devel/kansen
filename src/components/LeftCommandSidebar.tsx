import React, { useState } from 'react';
import { SectorType, FabModule, EdaLab } from '../types';
import { 
  Flame, Layers, Zap, Shield, ToggleLeft, Split, Cpu, Binary, Workflow, 
  CheckCircle2, Search, ChevronRight, Sparkles, Folder, FileCode, GitCommit, GitBranch, History, ChevronDown
} from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import { WorkspaceCommit } from '../utils/kansenEngine';

interface LeftCommandSidebarProps {
  fabModules: FabModule[];
  edaLabs: EdaLab[];
  activeSector: SectorType;
  activeId: string;
  onSelectModule: (sector: SectorType, id: string) => void;
  onRunAllTests: () => void;
  vcsHistory: WorkspaceCommit[];
  onSelectFile?: (filePath: string) => void;
  activeFilePath?: string;
}

export const LeftCommandSidebar: React.FC<LeftCommandSidebarProps> = ({
  fabModules,
  edaLabs,
  activeSector,
  activeId,
  onSelectModule,
  onRunAllTests,
  vcsHistory,
  onSelectFile,
  activeFilePath = '/rtl/top.v'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'NAV' | 'VFS' | 'VCS'>('NAV');
  const [vfsExpandedFolders, setVfsExpandedFolders] = useState<Record<string, boolean>>({
    'rtl': true,
    'syn': true,
    'layout': false,
    'verification': false
  });

  const toggleFolder = (folder: string) => {
    setVfsExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const renderFabIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return <Flame className="w-4 h-4 text-[#dc2626]" />;
      case 'Layers': return <Layers className="w-4 h-4 text-zinc-300" />;
      case 'Zap': return <Zap className="w-4 h-4 text-[#dc2626]" />;
      case 'Shield': return <Shield className="w-4 h-4 text-emerald-400" />;
      default: return <Cpu className="w-4 h-4 text-zinc-400" />;
    }
  };

  const renderLabIcon = (iconName: string) => {
    switch (iconName) {
      case 'ToggleLeft': return <ToggleLeft className="w-4 h-4 text-[#dc2626]" />;
      case 'Split': return <Split className="w-4 h-4 text-zinc-300" />;
      case 'Cpu': return <Cpu className="w-4 h-4 text-[#dc2626]" />;
      case 'Binary': return <Binary className="w-4 h-4 text-emerald-400" />;
      case 'Workflow': return <Workflow className="w-4 h-4 text-zinc-200" />;
      default: return <FileCode className="w-4 h-4 text-zinc-400" />;
    }
  };

  const filteredFab = fabModules.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEda = edaLabs.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="w-72 bg-[#000000] border-r border-[#18181b] flex flex-col h-full select-none shrink-0 z-20">
      {/* Sidebar Mode Tabs */}
      <div className="grid grid-cols-3 bg-[#050505] border-b border-[#18181b] text-[10px] font-mono">
        <button
          onClick={() => { soundFx.playClick(); setActiveTab('NAV'); }}
          className={`py-2 text-center border-b-2 font-bold transition ${activeTab === 'NAV' ? 'border-[#dc2626] text-white bg-zinc-900/60' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          MODULES
        </button>
        <button
          onClick={() => { soundFx.playClick(); setActiveTab('VFS'); }}
          className={`py-2 text-center border-b-2 font-bold transition ${activeTab === 'VFS' ? 'border-[#dc2626] text-white bg-zinc-900/60' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          VFS TREE
        </button>
        <button
          onClick={() => { soundFx.playClick(); setActiveTab('VCS'); }}
          className={`py-2 text-center border-b-2 font-bold transition ${activeTab === 'VCS' ? 'border-[#dc2626] text-white bg-zinc-900/60' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
        >
          GIT VCS
        </button>
      </div>

      {activeTab === 'NAV' && (
        <>
          {/* Search Header */}
          <div className="p-3 border-b border-[#18181b] bg-[#050505]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="SEARCH MODULES..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#000000] text-zinc-200 placeholder-zinc-600 text-xs pl-8 pr-3 py-1.5 rounded border border-[#18181b] focus:outline-none focus:border-[#dc2626] font-mono transition"
              />
            </div>
          </div>

          {/* Navigation Modules Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* SECTOR ALPHA SECTION */}
            <div>
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-orbitron font-bold text-[#dc2626] tracking-wider uppercase border-b border-rose-950/40 mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#dc2626] animate-pulse" />
                  SECTOR ALPHA: FAB TRACK
                </span>
                <span className="text-[10px] text-zinc-500 font-tech">{filteredFab.length} MODULES</span>
              </div>

              <div className="space-y-1">
                {filteredFab.map((mod) => {
                  const isActive = activeSector === 'ALPHA' && activeId === mod.id;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => {
                        soundFx.playClick();
                        onSelectModule('ALPHA', mod.id);
                      }}
                      className={`w-full text-left p-2 rounded transition flex items-center justify-between group relative border ${
                        isActive 
                          ? 'bg-[#dc2626]/20 border-[#dc2626] text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                          : 'bg-[#050505] hover:bg-zinc-900 border-[#18181b] text-zinc-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 overflow-hidden">
                        <div className="p-1 rounded bg-[#000000] border border-zinc-800 shrink-0 mt-0.5">
                          {renderFabIcon(mod.icon)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-bold truncate flex items-center gap-1">
                            {mod.title}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-tech truncate">
                            {mod.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pl-1">
                        {mod.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isActive ? (
                          <ChevronRight className="w-4 h-4 text-[#dc2626] animate-pulse" />
                        ) : (
                          <span className="text-[9px] text-zinc-600 font-mono">REQ</span>
                        )}
                      </div>

                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#dc2626] rounded-l" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SECTOR BETA SECTION */}
            <div>
              <div className="px-2 py-1 flex items-center justify-between text-[11px] font-orbitron font-bold text-white tracking-wider uppercase border-b border-zinc-800 mb-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  SECTOR BETA: RTL LABS
                </span>
                <span className="text-[10px] text-zinc-500 font-tech">{filteredEda.length} LABS</span>
              </div>

              <div className="space-y-1">
                {filteredEda.map((lab) => {
                  const isActive = activeSector === 'BETA' && activeId === lab.id;
                  return (
                    <button
                      key={lab.id}
                      onClick={() => {
                        soundFx.playClick();
                        onSelectModule('BETA', lab.id);
                      }}
                      className={`w-full text-left p-2 rounded transition flex items-center justify-between group relative border ${
                        isActive 
                          ? 'bg-[#dc2626]/20 border-[#dc2626] text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                          : 'bg-[#050505] hover:bg-zinc-900 border-[#18181b] text-zinc-300'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 overflow-hidden">
                        <div className="p-1 rounded bg-[#000000] border border-zinc-800 shrink-0 mt-0.5">
                          {renderLabIcon(lab.icon)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-xs font-bold truncate flex items-center gap-1">
                            {lab.title}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-tech truncate">
                            {lab.subtitle}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pl-1">
                        {lab.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : isActive ? (
                          <ChevronRight className="w-4 h-4 text-[#dc2626] animate-pulse" />
                        ) : (
                          <span className="text-[9px] text-zinc-600 font-mono">RTL</span>
                        )}
                      </div>

                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#dc2626] rounded-l" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'VFS' && (
        <div className="flex-1 overflow-y-auto p-3 text-xs font-mono space-y-2">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-[#18181b] pb-1 mb-2">
            VIRTUAL FILE SYSTEM (/WORKSPACE)
          </div>

          {/* Folder /rtl */}
          <div>
            <div 
              onClick={() => toggleFolder('rtl')} 
              className="flex items-center gap-1.5 text-zinc-300 font-bold hover:text-white cursor-pointer py-1"
            >
              {vfsExpandedFolders['rtl'] ? <ChevronDown className="w-3.5 h-3.5 text-[#dc2626]" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
              <Folder className="w-4 h-4 text-[#dc2626]" />
              <span>/rtl</span>
            </div>
            {vfsExpandedFolders['rtl'] && (
              <div className="pl-6 space-y-1 text-zinc-400">
                <div 
                  onClick={() => onSelectFile && onSelectFile('/rtl/top.v')}
                  className={`flex items-center gap-1.5 p-1 rounded cursor-pointer ${activeFilePath === '/rtl/top.v' ? 'bg-[#dc2626]/20 text-white font-bold border border-[#dc2626]' : 'hover:bg-zinc-900'}`}
                >
                  <FileCode className="w-3.5 h-3.5 text-white" />
                  <span>top.v</span>
                </div>
                <div 
                  onClick={() => onSelectFile && onSelectFile('/rtl/inverter_gate.v')}
                  className={`flex items-center gap-1.5 p-1 rounded cursor-pointer ${activeFilePath === '/rtl/inverter_gate.v' ? 'bg-[#dc2626]/20 text-white font-bold border border-[#dc2626]' : 'hover:bg-zinc-900'}`}
                >
                  <FileCode className="w-3.5 h-3.5 text-white" />
                  <span>inverter_gate.v</span>
                </div>
              </div>
            )}
          </div>

          {/* Folder /syn */}
          <div>
            <div 
              onClick={() => toggleFolder('syn')} 
              className="flex items-center gap-1.5 text-zinc-300 font-bold hover:text-white cursor-pointer py-1"
            >
              {vfsExpandedFolders['syn'] ? <ChevronDown className="w-3.5 h-3.5 text-[#dc2626]" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
              <Folder className="w-4 h-4 text-[#dc2626]" />
              <span>/syn</span>
            </div>
            {vfsExpandedFolders['syn'] && (
              <div className="pl-6 space-y-1 text-zinc-400">
                <div className="flex items-center gap-1.5 p-1 hover:bg-zinc-900 rounded cursor-pointer">
                  <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                  <span>synth_script.tcl</span>
                </div>
                <div className="flex items-center gap-1.5 p-1 hover:bg-zinc-900 rounded cursor-pointer">
                  <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                  <span>netlist.v</span>
                </div>
              </div>
            )}
          </div>

          {/* Folder /layout */}
          <div>
            <div 
              onClick={() => toggleFolder('layout')} 
              className="flex items-center gap-1.5 text-zinc-300 font-bold hover:text-white cursor-pointer py-1"
            >
              {vfsExpandedFolders['layout'] ? <ChevronDown className="w-3.5 h-3.5 text-[#dc2626]" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
              <Folder className="w-4 h-4 text-[#dc2626]" />
              <span>/layout</span>
            </div>
            {vfsExpandedFolders['layout'] && (
              <div className="pl-6 space-y-1 text-zinc-400">
                <div className="flex items-center gap-1.5 p-1 hover:bg-zinc-900 rounded cursor-pointer">
                  <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                  <span>floorplan.def</span>
                </div>
                <div className="flex items-center gap-1.5 p-1 hover:bg-zinc-900 rounded cursor-pointer">
                  <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                  <span>kansen_3nm.gds</span>
                </div>
              </div>
            )}
          </div>

          {/* Folder /verification */}
          <div>
            <div 
              onClick={() => toggleFolder('verification')} 
              className="flex items-center gap-1.5 text-zinc-300 font-bold hover:text-white cursor-pointer py-1"
            >
              {vfsExpandedFolders['verification'] ? <ChevronDown className="w-3.5 h-3.5 text-[#dc2626]" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
              <Folder className="w-4 h-4 text-[#dc2626]" />
              <span>/verification</span>
            </div>
            {vfsExpandedFolders['verification'] && (
              <div className="pl-6 space-y-1 text-zinc-400">
                <div className="flex items-center gap-1.5 p-1 hover:bg-zinc-900 rounded cursor-pointer">
                  <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                  <span>testbench.sv</span>
                </div>
                <div className="flex items-center gap-1.5 p-1 hover:bg-zinc-900 rounded cursor-pointer">
                  <FileCode className="w-3.5 h-3.5 text-zinc-400" />
                  <span>sim_output.vcd</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'VCS' && (
        <div className="flex-1 overflow-y-auto p-3 text-xs font-mono space-y-3">
          <div className="flex items-center justify-between border-b border-[#18181b] pb-1 mb-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5 text-[#dc2626]" />
              GIT VERSION CONTROL MATRIX
            </span>
            <span className="text-[9px] text-[#dc2626] font-bold">[MAIN]</span>
          </div>

          <div className="space-y-2 relative pl-4 border-l border-zinc-800">
            {vcsHistory.map((commit, idx) => (
              <div key={commit.id} className="relative group">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#dc2626] border border-black shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                <div className="bg-[#050505] p-2 rounded border border-[#18181b] hover:border-[#dc2626] transition">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-white font-mono">{commit.hash}</span>
                    <span className="text-zinc-500">{commit.timestamp}</span>
                  </div>
                  <div className="text-xs text-zinc-300 font-bold mt-0.5">{commit.message}</div>
                  <div className="text-[9px] text-zinc-500 font-tech mt-0.5">Author: {commit.author}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Action */}
      <div className="p-3 border-t border-[#18181b] bg-[#050505]">
        <button
          onClick={() => {
            soundFx.playSynthPass();
            onRunAllTests();
          }}
          className="w-full py-2 px-3 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-orbitron font-bold text-xs rounded border border-[#dc2626] shadow-[0_0_15px_rgba(220,38,38,0.4)] transition flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
          <span>MACRO BENCHMARK PASS</span>
        </button>
      </div>
    </aside>
  );
};
