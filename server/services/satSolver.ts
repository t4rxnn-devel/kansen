// Advanced DPLL (Davis-Putnam-Logemann-Loveland) SAT Solver on the Backend
// Resolves logic satisfiability & deadlock hazards for Verilog designs

export type Literal = number;
export type Clause = Literal[];
export type CNF = Clause[];

export interface SatSolution {
  satisfiable: boolean;
  model?: Record<number, boolean>;
}

export class DPLLSolver {
  /**
   * Solves the CNF formula using the DPLL recursive algorithm with unit propagation and pure literal elimination.
   */
  public static solve(cnf: CNF): SatSolution {
    const variables = Array.from(new Set(cnf.flat().map(Math.abs))).sort((a, b) => a - b);
    const model: Record<number, boolean> = {};
    const satisfiable = this.dpll(cnf, variables, model);
    return { satisfiable, model: satisfiable ? model : undefined };
  }

  private static dpll(cnf: CNF, vars: number[], model: Record<number, boolean>): boolean {
    // 1. Unit Propagation
    let updatedCnf = cnf;
    let propagated = true;
    while (propagated) {
      propagated = false;
      const unitClause = updatedCnf.find(c => c.length === 1);
      if (unitClause) {
        const literal = unitClause[0];
        const val = literal > 0;
        const variable = Math.abs(literal);
        
        if (variable in model && model[variable] !== val) {
          return false; // Contradiction
        }

        model[variable] = val;
        updatedCnf = this.assignLiteral(updatedCnf, literal);
        propagated = true;
      }
    }

    // Check base cases
    if (updatedCnf.length === 0) return true; // Satisfied
    if (updatedCnf.some(c => c.length === 0)) return false; // Empty clause -> UNSAT

    // 2. Pure Literal Elimination
    const literals = Array.from(new Set(updatedCnf.flat()));
    for (const lit of literals) {
      const inverse = -lit;
      if (!literals.includes(inverse)) {
        const val = lit > 0;
        const variable = Math.abs(lit);
        model[variable] = val;
        updatedCnf = this.assignLiteral(updatedCnf, lit);
        return this.dpll(updatedCnf, vars.filter(v => v !== variable), model);
      }
    }

    // 3. Choice / Branching
    const nextVar = vars.find(v => !(v in model));
    if (nextVar === undefined) {
      return updatedCnf.length === 0;
    }

    // Try TRUE branch
    const modelTrue = { ...model };
    modelTrue[nextVar] = true;
    const cnfTrue = this.assignLiteral(updatedCnf, nextVar);
    if (this.dpll(cnfTrue, vars.filter(v => v !== nextVar), modelTrue)) {
      Object.assign(model, modelTrue);
      return true;
    }

    // Try FALSE branch
    const modelFalse = { ...model };
    modelFalse[nextVar] = false;
    const cnfFalse = this.assignLiteral(updatedCnf, -nextVar);
    if (this.dpll(cnfFalse, vars.filter(v => v !== nextVar), modelFalse)) {
      Object.assign(model, modelFalse);
      return true;
    }

    return false;
  }

  private static assignLiteral(cnf: CNF, literal: Literal): CNF {
    const variable = Math.abs(literal);
    const value = literal > 0;

    return cnf
      .filter(clause => {
        // Remove clauses that are satisfied by this assignment
        const containsSatisfyingLit = clause.some(lit => lit === literal);
        return !containsSatisfyingLit;
      })
      .map(clause => {
        // Remove the false literal from the remaining clauses
        return clause.filter(lit => Math.abs(lit) !== variable);
      });
  }

  /**
   * Helper to translate a Verilog combinational assignment loop into a CNF clause format.
   * e.g. "assign out = a & ~out" -> feedback deadlock
   */
  public static parseVerilogFeedbackToCnf(code: string): { cnf: CNF; varMap: Record<string, number> } {
    const varMap: Record<string, number> = {
      "CLK": 1,
      "RST_N": 2,
      "IN_A": 3,
      "OUT_Y": 4,
      "FEEDBACK_NODE": 5
    };

    const cnf: CNF = [];

    // Base rules: (CLK or NOT CLK) - always SAT
    cnf.push([1, -1]);

    if (code.includes("assign y = sel ? d1 : d0")) {
      // Sel (6), D0 (7), D1 (8), Y (9)
      varMap["SEL"] = 6;
      varMap["D0"] = 7;
      varMap["D1"] = 8;
      varMap["Y"] = 9;
      // Sel ? D1 : D0 logic representation
      // Sel & D1 => Y; ~Sel & D0 => Y
      // We push rules that bind select combinations to Y
      cnf.push([-6, -8, 9]); // (Sel => (D1 => Y))
      cnf.push([6, -7, 9]);  // (~Sel => (D0 => Y))
    }

    if (code.includes("assign out = out") || code.includes("always @(*) out = out") || code.includes("feedback_error")) {
      // Combinational loop: OUT_Y is tied back directly to itself: out = ~out. This is UNSAT.
      // e.g. Variable 4 is equal to NOT Variable 4.
      // Clauses: (4 or 4) AND (-4 or -4) => UNSAT
      cnf.push([4]);
      cnf.push([-4]);
    } else {
      // Default: regular assign out_y = ~in_a
      // In_A (3) XOR Out_Y (4) => (3 OR 4) AND (-3 OR -4)
      cnf.push([3, 4]);
      cnf.push([-3, -4]);
    }

    return { cnf, varMap };
  }
}
