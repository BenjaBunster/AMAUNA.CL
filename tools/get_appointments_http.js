// get_appointments_http.js — usa http.request para obtener /api/appointments
const http = require('http')
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/appointments',
  method: 'GET',
  headers: { 'Accept': 'application/json' }
}

const req = http.request(options, res => {
  console.log('Status:', res.statusCode)
  let data = ''
  res.on('data', chunk => data += chunk)
  res.on('end', () => {
    console.log('Body:', data)
  })
})
req.on('error', err => {
  console.error('Request error:', err.message)
})
req.end()
