const axios = require('axios');
const fs = require('fs');
const inputFile = 'proxies.csv';
const active = [], dead = [];
const batchSize = 100;  // Mengatur ukuran batch
const delayTime = 180000; // Delay waktu 3 menit (180000 ms)

async function checkProxy(proxy, port, cc, isp) {
  try {
    const res = await axios.get(`https://api2.stupidworld.web.id/check?ip=${proxy}:${port}`, { timeout: 8000 });
    if (res.data.proxyip) {
      console.log(`[ACTIVE] ${proxy}:${port} - ${cc} - ${isp}`);
      return { status: 'active', line: `${proxy},${port},${cc},${isp}` };
    } else {
      console.log(`[DEAD] ${proxy}:${port} - ${cc} - ${isp}`);
      return { status: 'dead', line: `${proxy},${port},${cc},${isp}` };
    }
  } catch (err) {
    console.log(`[ERROR] ${proxy}:${port} - ${cc} - ${isp}`);
    return { status: 'dead', line: `${proxy},${port},${cc},${isp}` };
  }
}

// Fungsi untuk delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function processBatch(batch) {
  const tasks = batch.map(line => {
    const [proxy, port, cc, isp] = line.split(',');
    return checkProxy(proxy.trim(), port.trim(), cc?.trim(), isp?.trim());
  });

  const results = await Promise.all(tasks);
  for (const r of results) {
    if (r.status === 'active') active.push(r.line);
    else dead.push(r.line);
  }

  console.log(`Batch selesai, hasil sementara - Active: ${active.length}, Dead: ${dead.length}`);
}

(async () => {
  const lines = fs.readFileSync(inputFile, 'utf-8').split('\n').filter(x => x.trim());
  let batch = [];
  
  for (let i = 0; i < lines.length; i++) {
    batch.push(lines[i]);

    // Jika batch sudah cukup besar, proses dan tunggu sebelum lanjut ke batch berikutnya
    if (batch.length === batchSize || i === lines.length - 1) {
      console.log(`Memproses batch ${Math.floor(i / batchSize) + 1}...`);
      await processBatch(batch);
      batch = [];  // Reset batch
      if (i !== lines.length - 1) {
        console.log(`Menunggu 3 menit sebelum melanjutkan...`);
        await delay(delayTime);  // Tunggu 3 menit
      }
    }
  }

  // Tulis hasil akhir
  fs.writeFileSync('active.txt', active.join('\n'));
  fs.writeFileSync('dead.txt', dead.join('\n'));
})();
