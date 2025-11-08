// create_reservation.js — envia una reserva de prueba al backend
const url = 'http://localhost:3000/api/appointments'
const data = {
  name: 'Juan Pérez',
  email: 'juan@ejemplo.cl',
  phone: '+56912345678',
  service: 'Breathwork',
  date: '2025-11-11',
  time: '10:00'
}

async function run(){
  try{
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    })
    const text = await res.text()
    console.log('Status:', res.status)
    console.log(text)
  }catch(e){
    console.error('Error:', e.message)
  }
}

run()
