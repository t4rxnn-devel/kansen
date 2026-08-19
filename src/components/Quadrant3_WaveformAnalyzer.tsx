import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { WaveSignal, ProcessCorner } from '../types';
import { Activity, ZoomIn, ZoomOut, RotateCcw, MousePointer, Box, Layers, AlertTriangle, Cpu, Gauge, ShieldAlert, Sparkles, Download } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import { PvtEngine } from '../utils/kansenEngine';

interface Quadrant3_WaveformAnalyzerProps {
  signals: WaveSignal[];
  isSimulating: boolean;
  pvtCorner?: ProcessCorner;
  pvtVoltage?: number;
  pvtTemperature?: number;
  selectedSignal?: string | null;
  onSelectSignal?: (sigName: string | null) => void;
}

const calculateEdaMetrics = (
  preset: string,
  corner: string,
  v: number,
  temp: number,
  signalCount: number,
  isSim: boolean
) => {
  const procScale = corner === 'FF' ? 0.72 : corner === 'SS' ? 1.45 : corner === 'FS' ? 1.15 : corner === 'SF' ? 1.20 : 1.0;
  const vFactor = v > 0 ? (1.0 / Math.pow(v, 1.4)) : 2.0;
  const kelvin = temp + 273.15;
  const tempFactor = Math.pow(kelvin / 298.15, 1.5);
  
  const baseGates = signalCount * 8420;
  const netsCount = Math.round(baseGates * 2.84);
  
  const capPerMicron = 0.085; 
  const totalWireLengthUm = netsCount * 4.5;
  const parasiticCapacitanceFf = totalWireLengthUm * capPerMicron * (1.05 + Math.sin(v) * 0.05); 
  const dynamicCapacitancePf = parasiticCapacitanceFf / 1000;
  
  const activityFactor = isSim ? 0.32 : 0.02;
  const freqGhz = 1.25;
  const dynamicPowerMw = activityFactor * dynamicCapacitancePf * Math.pow(v, 2) * freqGhz * 1000;
  
  const leakageMultiplier = Math.exp((temp - 25) / 38);
  const leakagePowerMw = baseGates * 0.00018 * v * leakageMultiplier;
  const shortCircuitPowerMw = dynamicPowerMw * 0.085;
  const totalPowerMw = dynamicPowerMw + leakagePowerMw + shortCircuitPowerMw;
  
  const baseGateDelayPs = 12.4 * procScale * vFactor * tempFactor;
  const routingResistanceOhm = netsCount * 12.8;
  const wireRcDelayPs = 0.002 * routingResistanceOhm * parasiticCapacitanceFf * 0.001;
  const worstCaseLogicDepth = 18;
  const criticalPathDelayPs = worstCaseLogicDepth * baseGateDelayPs + wireRcDelayPs;
  
  const clockPeriodPs = 833; 
  const setupSlackPs = clockPeriodPs - criticalPathDelayPs;
  const holdSlackPs = 42 * (1.0 / vFactor);
  
  const riseTimePs = 8.5 * procScale * vFactor * tempFactor;
  const fallTimePs = 7.2 * procScale * vFactor * tempFactor;
  
  const maxCurrentDensityMaUm2 = 12.5;
  const activeCurrentDensityMaUm2 = (v / 1.0) * (kelvin / 298.15) * 6.4;
  const electromigrationRiskRatio = activeCurrentDensityMaUm2 / maxCurrentDensityMaUm2;
  
  const heatDensityWmm2 = totalPowerMw / 0.125; 
  
  const drcViolationCount = temp > 95 || v > 1.25 || setupSlackPs < 0 ? Math.floor(Math.abs(setupSlackPs) / 100) : 0;
  const lvsMismatchCount = 0;
  const crosstalkNoiseRatio = 0.042 * (1.1 - v) * (1.0 + (temp / 150));
  const fanoutMaxLoadCheck = baseGates / signalCount;
  
  return {
    SimClockFrequency: `${(1.2 + (1.2 - v) * 0.15).toFixed(2)} GHz`,
    ActiveGateCount: baseGates.toLocaleString(),
    TotalNetCount: netsCount.toLocaleString(),
    ParasiticCapacitance: `${parasiticCapacitanceFf.toFixed(2)} fF`,
    RoutingResistance: `${(routingResistanceOhm / 1000).toFixed(2)} kΩ`,
    DynamicPower: `${dynamicPowerMw.toFixed(3)} mW`,
    LeakagePower: `${leakagePowerMw.toFixed(3)} mW`,
    ShortCircuitPower: `${shortCircuitPowerMw.toFixed(3)} mW`,
    TotalPowerDissipation: `${totalPowerMw.toFixed(3)} mW`,
    WorstCaseSkewPs: `${(14.5 * procScale + temp * 0.08).toFixed(1)} ps`,
    SetupSlackPs: `${setupSlackPs.toFixed(1)} ps`,
    HoldSlackPs: `${holdSlackPs.toFixed(1)} ps`,
    LogicDepth: `${worstCaseLogicDepth} gates`,
    SignalSlewRise: `${riseTimePs.toFixed(1)} ps`,
    SignalSlewFall: `${fallTimePs.toFixed(1)} ps`,
    OperatingVoltageDrop: `${(0.04 * (dynamicPowerMw / 50) * v).toFixed(3)} V`,
    ElectromigrationRisk: `${(electromigrationRiskRatio * 100).toFixed(1)}%`,
    ThermalDissipationRate: `${heatDensityWmm2.toFixed(2)} W/mm²`,
    DrcViolationCount: String(drcViolationCount),
    LvsMismatchCount: String(lvsMismatchCount),
    CrosstalkNoiseRatio: `${(crosstalkNoiseRatio * 100).toFixed(2)}%`,
    FanoutMaximumLoad: `${(fanoutMaxLoadCheck / 120).toFixed(1)}x`,
    ProcessDerating: `${(procScale * 100).toFixed(0)}%`
  };
};

