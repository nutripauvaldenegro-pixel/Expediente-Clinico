const fs = require('fs');
let envFile = fs.readFileSync('sigem/.env', 'utf-8');
console.log("ENV IS", envFile);
