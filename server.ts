import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// API Routes Imports
import rtlRouter from './server/routes/rtl';
import satRouter from './server/routes/sat';
import gdsRouter from './server/routes/gds';
import pvtRouter from './server/routes/pvt';
import vfsRouter from './server/routes/vfs';
import shinzuRouter from './server/routes/shinzu';
import cleanroomRouter from './server/routes/cleanroom';
import drcRouter from './server/routes/drc';
import pdkRouter from './server/routes/pdk';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser for API payload processing
  app.use(express.json());

  // Mount API Endpoints (api routes FIRST)
  app.use('/api/rtl', rtlRouter);
  app.use('/api/sat', satRouter);
  app.use('/api/gds', gdsRouter);
  app.use('/api/pvt', pvtRouter);
  app.use('/api/vfs', vfsRouter);
  app.use('/api/shinzu', shinzuRouter);
  app.use('/api/cleanroom', cleanroomRouter);
  app.use('/api/drc', drcRouter);
  app.use('/api/pdk', pdkRouter);

  // Health probe API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'OK',
      system: 'KANSEN CONSOLE // FULL-STACK',
      timestamp: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV || 'development'
    });
  });

  // Integrate Vite Dev Server / Static Assets Server Middleware
  if (process.env.NODE_ENV !== 'production') {
    console.log('[KANSEN_BOOT] Starting Express server in DEVELOPMENT mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    console.log('[KANSEN_BOOT] Starting Express server in PRODUCTION mode...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind server listener to port 3000 & 0.0.0.0
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`========================================================`);
    console.log(`  KANSEN CONSOLE SYSTEM SERVER ONLINE`);
    console.log(`  Bound to: http://0.0.0.0:${PORT}`);
    console.log(`  Target node environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`========================================================`);
  });
}

startServer().catch((err) => {
  console.error('[CRITICAL_ERR] Kansen core server failed to boot:', err);
  process.exit(1);
});
