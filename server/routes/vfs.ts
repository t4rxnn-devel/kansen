// Express API route for VFS (Virtual File System) workspace persistence on the backend
import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const WORKSPACE_DIR = path.join(process.cwd(), 'workspace');

// Initial design templates
const DEFAULT_FILES: Record<string, string> = {
  '/rtl/top.v': `// Kansen CONSOLE - CMOS Inverter Module
// Technology Node: 3nm FinFET GAA
module inverter_gate (
  input  wire in_a,
  output wire out_y
);

  // Structural CMOS Inverter logic
  assign out_y = ~in_a;

endmodule
`,
  '/rtl/mux21.v': `// Kansen CONSOLE - 2-to-1 MUX Module
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
  '/rtl/shift_reg.v': `// Kansen CONSOLE - 4-bit SIPO Shift Register
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
  '/rtl/fsm_traffic.v': `// Kansen CONSOLE - Traffic Light FSM
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
  '/verification/tb.v': `// Kansen CONSOLE - SystemVerilog UVM Verification Environment
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
    super.connect_phase(phase);
    agent.ap.connect(scoreboard.ax_export);
  endfunction

endclass
`,
  '/syn/netlist.json': `{
  "creator": "Kansen CONSOLE Compiler",
  "technology_node": "3nm GAA Nanosheet",
  "cells": [
    { "id": "inv_1", "type": "INV", "area_um2": 0.0035, "delay_ps": 4.5 }
  ]
}`
};

// Ensure workspace directory structure
function ensureWorkspace() {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }
  const subDirs = ['rtl', 'syn', 'layout', 'verification'];
  for (const sub of subDirs) {
    const fullSub = path.join(WORKSPACE_DIR, sub);
    if (!fs.existsSync(fullSub)) {
      fs.mkdirSync(fullSub, { recursive: true });
    }
  }

  // Populate default files if empty
  for (const [vPath, content] of Object.entries(DEFAULT_FILES)) {
    const diskPath = path.join(WORKSPACE_DIR, vPath.replace(/^\//, ''));
    if (!fs.existsSync(diskPath)) {
      fs.writeFileSync(diskPath, content, 'utf8');
    }
  }
}

// Initial build
ensureWorkspace();

// GET /api/vfs/files -> lists all files in the tree
router.get('/files', (req, res) => {
  try {
    ensureWorkspace();
    const filesList: Array<{ path: string; name: string; size: number }> = [];

    const walkDir = (currentDir: string, relativePath: string = '') => {
      const items = fs.readdirSync(currentDir);
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const rel = relativePath ? `${relativePath}/${item}` : item;
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          walkDir(fullPath, rel);
        } else {
          filesList.push({
            path: `/${rel}`,
            name: item,
            size: stat.size
          });
        }
      }
    };

    walkDir(WORKSPACE_DIR);
    return res.json({ success: true, files: filesList });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to crawl VFS.', message: err.message });
  }
});

// POST /api/vfs/read -> reads a file
router.post('/read', (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath parameter required.' });
    }

    const diskPath = path.join(WORKSPACE_DIR, filePath.replace(/^\//, ''));
    if (!fs.existsSync(diskPath)) {
      // Check default fallback
      if (filePath in DEFAULT_FILES) {
        return res.json({ success: true, filePath, content: DEFAULT_FILES[filePath] });
      }
      return res.status(404).json({ error: `File '${filePath}' not found.` });
    }

    const content = fs.readFileSync(diskPath, 'utf8');
    return res.json({ success: true, filePath, content });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to read file.', message: err.message });
  }
});

// POST /api/vfs/write -> writes/saves a file
router.post('/write', (req, res) => {
  try {
    const { filePath, content } = req.body;
    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'filePath and content parameters required.' });
    }

    ensureWorkspace();
    const diskPath = path.join(WORKSPACE_DIR, filePath.replace(/^\//, ''));
    const parentDir = path.dirname(diskPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.writeFileSync(diskPath, content, 'utf8');
    return res.json({ success: true, filePath, bytesWritten: content.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to write file to disk.', message: err.message });
  }
});

// POST /api/vfs/reset -> resets VFS to defaults
router.post('/reset', (req, res) => {
  try {
    if (fs.existsSync(WORKSPACE_DIR)) {
      fs.rmSync(WORKSPACE_DIR, { recursive: true, force: true });
    }
    ensureWorkspace();
    return res.json({ success: true, message: 'Virtual File System workspace restored to factory baseline defaults.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'VFS reset failed.', message: err.message });
  }
});

export default router;
export { DEFAULT_FILES };
