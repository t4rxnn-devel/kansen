// Express API route for PVT timing evaluation on the backend
import express from 'express';
import { PvtSimulator } from '../services/pvtSimulator';

const router = express.Router();

router.post('/evaluate', (req, res) => {
  try {
    const { baseDelayNs, corner, voltage, temperature } = req.body;
    
    if (baseDelayNs === undefined || !corner || voltage === undefined || temperature === undefined) {
      return res.status(400).json({ error: 'Missing parameters for PVT timing simulation.' });
    }

    const report = PvtSimulator.simulate(Number(baseDelayNs), {
      corner,
      voltage: Number(voltage),
      temperature: Number(temperature)
    });

    return res.json(report);
  } catch (err: any) {
    return res.status(500).json({ error: 'PVT timing analysis failed.', message: err.message });
  }
});

export default router;
