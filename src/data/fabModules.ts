import { FabModule } from '../types';

export const fabModulesData: FabModule[] = [
  {
    id: 'cz-ingot',
    title: '1. Czochralski Silicon Crystal Growth',
    subtitle: 'Ultra-Pure Monocrystalline Ingot Pulling & Dopant Thermodynamics',
    sector: 'ALPHA',
    clearanceLevel: 'LEVEL-1 // CRYSTAL-PHYSICS',
    icon: 'Flame',
    description: 'Master the Czochralski (CZ) crystal growth process. Electronic grade silicon (99.999999999% 11-Nines purity) is melted in a quartz crucible at 1425°C, seeded with a single crystal, and rotated while slowly pulled to form a 300mm monocrystalline ingot.',
    targetTemp: '1425°C',
    cleanlinessReq: 'ISO 5 Vacuum Furnace',
    waferLayer: 'Diffusion',
    badgeName: 'CZ CRYSTAL PULLER CERTIFIED',
    steps: [
      {
        stepNumber: 1,
        title: 'Crucible Loading & Segregation Thermodynamics',
        subtitle: 'Quartz Crucible Thermal Equilibrium',
        description: 'Polysilicon chunks are melted along with Boron (p-type, k0=0.8) or Phosphorus (n-type, k0=0.35) dopants. Segregation formula governs dopant distribution along ingot axis.',
        formulaOrParam: 'C_solid(f) = k0 * C0 * (1 - f)^(k0 - 1) [k0_Boron = 0.8, k0_Phos = 0.35]',
        keyMetric: 'Silicon Purity: 11-Nines (99.999999999%)',
        interactiveControl: {
          name: 'Crucible Temperature',
          unit: '°C',
          min: 1380,
          max: 1470,
          defaultVal: 1425,
          targetVal: 1425,
          tolerance: 10,
          impactDescription: 'Maintain 1425°C liquid phase transition without nucleating multi-crystalline grain boundaries.'
        }
      },
      {
        stepNumber: 2,
        title: 'Seed Dip & Dash Necking Dislocation Elimination',
        subtitle: 'Dislocation Migration Dynamics',
        description: 'A 3mm single-crystal seed is dipped into the melt surface. Pulling at 180 mm/hr forms a 3mm neck, forcing all dislocations out to the crystal boundary.',
        keyMetric: 'Dislocation Density: 0 / cm²',
        interactiveControl: {
          name: 'Seed Pull Speed',
          unit: 'mm/hr',
          min: 50,
          max: 300,
          defaultVal: 180,
          targetVal: 180,
          tolerance: 15,
          impactDescription: 'Excessive speed snaps the crystal neck; too slow retains stress dislocations.'
        }
      }
    ],
    quiz: [
      {
        question: 'What is the primary purpose of the Dash necking technique during Czochralski growth?',
        options: [
          'To increase dopant incorporation into the crystal',
          'To force dislocations out of the single-crystal seed',
          'To reduce quartz crucible temperature',
          'To increase wafer surface thickness'
        ],
        correctAnswer: 1,
        explanation: 'Dash necking rapidly pulls a thin crystal neck, allowing thermal dislocations to migrate out to the seed surface.'
      }
    ]
  },
  {
    id: 'wafer-slice',
    title: '2. Wafer Slicing & Polishing Substrates',
    subtitle: 'Diamond Wire Sawing & Chemical Mechanical Polishing (CMP)',
    sector: 'ALPHA',
    clearanceLevel: 'LEVEL-2 // SUBSTRATE-FAB',
    icon: 'Layers',
    description: 'Transform grown monocrystalline boules into mirror-flat 300mm silicon wafers (775µm thickness). High-speed diamond wire saws slice the ingot, followed by edge profiling and dual-sided Chemical Mechanical Polishing (CMP).',
    targetTemp: '22.0°C (Slurry Temp)',
    cleanlinessReq: 'ISO 4 Substrate Bay',
    waferLayer: 'Polysilicon',
    badgeName: 'SUBSTRATE POLISHING CERTIFIED',
    steps: [
      {
        stepNumber: 1,
        title: 'Diamond Wire Sawing & Kerf Loss Optimization',
        subtitle: 'Sub-100µm Wire Motion',
        description: 'Electroplated diamond wires moving at 30 m/s slice 300mm boules into raw wafers. Wire tension and feed rate control kerf loss and Total Thickness Variation (TTV).',
        formulaOrParam: 'TTV = Thickness_max - Thickness_min (< 0.5 µm target)',
        keyMetric: 'Wafer Thickness: 775.0 ± 0.5 µm',
        interactiveControl: {
          name: 'Wire Speed',
          unit: 'm/s',
          min: 10,
          max: 50,
          defaultVal: 30,
          targetVal: 30,
          tolerance: 3,
          impactDescription: 'Optimized wire speed reduces micro-cracking and kerf loss.'
        }
      },
      {
        stepNumber: 2,
        title: 'Chemical Mechanical Polishing (CMP) Nano-Planarization',
        subtitle: 'Preston Equation Slurry Removal',
        description: 'Colloidal silica slurry combined with KOH chemically reacts with silicon surface while polyurethane pads mechanically polish down surface asperities to sub-angstrom flatness.',
        formulaOrParam: 'MRR = K_p * P * V [Material Removal Rate via Preston Constant]',
        keyMetric: 'Surface Roughness Ra: < 0.08 nm',
        interactiveControl: {
          name: 'Downforce Pressure',
          unit: 'PSI',
          min: 1,
          max: 10,
          defaultVal: 4,
          targetVal: 4,
          tolerance: 0.5,
          impactDescription: 'Higher downforce increases removal rate but risks dishing and scratching.'
        }
      }
    ],
    quiz: [
      {
        question: 'Which equation governs the Material Removal Rate (MRR) in Chemical Mechanical Polishing?',
        options: [
          'Preston Equation (MRR = Kp * P * V)',
          'Bragg Law (2d sinθ = nλ)',
          'Fick Second Law of Diffusion',
          'Maxwell Faraday Induction Law'
        ],
        correctAnswer: 0,
        explanation: 'The Preston equation states that material removal rate is proportional to applied pressure P and relative velocity V.'
      }
    ]
  },
  {
    id: 'photolitho-ach',
    title: '3. Photolithography & Cleanroom ACH Management',
    subtitle: 'EUV 13.5nm Sub-3nm Litho & 400-600 ACH Airflow Modeling',
    sector: 'ALPHA',
    clearanceLevel: 'LEVEL-3 // ULPA-LITHO',
    icon: 'Zap',
    description: 'Master Extreme Ultraviolet (EUV) photolithography at 13.5nm alongside cleanroom Air Changes Per Hour (ACH) environmental controls. ISO Class 3 requires 400 - 600 ACH with 100% ceiling ULPA filter coverage to prevent sub-micron air contamination.',
    targetTemp: '20.0°C (±0.01°C Climate)',
    cleanlinessReq: 'ISO 3 (400-600 ACH)',
    waferLayer: 'Polysilicon',
    badgeName: 'EUV & ACH CONTROLLER CERTIFIED',
    steps: [
      {
        stepNumber: 1,
        title: 'Cleanroom Laminar ACH Airflow Modeling',
        subtitle: 'ISO Class 3 ULPA Filter Coverage',
        description: 'ULPA filters rated at 99.9995% efficiency for 0.12µm particles pump unidirectional vertical air downward at 0.45 m/s, yielding 500 Air Changes Per Hour (ACH).',
        formulaOrParam: 'ACH = (Airflow_CFM * 60) / Cleanroom_Volume_FT3 (Target: 400 - 600 ACH)',
        keyMetric: 'Air Turnover Rate: 520 ACH',
        interactiveControl: {
          name: 'Laminar Airflow ACH',
          unit: 'ACH',
          min: 200,
          max: 800,
          defaultVal: 500,
          targetVal: 500,
          tolerance: 50,
          impactDescription: 'ACH below 400 violates ISO 3 particle limits; ACH above 600 generates air turbulence.'
        }
      },
      {
        stepNumber: 2,
        title: 'EUV 13.5nm Laser Produced Plasma (LPP) Exposure',
        subtitle: 'Sub-Wavelength Pattern Transfer',
        description: 'Tin droplets hit by twin CO2 laser pulses at 50kHz produce 13.5nm photons in hydrogen vacuum. Multi-layer Mo/Si Bragg mirrors focus the beam onto wafer photoresist.',
        formulaOrParam: 'CD = k1 * (λ / NA) [EUV λ = 13.5nm, NA = 0.33, k1 = 0.28 -> CD = 11.4nm]',
        keyMetric: 'Overlay Error: < 0.9 nm',
        interactiveControl: {
          name: 'EUV Dose',
          unit: 'mJ/cm²',
          min: 10,
          max: 100,
          defaultVal: 48,
          targetVal: 48,
          tolerance: 3,
          impactDescription: 'Correct exposure dose ensures precise Critical Dimension without line necking.'
        }
      }
    ],
    quiz: [
      {
        question: 'What is the required Air Changes Per Hour (ACH) range for an ISO Class 3 semiconductor cleanroom?',
        options: ['10 - 20 ACH', '50 - 100 ACH', '400 - 600 ACH', '1,000 - 2,000 ACH'],
        correctAnswer: 2,
        explanation: 'ISO Class 3 cleanrooms require 400 to 600 Air Changes Per Hour with 100% ceiling ULPA filtration.'
      }
    ]
  },
  {
    id: 'plasma-etch',
    title: '4. Plasma Etching Gas Ratios & RIE Anisotropy',
    subtitle: 'Fluorocarbon Gas Chemistry & Directional RF Ion Bombardment',
    sector: 'ALPHA',
    clearanceLevel: 'LEVEL-4 // PLASMA-ETCH',
    icon: 'Zap',
    description: 'Anisotropic Reactive Ion Etching (RIE) carves 3D FinFET fins and GAA nanosheets. Regulate physical ion bombardment (Ar+) and chemical gas ratios (SF6 / C4F8 / O2) in ICP chambers.',
    targetTemp: '60°C Chamber Wall',
    cleanlinessReq: 'High Vacuum 10⁻⁴ Torr',
    waferLayer: 'Etch',
    badgeName: 'PLASMA ETCH ENGINEER CERTIFIED',
    steps: [
      {
        stepNumber: 1,
        title: 'SF6 / C4F8 Gas Ratio Optimization',
        subtitle: 'Bosch Deep Reactive Ion Etch (DRIE)',
        description: 'SF6 gas generates fluorocarbon radicals (F*) for chemical silicon etching, while C4F8 deposits a protective Teflon-like polymer passivation layer on sidewalls.',
        formulaOrParam: 'Gas Ratio = SF6_flow / C4F8_flow (Optimal = 1.42)',
        keyMetric: 'Etch Selectivity: 45:1 (Si : Photoresist)',
        interactiveControl: {
          name: 'SF6 / C4F8 Ratio',
          unit: 'ratio',
          min: 0.5,
          max: 3.0,
          defaultVal: 1.42,
          targetVal: 1.42,
          tolerance: 0.1,
          impactDescription: 'Excess SF6 causes isotropic undercut; excess C4F8 chokes high-aspect vertical trenches.'
        }
      },
      {
        stepNumber: 2,
        title: 'DC Substrate Bias Acceleration',
        subtitle: 'Directional Physical Sputtering',
        description: 'RF substrate power creates a negative self-bias voltage, accelerating SF5+ ions perpendicular to wafer surface to break bottom passivation.',
        keyMetric: 'Anisotropy Factor A: 0.995',
        interactiveControl: {
          name: 'RF Substrate Bias',
          unit: 'Volts',
          min: 50,
          max: 500,
          defaultVal: 220,
          targetVal: 220,
          tolerance: 15,
          impactDescription: 'Higher bias increases vertical ion energy and sputtering rate.'
        }
      }
    ],
    quiz: [
      {
        question: 'In Bosch DRIE, what role does C4F8 gas play during plasma etching?',
        options: [
          'It passivates sidewalls with a polymer film to prevent lateral undercut',
          'It acts as an optical developer for photoresist',
          'It increases chamber vacuum pressure to atmospheric level',
          'It dilutes pure argon gas'
        ],
        correctAnswer: 0,
        explanation: 'C4F8 forms a protective fluorocarbon polymer passivating sidewalls while ions clear bottom surfaces.'
      }
    ]
  },
  {
    id: 'defect-yield',
    title: '5. Airborne Defect Density & ISO 14644 Yield Math',
    subtitle: 'Particulate Defect Density & Murphy / Seeds Yield Modeling',
    sector: 'ALPHA',
    clearanceLevel: 'LEVEL-5 // YIELD-MASTER',
    icon: 'Shield',
    description: 'Calculate wafer die yield based on ISO 14644 airborne particulate limits and Murphy/Poisson defect density models. Determine economic viability for sub-3nm chip production runs.',
    targetTemp: '20.0°C / 45% Humidity',
    cleanlinessReq: 'ISO 3 (Class 1)',
    waferLayer: 'ISO-3',
    badgeName: 'YIELD ARCHITECT MASTER CERTIFIED',
    steps: [
      {
        stepNumber: 1,
        title: 'ISO 14644 Airborne Particulate Concentration',
        subtitle: 'Particle Size Distribution Equation',
        description: 'ISO 14644 specifies maximum particle concentration Cn for particle sizes N. ISO 3 limits particles >= 0.1µm to 35 per cubic meter.',
        formulaOrParam: 'Cn = 10^N_class * (0.1 / D)^2.08 [ISO 3: C_0.1 = 35 / m³]',
        keyMetric: 'Defect Density D0: 0.04 defects / cm²',
        interactiveControl: {
          name: 'Defect Density D0',
          unit: 'defects/cm²',
          min: 0.01,
          max: 0.5,
          defaultVal: 0.04,
          targetVal: 0.04,
          tolerance: 0.01,
          impactDescription: 'Lower defect density exponentially increases usable die yield on large chips.'
        }
      },
      {
        stepNumber: 2,
        title: 'Murphy Die Yield Model Calculation',
        subtitle: 'Chip Area vs. Defect Density Impact',
        description: 'The Murphy model calculates yield Y for die area A and defect density D0. For a 1.2 cm² die and D0 = 0.04, yield exceeds 95%.',
        formulaOrParam: 'Yield Y = ((1 - exp(-D0 * A)) / (D0 * A))^2',
        keyMetric: 'Calculated Die Yield: 95.8%',
        interactiveControl: {
          name: 'Die Area A',
          unit: 'cm²',
          min: 0.2,
          max: 3.0,
          defaultVal: 1.2,
          targetVal: 1.2,
          tolerance: 0.2,
          impactDescription: 'Larger die sizes suffer steeper yield drops for given defect density D0.'
        }
      }
    ],
    quiz: [
      {
        question: 'According to Murphy Yield Model, how does increasing die area A affect chip yield Y for a fixed defect density D0?',
        options: [
          'Yield decreases non-linearly with increasing die area',
          'Yield increases linearly',
          'Yield remains unchanged',
          'Yield doubles for every 1 cm² increase'
        ],
        correctAnswer: 0,
        explanation: 'Larger die areas have a higher probability of containing a killer defect, driving yield down non-linearly.'
      }
    ]
  }
];
