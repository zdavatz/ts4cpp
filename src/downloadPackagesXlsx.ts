import fs from 'fs';
import Path from 'path';
import https from 'https';
import { IncomingHttpHeaders } from 'http';

export async function download() {
  const options = {
    host: 'www.swissmedic.ch',
    port: 443,
    path: '/dam/swissmedic/de/dokumente/internetlisten/zugelassene_packungen_human.xlsx.download.xlsx/zugelassene_packungen_ham.xlsx',
  };
  let headers = await new Promise<IncomingHttpHeaders>((resolve, reject)=> {
    const agent = new https.Agent({ keepAlive: false });
    const req = https.request({ ...options, agent, method: 'HEAD' }, (res)=> {
      resolve(res.headers);
    });
    req.on('error', reject);
    req.end();
  });
  const contentLength = headers['content-length'];
  var needToDownload = true;
  const filePath = Path.join('input', 'zugelassene_packungen_ham.xlsx');
  try {
    const stat = await fs.promises.stat(filePath);
    const size = stat.size;
    if (contentLength !== undefined && parseInt(contentLength) === size) {
      needToDownload = false;
    }
  } catch (e) {
    console.log('Cannot read existing zugelassene_packungen_ham.xlsx');
  }
  if (!needToDownload) {
    console.log('No need to download zugelassene_packungen_ham.xlsx');
    return;
  }
  console.log(`Downloading zugelassene_packungen_ham.xlsx, size: ${contentLength}`);
  const file = fs.createWriteStream(filePath);
  await new Promise((resolve, reject)=> {
    const request = https.request({ ...options, method: 'GET' }, (res)=> {
      res.pipe(file);
      file.on('finish', ()=> {
        file.close();
        resolve(null);
      })
    });
    request.on('error', async (error)=> {
      await fs.promises.unlink(filePath);
      reject(error);
    })
    request.end();
  });
  console.log(`Downloaded`);
}
