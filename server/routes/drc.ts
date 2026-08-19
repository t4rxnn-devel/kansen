// Express API route for Layout Design Rule Checking (DRC) validation
import express from 'express';
import { DrcEngine } from '../services/drcEngine';

const router = express.Router();

router.post('/verify', (req, res) => {
  try {
    const { layoutElements } = req.body;
    
    // Fallback if no layout elements provided
    const elements = layoutElements || [
      { layer: 'M1', width: 0.012, height: 0.05, x: 0.1, y: 0.1 },
      { layer: 'M1', width: 0.008, height: 0.04, x: 0.105, y: 0.1 } // Spacing violation
    ];

    const report = DrcEngine.verifyLayout(elements);
    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: 'DRC evaluation crashed.', message: err.message });
  }
});

export default router;
