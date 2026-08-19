// Express API route to serve 3nm PDK cells & SPICE netlists
import express from 'express';
import { PdkDatabase } from '../services/pdkDatabase';

const router = express.Router();

router.get('/cells', (req, res) => {
  try {
    const cells = PdkDatabase.getCells();
    return res.json({ success: true, count: Object.keys(cells).length, cells });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve PDK cells.', message: err.message });
  }
});

router.get('/cells/:name', (req, res) => {
  try {
    const { name } = req.params;
    const cell = PdkDatabase.getCell(name.toUpperCase());
    if (!cell) {
      return res.status(404).json({ error: `PDK Cell '${name}' not found in standard library catalog.` });
    }
    return res.json({ success: true, cell });
  } catch (err: any) {
    return res.status(500).json({ error: 'PDK cell lookup crashed.', message: err.message });
  }
});

export default router;
