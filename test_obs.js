const fs = require('fs');
eval(fs.readFileSync('obs-ws.min.js', 'utf8'));
console.log(Object.keys(global));
