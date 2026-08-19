// Express API route for SAT Solver logic check
import express from 'express';
import { DPLLSolver } from '../services/satSolver';

const router = express.Router();

router.post('/solve', (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing Verilog buffer for SAT mapping.' });
    }

    const { cnf, varMap } = DPLLSolver.parseVerilogFeedbackToCnf(code);
    const solution = DPLLSolver.solve(cnf);

    // Map numeric literals back to names for human readability
    const variables: Record<string, boolean> = {};
    for (const [varName, numId] of Object.entries(varMap)) {
      if (solution.model && numId in solution.model) {
        variables[varName] = solution.model[numId];
      } else {
        variables[varName] = false; // Default assignments
      }
    }

    const readableClauses = cnf.map(clause => {
      const literals = clause.map(lit => {
        const sign = lit > 0 ? '' : 'NOT ';
        const id = Math.abs(lit);
        const name = Object.keys(varMap).find(k => varMap[k] === id) || `NET_${id}`;
        return `${sign}${name}`;
      });
      return `(${literals.join(' OR ')})`;
    });

    const isSatisfiable = solution.satisfiable;

    return res.json({
      status: isSatisfiable ? 'SATISFIABLE (Design Safe)' : 'UNSATISFIABLE (Deadlock Hazard Detected)',
      isSatisfiable,
      variables,
      clauses: readableClauses,
      message: isSatisfiable
        ? 'DPLL Solver confirmed 0 combinational feedback loops or deadlock hazards.'
        : 'UNSATISFIABLE: Combinational logic loop detected on feedback nets. Refactor to sequential registered DFF state.'
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal SAT engine crash.',
      message: err.message
    });
  }
});

export default router;
