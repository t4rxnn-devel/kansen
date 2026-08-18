import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Cpu, Layers, Disc, RefreshCw, BarChart2, ShieldAlert, Zap, Box, CheckCircle2, TrendingUp, Award, Grid, DollarSign, Activity } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import { 
  ProcessCorner, 
  PvtConfig, 
  MacroCell, 
  PlacedMacro, 
  SatResult, 
  EcoPatchResult, 
  YieldProfitability, 
  LeaderboardEntry 
} from '../types';
import { 
  PvtEngine, 
  COMMERCIAL_MACRO_CATALOG, 
  SatSolverEngine, 
  SmartEcoEngine, 
  YieldProfitabilityEngine, 
  KansenLeaderboardEngine 
} from '../utils/kansenEngine';

interface Quadrant4_TelemetryWaferProps {
  telemetry: {
    gateCount: number;
    transistorAreaUm2: number;
    powerUw: number;
    worstCaseDelayNs: number;
    fanout: number;
    criticalPath: string;
  };
  layoutLayers: {
    polysilicon: boolean[][];
    diffusion: boolean[][];
    metal1: boolean[][];
    metal2: boolean[][];
  };
  is3dActive: boolean;
  onToggle3dTab: (show3d: boolean) => void;
  verilogCode?: string;
  moduleTitle?: string;
  pvtCorner?: ProcessCorner;
  setPvtCorner?: (corner: ProcessCorner) => void;
  pvtVoltage?: number;
  setPvtVoltage?: (v: number) => void;
  pvtTemperature?: number;
  setPvtTemperature?: (t: number) => void;
}

