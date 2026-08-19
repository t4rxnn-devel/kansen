// Express API route for raw GDSII stream compilation and package downloads
import express from 'express';
import { GdsiiBuilder } from '../services/gdsiiBuilder';

const router = express.Router();

router.post('/generate', (req, res) => {
  try {
    const { cellName } = req.body;
    const stream = GdsiiBuilder.buildBinaryGdsStream(cellName || 'TOP_CELL');
    
    return res.json({
      success: true,
      cellName: cellName || 'TOP_CELL',
      recordLengthBytes: stream.length,
      hexRepresentation: Buffer.from(stream.slice(0, 48)).toString('hex').toUpperCase(),
      message: 'GDSII low-level stream records allocated and verified. Layer 1-4 geometry compiled.'
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'GDSII stream failed.', message: err.message });
  }
});

router.post('/tapeout', async (req, res) => {
  try {
    const { cellName, verilogCode, operatorName, securityId, deptCode } = req.body;
    
    if (!cellName || !verilogCode) {
      return res.status(400).json({ error: 'Missing design components for tape-out package.' });
    }

    const zipBuffer = await GdsiiBuilder.buildServerTapeoutZip(
      cellName,
      verilogCode,
      operatorName || 'Kansen Operative',
      securityId || 'SEC-L5',
      deptCode || 'FAB-DEPT'
    );

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=kansen_tapeout_${cellName.toLowerCase()}.zip`);
    return res.send(zipBuffer);
  } catch (err: any) {
    return res.status(500).json({ error: 'Tape-out ZIP compilation crashed.', message: err.message });
  }
});

export default router;