const generateCadAssets = () => {
  const categories = [
    { prefix: 'gaa_nanosheet_channel', ext: 'step', desc: '3nm GAA Nanosheet Sub-Segment Channel' },
    { prefix: 'fin_silicon_structure', ext: 'step', desc: 'Silicon Fin Ridge Core Lattice' },
    { prefix: 'gate_dielectric_oxide', ext: 'stl', desc: 'High-K HfO2 Dielectric Oxide Barrier' },
    { prefix: 'metal_m1_interconnect', ext: 'gds', desc: 'Metal Layer 1 Interconnect Routing Segment' },
    { prefix: 'via_contact_array_pad', ext: 'step', desc: 'Tungsten Contact Interconnect Array Pad' },
    { prefix: 'sti_isolation_trench', ext: 'stl', desc: 'Shallow Trench Isolation Dielectric Field' },
    { prefix: 'spacer_dielectric_wall', ext: 'step', desc: 'Low-K Inner Gate Side Wall Spacer' },
  ];
  
  const list = [];
  for (let i = 1; i <= 70; i++) {
    const cat = categories[(i - 1) % categories.length];
    const indexStr = i < 10 ? `0${i}` : `${i}`;
    const size = `${(115 + (i * 9) % 245)} KB`;
    const temp = `${(25.0 + (i * 0.22) % 4.3).toFixed(1)}°C`;
    list.push({
      id: `CAD_M_0x${i.toString(16).toUpperCase().padStart(2, '0')}`,
      filename: `${cat.prefix}_v1_${indexStr}.${cat.ext}`,
      description: `${cat.desc} (Unit ${indexStr})`,
      size,
      temp,
      type: cat.ext.toUpperCase(),
      status: 'VERIFIED'
    });
  }
  return list;
};
const cadMechanicalAssets = generateCadAssets();

