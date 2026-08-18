export type SectorType = 'ALPHA' | 'BETA';

export interface FabStep {
  stepNumber: number;
  title: string;
  subtitle: string;
  description: string;
  formulaOrParam?: string;
  keyMetric: string;
  interactiveControl?: {
    name: string;
    unit: string;
    min: number;
    max: number;
    defaultVal: number;
    targetVal: number;
    tolerance: number;
    impactDescription: string;
  };
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface FabModule {
  id: string;
  title: string;
  subtitle: string;
  sector: 'ALPHA';
  clearanceLevel: string;
  icon: string;
  description: string;
  targetTemp: string;
  cleanlinessReq: string;
  waferLayer: 'Polysilicon' | 'Diffusion' | 'Etch' | 'ISO-3';
  steps: FabStep[];
  quiz: QuizQuestion[];
  badgeName: string;
  completed?: boolean;
}

export interface WaveSignal {
  name: string;
  type: 'clk' | 'bus' | 'bit';
  color: string;
  // Array of 0/1 or Hex numbers over clock cycles
  data: (number | string)[];
}

export interface SchematicNode {
  id: string;
  label: string;
  type: 'in' | 'out' | 'gate_and' | 'gate_or' | 'gate_not' | 'gate_xor' | 'gate_mux' | 'dff' | 'box';
  x: number;
  y: number;
  inputs?: string[]; // node IDs
  active?: boolean;
  // Metadata for schematic node hover tooltip
  transistorCount?: number;
  propagationDelayPs?: number;
  fanoutCapacitancePf?: number;
}

export interface EdaLab {
  id: string;
  title: string;
  subtitle: string;
  sector: 'BETA';
  clearanceLevel: string;
  icon: string;
  description: string;
  verilogCode: string;
  defaultSignals: WaveSignal[];
  schematicNodes: SchematicNode[];
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
  testbenchCases: {
    id: number;
    name: string;
    inputs: Record<string, number | string>;
    expectedOutputs: Record<string, number | string>;
  }[];
  completed?: boolean;
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  type: 'INFO' | 'WARN' | 'ERR' | 'SYNTH' | 'SUCCESS';
  message: string;
  source: string;
}

// PVT Process Corner & Variation Stress Testing
export type ProcessCorner = 'FF' | 'TT' | 'SS';

export interface PvtConfig {
  corner: ProcessCorner; // FF: 0.82, TT: 1.0, SS: 1.28
  voltage: number; // 0.9V to 1.2V
  temperature: number; // -40°C to 125°C
  calculatedDelayFactor: number; // Delay = Base * CornerFactor * ((Temp + 273)/300)^1.3 * (1.1 / Voltage)
  isTimingViolation: boolean;
}

// GDSII Commercial Macro-Cell Definitions
export interface MacroCell {
  id: string;
  name: string;
  category: string;
  widthUm: number;
  heightUm: number;
  layer: number;
  layerName: string;
  description: string;
  color: string;
}

export interface PlacedMacro {
  id: string;
  macroId: string;
  name: string;
  xUm: number; // Position in floorplan (0 - 1000 um)
  yUm: number;
  widthUm: number;
  heightUm: number;
  layer: number;
  layerName: string;
  color: string;
}

// SAT Solver Logic
export interface SatResult {
  status: 'SATISFIABLE (Design Safe)' | 'UNSATISFIABLE (Deadlock Hazard Detected)';
  isSatisfiable: boolean;
  variables: Record<string, boolean>;
  clauses: string[];
  executionTimeMs: number;
  message: string;
}

// Smart ECO (Engineering Change Order) Delta Patch
export interface EcoPatchResult {
  alteredGates: string[];
  alteredNets: string[];
  maskPenaltyCostUsd: number;
  timestamp: string;
  description: string;
}

// Cleanroom Defect Density & Cost Profitability
export interface YieldProfitability {
  waferDiameterMm: number; // e.g. 300mm
  dieAreaCm2: number; // Area of die in cm2
  defectDensityD0: number; // defects / cm2
  grossDiesPerWafer: number; // DPW
  yieldPercentage: number; // Murphy model
  netUsableDies: number;
  costPerWaferUsd: number; // ~$12,000 for 3nm wafer
  costPerDieUsd: number;
  grossMarginPct: number;
  isProfitable: boolean;
}

// Kansen Logic Efficiency Leaderboard
export interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number; // Silicon Purity Score
  transistorArea: number;
  pvtMarginPs: number;
  costPerDieUsd: number;
  isUser?: boolean;
  badge?: string;
}

