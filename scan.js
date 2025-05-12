const axios = require('axios');
const fs = require('fs');
const inputFile = 'proxies.csv';
const active = [], dead = [];
const timeoutAfter = 1500;  // Setelah memindai 1500 proxy, beri timeout
const timeoutDuration = 120000; // Timeout selama 2 menit (120000 ms)

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
  let processed = 0; // Untuk menghitung jumlah proxy yang telah diproses

  for (let i = 0; i < lines.length; i++) {
    batch.push(lines[i]);
    processed++;

    // Proses batch setelah ukuran batch tercapai
    if (batch.length === 100 || i === lines.length - 1) {
      console.log(`Memproses batch ${Math.floor(i / 100) + 1}...`);
      await processBatch(batch);
      batch = [];  // Reset batch

      // Jika sudah memproses 1500 proxy, beri waktu delay 2 menit
      if (processed >= timeoutAfter) {
        console.log(`Sudah memproses ${processed} proxy, menunggu selama 2 menit...`);
        await delay(timeoutDuration);  // Timeout 2 menit
        processed = 0; // Reset jumlah proxy yang telah diproses
      }
    }
  }

  // Tulis hasil akhir ke file
  fs.writeFileSync('active.txt', active.join('\n'));
  fs.writeFileSync('dead.txt', dead.join('\n'));
})();
