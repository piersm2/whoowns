import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hospitalRouter, dashboardRouter } from './routes/hospital.js';
import { referenceRouter } from './routes/reference.js';
import { checklistRouter } from './routes/checklist.js';
import { narrativeRouter } from './routes/narrative.js';
import { budgetRouter } from './routes/budget.js';
import { complianceRouter } from './routes/compliance.js';
import { documentsRouter } from './routes/documents.js';
import { hospitalsRouter, directoryRouter, hospitalScope } from './routes/hospitals.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(db, { uploadDir } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  const api = express.Router();
  api.get('/health', (req, res) => res.json({ ok: true }));
  api.use('/hospitals', hospitalsRouter(db));
  api.use('/directory', directoryRouter(db));
  api.use(hospitalScope(db));
  api.use('/hospital', hospitalRouter(db));
  api.use('/dashboard', dashboardRouter(db));
  api.use('/reference', referenceRouter(db));
  api.use('/checklist', checklistRouter(db));
  api.use('/narrative', narrativeRouter(db));
  api.use('/budget', budgetRouter(db));
  api.use('/compliance', complianceRouter(db));
  api.use('/documents', documentsRouter(db, uploadDir ?? path.join(__dirname, '..', 'uploads')));
  api.get('/activity', (req, res) => res.json(db.prepare('SELECT * FROM activity_log WHERE hospital_id = ? ORDER BY id DESC LIMIT 100').all(req.hid)));
  app.use('/api', api);

  // Serve the built client in production.
  const dist = path.join(__dirname, '..', '..', 'client', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res, next) => (req.path.startsWith('/api') ? next() : res.sendFile(path.join(dist, 'index.html'))));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
    res.status(status).json({ error: err.message || 'Server error' });
  });
  return app;
}
