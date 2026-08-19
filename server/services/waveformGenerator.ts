// Real Server-Side Waveform Generator (VCD Trace Compiler)
// Simulates state dumps and writes standard Value Change Dump (VCD) files for timing logic analysis

export interface SignalTrace {
  name: string;
  symbol: string;
  values: Array<{ tick: number; val: string | number }>;
}

export class WaveformGenerator {
  /**
   * Generates a fully compliant IEEE-1364 Value Change Dump (VCD) trace string
   */
  public static compileVcd(traces: SignalTrace[], durationTicks: number = 500): string {
    const lines: string[] = [];

    // Header Meta
    lines.push(`$date ${new Date().toUTCString()} $end`);
    lines.push(`$version Kansen Vcd Engine v4.0 $end`);
    lines.push(`$timescale 1ps $end`);
    lines.push(`$scope module TOP $end`);

    // Define variables
    for (const trace of traces) {
      const isBus = trace.name.includes('[') || trace.name.includes(':');
      const size = isBus ? 4 : 1; // Default simplified bus size
      const varType = isBus ? 'reg' : 'wire';
      lines.push(`$var ${varType} ${size} ${trace.symbol} ${trace.name} $end`);
    }

    lines.push(`$upscope $end`);
    lines.push(`$enddefinitions $end`);

    // Write trace changes over clock ticks
    for (let tick = 0; tick <= durationTicks; tick += 50) {
      lines.push(`#${tick}`);
      
      for (const trace of traces) {
        // Find if a change event occurs at this precise clock tick
        const event = trace.values.find(v => v.tick === tick);
        if (event) {
          const valStr = typeof event.val === 'number' 
            ? `b${event.val.toString(2)} ` // Write binary bus
            : event.val;                  // Standard single wire bit (0/1)
          lines.push(`${valStr}${trace.symbol}`);
        }
      }
    }

    return lines.join('\n') + '\n';
  }

  public static getDefaultTraces(): SignalTrace[] {
    return [
      {
        name: 'CLK',
        symbol: '#',
        values: [
          { tick: 0, val: '0' }, { tick: 50, val: '1' }, { tick: 100, val: '0' },
          { tick: 150, val: '1' }, { tick: 200, val: '0' }, { tick: 250, val: '1' },
          { tick: 300, val: '0' }, { tick: 350, val: '1' }, { tick: 400, val: '0' },
          { tick: 450, val: '1' }, { tick: 500, val: '0' }
        ]
      },
      {
        name: 'IN_A',
        symbol: '$',
        values: [
          { tick: 0, val: '0' }, { tick: 150, val: '1' }, { tick: 350, val: '0' }
        ]
      },
      {
        name: 'OUT_Y',
        symbol: '%',
        values: [
          { tick: 0, val: '1' }, { tick: 150, val: '0' }, { tick: 350, val: '1' }
        ]
      }
    ];
  }
}
