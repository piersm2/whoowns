import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { logActivity } from '../lib/db.js';

const DocSchema = z.object({
  title: z.string().min(1).max(300),
  doc_type: z.enum(['award', 'assurance', 'financial', 'chna', 'quote', 'letter', 'report', 'invoice', 'submission', 'policy', 'other']).default('other'),
  external_link: z.string().max(1000).default(''),
  related_table: z.string().max(50).default(''),
  related_id: z.coerce.number().int().nullable().default(null),
  notes: z.string().max(5000).default(''),
});

export function documentsRouter(db, uploadDir) {
  fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname).slice(0, 10)}`),
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
  });
  const r = Router();

  r.get('/', (req, res) => {
    const where = [];
    const params = [];
    if (req.query.related_table) { where.push('related_table = ?'); params.push(req.query.related_table); }
    if (req.query.related_id) { where.push('related_id = ?'); params.push(req.query.related_id); }
    res.json(db.prepare(`SELECT * FROM document${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY id DESC`).all(...params));
  });

  r.post('/', upload.single('file'), (req, res) => {
    const parsed = DocSchema.safeParse(req.body);
    if (!parsed.success) {
      if (req.file) fs.rmSync(req.file.path, { force: true });
      return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const d = parsed.data;
    const f = req.file;
    if (!f && !d.external_link) return res.status(400).json({ error: 'Attach a file or provide an external link' });
    const info = db.prepare('INSERT INTO document (title, doc_type, original_name, stored_name, mime_type, size_bytes, external_link, related_table, related_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(d.title, d.doc_type, f?.originalname ?? '', f?.filename ?? '', f?.mimetype ?? '', f?.size ?? 0, d.external_link, d.related_table, d.related_id, d.notes);
    logActivity(db, 'document', info.lastInsertRowid, 'create', d.title);
    res.status(201).json(db.prepare('SELECT * FROM document WHERE id = ?').get(info.lastInsertRowid));
  });

  r.get('/:id/file', (req, res) => {
    const doc = db.prepare('SELECT * FROM document WHERE id = ?').get(req.params.id);
    if (!doc || !doc.stored_name) return res.status(404).json({ error: 'Not found' });
    res.download(path.join(uploadDir, doc.stored_name), doc.original_name || doc.stored_name);
  });

  r.delete('/:id', (req, res) => {
    const doc = db.prepare('SELECT * FROM document WHERE id = ?').get(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Not found' });
    if (doc.stored_name) fs.rmSync(path.join(uploadDir, doc.stored_name), { force: true });
    db.prepare('DELETE FROM document WHERE id = ?').run(req.params.id);
    logActivity(db, 'document', req.params.id, 'delete', doc.title);
    res.status(204).end();
  });

  return r;
}
