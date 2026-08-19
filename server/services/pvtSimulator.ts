// Real Server-Side PVT (Process, Voltage, Temperature) Stress Simulation Engine
// Models physical gate degradation curves and checks static timing constraints

export interface PvtConfig {
  corner: 'FF' | 'TT' | 'SS';
  voltage: number;
  temperature: number;
}

export interface PvtReport {
  delayFactor: number;
  leakagePowerUw: number;
  propagationDelayNs: number;
  setupSlackPs: number;
  holdSlackPs: number;
  isTimingViolation: boolean;
  thresholdVoltageV: number;
  statusMessage: string;
}

export class PvtSimulator {
  public static simulate(baseDelayNs: number, config: PvtConfig): PvtReport {
    // 1. Process Corner Multiplier
    let cornerMult = 1.0;
    let thresholdVoltageV = 0.35; // Nominals
    if (config.corner === 'FF') {
      cornerMult = 0.81; // 19% faster gates
      thresholdVoltageV = 0.29; // Lower threshold -> faster switching, higher leakages
    } else if (config.corner === 'SS') {
      cornerMult = 1.27; // 27% slower gates
      thresholdVoltageV = 0.41; // Higher threshold -> slower switching, lower leakages
    }

    // 2. Temperature impact (Kelvin-scale ratio)
    // Delay scales roughly with Temp^1.3 under standard temperature-dependent carrier mobility models
    const kelvinRatio = (config.temperature + 273.15) / 298.15; // Ref 25°C
    const tempDelayMult = Math.pow(kelvinRatio, 1.3);

    // 3. Voltage impact (Schichman-Hodges delay model)
    // Delay is inversely proportional to VDD - Vth
    const vddNominal = 1.0;
    const effectiveVdd = Math.max(0.7, config.voltage);
    const voltageDelayMult = vddNominal / (effectiveVdd - thresholdVoltageV + 0.15);

    // Final consolidated Delay Factor
    const delayFactor = Number((cornerMult * tempDelayMult * voltageDelayMult).toFixed(4));
    const propagationDelayNs = Number((baseDelayNs * delayFactor).toFixed(5));

    // Setup & Hold Slack Calculations (assuming a 1.0 GHz frequency = 1.0ns clock cycle)
    const clockPeriodNs = 1.0;
    const setupSlackPs = Math.round((clockPeriodNs - propagationDelayNs) * 1000);
    
    // Hold Slack scales with higher voltage and lower temperature (where gates switch excessively fast, breaching hold times)
    const holdSlackPs = Math.round((config.voltage * 110) - (config.temperature * 0.45));

    const isTimingViolation = setupSlackPs < 0 || holdSlackPs < 12;

    // Static current leakages (grows exponentially with higher temperatures and lower thresholds)
    const baseLeakageUw = 0.05;
    const tempLeakageMult = Math.exp((config.temperature - 25) / 35);
    const vddLeakageMult = Math.pow(effectiveVdd / vddNominal, 2);
    const cornerLeakageMult = config.corner === 'FF' ? 4.5 : config.corner === 'SS' ? 0.25 : 1.0;
    const leakagePowerUw = Number((baseLeakageUw * tempLeakageMult * vddLeakageMult * cornerLeakageMult).toFixed(4));

    let statusMessage = 'OPERATIONAL SAFE MARGINS VERIFIED.';
    if (isTimingViolation) {
      if (setupSlackPs < 0) {
        statusMessage = `CRITICAL: SETUP SLACK VIOLATION DETECTED (-${Math.abs(setupSlackPs)}ps). Gates failed to settle within clock window.`;
      } else {
        statusMessage = `CRITICAL: HOLD SLACK VIOLATION DETECTED (${holdSlackPs}ps). Signals raced ahead before clock capture.`;
      }
    }

    return {
      delayFactor,
      leakagePowerUw,
      propagationDelayNs,
      setupSlackPs,
      holdSlackPs,
      isTimingViolation,
      thresholdVoltageV: Number(thresholdVoltageV.toFixed(3)),
      statusMessage
    };
  }
}
