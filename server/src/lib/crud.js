import { Router } from 'express';
import { z } from 'zod';
import { logActivity } from './db.js';

// Small generic CRUD router. `schema` is a zod object describing writable columns.
export function crudRouter(db, table, schema, { orderBy = 'id', onChange } = {}) {
  const r = Router();
  const partial = schema.partial();
  const columns = Object.keys(schema.shape);

  r.get('/', (req, res) => {
    const where = ['hospital_id = ?'];
    const params = [req.hid];
    for (const [k, v] of Object.entries(req.query)) {
      if (columns.includes(k)) { where.push(`${k} = ?`); params.push(v); }
    }
    const sql = `SELECT * FROM ${table} WHERE ${where.join(' AND ')} ORDER BY ${orderBy}`;
    res.json(db.prepare(sql).all(...params));
  });

  r.get('/:id', (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND hospital_id = ?`).get(req.params.id, req.hid);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  });

  r.post('/', (req, res) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    const data = { ...parsed.data, hospital_id: req.hid };
    const keys = Object.keys(data);
    const info = db.prepare(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...keys.map((k) => data[k]));
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(info.lastInsertRowid);
    logActivity(db, table, info.lastInsertRowid, 'create', row.title ?? row.line_item ?? row.description ?? '', req.hid);
    onChange?.(row);
    res.status(201).json(row);
  });

  r.patch('/:id', (req, res) => {
    const parsed = partial.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid input', issues: parsed.error.issues });
    const data = parsed.data;
    const keys = Object.keys(data);
    if (!keys.length) return res.status(400).json({ error: 'No fields to update' });
    const hasUpdated = db.prepare(`SELECT COUNT(*) AS n FROM pragma_table_info('${table}') WHERE name = 'updated_at'`).get().n > 0;
    const sets = keys.map((k) => `${k} = ?`).concat(hasUpdated ? ["updated_at = datetime('now')"] : []);
    const info = db.prepare(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ? AND hospital_id = ?`).run(...keys.map((k) => data[k]), req.params.id, req.hid);
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    logActivity(db, table, req.params.id, 'update', keys.join(','), req.hid);
    onChange?.(row);
    res.json(row);
  });

  r.delete('/:id', (req, res) => {
    const info = db.prepare(`DELETE FROM ${table} WHERE id = ? AND hospital_id = ?`).run(req.params.id, req.hid);
    if (!info.changes) return res.status(404).json({ error: 'Not found' });
    logActivity(db, table, req.params.id, 'delete', '', req.hid);
    res.status(204).end();
  });

  return r;
}

export const str = (max = 5000) => z.string().max(max).default('');
export const num = () => z.coerce.number().default(0);
export const dateStr = () => z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'Use YYYY-MM-DD').default('');
