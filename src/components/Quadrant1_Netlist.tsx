import React, { useState, useRef } from 'react';
import { SchematicNode } from '../types';
import { Network, ZoomIn, ZoomOut, Maximize2, Cpu } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface Quadrant1_NetlistProps {
  title: string;
  subtitle: string;
  nodes: SchematicNode[];
  isSimulating: boolean;
  onToggleNodeState?: (nodeId: string) => void;
  selectedSignal?: string | null;
  onSelectSignal?: (sigName: string | null) => void;
}

export const Quadrant1_Netlist: React.FC<Quadrant1_NetlistProps> = ({
  title,
  subtitle,
  nodes: initialNodes,
  isSimulating,
  onToggleNodeState,
  selectedSignal,
  onSelectSignal
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [highlightedNet, setHighlightedNet] = useState<string | null>(null);

  // Synchronize incoming selectedSignal with schematic highlight
  React.useEffect(() => {
    if (selectedSignal) {
      const matchNode = initialNodes.find(n => 
        n.label.toUpperCase() === selectedSignal.toUpperCase() || 
        n.id.toUpperCase() === selectedSignal.toUpperCase()
      );
      if (matchNode) {
        setHighlightedNet(matchNode.id);
        setActiveNodeId(matchNode.id);
      }
    } else {
      setHighlightedNet(null);
      setActiveNodeId(null);
    }
  }, [selectedSignal, initialNodes]);

  // Tooltip overlay state on gate mouseenter
  const [hoveredNode, setHoveredNode] = useState<SchematicNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Local state for draggable nodes
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    initialNodes.forEach(n => {
      pos[n.id] = { x: n.x, y: n.y };
    });
    return pos;
  });

  // Track dragging
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialX: number; initialY: number } | null>(null);

  // Keep nodePositions in sync if initialNodes change
  React.useEffect(() => {
    setNodePositions(prev => {
      const updated = { ...prev };
      initialNodes.forEach(n => {
        if (!updated[n.id]) {
          updated[n.id] = { x: n.x, y: n.y };
        }
      });
      return updated;
    });
  }, [initialNodes]);

  const handleGateMouseEnter = (node: SchematicNode, e: React.MouseEvent) => {
    setHoveredNode(node);
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + window.scrollX + 20,
      y: rect.top + window.scrollY - 80
    });
  };

  const handleGateMouseLeave = () => {
    setHoveredNode(null);
  };

  const handleMouseDown = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playClick();
    setActiveNodeId(nodeId);
    setHighlightedNet(nodeId);
    setDraggingNodeId(nodeId);

    const pos = nodePositions[nodeId] || { x: 0, y: 0 };
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: pos.x,
      initialY: pos.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoveredNode) {
      setTooltipPos({
        x: e.clientX + 15,
        y: e.clientY - 70
      });
    }

    if (!draggingNodeId || !dragStartRef.current) return;
    const dx = (e.clientX - dragStartRef.current.mouseX) / zoomLevel;
    const dy = (e.clientY - dragStartRef.current.mouseY) / zoomLevel;

    setNodePositions(prev => ({
      ...prev,
      [draggingNodeId]: {
        x: Math.max(10, Math.min(460, dragStartRef.current!.initialX + dx)),
        y: Math.max(10, Math.min(260, dragStartRef.current!.initialY + dy))
      }
    }));
  };

  const handleMouseUp = () => {
    setDraggingNodeId(null);
    dragStartRef.current = null;
  };

  const isNetHighlighted = (sourceId: string, targetId: string) => {
    if (!highlightedNet) return false;
    return highlightedNet === sourceId || highlightedNet === targetId;
  };

  const getGateSpecs = (node: SchematicNode) => {
    let gateName = node.label || 'LOGIC_CELL_3NM';
    let txCount = 4;
    let propDelayPs = 4.8;
    let fanoutCapPf = 0.018;
    let pinouts = 'IN_A, IN_B -> OUT_Y';

    switch (node.type) {
      case 'in':
        gateName = `INPUT_PAD [${node.label}]`;
        txCount = 2;
        propDelayPs = 1.2;
        fanoutCapPf = 0.005;
        pinouts = 'PAD_PIN -> NET_OUT';
        break;
      case 'out':
        gateName = `OUTPUT_PAD [${node.label}]`;
        txCount = 2;
        propDelayPs = 1.4;
        fanoutCapPf = 0.025;
        pinouts = 'NET_IN -> PAD_PIN';
        break;
      case 'gate_not':
        gateName = 'INV_X1_3NM (Nanosheet Inverter)';
        txCount = 2;
        propDelayPs = 3.6;
        fanoutCapPf = 0.012;
        pinouts = 'A -> Y';
        break;
      case 'gate_mux':
        gateName = 'MUX21_X1_3NM (2:1 Multiplexer)';
        txCount = 6;
        propDelayPs = 8.4;
        fanoutCapPf = 0.024;
        pinouts = 'D0, D1, SEL -> Y';
        break;
      case 'dff':
        gateName = 'DFF_X1_3NM (Flip-Flop Register)';
        txCount = 12;
        propDelayPs = 14.2;
        fanoutCapPf = 0.032;
        pinouts = 'D, CLK -> Q, QN';
        break;
      default:
        gateName = `${node.label}_X1_3NM`;
        txCount = 4;
        propDelayPs = 5.2;
        fanoutCapPf = 0.018;
        pinouts = 'A, B -> Y';
    }

    return { gateName, txCount, propDelayPs, fanoutCapPf, pinouts };
  };

  const renderGateShape = (node: SchematicNode) => {
    const pos = nodePositions[node.id] || { x: node.x, y: node.y };
    const isSelected = activeNodeId === node.id;
    const isHighlighted = highlightedNet === node.id;
    const isActive = node.active;

    const strokeColor = isHighlighted ? '#f59e0b' : isSelected ? '#dc2626' : '#27272a';
    const fillColor = isActive ? '#18181b' : '#050505';

    switch (node.type) {
      case 'in':
        return (
          <g
            className="cursor-pointer group"
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            onMouseEnter={(e) => handleGateMouseEnter(node, e)}
            onMouseLeave={handleGateMouseLeave}
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleNodeState) onToggleNodeState(node.id);
              if (onSelectSignal) onSelectSignal(node.label.toUpperCase());
            }}
          >
            <rect
              x={pos.x}
              y={pos.y - 14}
              width="60"
              height="28"
              rx="4"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isHighlighted || isSelected ? '2' : '1'}
              className="transition-all hover:stroke-[#dc2626]"
            />
            <text x={pos.x + 30} y={pos.y + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
              {node.label}
            </text>
            <circle cx={pos.x + 60} cy={pos.y} r="4" fill={isHighlighted ? '#f59e0b' : isActive ? '#dc2626' : '#52525b'} />
          </g>
        );

      case 'out':
        return (
          <g 
            className="cursor-pointer" 
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            onMouseEnter={(e) => handleGateMouseEnter(node, e)}
            onMouseLeave={handleGateMouseLeave}
            onClick={(e) => {
              e.stopPropagation();
              soundFx.playClick();
              if (onSelectSignal) onSelectSignal(node.label.toUpperCase());
            }}
          >
            <polygon
              points={`${pos.x},${pos.y - 14} ${pos.x + 50},${pos.y - 14} ${pos.x + 65},${pos.y} ${pos.x + 50},${pos.y + 14} ${pos.x},${pos.y + 14}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isHighlighted || isSelected ? '2' : '1'}
              className="transition-all hover:stroke-[#dc2626]"
            />
            <text x={pos.x + 28} y={pos.y + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
              {node.label}
            </text>
            <circle cx={pos.x} cy={pos.y} r="4" fill={isHighlighted ? '#f59e0b' : '#dc2626'} />
          </g>
        );

      case 'gate_not':
        return (
          <g 
            className="cursor-pointer" 
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            onMouseEnter={(e) => handleGateMouseEnter(node, e)}
            onMouseLeave={handleGateMouseLeave}
          >
            <polygon
              points={`${pos.x},${pos.y - 16} ${pos.x + 35},${pos.y} ${pos.x},${pos.y + 16}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isHighlighted || isSelected ? '2' : '1.5'}
            />
            <circle cx={pos.x + 40} cy={pos.y} r="4" fill="#000000" stroke={strokeColor} strokeWidth="1.5" />
            <text x={pos.x + 12} y={pos.y + 3} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">NOT</text>
          </g>
        );

      case 'gate_mux':
        return (
          <g 
            className="cursor-pointer" 
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            onMouseEnter={(e) => handleGateMouseEnter(node, e)}
            onMouseLeave={handleGateMouseLeave}
          >
            <polygon
              points={`${pos.x},${pos.y - 25} ${pos.x + 45},${pos.y - 15} ${pos.x + 45},${pos.y + 15} ${pos.x},${pos.y + 25}`}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isHighlighted || isSelected ? '2' : '1.5'}
            />
            <text x={pos.x + 22} y={pos.y + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">MUX</text>
          </g>
        );

      case 'dff':
        return (
          <g 
            className="cursor-pointer" 
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            onMouseEnter={(e) => handleGateMouseEnter(node, e)}
            onMouseLeave={handleGateMouseLeave}
          >
            <rect
              x={pos.x}
              y={pos.y - 24}
              width="50"
              height="48"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isHighlighted || isSelected ? '2' : '1.5'}
              rx="2"
            />
            <text x={pos.x + 25} y={pos.y - 8} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">DFF</text>
            <polyline points={`${pos.x},${pos.y + 12} ${pos.x + 8},${pos.y + 18} ${pos.x},${pos.y + 24}`} fill="none" stroke="#dc2626" strokeWidth="1.5" />
          </g>
        );

      default:
        return (
          <g 
            className="cursor-pointer" 
            onMouseDown={(e) => handleMouseDown(node.id, e)}
            onMouseEnter={(e) => handleGateMouseEnter(node, e)}
            onMouseLeave={handleGateMouseLeave}
          >
            <rect
              x={pos.x}
              y={pos.y - 20}
              width="60"
              height="40"
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isHighlighted || isSelected ? '2' : '1.5'}
              rx="3"
            />
            <text x={pos.x + 30} y={pos.y + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">{node.label}</text>
          </g>
        );
    }
  };

  const renderConnections = () => {
    const lines: React.ReactNode[] = [];

    initialNodes.forEach((targetNode) => {
      if (targetNode.inputs) {
        targetNode.inputs.forEach((inputId, idx) => {
          const sourceNode = initialNodes.find((n) => n.id === inputId);
          if (sourceNode) {
            const sourcePos = nodePositions[sourceNode.id] || { x: sourceNode.x, y: sourceNode.y };
            const targetPos = nodePositions[targetNode.id] || { x: targetNode.x, y: targetNode.y };

            const startX = sourcePos.x + (sourceNode.type === 'in' ? 60 : 45);
            const startY = sourcePos.y;
            const endX = targetPos.x;
            const endY = targetPos.y + (idx === 0 ? -6 : idx === 1 ? 6 : 0);

            const midX = (startX + endX) / 2;

            const isPathHighlighted = isNetHighlighted(sourceNode.id, targetNode.id);
            const pathColor = isPathHighlighted ? '#f59e0b' : isSimulating ? '#dc2626' : '#27272a';
            const pathWidth = isPathHighlighted ? '3' : isSimulating ? '2' : '1.5';

            lines.push(
              <g 
                key={`${sourceNode.id}-${targetNode.id}-${idx}`}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  soundFx.playClick();
                  setHighlightedNet(sourceNode.id);
                  setActiveNodeId(sourceNode.id);
                  if (onSelectSignal) {
                    onSelectSignal(sourceNode.label.toUpperCase());
                  }
                }}
              >
                <path
                  d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                  fill="none"
                  stroke={pathColor}
                  strokeWidth={pathWidth}
                  strokeDasharray={isSimulating ? '4,4' : 'none'}
                  className={isSimulating ? 'animate-pulse' : ''}
                />
                {(isSimulating || isPathHighlighted) && (
                  <circle r={isPathHighlighted ? '4' : '3'} fill={isPathHighlighted ? '#f59e0b' : '#dc2626'}>
                    <animateMotion
                      path={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                      dur={`${1 + idx * 0.4}s`}
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
              </g>
            );
          }
        });
      }
    });

    return lines;
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] border border-[#18181b] rounded relative overflow-hidden select-none">
      {/* Header Bar */}
      <div className="bg-[#050505] border-b border-[#18181b] px-3 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-[#dc2626]" />
          <span className="font-orbitron font-bold text-white tracking-wide">
            QUADRANT I: <span className="text-[#dc2626]">SCHEMATIC NETLIST</span>
          </span>
          <span className="text-[10px] text-zinc-500 font-tech">[{initialNodes.length} LOGIC CELLS]</span>
        </div>

        {/* Viewport Actions */}
        <div className="flex items-center gap-1">
          {highlightedNet && (
            <button
              onClick={() => {
                setHighlightedNet(null);
                setActiveNodeId(null);
              }}
              className="px-2 py-0.5 bg-amber-950/40 text-amber-400 border border-amber-800/60 rounded text-[10px] font-mono hover:bg-amber-900/60 transition"
            >
              CLEAR NET HIGHLIGHT
            </button>
          )}
          <button 
            onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2))} 
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.6))} 
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button 
            onClick={() => setZoomLevel(1)} 
            className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
            title="Reset View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Vector Schematic Grid Canvas */}
      <div 
        className="flex-1 bg-[#000000] relative overflow-hidden flex items-center justify-center p-4 cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={() => {
          setActiveNodeId(null);
          setHighlightedNet(null);
        }}
      >
        {/* Background Status Overlay */}
        <div className="absolute top-2 left-2 text-[10px] font-mono text-zinc-500 flex items-center gap-2 pointer-events-none">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-[#dc2626] animate-ping' : 'bg-zinc-600'}`} />
            {isSimulating ? 'SIGNAL PROPAGATION ACTIVE' : 'INTERACTIVE NETLIST PROBER'}
          </span>
          <span className="text-zinc-600">| HOVER GATES FOR PDK METADATA</span>
        </div>

        <svg
          className="w-full h-full transition-transform duration-100"
          style={{ transform: `scale(${zoomLevel})` }}
          viewBox="0 0 500 280"
        >
          <defs>
            <pattern id="netlist-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#121215" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#netlist-grid)" />

          {/* Wire Connections */}
          {renderConnections()}

          {/* Logic Nodes */}
          {initialNodes.map(node => (
            <React.Fragment key={node.id}>
              {renderGateShape(node)}
            </React.Fragment>
          ))}
        </svg>

        {/* Hover Custom Metadata Tooltip Overlay */}
        {hoveredNode && (
          <div
            style={{
              position: 'fixed',
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              pointerEvents: 'none'
            }}
            className="z-50 bg-[#050505]/95 border-2 border-[#dc2626] p-2.5 rounded shadow-[0_0_20px_rgba(220,38,38,0.4)] backdrop-blur text-xs font-mono text-zinc-200 min-w-[200px]"
          >
            {(() => {
              const specs = getGateSpecs(hoveredNode);
              return (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-1 text-[#dc2626] font-bold">
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{specs.gateName}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">TRANSISTOR COUNT:</span>
                    <span className="text-white font-bold">{specs.txCount} FinFET Transistors</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">PROPAGATION DELAY:</span>
                    <span className="text-emerald-400 font-bold">{specs.propDelayPs} ps</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">FANOUT CAPACITANCE:</span>
                    <span className="text-amber-400 font-bold">{specs.fanoutCapPf} pF</span>
                  </div>
                  <div className="text-[9px] text-zinc-400 border-t border-zinc-800/80 pt-1">
                    PINOUT: <span className="text-zinc-200">{specs.pinouts}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Active Node Telemetry Probe Box */}
        {activeNodeId && (
          <div className="absolute bottom-2 left-2 bg-[#050505]/95 border border-[#dc2626] p-2.5 rounded text-[10px] font-mono text-zinc-200 backdrop-blur shadow-[0_0_15px_rgba(220,38,38,0.2)]">
            <div className="font-bold border-b border-zinc-800 pb-1 mb-1 text-[#dc2626] flex items-center justify-between gap-4">
              <span>NET PROBE: {activeNodeId.toUpperCase()}</span>
              {highlightedNet === activeNodeId && (
                <span className="text-amber-400 font-normal">[NET HIGHLIGHTED]</span>
              )}
            </div>
            <div>VOLTAGE LOGIC: <span className="text-emerald-400">0.85V (LOGIC HIGH '1')</span></div>
            <div>NET CAPACITANCE: <span className="text-amber-400">1.82 fF</span></div>
            <div>PATH DELAY: <span className="text-white">4.12 ps</span></div>
            <div className="text-[9px] text-zinc-500 mt-0.5">Click logic paths or gates to trace connected nets</div>
          </div>
        )}
      </div>
    </div>
  );
};

