require('dotenv').config();
const keys = Object.keys(process.env);
const potentialKeys = keys.filter(k => k.includes('DB') || k.includes('URL') || k.includes('POSTGRES') || k.includes('MONGO'));
console.log('Potential DB Keys:', potentialKeys);
