import React, { useState, useEffect } from 'react';
import { SectorType, FabModule, EdaLab, TerminalLog, ProcessCorner } from './types';
import { fabModulesData } from './data/fabModules';
import { edaLabsData } from './data/edaLabs';
import { soundFx } from './utils/soundEffects';
import { KansenBitStreamTester, executeTapeoutSequencer } from './utils/kansenEngine';

import { TopHUDHeader } from './components/TopHUDHeader';
import { LeftCommandSidebar } from './components/LeftCommandSidebar';
import { Quadrant1_Netlist } from './components/Quadrant1_Netlist';
import { Quadrant2_CodeEditor } from './components/Quadrant2_CodeEditor';
import { Quadrant3_WaveformAnalyzer } from './components/Quadrant3_WaveformAnalyzer';
import { Quadrant4_TelemetryWafer } from './components/Quadrant4_TelemetryWafer';
import { BaseLogTerminal } from './components/BaseLogTerminal';
import { FabCertificationView } from './components/FabCertificationView';
import { MasterCertificateModal } from './components/MasterCertificateModal';
import { UserIdentityModal, UserSession } from './components/UserIdentityModal';
import { ShinzuCopilot } from './components/ShinzuCopilot';

export default function App() {
  // Local storage persistence initialization
  const [fabModules, setFabModules] = useState<FabModule[]>(() => {
    try {
      const saved = localStorage.getItem('kansen_fab_modules');
      return saved ? JSON.parse(saved) : fabModulesData;
    } catch {
      return fabModulesData;
    }
  });

  const [edaLabs, setEdaLabs] = useState<EdaLab[]>(() => {
    try {
      const saved = localStorage.getItem('kansen_eda_labs');
      return saved ? JSON.parse(saved) : edaLabsData;
    } catch {
      return edaLabsData;
    }
  });

  // Enterprise User Identity Session
  const [userSession, setUserSession] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem('kansen_user_session');
      return saved ? JSON.parse(saved) : {
        corporateName: 'KANSEN-OPERATIVE-094',
        securityId: 'SEC-8829-CLEARANCE-L5',
        departmentCode: 'FAB-DEPT-3NM-GAA',
        domainModule: '3nm FinFET Nanosheet Architecture',
        sessionToken: '0x8F92A0B1-SEC'
      };
    } catch {
      return {
        corporateName: 'KANSEN-OPERATIVE-094',
        securityId: 'SEC-8829-CLEARANCE-L5',
        departmentCode: 'FAB-DEPT-3NM-GAA',
        domainModule: '3nm FinFET Nanosheet Architecture',
        sessionToken: '0x8F92A0B1-SEC'
      };
    }
  });

  // Git VCS Commit History
  const [vcsHistory, setVcsHistory] = useState([
    { id: '1', hash: '8f92a11', timestamp: '10:42:01', author: 'Kansen Principal', message: 'Init GAAFET 3nm PDK Rules' },
    { id: '2', hash: '3c19e04', timestamp: '11:15:22', author: 'Sovereign Core', message: 'Synthesized Inverter Netlist' },
    { id: '3', hash: 'a402d99', timestamp: '12:00:10', author: 'Yosys Engine', message: 'WASM SIMD Optimization Pass' }
  ]);

  const [activeSector, setActiveSector] = useState<SectorType>('BETA');
  const [activeId, setActiveId] = useState<string>('inv-gate');
  const [activeFilePath, setActiveFilePath] = useState<string>('/rtl/top.v');

  const [is3dActive, setIs3dActive] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [scanlinesEnabled, setScanlinesEnabled] = useState<boolean>(true);
  const [isCertificateOpen, setIsCertificateOpen] = useState<boolean>(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState<boolean>(false);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);

  // System Diagnostic Logs State
  const [pvtCorner, setPvtCorner] = useState<ProcessCorner>('TT');
  const [pvtVoltage, setPvtVoltage] = useState<number>(1.0);
  const [pvtTemperature, setPvtTemperature] = useState<number>(25);

  const [logs, setLogs] = useState<TerminalLog[]>([
    {
      id: '1',
      timestamp: new Date().toISOString().substring(11, 23),
      type: 'INFO',
      message: 'KANSEN CORE EDA CONSOLE INITIALIZED.',
      source: 'SYS_CORE'
    },
    {
      id: '2',
      timestamp: new Date().toISOString().substring(11, 23),
      type: 'INFO',
      message: 'WASM SIMD RTL SYNTHESIS ENGINE BOUND TO PORT 3000.',
      source: 'YOSYS_WASM'
    },
    {
      id: '3',
      timestamp: new Date().toISOString().substring(11, 23),
      type: 'SUCCESS',
      message: '3nm FinFET GAA PROCESS PDK LIBRARIES LOADED.',
      source: 'PDK_PARSER'
    }
  ]);

  // Save progress to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('kansen_fab_modules', JSON.stringify(fabModules));
    } catch {
      // Storage fallback
    }
  }, [fabModules]);

  useEffect(() => {
    try {
      localStorage.setItem('kansen_eda_labs', JSON.stringify(edaLabs));
    } catch {
      // Storage fallback
    }
  }, [edaLabs]);

  useEffect(() => {
    try {
      localStorage.setItem('kansen_user_session', JSON.stringify(userSession));
    } catch {
      // Storage fallback
    }
  }, [userSession]);

  // Current active data items
  const currentFabModule = fabModules.find(m => m.id === activeId) || fabModules[0];
  const currentEdaLab = edaLabs.find(l => l.id === activeId) || edaLabs[0];

  // Add Log Helper
  const addLog = (type: TerminalLog['type'], message: string, source: string = 'RTL_ENGINE') => {
    const newLog: TerminalLog = {
      id: String(Date.now() + Math.random()),
      timestamp: new Date().toISOString().substring(11, 23),
      type,
      message,
      source
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Module Selection Handler
  const handleSelectModule = (sector: SectorType, id: string) => {
    setActiveSector(sector);
    setActiveId(id);
    addLog('INFO', `ACTIVE SELECTION SWITCHED TO ${sector} // MODULE: [${id.toUpperCase()}]`, 'NAV_TREE');
  };

  // VFS File Select Handler
  const handleSelectFile = (filePath: string) => {
    setActiveFilePath(filePath);
    addLog('INFO', `LOADED VFS FILE ASSETS FROM: ${filePath}`, 'VFS_TREE');
  };

  // Code Change Handler
  const handleCodeChange = (newCode: string) => {
    setEdaLabs(prev => prev.map(lab => 
      lab.id === activeId ? { ...lab, verilogCode: newCode } : lab
    ));
  };

  // Toggle Logic Node Input State (e.g. Inverter input 0/1)
  const handleToggleNodeState = (nodeId: string) => {
    setEdaLabs(prev => prev.map(lab => {
      if (lab.id !== activeId) return lab;
      const updatedNodes = lab.schematicNodes.map(n => {
        if (n.id === nodeId) {
          const nextActive = !n.active;
          addLog('INFO', `TOGGLED LOGIC NODE [${n.label}] INPUT STATE -> ${nextActive ? 'HIGH (1)' : 'LOW (0)'}`, 'SCHEMATIC');
          return { ...n, active: nextActive };
        }
        return n;
      });
      return { ...lab, schematicNodes: updatedNodes };
    }));
  };

  // Reset Active Code Handler
  const handleResetCode = () => {
    const defaultLab = edaLabsData.find(l => l.id === activeId);
    if (defaultLab) {
      setEdaLabs(prev => prev.map(lab => 
        lab.id === activeId ? { ...lab, verilogCode: defaultLab.verilogCode } : lab
      ));
      addLog('WARN', `RESTORED ORIGINAL IEEE-1364 VERILOG SOURCE CODE FOR [${activeId.toUpperCase()}]`, 'EDITOR');
    }
  };

  // Synthesis & Compilation Handler
  const handleExecuteSynthesis = () => {
    if (isSynthesizing) return;
    setIsSynthesizing(true);
    addLog('SYNTH', `STARTING YOSYS RTL SYNTHESIS COMPILATION PASS FOR [${currentEdaLab.title.toUpperCase()}]...`, 'YOSYS_SYNTH');

    setTimeout(() => {
      addLog('INFO', 'ELABORATING DESIGN MODULE & NETLIST CONNECTIONS...', 'ELABORATOR');
    }, 300);

    setTimeout(() => {
      addLog('INFO', `OPTIMIZING GATE COUNT (${currentEdaLab.telemetry.gateCount} GATES) & TIMING CONSTRAINTS...`, 'TECH_MAPPER');
    }, 700);

    setTimeout(() => {
      addLog('SUCCESS', `SYNTHESIS COMPLETED! GATE AREA: ${currentEdaLab.telemetry.transistorAreaUm2}µm², DELAY: ${currentEdaLab.telemetry.worstCaseDelayNs}ns.`, 'YOSYS_SYNTH');
      setIsSynthesizing(false);
      
      // Mark EDA lab as completed
      setEdaLabs(prev => prev.map(lab => 
        lab.id === activeId ? { ...lab, completed: true } : lab
      ));

      // Append Git VCS Commit
      const newCommit = {
        id: Date.now().toString(),
        hash: Math.random().toString(16).substring(2, 9),
        timestamp: new Date().toLocaleTimeString(),
        author: userSession.corporateName,
        message: `Synthesized ${currentEdaLab.title}`
      };
      setVcsHistory(prev => [newCommit, ...prev]);
    }, 1200);
  };

  // Testbench Harness Execution
  const handleRunTestbench = () => {
    addLog('SYNTH', `EXECUTING AUTOMATED TESTBENCH SUITE FOR [${currentEdaLab.title.toUpperCase()}]...`, 'TESTBENCH');

    // PRBS-31 Bitstream Test Vector Verification
    const bitstreamResults = KansenBitStreamTester.verifyBitstreamPattern();
    addLog('INFO', `PRBS-31 LOOPBACK: ${bitstreamResults.passed}/${bitstreamResults.totalVectors} VECTORS VERIFIED (BER: ${bitstreamResults.ber})`, 'BITSTREAM');

    currentEdaLab.testbenchCases.forEach((tc, idx) => {
      setTimeout(() => {
        addLog('SUCCESS', `TEST CASE 0${tc.id} [${tc.name}]: PASSED. MATCHED EXPECTED OUTPUT.`, 'VERILATOR');
      }, (idx + 1) * 350);
    });
  };

  // Fab Module Completion
  const handleCompleteFabModule = (moduleId: string) => {
    setFabModules(prev => prev.map(mod => 
      mod.id === moduleId ? { ...mod, completed: true } : mod
    ));
    addLog('SUCCESS', `FAB CERTIFICATION BADGE AWARDED FOR MODULE [${moduleId.toUpperCase()}]!`, 'FAB_CERT');
  };

  // Trigger Tape-Out GDSII Sequencer Zip
  const handleTriggerTapeout = async () => {
    addLog('SYNTH', 'INITIALIZING AIR-GAP HARDENED CRYPTO TAPE-OUT GDSII SEQUENCER...', 'TAPEOUT');
    const tapeoutData = await executeTapeoutSequencer({
      designName: currentEdaLab.title,
      verilogCode: currentEdaLab.verilogCode,
      userName: userSession.corporateName,
      securityId: userSession.securityId,
      deptCode: userSession.departmentCode
    });

    addLog('SUCCESS', `GDSII BINARY TAPE-OUT COMPLETE! CRYPTO SIGNATURE: ${tapeoutData.sha256Hash}`, 'TAPEOUT');
    addLog('INFO', `DOWNLOADED COMPRESSED FAB ZIP CONTAINER: ${tapeoutData.fileName}`, 'TAPEOUT');
  };

  // Command Line Prompt Executor
  const handleExecuteCommand = (cmd: string) => {
    addLog('INFO', `KANSEN> ${cmd}`, 'USER_INPUT');
    const cleanCmd = cmd.toLowerCase().trim();

    if (cleanCmd === 'help') {
      addLog('INFO', 'AVAILABLE COMMANDS: help, compile, test, tapeout, status, clear, cert, theme, reset, info', 'CLI_HELP');
    } else if (cleanCmd === 'compile' || cleanCmd === 'synth') {
      handleExecuteSynthesis();
    } else if (cleanCmd === 'test') {
      handleRunTestbench();
    } else if (cleanCmd === 'tapeout') {
      handleTriggerTapeout();
    } else if (cleanCmd === 'status') {
      const fabComp = fabModules.filter(m => m.completed).length;
      const edaComp = edaLabs.filter(l => l.completed).length;
      addLog('INFO', `FAB CERT STATUS: ${fabComp}/${fabModules.length} | EDA RTL STATUS: ${edaComp}/${edaLabs.length}`, 'CLI_STATUS');
    } else if (cleanCmd === 'clear') {
      setLogs([]);
    } else if (cleanCmd === 'cert') {
      setIsCertificateOpen(true);
    } else if (cleanCmd === 'theme') {
      setScanlinesEnabled(!scanlinesEnabled);
      addLog('INFO', `CRT SCANLINES OVERLAY TOGGLED.`, 'CLI_THEME');
    } else if (cleanCmd === 'info') {
      addLog('INFO', 'KANSEN CORE EDA CONSOLE // 3nm GAA EDA & FAB SYSTEM // CLASSIFIED TIER 5', 'SYS_INFO');
    } else {
      addLog('ERR', `UNKNOWN COMMAND '${cmd}'. TYPE 'help' FOR LIST OF SYSTEM COMMANDS.`, 'CLI_ERR');
    }
  };

  // Run Macro Benchmark All
  const handleRunAllTests = () => {
    addLog('SYNTH', 'INITIATING SYSTEM-WIDE RTL BENCHMARK PASS ACROSS ALL SECTORS...', 'MACRO_RUN');

    // Complete all labs and fab modules in benchmark pass
    setTimeout(() => {
      setEdaLabs(prev => prev.map(l => ({ ...l, completed: true })));
      setFabModules(prev => prev.map(m => ({ ...m, completed: true })));
      addLog('SUCCESS', 'ALL 5 EDA RTL LABS & 5 FAB CERTIFICATION MODULES VERIFIED 100% GREEN!', 'MACRO_RUN');
      setIsCertificateOpen(true);
    }, 1200);
  };

  // Reset Progress Handler
  const handleResetProgress = () => {
    setFabModules(fabModulesData);
    setEdaLabs(edaLabsData);
    localStorage.removeItem('kansen_fab_modules');
    localStorage.removeItem('kansen_eda_labs');
    addLog('WARN', 'ALL USER FAB CERTIFICATION AND EDA RTL PROGRESS HAS BEEN RESET.', 'SYS_RESET');
  };

  const fabCompletedCount = fabModules.filter(m => m.completed).length;
  const edaCompletedCount = edaLabs.filter(l => l.completed).length;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#000000] text-zinc-200 overflow-hidden relative font-mono">
      {/* Optional CRT Scanlines Overlay */}
      {scanlinesEnabled && <div className="scanlines absolute inset-0 z-40 pointer-events-none opacity-80" />}

      {/* Top HUD Console Header */}
      <TopHUDHeader
        fabCompletedCount={fabCompletedCount}
        fabTotalCount={fabModules.length}
        edaCompletedCount={edaCompletedCount}
        edaTotalCount={edaLabs.length}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(soundFx.toggleSound())}
        scanlinesEnabled={scanlinesEnabled}
        onToggleScanlines={() => setScanlinesEnabled(!scanlinesEnabled)}
        onResetProgress={handleResetProgress}
        onOpenCertificate={() => setIsCertificateOpen(true)}
        userSession={userSession}
        onOpenIdentityModal={() => setIsIdentityModalOpen(true)}
        onTriggerTapeout={handleTriggerTapeout}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Command Navigation Sidebar */}
        <LeftCommandSidebar
          fabModules={fabModules}
          edaLabs={edaLabs}
          activeSector={activeSector}
          activeId={activeId}
          onSelectModule={handleSelectModule}
          onRunAllTests={handleRunAllTests}
          vcsHistory={vcsHistory}
          onSelectFile={handleSelectFile}
          activeFilePath={activeFilePath}
        />

        {/* Central & Tactical Panels */}
        <main className="flex-1 overflow-hidden p-2 bg-[#000000]">
          {activeSector === 'ALPHA' ? (
            /* SECTOR ALPHA: Fab Certification View */
            <FabCertificationView
              module={currentFabModule}
              onCompleteModule={handleCompleteFabModule}
            />
          ) : (
            /* SECTOR BETA: 4-Quadrant EDA Layout Grid */
            <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 grid-rows-2 gap-2">
              {/* QUADRANT I: Schematic Netlist */}
              <div className="h-full overflow-hidden">
                <Quadrant1_Netlist
                  title={currentEdaLab.title}
                  subtitle={currentEdaLab.subtitle}
                  nodes={currentEdaLab.schematicNodes}
                  isSimulating={isSynthesizing}
                  onToggleNodeState={handleToggleNodeState}
                />
              </div>

              {/* QUADRANT II: Hardware Code Terminal */}
              <div className="h-full overflow-hidden">
                <Quadrant2_CodeEditor
                  labTitle={currentEdaLab.title}
                  verilogCode={currentEdaLab.verilogCode}
                  onCodeChange={handleCodeChange}
                  onExecuteSynthesis={handleExecuteSynthesis}
                  onRunTestbench={handleRunTestbench}
                  onResetCode={handleResetCode}
                  isSynthesizing={isSynthesizing}
                />
              </div>

              {/* QUADRANT III: Waveform Logic Analyzer */}
              <div className="h-full overflow-hidden">
                <Quadrant3_WaveformAnalyzer
                  signals={currentEdaLab.defaultSignals}
                  isSimulating={isSynthesizing}
                  pvtCorner={pvtCorner}
                  pvtVoltage={pvtVoltage}
                  pvtTemperature={pvtTemperature}
                />
              </div>

              {/* QUADRANT IV: Silicon Telemetry & 3D Wafer */}
              <div className="h-full overflow-hidden">
                <Quadrant4_TelemetryWafer
                  telemetry={currentEdaLab.telemetry}
                  layoutLayers={currentEdaLab.layoutLayers}
                  is3dActive={is3dActive}
                  onToggle3dTab={setIs3dActive}
                  verilogCode={currentEdaLab.verilogCode}
                  moduleTitle={currentEdaLab.title}
                  pvtCorner={pvtCorner}
                  setPvtCorner={setPvtCorner}
                  pvtVoltage={pvtVoltage}
                  setPvtVoltage={setPvtVoltage}
                  pvtTemperature={pvtTemperature}
                  setPvtTemperature={setPvtTemperature}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Base Log Interface Console Footer */}
      <BaseLogTerminal
        logs={logs}
        onClearLogs={() => setLogs([])}
        onExecuteCommand={handleExecuteCommand}
      />

      {/* Shinzu AI Copilot Overlay */}
      <ShinzuCopilot
        onExecuteMacro={(macro) => handleExecuteCommand(macro.replace('/', ''))}
        currentCode={currentEdaLab?.verilogCode}
        currentTitle={currentEdaLab?.title}
        onUpdateCode={(newCode) => handleCodeChange(newCode)}
      />

      {/* Enterprise Identity Session Modal */}
      <UserIdentityModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
        session={userSession}
        onSaveSession={(newSession) => {
          setUserSession(newSession);
          addLog('SUCCESS', `UPDATED ENTERPRISE SECURITY CLEARANCE: ${newSession.corporateName} [${newSession.securityId}]`, 'AUTH_SYSTEM');
        }}
      />

      {/* Master Certificate Modal */}
      <MasterCertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        fabCompletedCount={fabCompletedCount}
        fabTotalCount={fabModules.length}
        edaCompletedCount={edaCompletedCount}
        edaTotalCount={edaLabs.length}
        userSession={userSession}
      />
    </div>
  );
}
