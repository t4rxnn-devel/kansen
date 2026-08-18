import { EdaLab } from '../types';

export const edaLabsData: EdaLab[] = [
  {
    id: 'inv-gate',
    title: '1. Silicon Inverter Gate',
    subtitle: 'Base Complementary MOSFET Cell (3nm FinFET)',
    sector: 'BETA',
    clearanceLevel: 'LEVEL-1 // GATE-FOUNDATION',
    icon: 'ToggleLeft',
    description: 'Fundamental CMOS NOT logic gate comprising PMOS pull-up and NMOS pull-down transistors. Analyzes propagation delay t_pd, noise margins, and dynamic power consumption.',
    verilogCode: `// Kansen Silicon Net - CMOS Inverter Module
// Technology Node: 3nm FinFET GAA
module inverter_gate (
  input  wire in_a,
  output wire out_y
);

  // Structural CMOS Inverter logic
  assign out_y = ~in_a;

endmodule
`,
    defaultSignals: [
      { name: 'CLK', type: 'clk', color: '#dc2626', data: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
      { name: 'IN_A', type: 'bit', color: '#ffffff', data: [0, 0, 1, 1, 0, 1, 1, 0, 0, 1] },
      { name: 'OUT_Y', type: 'bit', color: '#dc2626', data: [1, 1, 0, 0, 1, 0, 0, 1, 1, 0] },
    ],
    schematicNodes: [
      { id: 'in_a', label: 'IN_A', type: 'in', x: 80, y: 120, active: true },
      { id: 'not1', label: 'NOT', type: 'gate_not', x: 220, y: 120, inputs: ['in_a'], active: true },
      { id: 'out_y', label: 'OUT_Y', type: 'out', x: 360, y: 120, inputs: ['not1'], active: true }
    ],
    telemetry: {
      gateCount: 2,
      transistorAreaUm2: 0.008,
      powerUw: 0.12,
      worstCaseDelayNs: 0.004,
      fanout: 4,
      criticalPath: 'IN_A -> PMOS/NMOS -> OUT_Y'
    },
    layoutLayers: {
      polysilicon: [
        [false, true, false, false],
        [false, true, false, false],
        [false, true, false, false],
        [false, true, false, false]
      ],
      diffusion: [
        [true, true, true, false],
        [false, false, false, false],
        [false, false, false, false],
        [true, true, true, false]
      ],
      metal1: [
        [true, false, false, true],
        [true, true, true, true],
        [true, true, true, true],
        [true, false, false, true]
      ],
      metal2: [
        [false, true, true, false],
        [false, true, true, false],
        [false, true, true, false],
        [false, true, true, false]
      ]
    },
    testbenchCases: [
      { id: 1, name: 'Logic 0 In', inputs: { in_a: 0 }, expectedOutputs: { out_y: 1 } },
      { id: 2, name: 'Logic 1 In', inputs: { in_a: 1 }, expectedOutputs: { out_y: 0 } }
    ]
  },

  {
    id: 'mux-21',
    title: '2. 2-to-1 Multiplexer',
    subtitle: 'Combinational Data Routing Block',
    sector: 'BETA',
    clearanceLevel: 'LEVEL-2 // COMBINATIONAL-LOGIC',
    icon: 'Split',
    description: 'Selects between two data lines (D0, D1) using a select line (SEL) to drive output Y. Implemented with transmission gate logic in 3nm FinFET.',
    verilogCode: `// Kansen Silicon Net - 2-to-1 MUX Module
module mux21 (
  input  wire d0,
  input  wire d1,
  input  wire sel,
  output wire y
);

  // Y = (D0 & ~SEL) | (D1 & SEL)
  assign y = sel ? d1 : d0;

endmodule
`,
    defaultSignals: [
      { name: 'CLK', type: 'clk', color: '#dc2626', data: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
      { name: 'SEL', type: 'bit', color: '#ffffff', data: [0, 0, 0, 0, 1, 1, 1, 1, 0, 0] },
      { name: 'D0', type: 'bit', color: '#a1a1aa', data: [1, 1, 0, 0, 1, 1, 0, 0, 1, 1] },
      { name: 'D1', type: 'bit', color: '#e4e4e7', data: [0, 0, 1, 1, 1, 0, 1, 0, 1, 0] },
      { name: 'Y', type: 'bit', color: '#dc2626', data: [1, 1, 0, 0, 1, 0, 1, 0, 1, 1] },
    ],
    schematicNodes: [
      { id: 'd0', label: 'D0', type: 'in', x: 60, y: 70, active: true },
      { id: 'd1', label: 'D1', type: 'in', x: 60, y: 150, active: true },
      { id: 'sel', label: 'SEL', type: 'in', x: 60, y: 220, active: true },
      { id: 'mux1', label: 'MUX21', type: 'gate_mux', x: 220, y: 130, inputs: ['d0', 'd1', 'sel'], active: true },
      { id: 'y', label: 'Y', type: 'out', x: 380, y: 130, inputs: ['mux1'], active: true }
    ],
    telemetry: {
      gateCount: 4,
      transistorAreaUm2: 0.018,
      powerUw: 0.28,
      worstCaseDelayNs: 0.012,
      fanout: 8,
      criticalPath: 'SEL -> NOT -> AND -> OR -> Y'
    },
    layoutLayers: {
      polysilicon: [
        [true, true, false, true],
        [true, false, true, true],
        [false, true, true, false],
        [true, true, false, true]
      ],
      diffusion: [
        [true, true, true, true],
        [true, false, false, true],
        [true, false, false, true],
        [true, true, true, true]
      ],
      metal1: [
        [true, false, true, true],
        [true, true, true, false],
        [false, true, true, true],
        [true, true, false, true]
      ],
      metal2: [
        [false, true, true, false],
        [true, true, false, true],
        [true, false, true, true],
        [false, true, true, false]
      ]
    },
    testbenchCases: [
      { id: 1, name: 'SEL=0 routes D0', inputs: { sel: 0, d0: 1, d1: 0 }, expectedOutputs: { y: 1 } },
      { id: 2, name: 'SEL=1 routes D1', inputs: { sel: 1, d0: 0, d1: 1 }, expectedOutputs: { y: 1 } }
    ]
  },

  {
    id: 'shift-reg-4bit',
    title: '3. 4-bit Shift Register',
    subtitle: 'Serial-In Parallel-Out (SIPO) Sequential Array',
    sector: 'BETA',
    clearanceLevel: 'LEVEL-3 // SEQUENTIAL-RTL',
    icon: 'Cpu',
    description: 'A 4-bit Serial-In Parallel-Out (SIPO) shift register constructed with cascading master-slave D-flip-flops. Converts serial data stream into 4-bit parallel word output Q[3:0].',
    verilogCode: `// Kansen Silicon Net - 4-bit SIPO Shift Register
module shift_reg_4bit (
  input  wire       clk,
  input  wire       rst_n,
  input  wire       din,
  output reg  [3:0] q
);

  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
      q <= 4'b0000;
    end else begin
      q <= {q[2:0], din}; // Shift left and insert din
    end
  end

endmodule
`,
    defaultSignals: [
      { name: 'CLK', type: 'clk', color: '#dc2626', data: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
      { name: 'RST_N', type: 'bit', color: '#a1a1aa', data: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
      { name: 'DIN', type: 'bit', color: '#ffffff', data: [1, 1, 0, 1, 0, 0, 1, 1, 0, 0] },
      { name: 'Q[3:0]', type: 'bus', color: '#dc2626', data: ['0x0', '0x1', '0x3', '0x6', '0xD', '0xA', '0x5', '0xB', '0x6', '0xC'] },
    ],
    schematicNodes: [
      { id: 'clk', label: 'CLK', type: 'in', x: 50, y: 50, active: true },
      { id: 'rst_n', label: 'RST_N', type: 'in', x: 50, y: 120, active: true },
      { id: 'din', label: 'DIN', type: 'in', x: 50, y: 190, active: true },
      { id: 'dff0', label: 'DFF_0', type: 'dff', x: 180, y: 120, inputs: ['clk', 'din'], active: true },
      { id: 'dff1', label: 'DFF_1', type: 'dff', x: 260, y: 120, inputs: ['dff0'], active: true },
      { id: 'dff2', label: 'DFF_2', type: 'dff', x: 340, y: 120, inputs: ['dff1'], active: true },
      { id: 'q_out', label: 'Q[3:0]', type: 'out', x: 420, y: 120, inputs: ['dff2'], active: true }
    ],
    telemetry: {
      gateCount: 24,
      transistorAreaUm2: 0.084,
      powerUw: 1.45,
      worstCaseDelayNs: 0.028,
      fanout: 12,
      criticalPath: 'CLK -> DFF0_Q -> DFF1_D Setup Window'
    },
    layoutLayers: {
      polysilicon: [
        [true, true, true, true],
        [false, true, true, false],
        [true, false, false, true],
        [true, true, true, true]
      ],
      diffusion: [
        [true, false, false, true],
        [true, true, true, true],
        [true, true, true, true],
        [true, false, false, true]
      ],
      metal1: [
        [true, true, true, true],
        [true, false, false, true],
        [true, false, false, true],
        [true, true, true, true]
      ],
      metal2: [
        [false, true, true, false],
        [true, true, true, true],
        [true, true, true, true],
        [false, true, true, false]
      ]
    },
    testbenchCases: [
      { id: 1, name: 'Reset Active', inputs: { clk: 1, rst_n: 0, din: 1 }, expectedOutputs: { q: '0x0' } },
      { id: 2, name: 'Shift DIN=1', inputs: { clk: 1, rst_n: 1, din: 1 }, expectedOutputs: { q: '0x1' } }
    ]
  },

  {
    id: 'fsm-traffic',
    title: '4. FSM Traffic Light Controller',
    subtitle: '3-State Moore State Machine with Timer Interlock',
    sector: 'BETA',
    clearanceLevel: 'LEVEL-4 // COMPLEX-RTL',
    icon: 'Workflow',
    description: 'A 3-state Moore Finite State Machine controlling intersection traffic signals (RED -> GREEN -> YELLOW -> RED) based on timer count ticks.',
    verilogCode: `// Kansen Silicon Net - Traffic Light FSM
module fsm_traffic (
  input  wire       clk,
  input  wire       rst_n,
  input  wire       timer_tick,
  output reg  [2:0] lights // {RED, YELLOW, GREEN}
);

  typedef enum logic [1:0] {
    S_RED    = 2'b00,
    S_GREEN  = 2'b01,
    S_YELLOW = 2'b10
  } state_t;

  state_t state, next_state;

  always @(posedge clk or negedge rst_n) begin
    if (!rst_n) state <= S_RED;
    else        state <= next_state;
  end

  always @(*) begin
    case (state)
      S_RED:    next_state = timer_tick ? S_GREEN  : S_RED;
      S_GREEN:  next_state = timer_tick ? S_YELLOW : S_GREEN;
      S_YELLOW: next_state = timer_tick ? S_RED    : S_YELLOW;
      default:  next_state = S_RED;
    endcase
  end

  always @(*) begin
    case (state)
      S_RED:    lights = 3'b100;
      S_GREEN:  lights = 3'b001;
      S_YELLOW: lights = 3'b010;
      default:  lights = 3'b100;
    endcase
  end

endmodule
`,
    defaultSignals: [
      { name: 'CLK', type: 'clk', color: '#dc2626', data: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
      { name: 'RST_N', type: 'bit', color: '#a1a1aa', data: [0, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
      { name: 'TICK', type: 'bit', color: '#ffffff', data: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
      { name: 'LIGHTS[2:0]', type: 'bus', color: '#dc2626', data: ['RED', 'RED', 'GRN', 'GRN', 'YEL', 'YEL', 'RED', 'RED', 'GRN', 'GRN'] },
    ],
    schematicNodes: [
      { id: 'clk', label: 'CLK', type: 'in', x: 50, y: 60, active: true },
      { id: 'tick', label: 'TICK', type: 'in', x: 50, y: 150, active: true },
      { id: 'state_reg', label: 'FSM_REG', type: 'dff', x: 220, y: 100, inputs: ['clk', 'tick'], active: true },
      { id: 'lights', label: 'LIGHTS[2:0]', type: 'out', x: 380, y: 100, inputs: ['state_reg'], active: true }
    ],
    telemetry: {
      gateCount: 22,
      transistorAreaUm2: 0.072,
      powerUw: 1.22,
      worstCaseDelayNs: 0.024,
      fanout: 10,
      criticalPath: 'CLK -> FSM_REG -> Next_State_Decoder -> Lights'
    },
    layoutLayers: {
      polysilicon: [
        [true, true, false, true],
        [false, true, true, true],
        [true, true, true, false],
        [true, false, true, true]
      ],
      diffusion: [
        [true, true, true, true],
        [true, false, false, true],
        [true, false, false, true],
        [true, true, true, true]
      ],
      metal1: [
        [true, false, true, true],
        [true, true, true, true],
        [true, true, true, true],
        [true, true, false, true]
      ],
      metal2: [
        [false, true, true, false],
        [true, true, true, true],
        [true, true, true, true],
        [false, true, true, false]
      ]
    },
    testbenchCases: [
      { id: 1, name: 'Red to Green Transition', inputs: { clk: 1, rst_n: 1, timer_tick: 1 }, expectedOutputs: { lights: '3\'b001' } }
    ]
  },

  {
    id: 'uvm-tb-env',
    title: '5. SystemVerilog UVM Verification Environment',
    subtitle: 'Universal Verification Methodology Architecture Layout',
    sector: 'BETA',
    clearanceLevel: 'LEVEL-5 // UVM-VERIFICATION',
    icon: 'Shield',
    description: 'SystemVerilog UVM testbench environment featuring UVM Agent, Sequencer, Driver, Monitor, and Scoreboard modules for full functional coverage verification.',
    verilogCode: `// Kansen Silicon Net - SystemVerilog UVM Verification Environment
class kansen_env extends uvm_env;
  \`uvm_component_utils(kansen_env)

  kansen_agent      agent;
  kansen_scoreboard scoreboard;

  function new(string name, uvm_component parent);
    super.new(name, parent);
  endfunction

  virtual function void build_phase(uvm_phase phase);
    super.build_phase(phase);
    agent      = kansen_agent::type_id::create("agent", this);
    scoreboard = kansen_scoreboard::type_id::create("scoreboard", this);
  endfunction

  virtual function void connect_phase(uvm_phase phase);
    agent.ap.connect(scoreboard.analysis_export);
  endfunction
endclass
`,
    defaultSignals: [
      { name: 'UVM_CLK', type: 'clk', color: '#dc2626', data: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1] },
      { name: 'TRANSACTION', type: 'bus', color: '#ffffff', data: ['REQ_0', 'REQ_1', 'RESP_0', 'RESP_1', 'REQ_2', 'RESP_2', 'IDLE', 'REQ_3', 'RESP_3', 'IDLE'] },
      { name: 'COVERAGE', type: 'bus', color: '#dc2626', data: ['12%', '34%', '58%', '75%', '88%', '94%', '99%', '100%', '100%', '100%'] },
    ],
    schematicNodes: [
      { id: 'seq', label: 'UVM_SEQ', type: 'in', x: 50, y: 60, active: true },
      { id: 'drv', label: 'UVM_DRV', type: 'box', x: 180, y: 60, inputs: ['seq'], active: true },
      { id: 'dut', label: '3NM_DUT', type: 'box', x: 290, y: 100, inputs: ['drv'], active: true },
      { id: 'mon', label: 'UVM_MON', type: 'box', x: 290, y: 200, inputs: ['dut'], active: true },
      { id: 'scb', label: 'SCOREBOARD', type: 'out', x: 410, y: 150, inputs: ['mon'], active: true }
    ],
    telemetry: {
      gateCount: 120,
      transistorAreaUm2: 0.420,
      powerUw: 4.80,
      worstCaseDelayNs: 0.010,
      fanout: 32,
      criticalPath: 'UVM Sequencer -> Driver -> DUT -> Monitor -> Scoreboard'
    },
    layoutLayers: {
      polysilicon: [
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true]
      ],
      diffusion: [
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true]
      ],
      metal1: [
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true]
      ],
      metal2: [
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true],
        [true, true, true, true]
      ]
    },
    testbenchCases: [
      { id: 1, name: '100% Code & Functional Coverage', inputs: { test: 'uvm_random_test' }, expectedOutputs: { scoreboard: 'MATCH_ALL_1024_VECTORS' } }
    ]
  }
];