export const Quadrant3_WaveformAnalyzer: React.FC<Quadrant3_WaveformAnalyzerProps> = ({
  signals,
  isSimulating,
  pvtCorner = 'TT',
  pvtVoltage = 1.0,
  pvtTemperature = 25,
  selectedSignal,
  onSelectSignal
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeMountRef = useRef<HTMLDivElement | null>(null);
  
  const [viewMode, setViewMode] = useState<'2D_WAVE' | '3D_LOGIC'>('2D_WAVE');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [displayPreset, setDisplayPreset] = useState<'STANDARD' | 'TIMING' | 'DEBUG'>('STANDARD');
  const [showDiagnostics, setShowDiagnostics] = useState(true);

  const handleDownloadCsv = () => {
    soundFx.playClick();
    if (!signals || signals.length === 0) return;
    
    // Header
    const headers = ['Time (ns)', ...signals.map(s => s.name)];
    const csvRows = [headers.join(',')];
    
    // Find maximum length of data arrays
    const maxLen = Math.max(...signals.map(s => s.data.length));
    
    for (let i = 0; i < maxLen; i++) {
      const row = [i * 10]; // Time step starts at 0, 10, 20...
      signals.forEach(sig => {
        const val = sig.data[i] !== undefined ? sig.data[i] : '';
        row.push(typeof val === 'string' && val.includes(',') ? `"${val}"` : val);
      });
      csvRows.push(row.join(','));
    }
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `eda_waveform_transitions_${timestamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render 3D Logic Waveform Scene in Three.js
  useEffect(() => {
    if (viewMode !== '3D_LOGIC' || !threeMountRef.current) return;

    const container = threeMountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xdc2626, 2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(30, 30, 0xdc2626, 0x27272a);
    scene.add(gridHelper);

    // Group for Waveform 3D Extrusions
    const waveGroup = new THREE.Group();

    // Calculate PVT Delay Factor to stretch signals under PVT Stress
    const pvtFactor = PvtEngine.calculatePvtDelayFactor(pvtCorner as ProcessCorner, pvtVoltage, pvtTemperature);

    const activePulses: Array<{
      mesh: THREE.Mesh;
      curve: THREE.CatmullRomCurve3;
      speed: number;
      offset: number;
    }> = [];

    signals.forEach((sig, sIdx) => {
      const zPos = (sIdx - signals.length / 2) * 4;
      const points: THREE.Vector3[] = [];

      // 1. ADD CAD SUBSTRATE BLOCK FOR EACH TRACK
      const subGeo = new THREE.BoxGeometry(18, 0.2, 2.2);
      const subMat = new THREE.MeshStandardMaterial({
        color: 0x09090b,
        roughness: 0.8,
        metalness: 0.2
      });
      const subMesh = new THREE.Mesh(subGeo, subMat);
      subMesh.position.set(0, -0.6, zPos);
      waveGroup.add(subMesh);

      // 2. ADD THREE 3nm FINFET CHANNEL FINS
      for (let f = -1; f <= 1; f++) {
        const finGeo = new THREE.BoxGeometry(16, 0.4, 0.15);
        const finMat = new THREE.MeshStandardMaterial({
          color: 0x3f3f46,
          metalness: 0.9,
          roughness: 0.3
        });
        const finMesh = new THREE.Mesh(finGeo, finMat);
        finMesh.position.set(0, -0.3, zPos + f * 0.5);
        waveGroup.add(finMesh);

        // Add oxide isolation spacer block (STI Isolation) between fins
        if (f < 1) {
          const stiGeo = new THREE.BoxGeometry(16, 0.2, 0.3);
          const stiMat = new THREE.MeshStandardMaterial({
            color: 0x1c1917,
            roughness: 0.9
          });
          const stiMesh = new THREE.Mesh(stiGeo, stiMat);
          stiMesh.position.set(0, -0.4, zPos + f * 0.5 + 0.25);
          waveGroup.add(stiMesh);
        }
      }

      // 3. ADD LOGIC CELL PACKAGES (3D CMOS TRANSISTOR GATES)
      for (let xOffset = -5; xOffset <= 5; xOffset += 5) {
        // High-k Metal Gate (HKMG) contact stack
        const hkmgGeo = new THREE.BoxGeometry(0.8, 1.4, 1.8);
        const hkmgMat = new THREE.MeshStandardMaterial({
          color: sig.color === '#ff003c' || sig.color === '#dc2626' ? 0xb91c1c : 0x047857,
          metalness: 0.7,
          roughness: 0.2,
          emissive: sig.color === '#ff003c' || sig.color === '#dc2626' ? 0x991b1b : 0x065f46,
          emissiveIntensity: 0.5
        });
        const hkmgMesh = new THREE.Mesh(hkmgGeo, hkmgMat);
        hkmgMesh.position.set(xOffset, 0.3, zPos);
        waveGroup.add(hkmgMesh);

        // Low-K dielectric spacer side collars
        const collarGeo = new THREE.BoxGeometry(1.1, 1.2, 0.2);
        const collarMat = new THREE.MeshStandardMaterial({
          color: 0x27272a,
          roughness: 0.8
        });
        const collarMeshL = new THREE.Mesh(collarGeo, collarMat);
        collarMeshL.position.set(xOffset, 0.3, zPos - 0.95);
        const collarMeshR = new THREE.Mesh(collarGeo, collarMat);
        collarMeshR.position.set(xOffset, 0.3, zPos + 0.95);
        waveGroup.add(collarMeshL);
        waveGroup.add(collarMeshR);

        // Vertical Contact Via (Pillar of tungsten connecting to metal layers)
        const viaGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8);
        const viaMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 1.0,
          roughness: 0.1
        });
        const viaMesh = new THREE.Mesh(viaGeo, viaMat);
        viaMesh.position.set(xOffset, 1.0, zPos);
        waveGroup.add(viaMesh);
      }

      sig.data.forEach((val, stepIdx) => {
        // Delay shifts signal horizontally (setup delay drift)
        const delayOffset = (pvtFactor - 1.0) * 0.4;
        const xPos = (stepIdx - sig.data.length / 2) * 2 + delayOffset;
        const isHigh = val === 1 || val === '1';
        const yPos = isHigh ? 2.0 : 0.8;

        points.push(new THREE.Vector3(xPos, yPos, zPos));
      });

      if (points.length > 1) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.15, 8, false);
        const color = sig.color === '#ff003c' || sig.color === '#dc2626' ? 0xdc2626 : 0x10b981;
        const tubeMat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.7,
          roughness: 0.1,
          metalness: 0.5
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        waveGroup.add(tubeMesh);

        // Add 3 flowing signal pulses down this transmission line
        for (let p = 0; p < 3; p++) {
          const sphereGeo = new THREE.SphereGeometry(0.32, 12, 12);
          const sphereMat = new THREE.MeshBasicMaterial({
            color: color === 0xdc2626 ? 0xff4d4d : 0x34d399,
          });
          const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
          waveGroup.add(sphereMesh);
          activePulses.push({
            mesh: sphereMesh,
            curve,
            speed: 0.003 + Math.random() * 0.002,
            offset: p / 3
          });
        }
      }
    });

    scene.add(waveGroup);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Slow elegant 3D scene rotations
      waveGroup.rotation.y = Math.sin(time * 0.15) * 0.5;
      waveGroup.rotation.x = Math.cos(time * 0.1) * 0.15;

      // Make the pulses glide down the logic tracks
      activePulses.forEach(p => {
        p.offset += p.speed;
        if (p.offset > 1.0) p.offset = 0;
        
        try {
          const point = p.curve.getPointAt(p.offset);
          p.mesh.position.copy(point);
          
          // Ripple pulse scale like high frequency signal package
          const pulseScale = 1.0 + Math.sin(time * 15 + p.offset * 40) * 0.2;
          p.mesh.scale.set(pulseScale, pulseScale, pulseScale);
        } catch (e) {
          // fallback
        }
      });

      // Wave oscillations under simulation
      if (isSimulating) {
        waveGroup.children.forEach((child) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.TubeGeometry) {
            // Ripple the logic level curves slightly representing high-freq noise jitter
            child.position.y = Math.sin(time * 25 + child.id) * 0.05;
          }
        });
      }

      // Thermal Jitter: mesh vibration at higher temperature corners
      if (pvtTemperature > 50) {
        const jitterIntensity = (pvtTemperature - 50) / 75 * 0.06;
        waveGroup.position.x = Math.sin(Date.now() * 0.06) * jitterIntensity;
        waveGroup.position.y = Math.cos(Date.now() * 0.08) * jitterIntensity;
      } else {
        waveGroup.position.set(0, 0, 0);
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
  }, [viewMode, signals, pvtCorner, pvtVoltage, pvtTemperature]);

  // Render 2D logic waveform on canvas with animated real-time oscillation paths
  const animationFrameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (viewMode !== '2D_WAVE') {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localTime = 0;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width * window.devicePixelRatio || canvas.height !== rect.height * window.devicePixelRatio) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
      }
      ctx.resetTransform();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const width = rect.width;
      const height = rect.height;

      // Calculate PVT Delay Factor
      const pvtFactor = PvtEngine.calculatePvtDelayFactor(pvtCorner as ProcessCorner, pvtVoltage, pvtTemperature);
      const isTimingViolation = pvtFactor > 1.25;
      const delayOffset = (pvtFactor - 1.0) * 15 * zoomScale; // Shift in pixels

      // Clear canvas with deep space status background
      ctx.fillStyle = isTimingViolation ? '#0f0202' : '#020202';
      ctx.fillRect(0, 0, width, height);

      // Draw interactive grid lines
      const cycleWidth = 40 * zoomScale;
      const startX = 90 + panOffset;

      ctx.strokeStyle = displayPreset === 'TIMING' ? 'rgba(234, 179, 8, 0.25)' : (displayPreset === 'DEBUG' ? '#27272a' : (isTimingViolation ? '#3a1111' : '#141416'));
      ctx.lineWidth = displayPreset === 'TIMING' ? 1.0 : 0.5;

      for (let x = startX; x < width; x += cycleWidth) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        const cycleIdx = Math.floor((x - startX) / cycleWidth);
        if (cycleIdx >= 0) {
          ctx.fillStyle = displayPreset === 'TIMING' ? '#eab308' : (isTimingViolation ? '#aa3333' : '#3f3f46');
          ctx.font = displayPreset === 'TIMING' ? 'bold 8px monospace' : '8px monospace';
          ctx.fillText(`${cycleIdx * 10}ns${displayPreset === 'TIMING' ? ' [CLK]' : ''}`, x + 2, 10);
        }
      }

      if (isTimingViolation) {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.04)';
        ctx.fillRect(90, 0, width, height);
        
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('⚠️ WARNING: TIMING VIOLATION (HOLD/SETUP DELAY UNDERFLOW)', width - 330, 14);
      }

      const rowHeight = (height - 20) / Math.max(signals.length, 1);
      localTime += isSimulating ? 0.15 : 0.02;

      signals.forEach((sig, idx) => {
        const yBase = 20 + idx * rowHeight + rowHeight * 0.7;
        const yHigh = yBase - rowHeight * 0.55;

        const isSelectedTrack = selectedSignal && selectedSignal.toUpperCase() === sig.name.toUpperCase();
        if (isSelectedTrack) {
          // Draw high-visibility glowing track backing
          ctx.fillStyle = 'rgba(234, 179, 8, 0.08)';
          ctx.fillRect(0, yHigh - 12, width, rowHeight + 16);
          
          ctx.strokeStyle = 'rgba(234, 179, 8, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, yHigh - 12);
          ctx.lineTo(width, yHigh - 12);
          ctx.moveTo(0, yHigh + rowHeight + 4);
          ctx.lineTo(width, yHigh + rowHeight + 4);
          ctx.stroke();

          // Also let's draw an active target crosshair pin on the right
          ctx.fillStyle = '#eab308';
          ctx.font = 'bold 8px monospace';
          ctx.fillText('▶ SELECTED TRACK', width - 110, yBase - rowHeight * 0.15);
        }

        const sigColor = isSelectedTrack ? '#f59e0b' : (sig.color === '#ff003c' || sig.color === '#dc2626' ? '#ef4444' : sig.color === '#4ade80' ? '#10b981' : '#38bdf8');

        // Draw Signal Label
        ctx.fillStyle = sigColor;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(sig.name, 10, yBase - rowHeight * 0.15);

        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, yBase + 4);
        ctx.lineTo(width, yBase + 4);
        ctx.stroke();

        // Draw setup drift shading region if delay exists
        if (delayOffset > 1) {
          ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
          sig.data.forEach((val, stepIdx) => {
            const x1 = startX + stepIdx * cycleWidth;
            const isHigh = val === 1 || val === '1';
            if (stepIdx > 0) {
              const prevHigh = sig.data[stepIdx - 1] === 1 || sig.data[stepIdx - 1] === '1';
              if (prevHigh !== isHigh && sig.type !== 'bus') {
                ctx.fillRect(x1, yHigh, delayOffset, yBase - yHigh);
              }
            }
          });
        }

        // Draw Wave Path (shifted by delayOffset to represent physical delay)
        ctx.strokeStyle = sigColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = sigColor;
        ctx.shadowBlur = isSimulating ? 8 : 2;

        ctx.beginPath();

        sig.data.forEach((val, stepIdx) => {
          const x1 = startX + stepIdx * cycleWidth + delayOffset;
          const x2 = x1 + cycleWidth;

          if (sig.type === 'bus') {
            ctx.moveTo(x1, yBase);
            ctx.lineTo(x1 + 4, yHigh);
            ctx.lineTo(x2 - 4, yHigh);
            ctx.lineTo(x2, yBase);
            ctx.lineTo(x2 - 4, yBase + (yBase - yHigh));
            ctx.lineTo(x1 + 4, yBase + (yBase - yHigh));
            ctx.closePath();

            ctx.fillStyle = '#ffffff';
            ctx.font = '8px monospace';
            ctx.fillText(String(val), x1 + 10, yBase - 2);
          } else {
            const isHigh = val === 1 || val === '1';
            let yVal = isHigh ? yHigh : yBase;

            // Make the path oscillate in real-time if active simulation is running
            if (isSimulating) {
              if (isHigh) {
                // Harmonic sine wave oscillation on active high logic
                yVal += Math.sin(localTime * 6 + stepIdx * 3) * 3;
              } else {
                // High frequency digital feedback noise jitter on base ground level
                yVal += Math.cos(localTime * 12 + stepIdx * 4) * 1;
              }
            }

            // Cross-talk electrical glitch spikes superimposition for DEBUG mode
            if (displayPreset === 'DEBUG') {
              const glitchFactor = Math.sin(localTime * 4.5 + stepIdx * 2.1);
              if (glitchFactor > 0.8) {
                // Slew rate transient spike
                yVal += (stepIdx % 2 === 0 ? -11 : 9) * Math.sin(localTime * 18);
              }
            }

            // Thermally induced noise jitter based on temperature parameter
            if (pvtTemperature > 45) {
              const thermalJitterAmp = (pvtTemperature - 45) / 80 * 1.5;
              yVal += (Math.random() - 0.5) * thermalJitterAmp;
            }

            if (stepIdx === 0) {
              ctx.moveTo(x1, yVal);
            } else {
              const prevHigh = sig.data[stepIdx - 1] === 1 || sig.data[stepIdx - 1] === '1';
              if (prevHigh !== isHigh) {
                // Interpolate state changes with elegant sigmoid curve
                ctx.bezierCurveTo(x1 - (cycleWidth / 4), isHigh ? yBase : yHigh, x1 - (cycleWidth / 8), yVal, x1, yVal);
              }
            }
            ctx.lineTo(x2, yVal);
          }
        });

        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Draw Vertical Timing Cursor with floating HUD card
      if (mousePos && mousePos.x >= 90) {
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(mousePos.x, 0);
        ctx.lineTo(mousePos.x, height);
        ctx.stroke();
        ctx.setLineDash([]);

        const timeNs = Math.max(0, Math.round(((mousePos.x - startX) / cycleWidth) * 10));

        // Display floating status card
        ctx.fillStyle = 'rgba(5, 5, 5, 0.96)';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1;
        ctx.fillRect(mousePos.x + 12, 15, 125, 45);
        ctx.strokeRect(mousePos.x + 12, 15, 125, 45);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 8.5px monospace';
        ctx.fillText(`TIME: ${timeNs} ns`, mousePos.x + 18, 28);
        ctx.fillStyle = '#a1a1aa';
        ctx.fillText(`CORNER: ${pvtCorner}`, mousePos.x + 18, 39);
        ctx.fillText(`SLACK: +${Math.max(0, 1000 - Math.round(pvtFactor * 350))} ps`, mousePos.x + 18, 50);
      }

      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [signals, zoomScale, panOffset, mousePos, isSimulating, viewMode, pvtCorner, pvtVoltage, pvtTemperature, displayPreset, selectedSignal, onSelectSignal]);

  // Mouse drag pan handler
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStartX(e.clientX - panOffset);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    if (isDragging) {
      setPanOffset(e.clientX - dragStartX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] border border-[#18181b] rounded overflow-hidden select-none relative">
      {/* Header Bar */}
      <div className="bg-[#050505] border-b border-[#18181b] px-3 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#dc2626]" />
          <span className="font-orbitron font-bold text-white tracking-wide">
            QUADRANT III: <span className="text-[#dc2626]">LOGIC ANALYZER WAVEFORMS</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-tech mr-1">[CLK: 1.2 GHz]</span>
          
          <div className="flex items-center gap-1.5 bg-[#000000] px-1.5 py-0.5 rounded border border-zinc-800 text-[9px]">
            <span className="text-zinc-500 font-bold uppercase text-[8px]">PRESET:</span>
            <select
              value={displayPreset}
              onChange={(e) => {
                soundFx.playClick();
                setDisplayPreset(e.target.value as any);
              }}
              className="bg-transparent text-white font-bold border-none outline-none text-[9px] cursor-pointer"
            >
              <option value="STANDARD" className="bg-[#050505] text-white">STANDARD LOGIC</option>
              <option value="TIMING" className="bg-[#050505] text-amber-400">FULL TIMING</option>
              <option value="DEBUG" className="bg-[#050505] text-[#dc2626]">DEBUG MODE</option>
            </select>
          </div>
        </div>

        {/* View Mode & Pan & Zoom Tools */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownloadCsv}
            className="px-2 py-0.5 rounded font-bold transition flex items-center gap-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 text-[10px]"
            title="Download simulated trace transitions as a timestamped CSV file"
          >
            <Download className="w-3 h-3 text-[#dc2626]" /> DOWNLOAD CSV
          </button>

          <div className="flex items-center gap-1 bg-[#000000] p-0.5 rounded border border-[#18181b] text-[10px]">
            <button
              onClick={() => { soundFx.playClick(); setViewMode('2D_WAVE'); }}
              className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
                viewMode === '2D_WAVE' ? 'bg-[#dc2626] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3 h-3" /> 2D TRACE
            </button>
            <button
              onClick={() => { soundFx.playClick(); setViewMode('3D_LOGIC'); }}
              className={`px-2 py-0.5 rounded font-bold transition flex items-center gap-1 ${
                viewMode === '3D_LOGIC' ? 'bg-[#dc2626] text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Box className="w-3 h-3" /> 3D LOGIC
            </button>
          </div>

          {viewMode === '2D_WAVE' && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => {
                  soundFx.playClick();
                  setZoomScale(prev => Math.min(prev + 0.25, 3));
                }} 
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                title="Zoom Waveform In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => {
                  soundFx.playClick();
                  setZoomScale(prev => Math.max(prev - 0.25, 0.5));
                }} 
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                title="Zoom Waveform Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => {
                  soundFx.playClick();
                  setZoomScale(1);
                  setPanOffset(0);
                }} 
                className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                title="Reset Pan & Zoom"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Waveform Viewport Area */}
      <div className="flex-1 bg-[#000000] relative overflow-hidden">
        {viewMode === '2D_WAVE' ? (
          <div className="w-full h-full cursor-crosshair relative">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onClick={(e) => {
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;
                const clickY = e.clientY - rect.top;
                const rowHeight = (rect.height - 20) / Math.max(signals.length, 1);
                const clickedIdx = Math.floor((clickY - 10) / rowHeight);
                if (clickedIdx >= 0 && clickedIdx < signals.length) {
                  soundFx.playClick();
                  const sig = signals[clickedIdx];
                  if (onSelectSignal) {
                    onSelectSignal(sig.name);
                  }
                }
              }}
              onMouseLeave={() => {
                setIsDragging(false);
                setMousePos(null);
              }}
              className="w-full h-full block"
            />

            {/* Hover Vector Readout Overlay */}
            {mousePos && mousePos.x >= 90 && (
              <div className="absolute top-2 right-2 bg-[#050505] border border-[#dc2626] p-2 rounded text-[10px] font-mono text-zinc-200 backdrop-blur pointer-events-none shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                <div className="font-bold border-b border-zinc-800 pb-0.5 mb-1 text-white flex items-center gap-1">
                  <MousePointer className="w-3 h-3 text-[#dc2626]" /> TIMING TRACE INSPECTOR
                </div>
                {signals.map(s => (
                  <div key={s.name} className="flex justify-between gap-4">
                    <span className="text-zinc-400">{s.name}:</span>
                    <span className="font-bold text-white">HIGH [1]</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col md:flex-row relative">
            {/* Left Column: Interactive ThreeJS 3D Stage */}
            <div className="flex-1 h-full relative min-h-[220px]">
              <div ref={threeMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
              <div className="absolute bottom-2 left-2 bg-[#050505]/95 border border-zinc-800 p-2 rounded backdrop-blur text-[9px] text-zinc-400 font-mono pointer-events-none">
                <span className="text-[#dc2626] font-bold">● INTERACTIVE CAD VIEW</span> // DRAG TO ROTATE // SCROLL TO ZOOM
              </div>
            </div>

            {/* Right Column: 70 CAD Mechanical Asset Inspector */}
            <div className="w-full md:w-[320px] h-full border-t md:border-t-0 md:border-l border-zinc-900 bg-[#020202] flex flex-col font-mono text-[10px] select-none shrink-0 overflow-hidden">
              <div className="bg-[#080808] border-b border-zinc-900 px-3 py-2 shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
                  <span className="text-zinc-300 font-bold tracking-wide uppercase text-[9px]">3D CAD MECHANICAL SPECS (70 FILES)</span>
                </div>
                <span className="text-zinc-600 text-[8px] font-mono">3nm FinFET Cell</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {cadMechanicalAssets.map((asset) => (
                  <div 
                    key={asset.id} 
                    className="p-1.5 rounded border border-zinc-900 bg-[#050505] hover:bg-[#0c0c0e] hover:border-zinc-800 transition group flex flex-col gap-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-amber-500 font-bold text-[9px] truncate max-w-[180px]">{asset.filename}</span>
                      <span className="text-[8px] bg-zinc-900 px-1 text-zinc-400 border border-zinc-800 rounded">{asset.type}</span>
                    </div>
                    <div className="text-[9px] text-zinc-400 font-tech">{asset.description}</div>
                    <div className="flex items-center justify-between text-[8px] text-zinc-600 font-mono mt-0.5 pt-0.5 border-t border-zinc-950">
                      <span>ID: {asset.id}</span>
                      <span>SIZE: {asset.size}</span>
                      <span className="text-[#dc2626]/80">TEMP: {asset.temp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CADENCE-GRADE EDA SIMULATION SUITE TERMINAL */}
      <div className="bg-[#050505] border-t border-[#18181b] flex flex-col font-mono text-[10px] shrink-0">
        {/* Toggle Title Bar */}
        <div
          onClick={() => {
            soundFx.playClick();
            setShowDiagnostics(!showDiagnostics);
          }}
          className="bg-[#000000] px-3 py-1.5 flex items-center justify-between border-b border-zinc-900 cursor-pointer hover:bg-zinc-950 transition select-none"
        >
          <span className="font-orbitron font-bold text-white flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#dc2626]" />
            EDA SIMULATION SUITE DIAGNOSTICS & TELEMETRY TERMINAL (23 ACTIVE FIELDS)
          </span>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-800 text-[8px] px-1.5 py-0.2 rounded font-bold">
              CADENCE-VIRTUOSO ACCELERATED
            </span>
            <span className="text-zinc-500 font-bold">{showDiagnostics ? '▼ COLLAPSE' : '▲ EXPAND'}</span>
          </div>
        </div>

        {showDiagnostics && (
          <div className="p-3 bg-[#020202] max-h-[160px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 border-b border-zinc-900">
            {Object.entries(calculateEdaMetrics(displayPreset, pvtCorner, pvtVoltage, pvtTemperature, signals.length, isSimulating)).map(([key, val]) => {
              const formattedKey = key
                .replace(/([A-Z])/g, ' $1')
                .trim()
                .toUpperCase();
              
              const isAlert = val.includes('V') && parseFloat(val) > 1.1 || val.includes('%') && parseFloat(val) > 70;
              return (
                <div key={key} className="bg-[#050505] border border-zinc-900 p-1.5 rounded flex flex-col justify-between hover:border-zinc-800 transition">
                  <span className="text-[8px] text-zinc-500 font-bold truncate tracking-tight">{formattedKey}</span>
                  <span className={`text-[10px] font-bold ${isAlert ? 'text-[#dc2626]' : 'text-zinc-200'}`}>
                    {val}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

