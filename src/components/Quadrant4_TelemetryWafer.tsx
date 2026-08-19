import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { Cpu, Layers, Disc, RefreshCw, BarChart2, ShieldAlert, Zap, Box, CheckCircle2, TrendingUp, Award, Grid, DollarSign, Activity } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import { GdsService } from '../services/gdsService';
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
  KansenLeaderboardEngine,
  KansenGdsFormatter
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
  isSimulating?: boolean;
  satSolverMode?: 'HEURISTIC' | 'EXACT';
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
  setPvtTemperature: propSetSetPvtTemperature,
  isSimulating = false,
  satSolverMode = 'HEURISTIC'
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  
  // Tab State
  type SubTab = '3D_WAFER' | 'ASML_METROLOGY' | 'TELEMETRY' | 'PVT_STRESS' | 'MACRO_DROPPER' | 'SAT_ECO' | 'YIELD_COST' | 'LEADERBOARD' | 'GDSII_STREAM' | 'FINFET_SIM';
  const [activeTab, setActiveTab] = useState<SubTab>(is3dActive ? '3D_WAFER' : 'TELEMETRY');

  // FinFET & GAA Simulator parameters
  const [finfetTicks, setFinfetTicks] = useState<number>(0);
  const [channelLength, setChannelLength] = useState<number>(3); // 3nm to 14nm
  const [finHeight, setFinHeight] = useState<number>(35); // 20nm to 45nm
  const [finWidth, setFinWidth] = useState<number>(5); // 2nm to 8nm
  const [gateOxideTox, setGateOxideTox] = useState<number>(0.8); // 0.5nm to 2.0nm
  const [gateVoltageVg, setGateVoltageVg] = useState<number>(0.75); // 0.0V to 1.2V

  useEffect(() => {
    if (activeTab !== 'FINFET_SIM') return;
    const interval = setInterval(() => {
      setFinfetTicks(t => t + 1);
    }, 120);
    return () => clearInterval(interval);
  }, [activeTab]);
  
  // 3D Wafer & ASML Lithography controls
  const [autoRotate3d, setAutoRotate3d] = useState<boolean>(true);
  const [renderingMode, setRenderingMode] = useState<'STANDARD' | 'THERMAL'>('STANDARD');
  const [activeLayerFilter, setActiveLayerFilter] = useState<'ALL' | 'POLY' | 'DIFF' | 'M1' | 'M2'>('ALL');
  
  // Diagnostic Fields Filters
  const [activeDiagGroup, setActiveDiagGroup] = useState<'ALL' | 'TIMING' | 'SIGNAL' | 'POWER' | 'PHYSICAL' | 'LITHO' | 'FORMAL' | 'YIELD'>('ALL');
  const [diagSearch, setDiagSearch] = useState<string>('');
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

  // Burn-In Stress Test & Transistor Sizing State
  const [isBurnInActive, setIsBurnInActive] = useState<boolean>(false);
  const [burnInStatus, setBurnInStatus] = useState<'IDLE' | 'STRESSING' | 'PASSED' | 'FAILED'>('IDLE');
  const [burnInSeconds, setBurnInSeconds] = useState<number>(0);
  const [burnInHistory, setBurnInHistory] = useState<Array<{ time: number; v: number; t: number; pass: boolean }>>([]);
  const [transistorSizingFactor, setTransistorSizingFactor] = useState<number>(1.0);

  // Dynamic thermodynamic adjustments
  const adjustedBaseDelayNs = Number((telemetry.worstCaseDelayNs / (1.0 + (transistorSizingFactor - 1.0) * 0.45)).toFixed(4));
  const adjustedPowerUw = Number((telemetry.powerUw * transistorSizingFactor).toFixed(1));
  const adjustedAreaUm2 = Number((telemetry.transistorAreaUm2 * transistorSizingFactor).toFixed(4));

  // Real-time Synthetic Sensor State
  const [leakageCurrent, setLeakageCurrent] = useState<number>(0.15);
  const [junctionTemp, setJunctionTemp] = useState<number>(25);
  const [telemetryHistory, setTelemetryHistory] = useState<Array<{ leakage: number; temp: number }>>([]);

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
  const [draggingMacroId, setDraggingMacroId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

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
      color: renderingMode === 'THERMAL' ? 0x11101d : 0x18181b,
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
    const gridHelper = new THREE.GridHelper(15, 24, renderingMode === 'THERMAL' ? 0xdc2626 : 0xdc2626, renderingMode === 'THERMAL' ? 0x1e1b4b : 0x27272a);
    gridHelper.position.y = 0.16;
    waferGroup.add(gridHelper);

    // Individual Glowing IC Dies
    for (let x = -6; x <= 6; x += 1.5) {
      for (let z = -6; z <= 6; z += 1.5) {
        if (x * x + z * z < 48) {
          const dieGeo = new THREE.BoxGeometry(1.2, 0.05, 1.2);
          
          let dieColor = 0x52525b;
          let dieEmissive = 0x18181b;
          let dieEmissiveIntensity = 0.5;

          if (renderingMode === 'THERMAL') {
            // Localized temperature: core is hotter, periphery is cooler with some thermal fluctuation noise
            const dist = Math.sqrt(x * x + z * z);
            const localTemp = junctionTemp + (15 - dist * 3.2) + Math.sin(x * 1.5) * 5 + Math.cos(z * 1.5) * 5;
            
            if (localTemp < 45) {
              dieColor = 0x1e3a8a; // Cool Blue
              dieEmissive = 0x1d4ed8;
              dieEmissiveIntensity = 0.3;
            } else if (localTemp < 72) {
              dieColor = 0x10b981; // Safe Green
              dieEmissive = 0x059669;
              dieEmissiveIntensity = 0.6;
            } else if (localTemp < 98) {
              dieColor = 0xf59e0b; // Hot Orange/Amber
              dieEmissive = 0xd97706;
              dieEmissiveIntensity = 1.1;
            } else {
              dieColor = 0xef4444; // Scorching Red-hot
              dieEmissive = 0xff0000;
              dieEmissiveIntensity = 1.8;
            }
          } else {
            dieColor = (Math.abs(x) + Math.abs(z)) % 3 === 0 ? 0xdc2626 : 0x52525b;
            dieEmissive = (Math.abs(x) + Math.abs(z)) % 3 === 0 ? 0x991b1b : 0x18181b;
            dieEmissiveIntensity = 0.5;
          }

          const dieMat = new THREE.MeshStandardMaterial({
            color: dieColor,
            emissive: dieEmissive,
            emissiveIntensity: dieEmissiveIntensity,
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
  }, [activeTab, autoRotate3d, renderingMode, junctionTemp, isBurnInActive]);

  // Compute PVT Evaluation
  const pvtConfig: PvtConfig = {
    corner: pvtCorner,
    voltage: pvtVoltage,
    temperature: pvtTemperature,
    calculatedDelayFactor: PvtEngine.calculatePvtDelayFactor(pvtCorner, pvtVoltage, pvtTemperature),
    isTimingViolation: false
  };
  const pvtEval = PvtEngine.evaluatePvtConfig(adjustedBaseDelayNs, pvtConfig);

  // Compute Yield Profitability
  const yieldEval: YieldProfitability = YieldProfitabilityEngine.calculateYield(dieAreaMm2, defectDensityD0);

  // Compute Leaderboard Ranking
  const leaderboardEntries: LeaderboardEntry[] = KansenLeaderboardEngine.getLeaderboard({
    name: 'OPERATIVE_094',
    areaUm2: adjustedAreaUm2,
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

  const handleMacroMouseDown = (e: React.MouseEvent, id: string, currentX: number, currentY: number) => {
    e.preventDefault();
    e.stopPropagation();
    soundFx.playClick();
    setDraggingMacroId(id);
    
    // Get mouse position relative to floorplan container
    const rect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      // Convert current macro position (xUm, yUm) to pixels for offset calculation
      const macroPxX = (currentX / 1000) * rect.width;
      const macroPxY = (currentY / 1000) * rect.height;
      setDragStartPos({
        x: mouseX - macroPxX,
        y: mouseY - macroPxY
      });
    }
  };

  const handleFloorplanMouseMove = (e: React.MouseEvent) => {
    if (!draggingMacroId) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // New pixel positions with offset
    let newPxX = mouseX - dragStartPos.x;
    let newPxY = mouseY - dragStartPos.y;

    // Convert pixel to um (0 to 1000)
    let newXUm = Math.round((newPxX / rect.width) * 1000);
    let newYUm = Math.round((newPxY / rect.height) * 1000);

    // Bound check
    const macro = placedMacros.find(m => m.id === draggingMacroId);
    if (!macro) return;

    // Snap to 10um grid for placement grid accuracy
    newXUm = Math.round(newXUm / 10) * 10;
    newYUm = Math.round(newYUm / 10) * 10;

    // Keep inside boundaries
    newXUm = Math.max(0, Math.min(1000 - macro.widthUm, newXUm));
    newYUm = Math.max(0, Math.min(1000 - macro.heightUm, newYUm));

    setPlacedMacros(prev => prev.map(m => {
      if (m.id === draggingMacroId) {
        return { ...m, xUm: newXUm, yUm: newYUm };
      }
      return m;
    }));
  };

  const handleFloorplanMouseUp = () => {
    if (draggingMacroId) {
      setDraggingMacroId(null);
    }
  };

  // Burn-In Stress Test Mode Effect Loop
  useEffect(() => {
    if (!isBurnInActive) return;

    let timer: any = null;
    let secondsElapsed = 0;
    setBurnInStatus('STRESSING');
    setBurnInHistory([]);

    const runStressCycle = () => {
      // Randomized voltage and temperature fluctuations representing Burn-in oven environment
      const minVolt = 0.75;
      const maxVolt = 1.35;
      const minTemp = 50;
      const maxTemp = 135;

      const randomVoltage = Number((minVolt + Math.random() * (maxVolt - minVolt)).toFixed(2));
      const randomTemp = Math.round(minTemp + Math.random() * (maxTemp - minTemp));

      // Propagate parameters dynamically
      setPvtVoltage(randomVoltage);
      setPvtTemperature(randomTemp);

      // Verify if timing and hold/leakage safety margins are violated at this stress corner
      const factor = PvtEngine.calculatePvtDelayFactor(pvtCorner, randomVoltage, randomTemp);
      const stepAdjustedDelayNs = Number((adjustedBaseDelayNs * factor).toFixed(4));
      const maxClockPeriodNs = 1.0;
      const stepSetupMarginPs = Math.round((maxClockPeriodNs - stepAdjustedDelayNs) * 1000);
      
      // Keep safety margin positive! If transistor width is not adjusted, high temperature
      // combined with low operating voltage creates negative setup margin (Timing Violation)
      const stepPass = stepSetupMarginPs >= 0;

      secondsElapsed += 1;
      setBurnInSeconds(secondsElapsed);

      setBurnInHistory(prev => {
        const newHistory = [...prev, { time: secondsElapsed, v: randomVoltage, t: randomTemp, pass: stepPass }];
        return newHistory.slice(-10); // Keep last 10 steps
      });

      if (!stepPass) {
        setBurnInStatus('FAILED');
        setIsBurnInActive(false);
        soundFx.playError();
        return;
      }

      if (secondsElapsed >= 15) {
        setBurnInStatus('PASSED');
        setIsBurnInActive(false);
        soundFx.playSynthPass();
        return;
      }
    };

    // Run first immediately
    runStressCycle();

    timer = setInterval(runStressCycle, 600);

    return () => {
      clearInterval(timer);
    };
  }, [isBurnInActive, pvtCorner, adjustedBaseDelayNs]);

  // Real-time On-Die Synthetic Sensor Telemetry Update
  useEffect(() => {
    const sensorInterval = setInterval(() => {
      // Base thermodynamic leakage (proportional to Temperature exponentially and Voltage cubed, scaled by transistor sizing width)
      const baseLeakage = 0.08 + (pvtVoltage * pvtVoltage * pvtVoltage * 0.12) * Math.exp((pvtTemperature - 25) / 60) * (telemetry.gateCount / 1000) * transistorSizingFactor;
      const dynamicJitter = (Math.random() - 0.5) * 0.02 * (isSimulating ? 3.0 : 1.0);
      const switchingCurrent = isSimulating ? (pvtVoltage * 0.28 * (telemetry.gateCount / 1500) * transistorSizingFactor) : 0;
      const calculatedLeakage = Number(Math.max(0.01, baseLeakage + dynamicJitter + switchingCurrent).toFixed(4));

      // Dynamic Junction temperature including resistive thermal heating
      const thermalResistance = 45; // °C/W
      const activePowerMw = adjustedPowerUw / 1000;
      const thermalHeating = activePowerMw * 0.0055 * thermalResistance * (isSimulating ? 1.8 : 0.2);
      const calculatedJunctionTemp = Number((pvtTemperature + thermalHeating + (Math.random() - 0.5) * 0.3).toFixed(1));

      setLeakageCurrent(calculatedLeakage);
      setJunctionTemp(calculatedJunctionTemp);

      setTelemetryHistory(prev => {
        const next = [...prev, { leakage: calculatedLeakage, temp: calculatedJunctionTemp }];
        return next.slice(-25);
      });
    }, 200);

    return () => {
      clearInterval(sensorInterval);
    };
  }, [pvtVoltage, pvtTemperature, telemetry.gateCount, transistorSizingFactor, isSimulating, adjustedPowerUw]);

  // Run SAT Solver
  const handleRunSatSolver = async () => {
    soundFx.playClick();
    try {
      const response = await fetch('/api/sat/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verilogCode, mode: satSolverMode })
      });
      if (response.ok) {
        const data = await response.json();
        setSatResult({
          status: data.status,
          isSatisfiable: data.isSatisfiable,
          variables: data.variables,
          clauses: data.clauses,
          executionTimeMs: 0.85,
          message: data.message,
          dpllSteps: data.dpllSteps || data.steps,
          decisionsCount: data.decisionsCount,
          unitPropagationsCount: data.unitPropagationsCount,
          backtracksCount: data.backtracksCount,
          learnedClauses: data.learnedClauses
        });
        if (data.isSatisfiable) {
          soundFx.playSynthPass();
        } else {
          soundFx.playError();
        }
        return;
      }
    } catch (e) {
      // Fallback to local offline solver below
    }
    const result = SatSolverEngine.solveDeadlockSat(verilogCode, (satSolverMode || 'HEURISTIC') as 'HEURISTIC' | 'EXACT');
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

  // Generate 70+ industrial-grade EDA diagnostic fields dynamically
  const diagnosticFields = [
    // 1. Clock & Timing Verification
    { id: 'T01', name: 'Setup Timing Slack', group: 'TIMING', value: `${pvtEval.setupMarginPs} ps`, status: pvtEval.setupMarginPs < 0 ? 'CRITICAL' : 'NOMINAL' },
    { id: 'T02', name: 'Hold Margin Slack', group: 'TIMING', value: `${pvtEval.holdMarginPs} ps`, status: 'NOMINAL' },
    { id: 'T03', name: 'Clock Skew Dev', group: 'TIMING', value: `${(15 + Math.sin(junctionTemp / 10) * 4).toFixed(1)} ps`, status: 'NOMINAL' },
    { id: 'T04', name: 'Clock Jitter (RMS)', group: 'TIMING', value: `${(2.4 + Math.cos(pvtVoltage * 3) * 0.5).toFixed(2)} ps`, status: 'NOMINAL' },
    { id: 'T05', name: 'Rise-time Degradation', group: 'TIMING', value: `${(18 + (1.2 / pvtVoltage) * 5).toFixed(1)} ps`, status: 'NOMINAL' },
    { id: 'T06', name: 'Fall-time Degradation', group: 'TIMING', value: `${(16 + (1.2 / pvtVoltage) * 4.5).toFixed(1)} ps`, status: 'NOMINAL' },
    { id: 'T07', name: 'Worst-case Delay', group: 'TIMING', value: `${pvtEval.adjustedDelayNs} ns`, status: pvtEval.isTimingViolation ? 'VIOLATION' : 'NOMINAL' },
    { id: 'T08', name: 'Duty Cycle Distortion', group: 'TIMING', value: `${(49.8 + Math.sin(junctionTemp / 20) * 0.4).toFixed(2)} %`, status: 'NOMINAL' },
    { id: 'T09', name: 'Buffer Prop Latency', group: 'TIMING', value: `${(12 + (pvtCorner === 'SS' ? 4 : pvtCorner === 'FF' ? -3 : 0)).toFixed(0)} ps`, status: 'NOMINAL' },
    { id: 'T10', name: 'Clock Tree Depth', group: 'TIMING', value: '7 Stages', status: 'NOMINAL' },

    // 2. Signal Integrity & Crosstalk
    { id: 'S01', name: 'Coupling Capacitance', group: 'SIGNAL', value: `${(1.24 * transistorSizingFactor).toFixed(2)} fF/µm`, status: 'NOMINAL' },
    { id: 'S02', name: 'Aggressor Nets Detected', group: 'SIGNAL', value: '3 Active', status: 'NOMINAL' },
    { id: 'S03', name: 'Victim Noise Peak', group: 'SIGNAL', value: `${(28 + (1.2 - pvtVoltage) * 40).toFixed(1)} mV`, status: 'NOMINAL' },
    { id: 'S04', name: 'Crosstalk Delay Delta', group: 'SIGNAL', value: `${(8.4 + Math.sin(junctionTemp / 15) * 2).toFixed(1)} ps`, status: 'NOMINAL' },
    { id: 'S05', name: 'Wire Resistance (M1)', group: 'SIGNAL', value: '2.45 Ω/µm', status: 'NOMINAL' },
    { id: 'S06', name: 'Electromigration Limit', group: 'SIGNAL', value: `${(45 + (adjustedPowerUw / 5)).toFixed(1)} %`, status: 'NOMINAL' },
    { id: 'S07', name: 'Via-1 Contact Resistance', group: 'SIGNAL', value: '142 mΩ', status: 'NOMINAL' },
    { id: 'S08', name: 'Substrate Noise Coupling', group: 'SIGNAL', value: '-42.6 dB', status: 'NOMINAL' },
    { id: 'S09', name: 'Signal Return Loss', group: 'SIGNAL', value: '-28.4 dB', status: 'NOMINAL' },
    { id: 'S10', name: 'Signal Overshoot Peak', group: 'SIGNAL', value: `${(42 + Math.cos(pvtVoltage * 4) * 10).toFixed(1)} mV`, status: 'NOMINAL' },

    // 3. Power & Thermal Reliability
    { id: 'P01', name: 'Static Leakage Current', group: 'POWER', value: `${leakageCurrent} mA`, status: 'NOMINAL' },
    { id: 'P02', name: 'Dynamic Switching Pwr', group: 'POWER', value: `${adjustedPowerUw} µW`, status: 'NOMINAL' },
    { id: 'P03', name: 'Subthreshold Swing', group: 'POWER', value: '64 mV/dec', status: 'NOMINAL' },
    { id: 'P04', name: 'Gate Tunneling Leakage', group: 'POWER', value: `${(12.5 * Math.exp(pvtVoltage / 0.3)).toFixed(1)} nA`, status: 'NOMINAL' },
    { id: 'P05', name: 'DIBL Effect Multiplier', group: 'POWER', value: '42 mV/V', status: 'NOMINAL' },
    { id: 'P06', name: 'Junction Temperature', group: 'POWER', value: `${junctionTemp} °C`, status: junctionTemp > 85 ? 'HIGH' : 'NOMINAL' },
    { id: 'P07', name: 'Dielectric Breakdown Hazard', group: 'POWER', value: pvtVoltage > 1.15 ? 'ELEVATED' : 'LOW', status: 'NOMINAL' },
    { id: 'P08', name: 'IR Drop Max Deviation', group: 'POWER', value: `${(1.2 + (adjustedPowerUw / 500)).toFixed(2)} %`, status: 'NOMINAL' },
    { id: 'P09', name: 'ESD Rating (HBM)', group: 'POWER', value: '2000 V', status: 'NOMINAL' },
    { id: 'P10', name: 'Peltier Thermal Flux', group: 'POWER', value: '14.2 W/cm²', status: 'NOMINAL' },

    // 4. Physical Design & DRC Mask Layer
    { id: 'D01', name: 'Active Fin Count', group: 'PHYSICAL', value: '3 Fins per Gate', status: 'NOMINAL' },
    { id: 'D02', name: 'Poly Pitch Deviation', group: 'PHYSICAL', value: '0.12 nm', status: 'NOMINAL' },
    { id: 'D03', name: 'M1 Enclosure Overlay', group: 'PHYSICAL', value: '0.45 nm', status: 'NOMINAL' },
    { id: 'D04', name: 'Edge-Placement Error', group: 'PHYSICAL', value: `${(0.38 + (euvNa === 0.33 ? 0.22 : 0)).toFixed(2)} nm`, status: 'NOMINAL' },
    { id: 'D05', name: 'Line-Edge Roughness', group: 'PHYSICAL', value: '0.84 nm', status: 'NOMINAL' },
    { id: 'D06', name: 'OPC Refinement Passes', group: 'PHYSICAL', value: '8 Passes', status: 'NOMINAL' },
    { id: 'D07', name: 'Min Contact-to-Gate Space', group: 'PHYSICAL', value: '11.4 nm', status: 'NOMINAL' },
    { id: 'D08', name: 'SAQP Pattern Offset', group: 'PHYSICAL', value: '0.24 nm', status: 'NOMINAL' },
    { id: 'D09', name: 'SRAF Features Inserted', group: 'PHYSICAL', value: '1,420 Elements', status: 'NOMINAL' },
    { id: 'D10', name: 'Reticle Defocus Mismatch', group: 'PHYSICAL', value: `${(1.1 + Math.sin(laserPulseMj / 10) * 0.4).toFixed(1)} nm`, status: 'NOMINAL' },

    // 5. ASML Photolithography Stepper Stats
    { id: 'A01', name: 'High-NA Projection Angle', group: 'LITHO', value: `${(euvNa * 1.05).toFixed(3)} rad`, status: 'NOMINAL' },
    { id: 'A02', name: 'EUV Laser Frequency', group: 'LITHO', value: '50 kHz', status: 'NOMINAL' },
    { id: 'A03', name: 'Tin-Droplet Size Variance', group: 'LITHO', value: '0.14 µm', status: 'NOMINAL' },
    { id: 'A04', name: 'Pellicle Operating Temp', group: 'LITHO', value: `${(180 + laserPulseMj * 1.5).toFixed(0)} °C`, status: 'NOMINAL' },
    { id: 'A05', name: 'Photoresist Absorption', group: 'LITHO', value: '14.2 /µm', status: 'NOMINAL' },
    { id: 'A06', name: 'Shot-Noise Variance', group: 'LITHO', value: `${(1.4 - (laserPulseMj / 100) * 0.5).toFixed(2)} %`, status: 'NOMINAL' },
    { id: 'A07', name: 'Reticle Distortion Factor', group: 'LITHO', value: '4.2 ppm', status: 'NOMINAL' },
    { id: 'A08', name: 'Stepper Overlay Alignment', group: 'LITHO', value: `${(1.1 - (euvNa === 0.55 ? 0.4 : 0)).toFixed(2)} nm`, status: 'NOMINAL' },
    { id: 'A09', name: 'Lens Heating Drift Comp', group: 'LITHO', value: '0.24 nm/hr', status: 'NOMINAL' },
    { id: 'A10', name: 'LPP EUV Source Power', group: 'LITHO', value: `${(250 + (laserPulseMj * 2.5)).toFixed(0)} W`, status: 'NOMINAL' },

    // 6. SAT Solver & Formal ECO Verification
    { id: 'R01', name: 'Clause-to-Variable Ratio', group: 'FORMAL', value: satResult ? `${(satResult.clauses.length / 8).toFixed(2)}` : '4.25', status: 'NOMINAL' },
    { id: 'R02', name: 'DPLL Conflict Depth', group: 'FORMAL', value: satResult ? `${satResult.decisionsCount ?? 3}` : '4', status: 'NOMINAL' },
    { id: 'R03', name: 'VSIDS Activity Decay', group: 'FORMAL', value: '0.95', status: 'NOMINAL' },
    { id: 'R04', name: 'Learned Clause Retention', group: 'FORMAL', value: '88.4 %', status: 'NOMINAL' },
    { id: 'R05', name: 'BCP Propagation Rate', group: 'FORMAL', value: '4,250 K/sec', status: 'NOMINAL' },
    { id: 'R06', name: 'Unsat Core Complexity', group: 'FORMAL', value: 'O(2^N) Poly', status: 'NOMINAL' },
    { id: 'R07', name: 'Deadlock Risk Score', group: 'FORMAL', value: satResult && satResult.isSatisfiable ? '0.0 % (SAFE)' : '100 % (HAZARD)', status: satResult && !satResult.isSatisfiable ? 'HAZARD' : 'NOMINAL' },
    { id: 'R08', name: 'Combinational Logic Loops', group: 'FORMAL', value: '0 Verified', status: 'NOMINAL' },
    { id: 'R09', name: 'Gates Replaced in ECO', group: 'FORMAL', value: ecoPatch ? `${ecoPatch.alteredGates.length}` : '0', status: 'NOMINAL' },
    { id: 'R10', name: 'ECO Re-routing Overhead', group: 'FORMAL', value: ecoPatch ? '2.4 %' : '0.0 %', status: 'NOMINAL' },

    // 7. Cleanroom Quality & Yield Economics
    { id: 'Y01', name: 'Defect Density D0', group: 'YIELD', value: `${defectDensityD0} defects/cm²`, status: 'NOMINAL' },
    { id: 'Y02', name: 'Gross Dies per Wafer', group: 'YIELD', value: `${yieldEval.grossDiesPerWafer}`, status: 'NOMINAL' },
    { id: 'Y03', name: 'Murphy Die Yield Y%', group: 'YIELD', value: `${yieldEval.yieldPercentage} %`, status: 'NOMINAL' },
    { id: 'Y04', name: 'Net Usable Dies / Wafer', group: 'YIELD', value: `${yieldEval.netUsableDies}`, status: 'NOMINAL' },
    { id: 'Y05', name: 'Silicon Cost Per Die', group: 'YIELD', value: `$${yieldEval.costPerDieUsd}`, status: 'NOMINAL' },
    { id: 'Y06', name: 'Cleanroom ISO Class', group: 'YIELD', value: 'ISO Class 1 (M1.5)', status: 'NOMINAL' },
    { id: 'Y07', name: 'Wafer Warp Displacement', group: 'YIELD', value: '14.5 µm', status: 'NOMINAL' },
    { id: 'Y08', name: 'Die Shear Strength Margin', group: 'YIELD', value: '450 MPa', status: 'NOMINAL' },
    { id: 'Y09', name: 'JTAG Probe Contact Imp', group: 'YIELD', value: '0.12 Ω', status: 'NOMINAL' },
    { id: 'Y10', name: 'Boundary-Scan Coverage', group: 'YIELD', value: '99.85 %', status: 'NOMINAL' },
  ];

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

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('FINFET_SIM');
              onToggle3dTab(false);
            }}
            className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
              activeTab === 'FINFET_SIM' ? 'bg-[#dc2626] text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3 h-3 text-amber-500" />
            FINFET SIM
          </button>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="flex-1 relative overflow-hidden bg-[#000000] p-3">
        {/* TAB 1: 3D Wafer & ASML EUV Lithography Simulator */}
        {activeTab === '3D_WAFER' && (
          <div className="w-full h-full relative">
            <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* Top Left Animated On-Die Sensor Telemetry Stream HUD */}
            <div className="absolute top-2 left-2 bg-[#050505]/95 border border-emerald-500/50 p-2.5 rounded backdrop-blur w-[230px] text-[10px] space-y-2 shadow-[0_0_15px_rgba(16,185,129,0.15)] z-10">
              <div className="font-orbitron font-bold text-emerald-400 flex items-center gap-1.5 border-b border-zinc-800 pb-1">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>ON-DIE SENSOR TELEMETRY</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 font-mono">
                <div className="bg-[#000000] p-1.5 rounded border border-zinc-800">
                  <div className="text-[8px] text-zinc-500">LEAKAGE CURRENT</div>
                  <div className="text-xs font-bold text-emerald-400 font-orbitron">{leakageCurrent} mA</div>
                </div>
                <div className="bg-[#000000] p-1.5 rounded border border-zinc-800">
                  <div className="text-[8px] text-zinc-500">JUNCTION TEMP</div>
                  <div className="text-xs font-bold text-[#dc2626] font-orbitron">{junctionTemp} °C</div>
                </div>
              </div>

              {/* Mini Sparkline Canvas representing real-time telemetry updates */}
              <div className="bg-[#000000] h-14 rounded border border-zinc-800 relative overflow-hidden flex items-end">
                <div className="absolute top-1 left-1.5 text-[8px] text-zinc-500 font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  REAL-TIME THERMODYNAMIC JITTER
                </div>
                {telemetryHistory.length > 1 ? (
                  <svg className="w-full h-10 stroke-emerald-500 fill-none" viewBox="0 0 100 40" preserveAspectRatio="none">
                    <path
                      d={`M ${telemetryHistory.map((h, i) => `${(i / (telemetryHistory.length - 1)) * 100},${40 - Math.min(38, Math.max(2, (h.leakage / (leakageCurrent || 1.0)) * 20))}`).join(' L ')}`}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <div className="w-full text-center text-[8px] text-zinc-600 font-mono mb-4">BUFFERING STREAM...</div>
                )}
              </div>

              <div className="font-mono text-[8px] text-zinc-500 space-y-0.5 border-t border-zinc-800 pt-1">
                <div className="flex justify-between">
                  <span>CHANNEL STRESS:</span>
                  <span className="text-zinc-300">{(1.65 + (junctionTemp / 300)).toFixed(2)} GPa (GAA)</span>
                </div>
                <div className="flex justify-between">
                  <span>INTERCONNECT RES:</span>
                  <span className="text-zinc-300">{(12.4 + pvtTemperature * 0.02).toFixed(1)} mΩ</span>
                </div>
                <div className="flex justify-between">
                  <span>GATE DELAY DRIFT:</span>
                  <span className="text-emerald-400">+{(pvtVoltage > 0 ? (1.0 / pvtVoltage * 10).toFixed(1) : '0')} ps</span>
                </div>
              </div>
            </div>

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

              <button
                onClick={() => {
                  soundFx.playClick();
                  setRenderingMode(prev => prev === 'STANDARD' ? 'THERMAL' : 'STANDARD');
                }}
                className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 font-bold border transition ${
                  renderingMode === 'THERMAL'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700/40 hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                {renderingMode === 'THERMAL' ? 'THERMAL HEATMAP: ON' : 'THERMAL HEATMAP: OFF'}
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
          <div className="w-full h-full flex flex-col gap-3 overflow-y-auto bg-[#050505] p-3 rounded border border-[#18181b] scrollbar-thin scrollbar-thumb-zinc-800">
            {/* Top Row: General Telemetry & Live Mask Layer grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 shrink-0">
              {/* Cell Telemetry Stats Deck */}
              <div className="space-y-2 bg-[#000000] p-3 rounded border border-zinc-800">
                <div className="text-xs font-orbitron font-bold text-[#dc2626] flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
                  <BarChart2 className="w-4 h-4 text-[#dc2626]" />
                  <span>HARDWARE SYNTHESIS TELEMETRY</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="bg-[#050505] p-2 rounded border border-zinc-900">
                    <div className="text-[10px] text-zinc-500">TOTAL GATE COUNT</div>
                    <div className="text-base font-bold text-white">{telemetry.gateCount} GATES</div>
                  </div>
                  <div className="bg-[#050505] p-2 rounded border border-zinc-900">
                    <div className="text-[10px] text-zinc-500">TRANSISTOR AREA</div>
                    <div className="text-base font-bold text-emerald-400">{adjustedAreaUm2} µm²</div>
                  </div>
                  <div className="bg-[#050505] p-2 rounded border border-zinc-900">
                    <div className="text-[10px] text-zinc-500">POWER FOOTPRINT</div>
                    <div className="text-base font-bold text-[#dc2626]">{adjustedPowerUw} µW</div>
                  </div>
                  <div className="bg-[#050505] p-2 rounded border border-zinc-900">
                    <div className="text-[10px] text-zinc-500">WORST-CASE DELAY</div>
                    <div className="text-base font-bold text-amber-400">{pvtEval.adjustedDelayNs} ns</div>
                  </div>
                </div>
                <div className="bg-[#050505] p-2 rounded border border-zinc-900 text-[11px] font-mono">
                  <div className="text-zinc-500 text-[10px]">CRITICAL TIMING PATH:</div>
                  <div className="text-zinc-200 truncate">{telemetry.criticalPath}</div>
                </div>
                <div className="pt-1 flex gap-1.5">
                  <button
                    onClick={() => {
                      soundFx.playSynthPass();
                      GdsService.downloadBinaryGds(
                        moduleTitle || 'active_circuit',
                        telemetry.gateCount,
                        adjustedAreaUm2
                      );
                    }}
                    className="w-full py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold text-[10px] rounded border border-[#dc2626] shadow transition flex items-center justify-center gap-1.5 font-orbitron"
                  >
                    <Grid className="w-3.5 h-3.5 animate-pulse" /> TAPE-OUT SYNTHESIZED GDSII BINARY
                  </button>
                </div>
              </div>

              {/* Silicon IC Mask Layer Matrix Viewer */}
              <div className="bg-[#000000] p-3 rounded border border-zinc-800 flex flex-col">
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
                <div className="flex-1 grid grid-cols-4 gap-1.5 bg-[#050505] p-2 rounded border border-zinc-900">
                  {Array.from({ length: 16 }).map((_, idx) => {
                    const r = Math.floor(idx / 4);
                    const c = idx % 4;
                    const hasPoly = layoutLayers.polysilicon[r]?.[c];
                    const hasDiff = layoutLayers.diffusion[r]?.[c];
                    const hasM1 = layoutLayers.metal1[r]?.[c];

                    return (
                      <div
                        key={idx}
                        className="aspect-square bg-[#000000] border border-zinc-800 rounded relative flex items-center justify-center p-1 group hover:border-[#dc2626] transition"
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

            {/* Bottom Section: Comprehensive Multi-Layer EDA Diagnostic Protocol (70+ Channels) */}
            <div className="bg-[#000000] p-3 rounded border border-zinc-800 space-y-3 flex-1 min-h-[350px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <div>
                    <span className="font-orbitron font-bold text-white text-[11px] block">COMPREHENSIVE MULTI-LAYER EDA DIAGNOSTIC PROTOCOL</span>
                    <span className="text-[9px] text-zinc-500 font-mono">70 REAL-TIME TELEMETRY CHANNELS TRACKING PHYSICAL LAYER AND SILICON STATUS</span>
                  </div>
                </div>
                {/* Search field */}
                <input
                  type="text"
                  placeholder="SEARCH CHANNELS..."
                  value={diagSearch}
                  onChange={(e) => setDiagSearch(e.target.value)}
                  className="bg-[#050505] border border-zinc-800 rounded text-[9px] px-2 py-1 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 w-[160px] font-mono uppercase"
                />
              </div>

              {/* Group Filters */}
              <div className="flex flex-wrap items-center gap-1 pb-1">
                {(['ALL', 'TIMING', 'SIGNAL', 'POWER', 'PHYSICAL', 'LITHO', 'FORMAL', 'YIELD'] as const).map(g => (
                  <button
                    key={g}
                    onClick={() => { soundFx.playClick(); setActiveDiagGroup(g); }}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold border transition ${
                      activeDiagGroup === g 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' 
                        : 'bg-zinc-950 text-zinc-500 border-zinc-900 hover:text-zinc-300'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>

              {/* Grid of 70+ Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 max-h-[400px] overflow-y-auto pr-1">
                {diagnosticFields
                  .filter(f => activeDiagGroup === 'ALL' || f.group === activeDiagGroup)
                  .filter(f => diagSearch === '' || f.name.toUpperCase().includes(diagSearch.toUpperCase()) || f.id.toUpperCase().includes(diagSearch.toUpperCase()))
                  .map((field) => (
                    <div
                      key={field.id}
                      className="p-1.5 bg-[#050505] border border-zinc-900 rounded font-mono text-[9px] hover:border-zinc-700 transition flex flex-col justify-between h-[52px]"
                    >
                      <div className="flex items-center justify-between text-zinc-500">
                        <span className="text-[8px] bg-zinc-950 px-1 py-0.5 rounded text-zinc-400 font-bold">{field.id}</span>
                        <span className="text-[7px] text-zinc-600">{field.group}</span>
                      </div>
                      <div className="text-zinc-300 truncate font-semibold mt-1" title={field.name}>
                        {field.name.toUpperCase()}
                      </div>
                      <div className="flex items-center justify-between mt-1 border-t border-zinc-900 pt-0.5">
                        <span className="text-white font-bold">{field.value}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${field.status === 'CRITICAL' || field.status === 'VIOLATION' || field.status === 'HIGH' || field.status === 'HAZARD' ? 'bg-[#dc2626] animate-ping' : 'bg-emerald-500'}`} />
                      </div>
                    </div>
                  ))}
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

            {/* Design Tuning Slider (Transistor Sizing) */}
            <div className="bg-[#000000] p-3 rounded border border-zinc-800 space-y-2 mt-2">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-1">
                <span className="text-[10px] font-orbitron font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-[#dc2626]" />
                  PHYSICAL DESIGN OPTIMIZATION: GATE DRIVE WIDTH TUNING
                </span>
                <span className="text-[9px] text-zinc-500 font-mono">PDK Sizing Rules</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
                <div className="md:col-span-3 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-zinc-400">TRANSISTOR W/L CHANNEL RATIO:</span>
                    <span className="text-emerald-400 font-bold">{transistorSizingFactor.toFixed(2)}x Drive Strength</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.05"
                    value={transistorSizingFactor}
                    onChange={(e) => {
                      soundFx.playClick();
                      setTransistorSizingFactor(parseFloat(e.target.value));
                    }}
                    disabled={isBurnInActive}
                    className="w-full accent-[#dc2626] bg-zinc-800 rounded disabled:opacity-50"
                  />
                  <p className="text-[8px] text-zinc-500 font-mono leading-tight">
                    By scaling transistor gate widths, you lower base propagation delay to `{adjustedBaseDelayNs} ns` (was `{telemetry.worstCaseDelayNs} ns`), protecting the design from thermal slow-down. However, active power scales to `{adjustedPowerUw} µW` and silicon area footprint grows to `{adjustedAreaUm2} µm²`.
                  </p>
                </div>
                <div className="bg-[#050505] p-2 rounded border border-zinc-900 text-center space-y-1 font-mono text-[10px]">
                  <div className="text-zinc-500 text-[8px] uppercase">TUNED SLACK BUFFER</div>
                  <div className={`text-base font-bold ${pvtEval.setupMarginPs >= 200 ? 'text-emerald-400' : pvtEval.setupMarginPs >= 0 ? 'text-amber-400' : 'text-[#dc2626]'}`}>
                    +{pvtEval.setupMarginPs} ps
                  </div>
                  <div className="text-[8px] text-zinc-600">CLK PERIOD: 1.0ns</div>
                </div>
              </div>
            </div>

            {/* Burn-In Stress Test Mode Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
              <div className="bg-[#000000] p-3 rounded border border-zinc-800 col-span-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] font-orbitron font-bold text-white flex items-center gap-1.5 border-b border-zinc-900 pb-1">
                    <ShieldAlert className="w-4 h-4 text-[#dc2626]" />
                    <span>BURN-IN STRESS TEST</span>
                  </div>
                  <p className="text-[9px] text-zinc-500 font-mono leading-tight">
                    Burn-In tests subject raw IC silicon to high voltage and severe thermal cycles to filter out infant mortality failures and weed out unstable circuits. 
                  </p>
                  <p className="text-[9px] text-zinc-400 font-mono leading-tight">
                    <span className="text-amber-400 font-bold">Survival Condition:</span> Setup Timing Margin must stay positive across 15 randomized fluctuations. Turn up Transistor Drive Strength to survive!
                  </p>
                </div>

                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-zinc-500">BURN-IN STATUS:</span>
                    <span className={`font-bold px-1.5 py-0.5 rounded ${
                      burnInStatus === 'STRESSING' ? 'bg-amber-950/80 text-amber-400 border border-amber-500 animate-pulse' :
                      burnInStatus === 'PASSED' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500' :
                      burnInStatus === 'FAILED' ? 'bg-rose-950/80 text-[#dc2626] border border-[#dc2626]' :
                      'bg-zinc-900 text-zinc-400 border border-zinc-800'
                    }`}>
                      {burnInStatus}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      soundFx.playClick();
                      setIsBurnInActive(true);
                    }}
                    disabled={isBurnInActive}
                    className={`w-full py-2 font-bold rounded border transition text-[10px] flex items-center justify-center gap-1.5 ${
                      isBurnInActive
                        ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                        : 'bg-gradient-to-r from-[#dc2626] to-[#b91c1c] hover:opacity-90 text-white border-[#dc2626]'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    {isBurnInActive ? `STRESSING WAFER (${burnInSeconds}/15s)` : 'EXECUTE BURN-IN PROTOCOL'}
                  </button>
                </div>
              </div>

              {/* Rolling logs of fluctuations */}
              <div className="bg-[#000000] p-3 rounded border border-zinc-800 col-span-2 space-y-1.5 flex flex-col justify-between font-mono">
                <div className="text-[10px] font-orbitron font-bold text-zinc-400 border-b border-zinc-900 pb-1 flex justify-between">
                  <span>ENVIRONMENTAL STRESS LOGS:</span>
                  <span className="text-zinc-500 font-mono font-normal">SAMPLING RATE: 600ms</span>
                </div>
                <div className="flex-1 min-h-[110px] bg-[#020202] border border-zinc-900 rounded p-1.5 text-[9px] overflow-y-auto space-y-1">
                  {burnInHistory.length === 0 ? (
                    <div className="text-zinc-600 text-center mt-10">OVEN TEMPERATURE VACUUM SECURE. WAITING FOR TRIGGER...</div>
                  ) : (
                    burnInHistory.map((h, i) => (
                      <div key={i} className="flex justify-between items-center text-zinc-400">
                        <span>[CYCLE_{h.time.toString().padStart(2, '0')}] VDD: {h.v.toFixed(2)}V // TEMP: {h.t}°C</span>
                        <span className={`font-bold ${h.pass ? 'text-emerald-400' : 'text-[#dc2626]'}`}>
                          {h.pass ? 'SLACK OK (PASS)' : 'SETUP SLACK UNDERRUN (CRITICAL FAIL)'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
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
              <div 
                onMouseMove={handleFloorplanMouseMove}
                onMouseUp={handleFloorplanMouseUp}
                onMouseLeave={handleFloorplanMouseUp}
                className="flex-1 aspect-square bg-[#050505] border-2 border-dashed border-zinc-800 rounded relative overflow-hidden p-2 select-none"
              >
                {/* Grid Overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#dc2626_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f1f23_1px,transparent_1px),linear-gradient(to_bottom,#1f1f23_1px,transparent_1px)] [background-size:40px_40px] opacity-40 pointer-events-none" />

                {placedMacros.map((placed) => {
                  // Scale 1000um -> 100% canvas
                  const leftPct = (placed.xUm / 1000) * 100;
                  const topPct = (placed.yUm / 1000) * 100;
                  const widthPct = (placed.widthUm / 1000) * 100;
                  const heightPct = (placed.heightUm / 1000) * 100;
                  const isDraggingThis = draggingMacroId === placed.id;

                  return (
                    <div
                      key={placed.id}
                      onMouseDown={(e) => handleMacroMouseDown(e, placed.id, placed.xUm, placed.yUm)}
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                        borderColor: placed.color,
                        backgroundColor: isDraggingThis ? `${placed.color}44` : `${placed.color}22`,
                        cursor: isDraggingThis ? 'grabbing' : 'grab',
                        zIndex: isDraggingThis ? 50 : 10,
                        boxShadow: isDraggingThis ? `0 0 12px ${placed.color}` : 'none'
                      }}
                      className="absolute border-2 rounded p-1 flex flex-col justify-between group transition-shadow active:scale-[0.99]"
                    >
                      <div className="flex justify-between items-start text-[8px] font-bold text-white truncate pointer-events-none">
                        <span className="truncate">{placed.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMacro(placed.id);
                          }}
                          className="bg-black/80 text-rose-400 px-1 hover:bg-rose-900 rounded pointer-events-auto"
                        >
                          X
                        </button>
                      </div>
                      <div className="text-[7px] text-zinc-300 font-mono flex justify-between items-center pointer-events-none">
                        <span>{placed.widthUm}x{placed.heightUm}µm</span>
                        <span className="text-zinc-400 font-bold bg-black/40 px-1 rounded">X:{placed.xUm} Y:{placed.yUm}</span>
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
                <div className="space-y-2 text-xs font-mono flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className={`p-2 rounded border ${
                      satResult.isSatisfiable
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                        : 'bg-rose-950/40 border-[#dc2626] text-[#dc2626]'
                    }`}>
                      <div className="font-bold flex justify-between">
                        <span>{satResult.status}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{satResult.executionTimeMs} ms</span>
                      </div>
                      <div className="text-[10px] text-zinc-300 mt-0.5">{satResult.message}</div>
                    </div>

                    {/* SAT Metrics */}
                    <div className="grid grid-cols-3 gap-1 bg-[#050505] p-2 rounded border border-zinc-900 text-center text-[10px]">
                      <div>
                        <div className="text-zinc-500 text-[8px] uppercase">DECISIONS</div>
                        <div className="font-bold text-white text-xs">{satResult.decisionsCount ?? 0}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500 text-[8px] uppercase">UNIT PROPS</div>
                        <div className="font-bold text-emerald-400 text-xs">{satResult.unitPropagationsCount ?? 0}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500 text-[8px] uppercase">BACKTRACKS</div>
                        <div className="font-bold text-[#dc2626] text-xs">{satResult.backtracksCount ?? 0}</div>
                      </div>
                    </div>

                    <div className="bg-[#050505] p-2 rounded border border-zinc-900 space-y-1">
                      <div className="text-[10px] text-zinc-500 font-bold flex justify-between">
                        <span>SOLVER CNF CLAUSES EVALUATED:</span>
                        <span className="text-[#dc2626] text-[8px] font-bold">CDCL CORE</span>
                      </div>
                      {satResult.clauses.map((c, idx) => (
                        <div key={idx} className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                          <span className="text-zinc-600 font-bold">{idx + 1}.</span>
                          <span className="truncate">{c}</span>
                        </div>
                      ))}
                    </div>

                    {satResult.learnedClauses && satResult.learnedClauses.length > 0 && (
                      <div className="bg-amber-950/20 border border-amber-900/50 p-2 rounded text-[10px] space-y-0.5">
                        <div className="text-amber-400 font-bold uppercase text-[9px]">Learned Conflicting Clauses:</div>
                        {satResult.learnedClauses.map((l, i) => (
                          <div key={i} className="text-amber-300 font-mono">{l}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* DPLL Trace Log Terminal */}
                  {satResult.dpllSteps && (
                    <div className="space-y-1 flex-1 flex flex-col min-h-[140px] max-h-[220px]">
                      <div className="text-[10px] text-zinc-500 font-bold uppercase">DPLL Execution Trace Logs:</div>
                      <div className="bg-[#020202] border border-zinc-900 rounded p-1.5 flex-1 overflow-y-auto font-mono text-[9px] text-zinc-400 space-y-1.5">
                        {satResult.dpllSteps.map((step, sIdx) => {
                          const isConflict = step.includes('[CONFLICT]');
                          const isSuccess = step.includes('[SUCCESS]');
                          const isDecision = step.includes('[DECISION]');
                          const isUnit = step.includes('[UNIT-PROP]');
                          return (
                            <div key={sIdx} className={`leading-snug ${
                              isConflict ? 'text-[#dc2626] font-bold' :
                              isSuccess ? 'text-emerald-400 font-bold' :
                              isDecision ? 'text-sky-400' :
                              isUnit ? 'text-amber-400' : 'text-zinc-400'
                            }`}>
                              {step}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
        {activeTab === 'GDSII_STREAM' && (() => {
          const actualGdsData = GdsService.generateBinaryGds(moduleTitle || 'TOP_CELL', telemetry.gateCount, adjustedAreaUm2);
          const hexDumpString = Array.from(actualGdsData)
            .map(b => b.toString(16).toUpperCase().padStart(2, '0'))
            .join(' ');

          return (
            <div className="w-full h-full flex flex-col gap-3 overflow-y-auto bg-[#050505] p-3 rounded border border-[#18181b]">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-[#dc2626]" />
                  <span className="font-orbitron font-bold text-white text-xs">GDSII STREAM STRUCTURE MATRIX & BINARY INSPECTOR</span>
                </div>
                <button
                  onClick={() => {
                    soundFx.playSynthPass();
                    GdsService.downloadBinaryGds(moduleTitle || 'TOP_CELL', telemetry.gateCount, adjustedAreaUm2);
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
                <div className="flex justify-between items-center text-zinc-500 font-bold mb-1">
                  <span>RAW GDSII STREAM UINT8ARRAY MEMORY DUMP:</span>
                  <span className="text-[#dc2626] font-bold">{actualGdsData.length} BYTES COMPILED</span>
                </div>
                <div className="bg-[#050505] p-2 rounded border border-zinc-900 text-emerald-400 leading-relaxed font-mono overflow-x-auto max-h-[160px] overflow-y-auto whitespace-pre-wrap select-text select-all break-all">
                  {hexDumpString}
                </div>
                <div className="text-[9px] text-zinc-500">
                  GDSII Record Sequence: HEADER (0x0002) → BGNLIB (0x0102) → LIBNAME (0x0206) → BGNSTR (0x0302) → STRNAME (0x0406) → ENDSTR (0x0700)
                </div>
              </div>
            </div>
          );
        })()}

        {activeTab === 'FINFET_SIM' && (
          <div className="w-full h-full flex flex-col gap-3 overflow-y-auto bg-[#050505] p-3 rounded border border-[#18181b] scrollbar-thin scrollbar-thumb-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-500" />
                <span className="font-orbitron font-bold text-white text-xs">3nm FinFET & GAA NANOSHEET QUANTUM TRANSISTOR SIMULATOR</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-amber-950/80 text-amber-400 border-amber-500">
                GAA-FET PDK 3.0
              </span>
            </div>

            {/* Layout grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Simulator Sliders */}
              <div className="bg-[#000000] p-3 rounded border border-zinc-800 space-y-3">
                <div className="text-[10px] text-zinc-400 font-bold uppercase border-b border-zinc-900 pb-1 flex justify-between">
                  <span>SILICON GEOMETRY & VOLTAGE CONTROLS:</span>
                  <span className="text-amber-500 font-bold">3nm PDK PROTOCOL</span>
                </div>

                {/* Gate Voltage Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400">GATE VOLTAGE V_G (V):</span>
                    <span className="text-emerald-400 font-bold">{gateVoltageVg.toFixed(2)} V</span>
                  </div>
                  <input
                    type="range"
                    min="0.00"
                    max="1.20"
                    step="0.05"
                    value={gateVoltageVg}
                    onChange={(e) => { soundFx.playClick(); setGateVoltageVg(parseFloat(e.target.value)); }}
                    className="w-full accent-amber-500 bg-zinc-800 rounded"
                  />
                </div>

                {/* Channel Length Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400">CHANNEL LENGTH L_g (nm):</span>
                    <span className="text-white font-bold">{channelLength} nm</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="14"
                    step="1"
                    value={channelLength}
                    onChange={(e) => { soundFx.playClick(); setChannelLength(parseInt(e.target.value)); }}
                    className="w-full accent-amber-500 bg-zinc-800 rounded"
                  />
                </div>

                {/* Fin Height Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400">FIN HEIGHT H_fin (nm):</span>
                    <span className="text-white font-bold">{finHeight} nm</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="45"
                    step="1"
                    value={finHeight}
                    onChange={(e) => { soundFx.playClick(); setFinHeight(parseInt(e.target.value)); }}
                    className="w-full accent-amber-500 bg-zinc-800 rounded"
                  />
                </div>

                {/* Fin Width Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400">FIN WIDTH W_fin (nm):</span>
                    <span className="text-white font-bold">{finWidth} nm</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="1"
                    value={finWidth}
                    onChange={(e) => { soundFx.playClick(); setFinWidth(parseInt(e.target.value)); }}
                    className="w-full accent-amber-500 bg-zinc-800 rounded"
                  />
                </div>

                {/* Gate Oxide Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-400">GATE OXIDE THICKNESS T_ox (nm):</span>
                    <span className="text-amber-500 font-bold">{gateOxideTox.toFixed(2)} nm</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={gateOxideTox}
                    onChange={(e) => { soundFx.playClick(); setGateOxideTox(parseFloat(e.target.value)); }}
                    className="w-full accent-amber-500 bg-zinc-800 rounded"
                  />
                </div>
              </div>

              {/* Advanced Physics Analytics */}
              {(() => {
                const thresholdVg = 0.30;
                const beta = 140 * (finHeight / 30) * (5 / finWidth);
                const ids = gateVoltageVg <= thresholdVg ? 0 : beta * Math.pow(gateVoltageVg - thresholdVg, 2) * (3 / channelLength);
                const tunnelRate = Math.exp(-3 * gateOxideTox * Math.sqrt(8.5 * Math.abs(1.1 - gateVoltageVg)));
                const gateLeakageNa = Math.round(tunnelRate * 450 * (10 / channelLength));

                const renderChannelCurrent = () => {
                  if (gateVoltageVg <= thresholdVg) {
                    return '           [OFF: CHANNEL DEPLETED]            ';
                  }
                  const len = 42;
                  const dotCount = Math.min(10, Math.floor(ids / 4));
                  const chars = Array.from({ length: len }).map((_, i) => {
                    const tickPos = (i - finfetTicks) % Math.max(2, 12 - dotCount);
                    return Math.abs(tickPos) === 0 ? '•' : ' ';
                  }).join('');
                  return `[IN] ${chars} [OUT]`;
                };

                return (
                  <div className="space-y-3 flex flex-col justify-between">
                    <div className="bg-[#000000] p-3 rounded border border-zinc-800 font-mono text-[10px] text-zinc-400 leading-tight space-y-2">
                      <div className="text-zinc-600 border-b border-zinc-900 pb-1 flex justify-between uppercase">
                        <span>3D Multi-Gate Nanosheet Quantum Field:</span>
                        <span className={ids > 0 ? 'text-emerald-400 font-bold' : 'text-zinc-500 font-bold'}>
                          {ids > 0 ? 'CONDUCTION STATE' : 'SUBTHRESHOLD OFF'}
                        </span>
                      </div>
                      <pre className="text-amber-500 font-mono leading-none text-[9.5px]">
{`         +------------------------------------------------------+
  Gate   |             [HIGH-K METAL GATE CONTACT]              |
         |         === HfO2 Oxide Layer (T_ox: ${gateOxideTox.toFixed(1)}nm) ===         |
         +------------------------------------------------------+
  Source | [SOURCE] |            [CHANNEL REGION]            |  [DRAIN] |
  & Drain| (Input)  | ${renderChannelCurrent()} | (Output) |
         +------------------------------------------------------+
  Body   |      Silicon Fin (Height: ${finHeight}nm, Width: ${finWidth}nm, Length: ${channelLength}nm)     |
         |      GAA (Gate-All-Around) Electrostatic Boundary    |
         +------------------------------------------------------+`}
                      </pre>
                    </div>

                    {/* Performance metrics breakdown */}
                    <div className="bg-[#000000] p-3 rounded border border-zinc-800 grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 bg-[#050505] border border-zinc-900 rounded">
                        <div className="text-zinc-500 font-bold uppercase">THRESHOLD VOLTAGE (V_th):</div>
                        <div className="text-base font-bold text-amber-400 mt-1">0.30 V</div>
                        <div className="text-[8px] text-zinc-600">Static GAA Design Limit</div>
                      </div>

                      <div className="p-2 bg-[#050505] border border-zinc-900 rounded">
                        <div className="text-zinc-500 font-bold uppercase">DRAIN-SOURCE CURRENT (I_ds):</div>
                        <div className="text-base font-bold text-emerald-400 mt-1">{ids.toFixed(1)} µA</div>
                        <div className="text-[8px] text-zinc-600">Formula: Beta * (V_g - V_th)² * (3/L)</div>
                      </div>

                      <div className="p-2 bg-[#050505] border border-zinc-900 rounded">
                        <div className="text-zinc-500 font-bold uppercase">GATE LEAKAGE (I_g, tunneling):</div>
                        <div className="text-base font-bold text-[#dc2626] mt-1">{gateLeakageNa} nA</div>
                        <div className="text-[8px] text-zinc-600">Quantum Fowler-Nordheim Leak</div>
                      </div>

                      <div className="p-2 bg-[#050505] border border-zinc-900 rounded">
                        <div className="text-zinc-500 font-bold uppercase">ELECTROSTATIC CONTROL:</div>
                        <div className="text-base font-bold text-white mt-1">
                          {channelLength <= 4 ? 'WEAK (Short Channel Effect)' : 'EXCELLENT (GAA Shielded)'}
                        </div>
                        <div className="text-[8px] text-zinc-600">Subthreshold Swing: 68 mV/dec</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
