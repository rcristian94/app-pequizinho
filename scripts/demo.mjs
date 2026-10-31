import {writeFile} from 'node:fs/promises';
import {curriculum} from '../src/curriculum.mjs';
await writeFile('public/demo-lessons.json',JSON.stringify(curriculum));
