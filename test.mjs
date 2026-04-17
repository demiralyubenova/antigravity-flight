import { removeBackground } from '@imgly/background-removal';
import fs from 'fs';

async function test() {
  const blob = new Blob([fs.readFileSync('test.jpg')], { type: 'image/jpeg' });
  try {
    await removeBackground(blob, {
       debug: true
    });
  } catch (e) {
    console.error(e);
  }
}

test();
