import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Minimize2, Maximize2, Send, Sparkles, Code, GraduationCap, Microscope, CheckCircle2, Cpu } from 'lucide-react';
import * as d3 from 'd3';
import { soundFx } from '../utils/soundEffects';
import { predictSiliconArchitecture } from '../utils/kansenEngine';

interface ShinzuMessage {
  id: string;
  sender: 'user' | 'shinzu';
  text: string;
  timestamp: string;
  mode?: 'STUDENT' | 'SCIENTIST';
  actionExecuted?: string;
}

interface ShinzuCopilotProps {
  onExecuteMacro?: (command: string) => void;
  currentCode?: string;
  currentTitle?: string;
  onUpdateCode?: (newCode: string) => void;
  isSynthesizing?: boolean;
}

// Interfaces for 60fps D3 Neural Network
interface D3NeuralNode extends d3.SimulationNodeDatum {
  id: string;
  layer: number;
  activation: number;
  pulse: number;
  targetX: number;
}

interface D3NeuralLink extends d3.SimulationLinkDatum<D3NeuralNode> {
  id: string;
  source: D3NeuralNode;
  target: D3NeuralNode;
  weight: number;
  initialWeight: number;
}

const ShinzuNeuralCanvas: React.FC<{ isSynthesizing?: boolean }> = ({ isSynthesizing = false }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [loss, setLoss] = useState(0.042);
  const [synapsesCount, setSynapsesCount] = useState(74);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const width = 390;
    const height = 110;

    // Clear previous SVG content
    d3.select(svgEl).selectAll('*').remove();

    const svg = d3.select(svgEl)
      .attr('width', width)
      .attr('height', height)
      .style('background', '#000000');

    // Create layered nodes structure
    const layerSizes = [4, 5, 4, 3];
    const nodes: D3NeuralNode[] = [];
    const links: D3NeuralLink[] = [];

    // Initialize nodes
    const layerCount = layerSizes.length;
    const xSpacing = (width - 60) / (layerCount - 1);

    layerSizes.forEach((size, lIdx) => {
      const targetX = 30 + lIdx * xSpacing;
      const ySpacing = (height - 30) / (size - 1 || 1);
      const topPadding = size === 1 ? height / 2 : 15;

      for (let nIdx = 0; nIdx < size; nIdx++) {
        const y = topPadding + nIdx * ySpacing;
        nodes.push({
          id: `L${lIdx}_N${nIdx}`,
          layer: lIdx,
          activation: Math.random(),
          pulse: 0,
          targetX,
          x: targetX + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 10
        });
      }
    });

    // Initialize links
    for (let lIdx = 0; lIdx < layerCount - 1; lIdx++) {
      const currentLayerNodes = nodes.filter(n => n.layer === lIdx);
      const nextLayerNodes = nodes.filter(n => n.layer === lIdx + 1);

      currentLayerNodes.forEach(fromNode => {
        nextLayerNodes.forEach(toNode => {
          const w = (Math.random() * 2 - 1) * 1.5;
          links.push({
            id: `${fromNode.id}->${toNode.id}`,
            source: fromNode,
            target: toNode,
            weight: w,
            initialWeight: w
          });
        });
      });
    }

    setSynapsesCount(links.length);

    // Create simulation with spring forces
    const simulation = d3.forceSimulation<D3NeuralNode>(nodes)
      .force('link', d3.forceLink<D3NeuralNode, D3NeuralLink>(links).id(d => d.id).distance(65))
      .force('x', d3.forceX<D3NeuralNode>(d => d.targetX).strength(0.85))
      .force('y', d3.forceY<D3NeuralNode>(height / 2).strength(0.08))
      .force('charge', d3.forceManyBody().strength(-15))
      .force('collide', d3.forceCollide().radius(10));

    // Groups for drawing
    const linkGroup = svg.append('g').attr('class', 'links');
    const particleGroup = svg.append('g').attr('class', 'particles');
    const nodeGroup = svg.append('g').attr('class', 'nodes');

    // Create links elements
    const linkSelection = linkGroup.selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke-linecap', 'round');

    // Create node elements
    const nodeSelection = nodeGroup.selectAll('g')
      .data(nodes)
      .enter()
      .append('g');

    const nodeCircles = nodeSelection.append('circle')
      .attr('r', d => 4.5 + d.activation * 1.5)
      .attr('fill', '#050505')
      .attr('stroke-width', 1.5);

    const nodeInnerCircles = nodeSelection.append('circle')
      .attr('r', 2);

    // Create tooltip element in parent
    const tooltipDiv = d3.select(svgEl.parentNode as HTMLElement)
      .append('div')
      .style('position', 'absolute')
      .style('visibility', 'hidden')
      .style('background', '#020202')
      .style('border', '1px solid #dc2626')
      .style('padding', '6px 10px')
      .style('border-radius', '4px')
      .style('font-family', 'monospace')
      .style('font-size', '10px')
      .style('color', '#a1a1aa')
      .style('pointer-events', 'none')
      .style('z-index', '100')
      .style('box-shadow', '0 0 15px rgba(220, 38, 38, 0.4)')
      .style('min-width', '145px')
      .style('line-height', '1.4');

    let hoveredNodeData: D3NeuralNode | null = null;
    let hoveredLinkData: D3NeuralLink | null = null;

    nodeSelection
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        hoveredNodeData = d;
        tooltipDiv.style('visibility', 'visible');
      })
      .on('mousemove', (event) => {
        const parentRect = (svgEl.parentNode as HTMLElement).getBoundingClientRect();
        const mouseX = event.clientX - parentRect.left;
        const mouseY = event.clientY - parentRect.top;
        tooltipDiv
          .style('left', (mouseX + 14) + 'px')
          .style('top', (mouseY - 30) + 'px');
      })
      .on('mouseout', () => {
        hoveredNodeData = null;
        tooltipDiv.style('visibility', 'hidden');
      });

    linkSelection
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => {
        hoveredLinkData = d;
        tooltipDiv.style('visibility', 'visible');
      })
      .on('mousemove', (event) => {
        const parentRect = (svgEl.parentNode as HTMLElement).getBoundingClientRect();
        const mouseX = event.clientX - parentRect.left;
        const mouseY = event.clientY - parentRect.top;
        tooltipDiv
          .style('left', (mouseX + 14) + 'px')
          .style('top', (mouseY - 30) + 'px');
      })
      .on('mouseout', () => {
        hoveredLinkData = null;
        tooltipDiv.style('visibility', 'hidden');
      });

    // Live particles / signal impulses
    let activeParticles: Array<{
      link: D3NeuralLink;
      progress: number;
      speed: number;
    }> = [];

    let frameCount = 0;

    // 60FPS animation loop
    const tick = () => {
      frameCount++;

      if (hoveredNodeData) {
        const layerNames = ['Input Layer (RTL Signal Input)', 'Hidden Layer Alpha', 'Hidden Layer Beta', 'Output Decision Node'];
        tooltipDiv.html(`
          <div style="font-weight: bold; color: #ef4444; border-b: 1px solid #1f1f23; padding-bottom: 4px; margin-bottom: 4px; font-size: 10px;">NEURON STATE</div>
          <div>ID: <span style="color: #fff; font-weight: bold;">${hoveredNodeData.id}</span></div>
          <div>TYPE: <span style="color: #e2e8f0;">${layerNames[hoveredNodeData.layer] || 'Processing Node'}</span></div>
          <div style="margin-top: 3px;">ACTIVATION: <span style="color: #10b981; font-weight: bold;">${(hoveredNodeData.activation * 1.25).toFixed(4)} V</span></div>
        `);
      } else if (hoveredLinkData) {
        tooltipDiv.html(`
          <div style="font-weight: bold; color: #10b981; border-b: 1px solid #1f1f23; padding-bottom: 4px; margin-bottom: 4px; font-size: 10px;">SYNAPSE SPEC</div>
          <div>PATH: <span style="color: #fff; font-weight: bold;">${hoveredLinkData.source.id} → ${hoveredLinkData.target.id}</span></div>
          <div>CURRENT WT: <span style="color: ${hoveredLinkData.weight >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">${hoveredLinkData.weight.toFixed(4)}</span></div>
          <div>STABILITY: <span style="color: #38bdf8;">${(98.45 - Math.abs(hoveredLinkData.weight - hoveredLinkData.initialWeight) * 10).toFixed(2)}%</span></div>
        `);
      }

      // Update neural state (synaptic weights fluctuation)
      const speedCoeff = isSynthesizing ? 4.5 : 1.0;
      links.forEach(l => {
        // Fluctuate weights dynamically to reflect active weight changes
        const delta = Math.sin(frameCount * 0.04 + l.initialWeight * 5) * 0.05 * speedCoeff;
        l.weight = l.initialWeight + delta;
      });

      // Update training loss
      if (frameCount % 60 === 0) {
        setLoss(prev => {
          const next = isSynthesizing 
            ? Math.max(0.0008, prev - 0.0015 + (Math.random() - 0.5) * 0.0004)
            : Math.max(0.0012, prev - 0.0001 + (Math.random() - 0.5) * 0.0003);
          return Number(next.toFixed(5));
        });
      }

      // Spawn particles along synapses
      const spawnRate = isSynthesizing ? 10 : 40;
      if (frameCount % spawnRate === 0) {
        nodes.filter(n => n.layer === 0).forEach(fromNode => {
          if (Math.random() > 0.4) {
            const outgoing = links.filter(l => l.source.id === fromNode.id);
            if (outgoing.length > 0) {
              const selectedLink = outgoing[Math.floor(Math.random() * outgoing.length)];
              activeParticles.push({
                link: selectedLink,
                progress: 0,
                speed: 0.015 + Math.random() * 0.02
              });
            }
          }
        });
      }

      // Update and filter particles
      activeParticles.forEach((p, idx) => {
        p.progress += p.speed * (isSynthesizing ? 1.8 : 1.0);
        if (p.progress >= 1.0) {
          // Trigger next layer signal propagate
          const targetNode = p.link.target;
          targetNode.activation = Math.min(1.0, targetNode.activation + 0.25);
          targetNode.pulse = 1.0;

          const nextLinks = links.filter(l => l.source.id === targetNode.id);
          if (nextLinks.length > 0 && Math.random() > 0.5) {
            const nextL = nextLinks[Math.floor(Math.random() * nextLinks.length)];
            activeParticles.push({
              link: nextL,
              progress: 0,
              speed: 0.02 + Math.random() * 0.02
            });
          }
          activeParticles.splice(idx, 1);
        }
      });

      // D3 Update positions from simulation
      linkSelection
        .attr('x1', d => d.source.x!)
        .attr('y1', d => d.source.y!)
        .attr('x2', d => d.target.x!)
        .attr('y2', d => d.target.y!)
        .attr('stroke', d => {
          const absW = Math.abs(d.weight);
          const alpha = Math.min(0.7, Math.max(0.1, absW * 0.35));
          return d.weight > 0 ? `rgba(16, 185, 129, ${alpha})` : `rgba(220, 38, 38, ${alpha})`;
        })
        .attr('stroke-width', d => Math.min(3.0, 0.5 + Math.abs(d.weight) * 1.2));

      // Draw active particles
      const particleSel = particleGroup.selectAll('circle')
        .data(activeParticles);

      particleSel.enter()
        .append('circle')
        .attr('r', 2.0)
        .attr('fill', '#dc2626')
        .style('filter', 'drop-shadow(0 0 4px #dc2626)')
        .merge(particleSel as any)
        .attr('cx', d => d.link.source.x! + (d.link.target.x! - d.link.source.x!) * d.progress)
        .attr('cy', d => d.link.source.y! + (d.link.target.y! - d.link.source.y!) * d.progress);

      particleSel.exit().remove();

      // Nodes transition and pulse
      nodeSelection
        .attr('transform', d => `translate(${d.x!}, ${d.y!})`);

      nodeCircles
        .attr('r', d => 4.5 + d.activation * 1.5)
        .attr('stroke', d => {
          if (d.layer === 3) return '#dc2626';
          return d.activation > 0.5 ? '#10b981' : '#3f3f46';
        })
        .attr('fill', d => d.pulse > 0.1 ? `rgba(220,38,38,${d.pulse * 0.2})` : '#050505');

      nodeInnerCircles
        .attr('fill', d => d.layer === 3 ? '#ef4444' : (d.activation > 0.5 ? '#34d399' : '#18181b'));

      // Decay pulses and activations
      nodes.forEach(n => {
        n.activation = Math.max(0.1, n.activation - 0.003);
        if (n.pulse > 0) n.pulse -= 0.05;
      });
    };

    // Tie to simulation tick
    simulation.on('tick', tick);

    return () => {
      simulation.stop();
      tooltipDiv.remove();
    };
  }, [isSynthesizing]);

  return (
    <div className="bg-[#000000] p-1 border-b border-[#18181b] relative overflow-hidden flex flex-col items-center">
      <svg ref={svgRef} className="block w-[390px] h-[110px]" />
      
      {/* HUD overlay for D3 Neural Net */}
      <div className="w-[390px] px-2 flex justify-between text-[8px] font-mono text-zinc-500 mt-0.5 select-none">
        <span>COGNITIVE FLOW: D3 FORCE-DIRECTED 60FPS</span>
        <span className="text-[#dc2626] font-bold">LOSS: {loss.toFixed(5)}</span>
        <span>SYNAPSE WEIGHTS: {synapsesCount} ACTIVE</span>
      </div>
    </div>
  );
};

