import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { WaveSignal, ProcessCorner } from '../types';
import { Activity, ZoomIn, ZoomOut, RotateCcw, MousePointer, Box, Layers, AlertTriangle } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import { PvtEngine } from '../utils/kansenEngine';

interface Quadrant3_WaveformAnalyzerProps {
  signals: WaveSignal[];
  isSimulating: boolean;
  pvtCorner?: ProcessCorner;
  pvtVoltage?: number;
  pvtTemperature?: number;
}

export const Quadrant3_WaveformAnalyzer: React.FC<Quadrant3_WaveformAnalyzerProps> = ({
  signals,
  isSimulating,
  pvtCorner = 'TT',
  pvtVoltage = 1.0,
  pvtTemperature = 25
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const threeMountRef = useRef<HTMLDivElement | null>(null);
  
  const [viewMode, setViewMode] = useState<'2D_WAVE' | '3D_LOGIC'>('2D_WAVE');
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStartX, setDragStartX] = useState<number>(0);

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

    signals.forEach((sig, sIdx) => {
      const zPos = (sIdx - signals.length / 2) * 3;
      const points: THREE.Vector3[] = [];

      sig.data.forEach((val, stepIdx) => {
        // Delay shifts signal horizontally (setup delay drift)
        const delayOffset = (pvtFactor - 1.0) * 0.4;
        const xPos = (stepIdx - sig.data.length / 2) * 2 + delayOffset;
        const isHigh = val === 1 || val === '1';
        const yPos = isHigh ? 2 : 0;

        points.push(new THREE.Vector3(xPos, yPos, zPos));
      });

      if (points.length > 1) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.2, 8, false);
        const color = sig.color === '#ff003c' || sig.color === '#dc2626' ? 0xdc2626 : 0xffffff;
        const tubeMat = new THREE.MeshStandardMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.6,
          roughness: 0.2
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        waveGroup.add(tubeMesh);
      }
    });

    scene.add(waveGroup);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      waveGroup.rotation.y += 0.005;

      // Thermal Jitter: mesh vibration at higher temperature corners
      if (pvtTemperature > 50) {
        const jitterIntensity = (pvtTemperature - 50) / 75 * 0.04;
        waveGroup.position.x = Math.sin(Date.now() * 0.05) * jitterIntensity;
        waveGroup.position.y = Math.cos(Date.now() * 0.07) * jitterIntensity;
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

  // Render 2D logic waveform on canvas
  useEffect(() => {
    if (viewMode !== '2D_WAVE') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI scaling
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const width = rect.width;
    const height = rect.height;

    // Calculate PVT Delay Factor
    const pvtFactor = PvtEngine.calculatePvtDelayFactor(pvtCorner as ProcessCorner, pvtVoltage, pvtTemperature);
    const isTimingViolation = pvtFactor > 1.25;
    const delayOffset = (pvtFactor - 1.0) * 15 * zoomScale; // Shift in pixels

    // Clear canvas & fill warning background if timing violated
    ctx.fillStyle = isTimingViolation ? '#080000' : '#000000';
    ctx.fillRect(0, 0, width, height);

    if (isTimingViolation) {
      // Draw background setup-slack error indicators
      ctx.fillStyle = 'rgba(220, 38, 38, 0.05)';
      ctx.fillRect(90, 0, width, height);
      
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('⚠️ PVT TIMING VIOLATION: SLACK OVERRUN', width - 210, 12);
    }

    // Draw timing grid lines
    const cycleWidth = 40 * zoomScale;
    const startX = 90 + panOffset;

    ctx.strokeStyle = isTimingViolation ? '#220808' : '#18181b';
    ctx.lineWidth = 0.5;

    // Draw vertical clock cycle grid lines
    for (let x = startX; x < width; x += cycleWidth) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Cycle numbers
      const cycleIdx = Math.floor((x - startX) / cycleWidth);
      if (cycleIdx >= 0) {
        ctx.fillStyle = isTimingViolation ? '#883333' : '#52525b';
        ctx.font = '9px monospace';
        ctx.fillText(`${cycleIdx * 10}ns`, x + 2, 12);
      }
    }

    // Render each signal waveform row
    const rowHeight = (height - 20) / Math.max(signals.length, 1);

    signals.forEach((sig, idx) => {
      const yBase = 20 + idx * rowHeight + rowHeight * 0.7;
      const yHigh = yBase - rowHeight * 0.5;

      const sigColor = sig.color === '#ff003c' || sig.color === '#dc2626' ? '#dc2626' : sig.color === '#4ade80' ? '#ffffff' : '#a1a1aa';

      // Draw Signal Label
      ctx.fillStyle = sigColor;
      ctx.font = 'bold 11px monospace';
      ctx.fillText(sig.name, 10, yBase - rowHeight * 0.2);

      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, yBase + 4);
      ctx.lineTo(width, yBase + 4);
      ctx.stroke();

      // Draw setup drift shading region if delay exists
      if (delayOffset > 1) {
        ctx.fillStyle = 'rgba(220, 38, 38, 0.12)';
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
      ctx.shadowBlur = isSimulating ? 6 : 2;

      ctx.beginPath();

      sig.data.forEach((val, stepIdx) => {
        // Horizontally delayed start/end positions
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
          ctx.font = '9px monospace';
          ctx.fillText(String(val), x1 + 10, yBase - 4);
        } else {
          const isHigh = val === 1 || val === '1';
          const yVal = isHigh ? yHigh : yBase;

          if (stepIdx === 0) {
            ctx.moveTo(x1, yVal);
          } else {
            const prevHigh = sig.data[stepIdx - 1] === 1 || sig.data[stepIdx - 1] === '1';
            if (prevHigh !== isHigh) {
              ctx.lineTo(x1, yVal);
            }
          }
          ctx.lineTo(x2, yVal);
        }
      });

      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    // Draw Vertical Timing Cursor on Mouse Hover / Drag
    if (mousePos && mousePos.x >= 90) {
      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      ctx.beginPath();
      ctx.moveTo(mousePos.x, 0);
      ctx.lineTo(mousePos.x, height);
      ctx.stroke();
      ctx.setLineDash([]);

      const timeNs = Math.max(0, Math.round(((mousePos.x - startX) / cycleWidth) * 10));

      ctx.fillStyle = '#dc2626';
      ctx.fillRect(mousePos.x - 25, height - 18, 50, 16);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`${timeNs}ns`, mousePos.x - 18, height - 6);
    }

  }, [signals, zoomScale, panOffset, mousePos, isSimulating, viewMode, pvtCorner, pvtVoltage, pvtTemperature]);

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
          <span className="text-[10px] text-zinc-500 font-tech">[CLK: 1.2 GHz]</span>
        </div>

        {/* View Mode & Pan & Zoom Tools */}
        <div className="flex items-center gap-1.5">
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
          <div className="w-full h-full relative">
            <div ref={threeMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
            <div className="absolute bottom-2 left-2 bg-[#050505]/90 border border-[#18181b] p-1.5 rounded backdrop-blur text-[10px] text-zinc-400 font-mono">
              3D EXTRUDED SIGNAL RIBBONS // ROTATE TO INSPECT SIGNAL SKEW
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

