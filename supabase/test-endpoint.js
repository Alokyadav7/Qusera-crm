const http = require('http');

console.log('Sending request to http://localhost:3000/api/run-migration...');
http.get('http://localhost:3000/api/run-migration', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('Response Body:', data);
  });
}).on('error', (err) => {
  console.error('Request Error:', err.message);
});