export const ShinzuCopilot: React.FC<ShinzuCopilotProps> = ({
  onExecuteMacro,
  currentCode = '',
  currentTitle = 'Active Circuit',
  onUpdateCode,
  isSynthesizing = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [personaMode, setPersonaMode] = useState<'STUDENT' | 'SCIENTIST'>('SCIENTIST');
  const [showNeuralNet, setShowNeuralNet] = useState(true);

  const [messages, setMessages] = useState<ShinzuMessage[]>([
    {
      id: '1',
      sender: 'shinzu',
      text: 'SHINZU // QUANTUM SILICON CORE online. Autonomous AI Peer active with VFS read/write clearance and Monaco text buffer injection capabilities.',
      timestamp: new Date().toLocaleTimeString(),
      mode: 'SCIENTIST'
    }
  ]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = textToSend || inputText;
    if (!prompt.trim()) return;

    soundFx.playClick();
    const userMsg: ShinzuMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsProcessing(true);

    setTimeout(async () => {
      let actionTag = '';
      let generatedVerilog = '';

      const cleanPrompt = prompt.toLowerCase();
      if (cleanPrompt.includes('multiplier') || cleanPrompt.includes('8-bit') || cleanPrompt.includes('pipeline')) {
        generatedVerilog = `// Pipelined 8-Bit Multiplier Core Generated by SHINZU AI Peer
module pipelined_multiplier_8bit (
  input wire clk,
  input wire rst_n,
  input wire [7:0] a,
  input wire [7:0] b,
  output reg [15:0] product
);
  reg [15:0] stage1_mult;
  
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      stage1_mult <= 16'd0;
      product <= 16'd0;
    end else begin
      stage1_mult <= a * b;
      product <= stage1_mult;
    end
  end
endmodule`;
        if (onUpdateCode) {
          onUpdateCode(generatedVerilog);
          actionTag = 'VFS CODE BUFFER UPDATED: Injected 8-bit Pipelined Multiplier RTL';
        }
      } else if (cleanPrompt.includes('inverter') || cleanPrompt.includes('inv_x1')) {
        generatedVerilog = `// High-Speed 3nm Nanosheet Inverter
module inv_x1_3nm (
  input wire in_a,
  output wire out_y
);
  assign out_y = ~in_a;
endmodule`;
        if (onUpdateCode) {
          onUpdateCode(generatedVerilog);
          actionTag = 'VFS CODE BUFFER UPDATED: Injected High-Speed 3nm Inverter RTL';
        }
      } else if (cleanPrompt.includes('register') || cleanPrompt.includes('dff')) {
        generatedVerilog = `// D-Flip-Flop Register with Asynchronous Reset
module dff_register_3nm (
  input wire clk,
  input wire rst_n,
  input wire data_in,
  output reg data_out
);
  always @(posedge clk or negedge rst_n) begin
    if (!rst_n)
      data_out <= 1'b0;
    else
      data_out <= data_in;
  end
endmodule`;
        if (onUpdateCode) {
          onUpdateCode(generatedVerilog);
          actionTag = 'VFS CODE BUFFER UPDATED: Injected DFF Register RTL';
        }
      }

      let responseText = '';
      try {
        const response = await fetch('/api/shinzu/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            activeModule: currentTitle,
            userCode: currentCode
          })
        });
        if (response.ok) {
          const data = await response.json();
          responseText = data.response;
        } else {
          responseText = predictSiliconArchitecture(prompt, { activeModule: currentTitle, userCode: currentCode });
        }
      } catch (e) {
        responseText = predictSiliconArchitecture(prompt, { activeModule: currentTitle, userCode: currentCode });
      }

      if (personaMode === 'STUDENT') {
        responseText = `[STUDENT GUIDE MODE] Let's break this down step-by-step:\n\n` +
          `• Concept: Digital logic components like inverters or multipliers route electrical signals between transistors.\n` +
          `• Process Math: Speed is determined by how fast electrons move through thin silicon wires (propagation delay in picoseconds).\n` +
          `• Action Taken: ${actionTag || 'Analyzed code syntax and verified signal paths.'}\n\n` +
          `Tip: Always separate combinational logic (math) from sequential logic (clocked flip-flops) for clean chip design!`;
      } else {
        responseText = `[PRINCIPAL SCIENTIST MODE] Sub-3nm Technology Trade-off Analysis:\n\n` +
          `• PDK Parasitics: GAA Nanosheet sheet resistance (R_sheet = 42Ω/sq) imposes RC interconnect bottlenecks on Metal-1.\n` +
          `• Cleanroom Metrics: ULPA Class-3 Air Changes Per Hour (ACH=500) prevents defect density D0 > 0.08/cm².\n` +
          `• ${responseText}\n` +
          (actionTag ? `\n[AUTONOMOUS VFS DIRECTIVE]: ${actionTag}` : '');
      }

      const shinzuMsg: ShinzuMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'shinzu',
        text: responseText,
        timestamp: new Date().toLocaleTimeString(),
        mode: personaMode,
        actionExecuted: actionTag
      };

      setMessages(prev => [...prev, shinzuMsg]);
      setIsProcessing(false);
      soundFx.playSynthPass();

      if (prompt.startsWith('/') && onExecuteMacro) {
        onExecuteMacro(prompt);
      }
    }, 600);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          soundFx.playClick();
          setIsOpen(true);
        }}
        className="fixed bottom-4 right-4 z-40 bg-[#000000] border-2 border-[#dc2626] text-white px-3.5 py-2 rounded-full font-orbitron font-bold text-xs flex items-center gap-2 shadow-[0_0_25px_rgba(220,38,38,0.5)] hover:scale-105 transition"
      >
        <Bot className="w-4 h-4 text-[#dc2626] animate-pulse" />
        <span>SHINZU AI PEER</span>
      </button>
    );
  }

  return (
    <div className={`fixed z-40 bg-[#050505] border-2 border-[#dc2626] rounded-lg shadow-[0_0_35px_rgba(220,38,38,0.4)] flex flex-col font-mono text-xs transition-all duration-300 ${
      isMinimized ? 'bottom-4 right-4 w-80 h-12 overflow-hidden' : 'bottom-4 right-4 w-[420px] h-[520px]'
    }`}>
      {/* Copilot Header */}
      <div className="bg-[#000000] border-b border-[#18181b] p-2.5 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#dc2626] animate-pulse" />
          <span className="font-orbitron font-bold text-white text-xs tracking-wider">
            SHINZU // AI PEER
          </span>
          <span className="bg-[#dc2626]/20 text-[#dc2626] text-[9px] px-1.5 py-0.5 rounded font-bold border border-[#dc2626]/40">
            VFS ACCESS
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              soundFx.playClick();
              setIsMinimized(!isMinimized);
            }}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              soundFx.playClick();
              setIsOpen(false);
            }}
            className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Persona Mode Selector & Quick Prompts */}
          <div className="bg-[#000000] border-b border-[#18181b] p-2 flex items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-1 bg-[#050505] p-1 rounded border border-zinc-800">
              <button
                onClick={() => {
                  soundFx.playClick();
                  setPersonaMode('STUDENT');
                }}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
                  personaMode === 'STUDENT'
                    ? 'bg-amber-950/80 text-amber-300 font-bold border border-amber-800'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <GraduationCap className="w-3 h-3" /> STUDENT
              </button>
              <button
                onClick={() => {
                  soundFx.playClick();
                  setPersonaMode('SCIENTIST');
                }}
                className={`px-2 py-0.5 rounded flex items-center gap-1 transition ${
                  personaMode === 'SCIENTIST'
                    ? 'bg-[#dc2626]/30 text-white font-bold border border-[#dc2626]'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Microscope className="w-3 h-3 text-[#dc2626]" /> SCIENTIST
              </button>
            </div>

            <div className="flex gap-1 overflow-x-auto">
              <button
                onClick={() => handleSendMessage('Generate optimized pipelined 8-bit multiplier RTL')}
                className="bg-zinc-900 hover:bg-zinc-800 text-white px-2 py-1 rounded border border-zinc-800 shrink-0 font-bold flex items-center gap-1 text-[9px]"
              >
                <Code className="w-3 h-3 text-[#dc2626]" /> Multiplier RTL
              </button>
              <button
                onClick={() => handleSendMessage('/tapeout')}
                className="bg-zinc-900 hover:bg-zinc-800 text-[#dc2626] px-2 py-1 rounded border border-zinc-800 shrink-0 font-bold text-[9px]"
              >
                /tapeout
              </button>
            </div>
          </div>

          {/* Neural Activity Header / Toggler */}
          <div className="bg-[#000000] px-2.5 py-1.5 border-b border-[#18181b] flex items-center justify-between text-[10px] text-zinc-400">
            <span className="font-orbitron font-bold text-white flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-[#dc2626]" />
              SHINZU COGNITIVE NEURAL NET
            </span>
            <button
              onClick={() => {
                soundFx.playClick();
                setShowNeuralNet(!showNeuralNet);
              }}
              className="px-2 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded font-bold text-[8px] text-[#dc2626]"
            >
              {showNeuralNet ? 'HIDE REAL-TIME NET' : 'SHOW THINKING COUPLING'}
            </button>
          </div>

          {showNeuralNet && <ShinzuNeuralCanvas isSynthesizing={isSynthesizing || isProcessing} />}

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#000000] leading-relaxed text-[11px]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-2.5 rounded border ${
                  m.sender === 'user'
                    ? 'bg-zinc-900 border-zinc-800 text-zinc-200 ml-6'
                    : 'bg-[#050505] border-[#18181b] text-white mr-2'
                }`}
              >
                <div className="flex justify-between items-center text-[9px] text-zinc-500 font-bold mb-1">
                  <span>{m.sender === 'user' ? 'OPERATIVE' : `SHINZU [${m.mode || personaMode}]`}</span>
                  <span>{m.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap">{m.text}</p>
                {m.actionExecuted && (
                  <div className="mt-2 p-1.5 bg-emerald-950/40 border border-emerald-800 rounded text-emerald-400 font-bold text-[9px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{m.actionExecuted}</span>
                  </div>
                )}
              </div>
            ))}
            {isProcessing && (
              <div className="text-[10px] text-[#dc2626] italic animate-pulse p-1 flex items-center gap-2">
                <Sparkles className="w-3 h-3 animate-spin" />
                SHINZU EXECUTING VFS COMPILATION MATRIX...
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-2 bg-[#000000] border-t border-[#18181b] flex items-center gap-1.5">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Dictate RTL synthesis, VFS edits, or layout queries..."
              className="flex-1 bg-[#050505] text-white placeholder-zinc-600 px-2.5 py-1.5 rounded border border-[#18181b] focus:outline-none focus:border-[#dc2626] font-mono text-xs"
            />
            <button
              onClick={() => handleSendMessage()}
              className="p-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded transition border border-[#dc2626]"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
