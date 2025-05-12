const axios = require('axios');
const fs = require('fs');
const inputFile = 'proxies.csv';  // Your input CSV file
const active = [], dead = [];
const timeoutAfter = 1500;  // After scanning 1500 proxies, give timeout
const timeoutDuration = 120000; // Timeout for 2 minutes (120000 ms)

async function checkProxy(proxy, port) {
  try {
    const res = await axios.get(`https://api2.stupidworld.web.id/check?ip=${proxy}:${port}`, { timeout: 8000 });

    // If proxy is alive, extract the relevant data
    if (res.data.proxyip) {
      const countryCode = res.data.countryCode || 'Unknown';  // Default to 'Unknown' if countryCode is not available
      const isp = res.data.asOrganization || 'Unknown';  // Default to 'Unknown' if ISP is not available
      console.log(`[ACTIVE] ${proxy}:${port} - ${countryCode} - ${isp}`);
      return { status: 'active', line: `${proxy},${port},${countryCode},${isp}` };
    } else {
      console.log(`[DEAD] ${proxy}:${port}`);
      return { status: 'dead', line: `${proxy},${port}` };
    }
  } catch (err) {
    console.log(`[ERROR] ${proxy}:${port}`);
    return { status: 'dead', line: `${proxy},${port}` };
  }
}

// Delay function
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function processBatch(batch) {
  const tasks = batch.map(line => {
    const [proxy, port] = line.split(','); // Assuming the input CSV only has proxy and port
    return checkProxy(proxy.trim(), port.trim());
  });

  const results = await Promise.all(tasks);
  for (const r of results) {
    if (r.status === 'active') active.push(r.line);
    else dead.push(r.line);
  }

  console.log(`Batch complete, temporary results - Active: ${active.length}, Dead: ${dead.length}`);
}

(async () => {
  const lines = fs.readFileSync(inputFile, 'utf-8').split('\n').filter(x => x.trim());
  let batch = [];
  let processed = 0; // To track the number of proxies processed

  for (let i = 0; i < lines.length; i++) {
    batch.push(lines[i]);
    processed++;

    // Process batch after reaching size limit
    if (batch.length === 100 || i === lines.length - 1) {
      console.log(`Processing batch ${Math.floor(i / 100) + 1}...`);
      await processBatch(batch);
      batch = [];  // Reset batch

      // After processing 1500 proxies, give timeout of 2 minutes
      if (processed >= timeoutAfter) {
        console.log(`Processed ${processed} proxies, waiting for 2 minutes...`);
        await delay(timeoutDuration);  // Timeout 2 minutes
        processed = 0; // Reset processed proxy count
      }
    }
  }

  // Write final results to file
  fs.writeFileSync('active.txt', active.join('\n'));
  fs.writeFileSync('dead.txt', dead.join('\n'));
})();
