const axios = require('axios');
const fs = require('fs');
const path = require('path');

const inputFile = 'proxies.csv';
const active = [], dead = [];

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

(async () => {
  const lines = fs.readFileSync(inputFile, 'utf-8').split('\n').filter(x => x.trim());
  const tasks = lines.map(line => {
    const [proxy, port, cc, isp] = line.split(',');
    return checkProxy(proxy.trim(), port.trim(), cc?.trim(), isp?.trim());
  });

  const results = await Promise.all(tasks);
  for (const r of results) {
    if (r.status === 'active') active.push(r.line);
    else dead.push(r.line);
  }

  fs.writeFileSync('active.txt', active.join('\n'));
  fs.writeFileSync('dead.txt', dead.join('\n'));
})();
