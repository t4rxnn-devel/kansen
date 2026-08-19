// Express API route for ISO Class 3 Cleanroom calculations
import express from 'express';
import { YieldProfitabilityEngine } from '../../src/utils/kansenEngine';

const router = express.Router();

router.post('/yield', (req, res) => {
  try {
    const { dieAreaMm2, defectDensityD0 } = req.body;
    if (dieAreaMm2 === undefined || defectDensityD0 === undefined) {
      return res.status(400).json({ error: 'dieAreaMm2 and defectDensityD0 are required parameters.' });
    }

    const calculations = YieldProfitabilityEngine.calculateYield(
      Number(dieAreaMm2),
      Number(defectDensityD0)
    );

    return res.json({
      success: true,
      ...calculations,
      standards: {
        isoClass: 3,
        permittedParticlesPerM3: 35, // For particles >= 0.1um
        requiredAirChangesPerHour: '400 - 600 ACH',
        filtrationCoverage: '100% ULPA ceiling coverage'
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Cleanroom yield calculation crashed.', message: err.message });
  }
});

export default router;
