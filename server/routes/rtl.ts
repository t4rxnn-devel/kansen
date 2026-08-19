// Express API route for Verilog synthesis on the backend
import express from 'express';
import { VerilogParser } from '../services/verilogParser';

const router = express.Router();

router.post('/synthesize', (req, res) => {
  try {
    const { code, moduleName } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing Verilog source code buffer.' });
    }

    const compileResult = VerilogParser.parse(code);
    return res.json(compileResult);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'Internal compiler server error.',
      message: err.message
    });
  }
});

export default router;
