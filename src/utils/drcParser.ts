export interface DrcViolation {
  id: string;
  line: number;
  type: 'WARNING' | 'ERROR' | 'VIOLATION';
  rule: string;
  message: string;
  codeSnippet?: string;
}

export function runDesignRuleCheck(code: string): DrcViolation[] {
  const violations: DrcViolation[] = [];
  const lines = code.split('\n');

  // 1. Extract inputs, outputs, wires
  const inputRegex = /\binput\s+(?:wire\s+)?(?:\[\d+:\d+\]\s+)?([a-zA-Z0-9_,\s]+)/g;
  const outputRegex = /\boutput\s+(?:reg\s+|wire\s+)?(?:\[\d+:\d+\]\s+)?([a-zA-Z0-9_,\s]+)/g;
  const wireRegex = /\bwire\s+(?:\[\d+:\d+\]\s+)?([a-zA-Z0-9_,\s]+)/g;

  const inputs: string[] = [];
  const outputs: string[] = [];
  const wires: string[] = [];

  // Parse lines for declarations
  lines.forEach((line) => {
    let match;
    // Reset regex indices
    inputRegex.lastIndex = 0;
    outputRegex.lastIndex = 0;
    wireRegex.lastIndex = 0;

    // Inputs
    while ((match = inputRegex.exec(line)) !== null) {
      match[1].split(',').forEach(s => {
        const name = s.trim().replace(';', '');
        if (name && !inputs.includes(name)) inputs.push(name);
      });
    }

    // Outputs
    while ((match = outputRegex.exec(line)) !== null) {
      match[1].split(',').forEach(s => {
        const name = s.trim().replace(';', '');
        if (name && !outputs.includes(name)) outputs.push(name);
      });
    }

    // Wires
    while ((match = wireRegex.exec(line)) !== null) {
      match[1].split(',').forEach(s => {
        const name = s.trim().replace(';', '');
        if (name && !wires.includes(name)) wires.push(name);
      });
    }
  });

  // 2. Scan for violations line-by-line
  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Check for trailing semicolon omissions on logic lines
    const trimmed = line.trim();
    if (
      (trimmed.includes('assign') || trimmed.includes('input') || trimmed.includes('output') || trimmed.includes('wire')) &&
      !trimmed.endsWith(';') &&
      !trimmed.includes('(') &&
      !trimmed.includes(')') &&
      !trimmed.startsWith('//')
    ) {
      violations.push({
        id: `semicolon_${lineNum}`,
        line: lineNum,
        type: 'ERROR',
        rule: 'SYNTAX_RULE_01',
        message: 'Missing terminator semicolon (;) at line end.',
        codeSnippet: trimmed
      });
    }
  });

  // 3. Check for Floating Inputs: declared as input but never read
  inputs.forEach(inputName => {
    let isRead = false;
    lines.forEach((line) => {
      if (line.includes(inputName) && !line.includes('input')) {
        const assignParts = line.split('=');
        if (assignParts.length > 1) {
          if (assignParts[1].includes(inputName)) isRead = true;
        } else if (line.includes('(') && line.includes(inputName)) {
          isRead = true;
        } else if (!line.trim().startsWith('//')) {
          isRead = true;
        }
      }
    });

    if (!isRead) {
      const declLine = lines.findIndex(l => l.includes('input') && l.includes(inputName)) + 1;
      violations.push({
        id: `floating_input_${inputName}`,
        line: declLine > 0 ? declLine : 1,
        type: 'ERROR',
        rule: 'DRC_RULE_FLOAT_IN',
        message: `Floating Input: Port '${inputName}' is declared but never mapped to internal logic.`,
        codeSnippet: `input ${inputName};`
      });
    }
  });

  // 4. Check for Fan-out limit (limit: 3 loads)
  const allSignals = [...inputs, ...wires];
  allSignals.forEach(sigName => {
    let loadCount = 0;
    let firstUsageLine = -1;
    lines.forEach((line, index) => {
      if (line.includes(sigName) && !line.includes('input') && !line.includes('wire') && !line.includes('output')) {
        const assignParts = line.split('=');
        if (assignParts.length > 1 && assignParts[1].includes(sigName)) {
          loadCount++;
          if (firstUsageLine === -1) firstUsageLine = index + 1;
        }
      }
    });

    if (loadCount > 3) {
      violations.push({
        id: `fanout_${sigName}`,
        line: firstUsageLine > 0 ? firstUsageLine : 1,
        type: 'VIOLATION',
        rule: 'DRC_RULE_FANOUT_LIMIT',
        message: `Fan-Out Limit Exceeded: Signal '${sigName}' drives ${loadCount} gates (limit is 3). Buffer insertion required.`,
        codeSnippet: `assign ... = ${sigName};`
      });
    }
  });

  // 5. Check for Multiple Drivers
  wires.forEach(wireName => {
    let driverCount = 0;
    let driverLines: number[] = [];
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('assign') && trimmed.includes(wireName)) {
        const parts = trimmed.split('=');
        if (parts[0].includes(wireName)) {
          driverCount++;
          driverLines.push(index + 1);
        }
      }
    });

    if (driverCount > 1) {
      violations.push({
        id: `multidrive_${wireName}`,
        line: driverLines[1] || 1,
        type: 'ERROR',
        rule: 'DRC_RULE_MULTI_DRIVE',
        message: `Multiple Drivers: Internal wire '${wireName}' is actively driven in multiple lines [${driverLines.join(', ')}].`,
        codeSnippet: `assign ${wireName} = ...;`
      });
    }
  });

  // 6. Check for Undriven Outputs
  outputs.forEach(outName => {
    let isDriven = false;
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('assign') && trimmed.includes(outName)) {
        const parts = trimmed.split('=');
        if (parts[0].includes(outName)) {
          isDriven = true;
        }
      } else if (trimmed.includes('<=') || trimmed.includes('=')) {
        const parts = trimmed.split(/[<=|=]/);
        if (parts[0].includes(outName) && !trimmed.includes('output')) {
          isDriven = true;
        }
      }
    });

    if (!isDriven) {
      const declLine = lines.findIndex(l => l.includes('output') && l.includes(outName)) + 1;
      violations.push({
        id: `undriven_out_${outName}`,
        line: declLine > 0 ? declLine : 1,
        type: 'VIOLATION',
        rule: 'DRC_RULE_UNDRIVEN_OUT',
        message: `Undriven Output: Port '${outName}' is declared but never driven. Port is floating (Hi-Z).`,
        codeSnippet: `output ${outName};`
      });
    }
  });

  return violations;
}
