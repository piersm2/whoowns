import { z } from 'zod';
import { crudRouter, str, dateStr } from '../lib/crud.js';

const ChecklistSchema = z.object({
  phase: z.enum(['application', 'award', 'reporting']).default('application'),
  category: str(100).transform((v) => v || 'General'),
  title: z.string().min(1).max(300),
  description: str(),
  is_required: z.coerce.number().int().min(0).max(1).default(1),
  owner: str(200),
  due_date: dateStr(),
  status: z.enum(['not_started', 'in_progress', 'blocked', 'complete', 'na']).default('not_started'),
  evidence_link: str(1000),
  notes: str(),
  sort_order: z.coerce.number().int().default(999),
});

export function checklistRouter(db) {
  return crudRouter(db, 'checklist_item', ChecklistSchema, { orderBy: 'sort_order, id' });
}
