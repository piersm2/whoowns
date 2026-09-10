import { openDatabase } from './lib/db.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT || 3001);
const db = openDatabase();
const app = createApp(db);
app.listen(port, () => console.log(`RHTP Navigator API listening on http://localhost:${port}`));