export const Quadrant4_TelemetryWafer: React.FC<Quadrant4_TelemetryWaferProps> = ({
  telemetry,
  layoutLayers,
  is3dActive,
  onToggle3dTab,
  verilogCode = '',
  moduleTitle = 'Active Circuit',
  pvtCorner: propPvtCorner,
  setPvtCorner: propSetPvtCorner,
  pvtVoltage: propPvtVoltage,
  setPvtVoltage: propSetPvtVoltage,
  pvtTemperature: propPvtTemperature,
  setPvtTemperature: propSetSetPvtTemperature
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  
  // Tab State
  type SubTab = '3D_WAFER' | 'ASML_METROLOGY' | 'TELEMETRY' | 'PVT_STRESS' | 'MACRO_DROPPER' | 'SAT_ECO' | 'YIELD_COST' | 'LEADERBOARD' | 'GDSII_STREAM';
  const [activeTab, setActiveTab] = useState<SubTab>(is3dActive ? '3D_WAFER' : 'TELEMETRY');
  
  // 3D Wafer & ASML Lithography controls
  const [autoRotate3d, setAutoRotate3d] = useState<boolean>(true);
  const [activeLayerFilter, setActiveLayerFilter] = useState<'ALL' | 'POLY' | 'DIFF' | 'M1' | 'M2'>('ALL');
  const [euvNa, setEuvNa] = useState<number>(0.55); // 0.55 High-NA vs 0.33 Standard
  const [laserPulseMj, setLaserPulseMj] = useState<number>(45); // EUV Pulse Energy
  const [reticleSlitWidthMm, setReticleSlitWidthMm] = useState<number>(26);
  const [k1Factor, setK1Factor] = useState<number>(0.28);
  const [scanSpeedMms, setScanSpeedMms] = useState<number>(800);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // PVT Stress State
  const [localPvtCorner, setLocalPvtCorner] = useState<ProcessCorner>('TT');
  const [localPvtVoltage, setLocalPvtVoltage] = useState<number>(1.0);
  const [localPvtTemperature, setLocalPvtTemperature] = useState<number>(25);

  const pvtCorner = propPvtCorner !== undefined ? propPvtCorner : localPvtCorner;
  const setPvtCorner = propSetPvtCorner !== undefined ? propSetPvtCorner : setLocalPvtCorner;
  const pvtVoltage = propPvtVoltage !== undefined ? propPvtVoltage : localPvtVoltage;
  const setPvtVoltage = propSetPvtVoltage !== undefined ? propSetPvtVoltage : setLocalPvtVoltage;
  const pvtTemperature = propPvtTemperature !== undefined ? propPvtTemperature : localPvtTemperature;
  const setPvtTemperature = propSetSetPvtTemperature !== undefined ? propSetSetPvtTemperature : setLocalPvtTemperature;

  // Macro Dropper Floorplan State
  const [placedMacros, setPlacedMacros] = useState<PlacedMacro[]>([
    {
      id: 'placed_sram_1',
      macroId: 'sram_array_32k',
      name: 'SRAM Memory Array (32KB)',
      xUm: 50,
      yUm: 50,
      widthUm: 450,
      heightUm: 300,
      layer: 12,
      layerName: 'Metal 12',
      color: '#ef4444'
    },
    {
      id: 'placed_io_1',
      macroId: 'io_pad_ring_32',
      name: 'I/O Pad Ring Driver',
      xUm: 800,
      yUm: 800,
      widthUm: 120,
      heightUm: 120,
      layer: 15,
      layerName: 'Metal 15',
      color: '#f97316'
    }
  ]);
  const [selectedMacroCatalogId, setSelectedMacroCatalogId] = useState<string>('analog_pll_1ghz');
  const [dragError, setDragError] = useState<string | null>(null);

  // SAT Solver State
  const [satResult, setSatResult] = useState<SatResult | null>(null);
  const [ecoPatch, setEcoPatch] = useState<EcoPatchResult | null>(null);

  // Defect Yield State
  const [defectDensityD0, setDefectDensityD0] = useState<number>(0.04);
  const [dieAreaMm2, setDieAreaMm2] = useState<number>(120);

  // Sync external tab changes
  useEffect(() => {
    if (is3dActive) {
      setActiveTab('3D_WAFER');
    } else if (activeTab === '3D_WAFER') {
      setActiveTab('TELEMETRY');
    }
  }, [is3dActive]);

  // Three.js 3D Silicon Wafer Viewport
  useEffect(() => {
    if (activeTab !== '3D_WAFER' || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 25);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xdc2626, 2.5);
    dirLight1.position.set(20, 30, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight2.position.set(-20, 20, -10);
    scene.add(dirLight2);

    const waferGroup = new THREE.Group();

    // Wafer Substrate Cylinder
    const waferGeometry = new THREE.CylinderGeometry(8, 8, 0.3, 64);
    const waferMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.9,
      roughness: 0.2
    });
    const waferMesh = new THREE.Mesh(waferGeometry, waferMaterial);
    waferGroup.add(waferMesh);

    // Beveled Notch on Wafer Edge
    const notchGeo = new THREE.BoxGeometry(0.8, 0.35, 0.8);
    const notchMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const notchMesh = new THREE.Mesh(notchGeo, notchMat);
    notchMesh.position.set(8, 0, 0);
    waferGroup.add(notchMesh);

    // Die Grid Lines
    const gridHelper = new THREE.GridHelper(15, 24, 0xdc2626, 0x27272a);
    gridHelper.position.y = 0.16;
    waferGroup.add(gridHelper);

    // Individual Glowing IC Dies
    for (let x = -6; x <= 6; x += 1.5) {
      for (let z = -6; z <= 6; z += 1.5) {
        if (x * x + z * z < 48) {
          const dieGeo = new THREE.BoxGeometry(1.2, 0.05, 1.2);
          const dieMat = new THREE.MeshStandardMaterial({
            color: (Math.abs(x) + Math.abs(z)) % 3 === 0 ? 0xdc2626 : 0x52525b,
            emissive: (Math.abs(x) + Math.abs(z)) % 3 === 0 ? 0x991b1b : 0x18181b,
            emissiveIntensity: 0.5,
            metalness: 0.8
          });
          const dieMesh = new THREE.Mesh(dieGeo, dieMat);
          dieMesh.position.set(x, 0.18, z);
          waferGroup.add(dieMesh);
        }
      }
    }

    // EUV Reticle Laser Outer Ring
    const ringGeo = new THREE.RingGeometry(8.2, 8.5, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xdc2626, side: THREE.DoubleSide });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    waferGroup.add(ringMesh);

    scene.add(waferGroup);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate3d) {
        waferGroup.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [activeTab, autoRotate3d]);

  // Compute PVT Evaluation
  const pvtConfig: PvtConfig = {
    corner: pvtCorner,
    voltage: pvtVoltage,
    temperature: pvtTemperature,
    calculatedDelayFactor: PvtEngine.calculatePvtDelayFactor(pvtCorner, pvtVoltage, pvtTemperature),
    isTimingViolation: false
  };
  const pvtEval = PvtEngine.evaluatePvtConfig(telemetry.worstCaseDelayNs, pvtConfig);

  // Compute Yield Profitability
  const yieldEval: YieldProfitability = YieldProfitabilityEngine.calculateYield(dieAreaMm2, defectDensityD0);

  // Compute Leaderboard Ranking
  const leaderboardEntries: LeaderboardEntry[] = KansenLeaderboardEngine.getLeaderboard({
    name: 'OPERATIVE_094',
    areaUm2: telemetry.transistorAreaUm2,
    pvtMarginPs: pvtEval.setupMarginPs,
    costPerDieUsd: yieldEval.costPerDieUsd
  });

  // Handle Macro Dropper Addition
  const handlePlaceMacro = () => {
    const macroDef = COMMERCIAL_MACRO_CATALOG.find(m => m.id === selectedMacroCatalogId);
    if (!macroDef) return;

    soundFx.playClick();
    // Default position with offset
    const xUm = 100 + (placedMacros.length * 80) % 500;
    const yUm = 100 + (placedMacros.length * 60) % 500;

    // Check boundary overlap with existing
    const newPlaced: PlacedMacro = {
      id: `placed_${macroDef.id}_${Date.now()}`,
      macroId: macroDef.id,
      name: macroDef.name,
      xUm,
      yUm,
      widthUm: macroDef.widthUm,
      heightUm: macroDef.heightUm,
      layer: macroDef.layer,
      layerName: macroDef.layerName,
      color: macroDef.color
    };

    setPlacedMacros(prev => [...prev, newPlaced]);
    setDragError(null);
  };

  const handleRemoveMacro = (id: string) => {
    soundFx.playClick();
    setPlacedMacros(prev => prev.filter(m => m.id !== id));
  };

  // Run SAT Solver
  const handleRunSatSolver = () => {
    soundFx.playClick();
    const result = SatSolverEngine.solveDeadlockSat(verilogCode);
    setSatResult(result);
    if (result.isSatisfiable) {
      soundFx.playSynthPass();
    } else {
      soundFx.playError();
    }
  };

  // Run Smart ECO Delta Patch
  const handleRunSmartEco = () => {
    soundFx.playClick();
    const patch = SmartEcoEngine.computeEcoPatch(verilogCode, moduleTitle);
    setEcoPatch(patch);
    soundFx.playSynthPass();
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] border border-[#18181b] rounded overflow-hidden select-none relative font-mono text-xs">
      {/* Navigation Sub-Tabs Header */}
      <div className="bg-[#050505] border-b border-[#18181b] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-[#dc2626]" />
          <span className="font-orbitron font-bold text-white tracking-wide">
            QUADRANT IV: <span className="text-[#dc2626]">TACTICAL SILICON ANALYSIS</span>
          </span>
        </div>

        {/* Tab Controls Bar */}
        <div className="flex items-center gap-1 bg-[#000000] p-1 rounded border border-[#18181b] overflow-x-auto text-[10px]">
          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('3D_WAFER');
              onToggle3dTab(true);
            }}
            className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
              activeTab === '3D_WAFER' ? 'bg-[#dc2626] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Disc className="w-3 h-3" />
            3D WAFER
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('ASML_METROLOGY');
              onToggle3dTab(false);
            }}
            className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
              activeTab === 'ASML_METROLOGY' ? 'bg-[#dc2626] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-3 h-3" />
            ASML LITHOGRAPHY
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('TELEMETRY');
              onToggle3dTab(false);
            }}
            className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
              activeTab === 'TELEMETRY' ? 'bg-[#dc2626] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            PDK MASK
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('PVT_STRESS');
              onToggle3dTab(false);
            }}
            className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
              activeTab === 'PVT_STRESS' ? 'bg-[#dc2626] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Zap className="w-3 h-3" />
            PVT CORNER
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('MACRO_DROPPER');
              onToggle3dTab(false);
            }}
            className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
              activeTab === 'MACRO_DROPPER' ? 'bg-[#dc2626] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Box className="w-3 h-3" />
            MACRO DROP
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('SAT_ECO');
              onToggle3dTab(false);
            }}
            className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
              activeTab === 'SAT_ECO' ? 'bg-[#dc2626] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            SAT & ECO
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('YIELD_COST');
              onToggle3dTab(false);
            }}
            className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
              activeTab === 'YIELD_COST' ? 'bg-[#dc2626] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3 h-3" />
            YIELD/DPW
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('LEADERBOARD');
              onToggle3dTab(false);
            }}
            className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
              activeTab === 'LEADERBOARD' ? 'bg-[#dc2626] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Award className="w-3 h-3" />
            LEADERBOARD
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('GDSII_STREAM');
              onToggle3dTab(false);
            }}
            className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
              activeTab === 'GDSII_STREAM' ? 'bg-[#dc2626] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Grid className="w-3 h-3" />
            GDSII STREAM
          </button>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="flex-1 relative overflow-hidden bg-[#000000] p-3">
        {/* TAB 1: 3D Wafer & ASML EUV Lithography Simulator */}
        {activeTab === '3D_WAFER' && (
          <div className="w-full h-full relative">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Top Right ASML EUV Lithography HUD */}
            <div className="absolute top-2 right-2 bg-[#050505]/95 border border-[#dc2626] p-2.5 rounded backdrop-blur max-w-[280px] text-[10px] space-y-2 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
              <div className="font-orbitron font-bold text-[#dc2626] flex items-center justify-between border-b border-zinc-800 pb-1">
                <span>ASML TWINSCAN EXE:5000</span>
                <span className="text-[9px] text-zinc-400 font-mono">13.5nm EUV</span>
              </div>

              {/* NA Selector */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>NUMERICAL APERTURE (NA):</span>
                  <span className="text-white font-bold">{euvNa === 0.55 ? '0.55 High-NA' : '0.33 Standard'}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { soundFx.playClick(); setEuvNa(0.33); }}
                    className={`flex-1 py-1 rounded font-bold border transition ${
                      euvNa === 0.33 ? 'bg-[#dc2626] text-white border-[#dc2626]' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    0.33 Standard
                  </button>
                  <button
                    onClick={() => { soundFx.playClick(); setEuvNa(0.55); }}
                    className={`flex-1 py-1 rounded font-bold border transition ${
                      euvNa === 0.55 ? 'bg-[#dc2626] text-white border-[#dc2626]' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    0.55 High-NA
                  </button>
                </div>
              </div>

              {/* EUV Laser Pulse Energy Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-400">
                  <span>LASER PULSE ENERGY:</span>
                  <span className="text-emerald-400 font-bold">{laserPulseMj} mJ/cm²</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={laserPulseMj}
                  onChange={(e) => setLaserPulseMj(parseInt(e.target.value))}
                  className="w-full accent-[#dc2626] bg-zinc-800 rounded"
                />
              </div>

              {/* Critical Resolution Calculation */}
              <div className="p-1.5 bg-[#000000] rounded border border-zinc-800 space-y-0.5 text-[9px] font-mono">
                <div className="flex justify-between">
                  <span className="text-zinc-500">RAYLEIGH RESOLUTION (CD):</span>
                  <span className="text-amber-400 font-bold">{( (0.25 * 13.5) / euvNa ).toFixed(2)} nm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">RETICLE SLIT FIELD:</span>
                  <span className="text-white font-bold">{reticleSlitWidthMm} mm</span>
                </div>
              </div>
            </div>

            <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-[#050505]/90 border border-[#18181b] p-1.5 rounded backdrop-blur">
              <button
                onClick={() => setAutoRotate3d(!autoRotate3d)}
                className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 ${
                  autoRotate3d ? 'bg-[#dc2626]/20 text-[#dc2626] border border-[#dc2626]' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${autoRotate3d ? 'animate-spin' : ''}`} />
                {autoRotate3d ? 'ORBIT: AUTO' : 'ORBIT: MANUAL'}
              </button>
              <span className="text-[10px] text-zinc-400">300mm SILICON WAFER // EUV DIE MATRIX</span>
            </div>
          </div>
        )}

        {/* TAB: ASML Metrology Research & Lithography Equipment Simulator */}
        {activeTab === 'ASML_METROLOGY' && (
          <div className="w-full h-full flex flex-col gap-3 overflow-y-auto bg-[#050505] p-3 rounded border border-[#18181b] text-xs font-mono">
            {/* Academic Copyright & Innovation Header */}
            <div className="p-2.5 bg-[#000000] border border-[#dc2626]/40 rounded space-y-1">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-1">
                <span className="font-orbitron font-bold text-[#dc2626] text-xs">
                  ASML METROLOGY SYSTEM ANALYSIS // HIGH-NA EUV LITHOGRAPHY
                </span>
                <span className="text-[9px] text-zinc-500">ASML HOLDING N.V. ARCHITECTURAL REFERENCE</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Academic reference and baseline architectural innovations attributed to <strong className="text-white">ASML Holding N.V.</strong> (Veldhoven, Netherlands) regarding High-NA Extreme Ultraviolet (EUV) photolithography, Laser-Produced Plasma (LPP) tin-droplet 13.5nm light sources, anamorphic projection optics (POB), and TWINSCAN dual-stage metrology.
              </p>
            </div>

            {/* Scanner Controls & Physics Formula Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Parameter Inputs */}
              <div className="bg-[#000000] p-2.5 rounded border border-zinc-800 space-y-2">
                <div className="text-[10px] text-zinc-400 font-bold uppercase border-b border-zinc-900 pb-1">
                  EUV STEPPER SCANNER PARAMETERS:
                </div>

                {/* NA Selector */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400">NUMERICAL APERTURE (NA):</span>
                    <span className="text-white font-bold">{euvNa === 0.55 ? '0.55 High-NA (Anamorphic)' : '0.33 Standard EUV'}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { soundFx.playClick(); setEuvNa(0.33); }}
                      className={`flex-1 py-1 rounded text-[10px] font-bold border transition ${
                        euvNa === 0.33 ? 'bg-[#dc2626] text-white border-[#dc2626]' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      0.33 Standard
                    </button>
                    <button
                      onClick={() => { soundFx.playClick(); setEuvNa(0.55); }}
                      className={`flex-1 py-1 rounded text-[10px] font-bold border transition ${
                        euvNa === 0.55 ? 'bg-[#dc2626] text-white border-[#dc2626]' : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                      }`}
                    >
                      0.55 High-NA
                    </button>
                  </div>
                </div>

                {/* Rayleigh k1 Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400">RAYLEIGH PROCESS FACTOR (k1):</span>
                    <span className="text-amber-400 font-bold">{k1Factor.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="0.40"
                    step="0.01"
                    value={k1Factor}
                    onChange={(e) => setK1Factor(parseFloat(e.target.value))}
                    className="w-full accent-[#dc2626] bg-zinc-800 rounded"
                  />
                </div>

                {/* Scan Speed Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400">STAGE SCAN SPEED (mm/s):</span>
                    <span className="text-white font-bold">{scanSpeedMms} mm/s</span>
                  </div>
                  <input
                    type="range"
                    min="400"
                    max="1200"
                    step="50"
                    value={scanSpeedMms}
                    onChange={(e) => setScanSpeedMms(parseInt(e.target.value))}
                    className="w-full accent-[#dc2626] bg-zinc-800 rounded"
                  />
                </div>

                <button
                  onClick={() => {
                    soundFx.playSynthPass();
                    setIsScanning(true);
                    setTimeout(() => setIsScanning(false), 2000);
                  }}
                  className={`w-full py-2 font-bold rounded border transition text-[10px] flex items-center justify-center gap-1.5 ${
                    isScanning
                      ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                      : 'bg-[#dc2626] hover:bg-[#b91c1c] text-white border-[#dc2626]'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  {isScanning ? 'FIRING LPP EUV LASER SCAN PROTOCOL...' : 'EXECUTE ASML SCANNER EXPOSURE'}
                </button>
              </div>

              {/* Physical Optics Calculations & Visual Diagram */}
              <div className="bg-[#000000] p-2.5 rounded border border-zinc-800 space-y-2 flex flex-col justify-between">
                <div className="text-[10px] text-zinc-400 font-bold uppercase border-b border-zinc-900 pb-1">
                  RAYLEIGH OPTICAL METRICS (λ = 13.5 nm):
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 bg-[#050505] border border-zinc-800 rounded">
                    <div className="text-zinc-500">CRITICAL RESOLUTION (CD)</div>
                    <div className="text-base font-bold text-amber-400 mt-0.5">
                      {((k1Factor * 13.5) / euvNa).toFixed(2)} nm
                    </div>
                    <div className="text-[8px] text-zinc-600 font-mono mt-0.5">Formula: CD = k1 * (λ / NA)</div>
                  </div>

                  <div className="p-2 bg-[#050505] border border-zinc-800 rounded">
                    <div className="text-zinc-500">DEPTH OF FOCUS (DOF)</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">
                      {((0.5 * 13.5) / (euvNa * euvNa)).toFixed(1)} nm
                    </div>
                    <div className="text-[8px] text-zinc-600 font-mono mt-0.5">Formula: DOF = k2 * (λ / NA²)</div>
                  </div>
                </div>

                {/* Subsystem Component Matrix */}
                <div className="p-2 bg-[#050505] border border-zinc-900 rounded space-y-1 text-[9px]">
                  <div className="font-bold text-white border-b border-zinc-800 pb-0.5">HIGH-NA HARDWARE SUBSYSTEMS:</div>
                  <div className="flex justify-between text-zinc-400">
                    <span>LPP TIN DROPLET PLASMA:</span>
                    <span className="text-emerald-400">50 kHz Pulse / 20kW CO2 Laser</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>ANAMORPHIC MIRROR POB:</span>
                    <span className="text-white">Mo/Si Multilayer (8x Transverse / 4x Longitudinal)</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>TWINSCAN DUAL STAGE:</span>
                    <span className="text-amber-400">Interferometric Real-Time Alignment</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'TELEMETRY' && (
          <div className="w-full h-full flex flex-col md:flex-row gap-3 overflow-auto">
            {/* Cell Telemetry Stats Deck */}
            <div className="w-full md:w-1/2 space-y-2 bg-[#050505] p-3 rounded border border-[#18181b]">
              <div className="text-xs font-orbitron font-bold text-[#dc2626] flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                <BarChart2 className="w-4 h-4 text-[#dc2626]" />
                <span>HARDWARE SYNTHESIS TELEMETRY</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">TOTAL GATE COUNT</div>
                  <div className="text-base font-bold text-white">{telemetry.gateCount} GATES</div>
                </div>
                <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">TRANSISTOR AREA</div>
                  <div className="text-base font-bold text-emerald-400">{telemetry.transistorAreaUm2} µm²</div>
                </div>
                <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">POWER FOOTPRINT</div>
                  <div className="text-base font-bold text-[#dc2626]">{telemetry.powerUw} µW</div>
                </div>
                <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                  <div className="text-[10px] text-zinc-500">WORST-CASE DELAY</div>
                  <div className="text-base font-bold text-amber-400">{telemetry.worstCaseDelayNs} ns</div>
                </div>
              </div>
              <div className="bg-[#000000] p-2 rounded border border-zinc-800 text-[11px] font-mono">
                <div className="text-zinc-500 text-[10px]">CRITICAL TIMING PATH:</div>
                <div className="text-zinc-200 truncate">{telemetry.criticalPath}</div>
              </div>
            </div>

            {/* Silicon IC Mask Layer Matrix Viewer */}
            <div className="w-full md:w-1/2 bg-[#050505] p-3 rounded border border-[#18181b] flex flex-col">
              <div className="text-xs font-orbitron font-bold text-white flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-2">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#dc2626]" />
                  <span>SILICON MASK LAYERS</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">3nm GAA PROCESS</span>
              </div>
              <div className="flex items-center gap-1 mb-2 text-[9px] font-mono">
                {(['ALL', 'POLY', 'DIFF', 'M1'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveLayerFilter(filter)}
                    className={`px-1.5 py-0.5 rounded ${activeLayerFilter === filter ? 'bg-[#dc2626] text-white font-bold' : 'bg-zinc-800 text-zinc-400'}`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-4 gap-1.5 bg-[#000000] p-2 rounded border border-zinc-900">
                {Array.from({ length: 16 }).map((_, idx) => {
                  const r = Math.floor(idx / 4);
                  const c = idx % 4;
                  const hasPoly = layoutLayers.polysilicon[r]?.[c];
                  const hasDiff = layoutLayers.diffusion[r]?.[c];
                  const hasM1 = layoutLayers.metal1[r]?.[c];

                  return (
                    <div
                      key={idx}
                      className="aspect-square bg-[#050505] border border-zinc-800 rounded relative flex items-center justify-center p-1 group hover:border-[#dc2626] transition"
                    >
                      {(activeLayerFilter === 'ALL' || activeLayerFilter === 'POLY') && hasPoly && (
                        <div className="absolute inset-1 border border-amber-500/80 bg-amber-500/20 rounded" />
                      )}
                      {(activeLayerFilter === 'ALL' || activeLayerFilter === 'DIFF') && hasDiff && (
                        <div className="absolute inset-2 border border-rose-500/80 bg-rose-500/20 rounded" />
                      )}
                      {(activeLayerFilter === 'ALL' || activeLayerFilter === 'M1') && hasM1 && (
                        <div className="absolute inset-3 border border-emerald-400/80 bg-emerald-400/30 rounded" />
                      )}
                      <span className="text-[8px] font-mono text-zinc-600 relative z-10">{`CELL_${r}${c}`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PVT Corner & Stress Analysis */}
        {activeTab === 'PVT_STRESS' && (
          <div className="w-full h-full flex flex-col gap-3 overflow-y-auto bg-[#050505] p-3 rounded border border-[#18181b]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#dc2626]" />
                <span className="font-orbitron font-bold text-white text-xs">PVT PROCESS CORNER & THERMAL STRESS TESTING</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                pvtEval.isTimingViolation ? 'bg-rose-950/80 text-[#dc2626] border-[#dc2626]' : 'bg-emerald-950/80 text-emerald-400 border-emerald-500'
              }`}>
                {pvtEval.isTimingViolation ? 'TIMING VIOLATION' : 'TIMING MARGIN OK'}
              </span>
            </div>

            {/* PVT Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Process Corner Select */}
              <div className="bg-[#000000] p-2.5 rounded border border-zinc-800 space-y-1">
                <label className="text-[10px] font-bold text-zinc-400">PROCESS CORNER (P)</label>
                <div className="flex gap-1">
                  {(['FF', 'TT', 'SS'] as const).map(corner => (
                    <button
                      key={corner}
                      onClick={() => {
                        soundFx.playClick();
                        setPvtCorner(corner);
                      }}
                      className={`flex-1 py-1 rounded text-xs font-bold border transition ${
                        pvtCorner === corner
                          ? 'bg-[#dc2626] text-white border-[#dc2626]'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {corner} ({corner === 'FF' ? 'Fast' : corner === 'TT' ? 'Nominal' : 'Slow'})
                    </button>
                  ))}
                </div>
              </div>

              {/* Voltage Slider */}
              <div className="bg-[#000000] p-2.5 rounded border border-zinc-800 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-zinc-400">VOLTAGE VDD (V):</span>
                  <span className="text-white font-bold">{pvtVoltage.toFixed(2)} V</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={pvtVoltage}
                  onChange={(e) => setPvtVoltage(parseFloat(e.target.value))}
                  className="w-full accent-[#dc2626] bg-zinc-800 rounded"
                />
              </div>

              {/* Temperature Slider */}
              <div className="bg-[#000000] p-2.5 rounded border border-zinc-800 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-zinc-400">TEMPERATURE (T):</span>
                  <span className={`font-bold ${pvtTemperature > 85 ? 'text-[#dc2626]' : 'text-amber-400'}`}>
                    {pvtTemperature}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="-40"
                  max="125"
                  step="5"
                  value={pvtTemperature}
                  onChange={(e) => setPvtTemperature(parseInt(e.target.value))}
                  className="w-full accent-[#dc2626] bg-zinc-800 rounded"
                />
              </div>
            </div>

            {/* Calculated Results Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">CORNER DELAY MULTIPLIER</div>
                <div className="text-base font-bold text-white">{pvtEval.delayFactor}x</div>
              </div>
              <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">PVT ADJUSTED DELAY</div>
                <div className="text-base font-bold text-amber-400">{pvtEval.adjustedDelayNs} ns</div>
              </div>
              <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">SETUP TIMING MARGIN</div>
                <div className={`text-base font-bold ${pvtEval.setupMarginPs < 0 ? 'text-[#dc2626]' : 'text-emerald-400'}`}>
                  {pvtEval.setupMarginPs} ps
                </div>
              </div>
              <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">HOLD MARGIN WINDOW</div>
                <div className="text-base font-bold text-white">{pvtEval.holdMarginPs} ps</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Commercial GDSII Macro Dropper */}
        {activeTab === 'MACRO_DROPPER' && (
          <div className="w-full h-full flex flex-col md:flex-row gap-3 overflow-y-auto bg-[#050505] p-3 rounded border border-[#18181b]">
            {/* Left Controls & Catalog */}
            <div className="w-full md:w-5/12 space-y-2">
              <div className="text-xs font-orbitron font-bold text-white flex items-center gap-1 border-b border-zinc-800 pb-1.5">
                <Box className="w-4 h-4 text-[#dc2626]" />
                <span>COMMERCIAL MACRO-CELL CATALOG</span>
              </div>

              <div className="space-y-1.5">
                {COMMERCIAL_MACRO_CATALOG.map(macro => (
                  <div
                    key={macro.id}
                    onClick={() => {
                      soundFx.playClick();
                      setSelectedMacroCatalogId(macro.id);
                    }}
                    className={`p-2 rounded border cursor-pointer transition ${
                      selectedMacroCatalogId === macro.id
                        ? 'bg-zinc-900 border-[#dc2626] text-white'
                        : 'bg-[#000000] border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span>{macro.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                        {macro.widthUm}µm x {macro.heightUm}µm
                      </span>
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-1">{macro.description}</div>
                  </div>
                ))}
              </div>

              <button
                onClick={handlePlaceMacro}
                className="w-full py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold rounded border border-[#dc2626] shadow transition flex items-center justify-center gap-1.5 text-xs"
              >
                <Box className="w-4 h-4" />
                DROP MACRO ONTO FLOORPLAN (1000µm x 1000µm)
              </button>

              {dragError && (
                <div className="p-2 bg-rose-950/80 border border-[#dc2626] text-[#dc2626] text-[10px] rounded">
                  {dragError}
                </div>
              )}
            </div>

            {/* Right Floorplan Canvas (1000µm x 1000µm representation) */}
            <div className="w-full md:w-7/12 bg-[#000000] p-3 rounded border border-zinc-800 flex flex-col">
              <div className="flex justify-between items-center text-[10px] text-zinc-400 border-b border-zinc-800 pb-1.5 mb-2">
                <span className="font-bold text-white">GDSII DIE FLOORPLAN CANVAS (1000µm x 1000µm)</span>
                <span>PLACED: {placedMacros.length} MACROS</span>
              </div>

              {/* Interactive Floorplan Box */}
              <div className="flex-1 aspect-square bg-[#050505] border-2 border-dashed border-zinc-800 rounded relative overflow-hidden p-2">
                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                {placedMacros.map((placed) => {
                  // Scale 1000um -> 100% canvas
                  const leftPct = (placed.xUm / 1000) * 100;
                  const topPct = (placed.yUm / 1000) * 100;
                  const widthPct = (placed.widthUm / 1000) * 100;
                  const heightPct = (placed.heightUm / 1000) * 100;

                  return (
                    <div
                      key={placed.id}
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                        borderColor: placed.color,
                        backgroundColor: `${placed.color}22`
                      }}
                      className="absolute border-2 rounded p-1 flex flex-col justify-between group shadow-lg transition-all"
                    >
                      <div className="flex justify-between items-start text-[8px] font-bold text-white truncate">
                        <span className="truncate">{placed.name}</span>
                        <button
                          onClick={() => handleRemoveMacro(placed.id)}
                          className="bg-black/80 text-rose-400 px-1 hover:bg-rose-900 rounded"
                        >
                          X
                        </button>
                      </div>
                      <div className="text-[7px] text-zinc-300 font-mono">
                        {placed.widthUm}x{placed.heightUm}µm [L{placed.layer}]
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SAT Solver & Smart ECO Delta Patch */}
        {activeTab === 'SAT_ECO' && (
          <div className="w-full h-full flex flex-col md:flex-row gap-3 overflow-y-auto bg-[#050505] p-3 rounded border border-[#18181b]">
            {/* SAT Solver Panel */}
            <div className="w-full md:w-1/2 bg-[#000000] p-3 rounded border border-zinc-800 space-y-2 flex flex-col">
              <div className="text-xs font-orbitron font-bold text-white flex items-center justify-between border-b border-zinc-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#dc2626]" />
                  <span>CNF SAT SOLVER (DEADLOCK HAZARD)</span>
                </span>
                <button
                  onClick={handleRunSatSolver}
                  className="px-2 py-0.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-[10px] font-bold rounded"
                >
                  RUN CNF SOLVER
                </button>
              </div>

              {satResult ? (
                <div className="space-y-2 text-xs font-mono">
                  <div className={`p-2 rounded border ${
                    satResult.isSatisfiable
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                      : 'bg-rose-950/40 border-[#dc2626] text-[#dc2626]'
                  }`}>
                    <div className="font-bold">{satResult.status}</div>
                    <div className="text-[10px] text-zinc-300 mt-0.5">{satResult.message}</div>
                  </div>

                  <div className="bg-[#050505] p-2 rounded border border-zinc-900 space-y-1">
                    <div className="text-[10px] text-zinc-500 font-bold">SOLVER CNF CLAUSES EVALUATED:</div>
                    {satResult.clauses.map((c, idx) => (
                      <div key={idx} className="text-[10px] text-zinc-400 font-mono">{c}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-zinc-600 italic text-[11px] p-4 text-center">
                  Press 'RUN CNF SOLVER' to verify formal deadlock hazards & combinational feedback loops.
                </div>
              )}
            </div>

            {/* Smart ECO Delta Patch Panel */}
            <div className="w-full md:w-1/2 bg-[#000000] p-3 rounded border border-zinc-800 space-y-2 flex flex-col">
              <div className="text-xs font-orbitron font-bold text-white flex items-center justify-between border-b border-zinc-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>SMART ECO DELTA PATCH GENERATOR</span>
                </span>
                <button
                  onClick={handleRunSmartEco}
                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-black text-[10px] font-bold rounded"
                >
                  SYNTHESIZE ECO
                </button>
              </div>

              {ecoPatch ? (
                <div className="space-y-2 text-xs font-mono">
                  <div className="p-2 bg-zinc-900 border border-amber-500/40 rounded text-zinc-200">
                    <div className="text-amber-400 font-bold">{ecoPatch.description}</div>
                    <div className="text-[10px] text-zinc-400 mt-1">MASK SPIN COST SAVED: $2,125,000 USD</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-[#050505] p-2 rounded border border-zinc-900">
                      <div className="text-zinc-500">ALTERED GATES</div>
                      <div className="text-white font-bold">{ecoPatch.alteredGates.join(', ')}</div>
                    </div>
                    <div className="bg-[#050505] p-2 rounded border border-zinc-900">
                      <div className="text-zinc-500">MODIFIED NETS</div>
                      <div className="text-emerald-400 font-bold">{ecoPatch.alteredNets.join(', ')}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-600 italic text-[11px] p-4 text-center">
                  Press 'SYNTHESIZE ECO' to compute engineering change order delta patch on modified metal layers.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: Defect Density & Yield Profitability */}
        {activeTab === 'YIELD_COST' && (
          <div className="w-full h-full flex flex-col gap-3 overflow-y-auto bg-[#050505] p-3 rounded border border-[#18181b]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#dc2626]" />
                <span className="font-orbitron font-bold text-white text-xs">CLEANROOM DEFECT DENSITY & YIELD PROFITABILITY MODEL</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                yieldEval.isProfitable ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500' : 'bg-rose-950/80 text-[#dc2626] border-[#dc2626]'
              }`}>
                {yieldEval.isProfitable ? 'COMMERCIAL PROFITABLE' : 'UNECONOMIC MARGIN'}
              </span>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-[#000000] p-2.5 rounded border border-zinc-800 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-zinc-400">DEFECT DENSITY D0 (defects/cm²):</span>
                  <span className="text-white font-bold">{defectDensityD0}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.30"
                  step="0.01"
                  value={defectDensityD0}
                  onChange={(e) => setDefectDensityD0(parseFloat(e.target.value))}
                  className="w-full accent-[#dc2626] bg-zinc-800 rounded"
                />
              </div>

              <div className="bg-[#000000] p-2.5 rounded border border-zinc-800 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-zinc-400">DIE FOOTPRINT AREA (mm²):</span>
                  <span className="text-white font-bold">{dieAreaMm2} mm²</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="400"
                  step="10"
                  value={dieAreaMm2}
                  onChange={(e) => setDieAreaMm2(parseInt(e.target.value))}
                  className="w-full accent-[#dc2626] bg-zinc-800 rounded"
                />
              </div>
            </div>

            {/* Yield Calculations Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">GROSS DIES PER WAFER (DPW)</div>
                <div className="text-base font-bold text-white">{yieldEval.grossDiesPerWafer} DIES</div>
              </div>
              <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">MURPHY DIE YIELD Y%</div>
                <div className="text-base font-bold text-emerald-400">{yieldEval.yieldPercentage}%</div>
              </div>
              <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">NET USABLE DIES / WAFER</div>
                <div className="text-base font-bold text-amber-400">{yieldEval.netUsableDies} DIES</div>
              </div>
              <div className="bg-[#000000] p-2 rounded border border-zinc-800">
                <div className="text-[10px] text-zinc-500">COST PER USABLE DIE</div>
                <div className="text-base font-bold text-[#dc2626]">${yieldEval.costPerDieUsd} USD</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: Kansen Logic Efficiency Leaderboard */}
        {activeTab === 'LEADERBOARD' && (
          <div className="w-full h-full flex flex-col gap-2 overflow-y-auto bg-[#050505] p-3 rounded border border-[#18181b]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#dc2626]" />
                <span className="font-orbitron font-bold text-white text-xs">KANSEN LOGIC EFFICIENCY LEADERBOARD</span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                FORMULA: [AREA EFFICIENCY] + [PVT MARGIN] + [COST / DIE]
              </span>
            </div>

            <div className="space-y-1.5">
              {leaderboardEntries.map((entry) => (
                <div
                  key={entry.rank}
                  className={`p-2 rounded border flex items-center justify-between text-xs transition ${
                    entry.isUser
                      ? 'bg-[#dc2626]/20 border-[#dc2626] text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]'
                      : 'bg-[#000000] border-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      entry.rank === 1 ? 'bg-amber-500 text-black' :
                      entry.rank === 2 ? 'bg-zinc-300 text-black' :
                      entry.rank === 3 ? 'bg-amber-700 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      #{entry.rank}
                    </span>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{entry.name}</span>
                        {entry.isUser && (
                          <span className="bg-[#dc2626] text-white text-[9px] px-1 rounded font-mono">
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono">
                        Area: {entry.transistorArea}µm² | PVT Margin: {entry.pvtMarginPs}ps | Cost: ${entry.costPerDieUsd}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-orbitron font-black text-sm text-emerald-400">
                      {entry.score} PTS
                    </div>
                    <div className="text-[9px] text-zinc-500">SILICON PURITY</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: GDSII Binary Stream Inspector & Matrix */}
        {activeTab === 'GDSII_STREAM' && (
          <div className="w-full h-full flex flex-col gap-3 overflow-y-auto bg-[#050505] p-3 rounded border border-[#18181b]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-[#dc2626]" />
                <span className="font-orbitron font-bold text-white text-xs">GDSII STREAM STRUCTURE MATRIX & BINARY INSPECTOR</span>
              </div>
              <button
                onClick={() => {
                  soundFx.playClick();
                  const sampleGdsData = new Uint8Array([
                    0x00, 0x06, 0x00, 0x02, 0x02, 0x58, // HEADER
                    0x00, 0x1c, 0x01, 0x02, 0x07, 0xe8, 0x00, 0x08, 0x00, 0x12, 0x00, 0x09, // BGNLIB
                    0x00, 0x12, 0x02, 0x06, 0x4b, 0x41, 0x4e, 0x53, 0x45, 0x4e, 0x5f, 0x33, 0x4e, 0x4d, // LIBNAME: KANSEN_3NM
                    0x00, 0x04, 0x07, 0x00 // ENDLIB
                  ]);
                  const blob = new Blob([sampleGdsData], { type: 'application/octet-stream' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `kansen_layout_3nm_${moduleTitle.replace(/\s+/g, '_')}.gds`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-2.5 py-1 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-[10px] rounded border border-[#dc2626] shadow transition flex items-center gap-1"
              >
                <Grid className="w-3 h-3" /> EXPORT BINARY .GDS FILE
              </button>
            </div>

            {/* Layer Mapping Table */}
            <div className="bg-[#000000] p-2.5 rounded border border-zinc-800 space-y-2">
              <div className="text-[10px] text-zinc-400 font-bold uppercase">PHYSICAL PDK MASK LAYER ASSIGNMENTS (3NM GAANFET):</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-[10px]">
                <div className="p-2 bg-[#050505] border border-amber-800/60 rounded">
                  <div className="text-amber-400 font-bold">LAYER 1 (0x01)</div>
                  <div className="text-zinc-300">Active Diffusion (FIN)</div>
                </div>
                <div className="p-2 bg-[#050505] border border-rose-800/60 rounded">
                  <div className="text-rose-400 font-bold">LAYER 2 (0x02)</div>
                  <div className="text-zinc-300">Gate Poly / Nanosheet</div>
                </div>
                <div className="p-2 bg-[#050505] border border-emerald-800/60 rounded">
                  <div className="text-emerald-400 font-bold">LAYER 10 (0x0A)</div>
                  <div className="text-zinc-300">Metal 1 Interconnect</div>
                </div>
                <div className="p-2 bg-[#050505] border border-blue-800/60 rounded">
                  <div className="text-blue-400 font-bold">LAYER 11 (0x0B)</div>
                  <div className="text-zinc-300">Via 1 Inter-Layer</div>
                </div>
                <div className="p-2 bg-[#050505] border border-purple-800/60 rounded">
                  <div className="text-purple-400 font-bold">LAYER 12 (0x0C)</div>
                  <div className="text-zinc-300">Metal 2 Signal Bus</div>
                </div>
              </div>
            </div>

            {/* Raw Uint8Array Memory Hex Dump */}
            <div className="bg-[#000000] p-2.5 rounded border border-zinc-800 space-y-1 font-mono text-[10px]">
              <div className="text-zinc-500 font-bold mb-1">RAW GDSII STREAM UINT8ARRAY MEMORY DUMP:</div>
              <div className="bg-[#050505] p-2 rounded border border-zinc-900 text-emerald-400 leading-relaxed font-mono overflow-x-auto">
                00 06 00 02 02 58 00 1C 01 02 07 E8 00 08 00 12 00 09 00 12 02 06 4B 41 4E 53 45 4E 5F 33 4E 4D 00 14 03 02 00 08 00 12 00 09 00 0C 04 06 54 4F 50 5F 43 45 4C 4C 00 04 07 00
              </div>
              <div className="text-[9px] text-zinc-500">
                GDSII Record Sequence: HEADER (0x0002) → BGNLIB (0x0102) → LIBNAME (0x0206) → BGNSTR (0x0302) → STRNAME (0x0406) → ENDSTR (0x0700)
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
