const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs').promises

const app = express()
const PORT = process.env.PORT || 3000
const DATA_FILE = path.join(__dirname, 'appointments.json')

app.use(cors())
app.use(express.json())
// serve static frontend from project root
app.use(express.static(path.join(__dirname)))

async function readData(){
  try{
    const raw = await fs.readFile(DATA_FILE,'utf8')
    return JSON.parse(raw)
  }catch(e){
    if(e.code === 'ENOENT') return []
    throw e
  }
}

async function writeData(data){
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8')
}

app.get('/api/ping', (req,res)=>{
  res.json({ok:true})
})

app.get('/api/appointments', async (req,res)=>{
  const data = await readData()
  res.json(data)
})

app.post('/api/appointments', async (req,res)=>{
  const {name,email,phone,service,date,time} = req.body
  if(!name || !email || !date || !time || !service) return res.status(400).json({error:'Faltan campos requeridos'})

  // Validate date is weekday (Mon-Fri)
  const d = new Date(date + 'T00:00:00')
  const day = d.getDay() // 0=Sun,1=Mon,...6=Sat
  if(day === 0 || day === 6) return res.status(400).json({error:'Solo se permiten reservas de lunes a viernes'})

  // Validate time is on the hour and between 08:00 and 20:00
  const timeMatch = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(time)
  if(!timeMatch) return res.status(400).json({error:'Formato de hora inválido'})
  const hour = parseInt(timeMatch[1],10)
  const minute = parseInt(timeMatch[2],10)
  if(minute !== 0) return res.status(400).json({error:'Las reservas deben empezar en punto (minutos = 00)'})
  if(hour < 8 || hour > 20) return res.status(400).json({error:'Las reservas solo pueden ser entre 08:00 y 20:00'})

  const list = await readData()
  // prevent double booking at same date+time
  const conflict = list.find(x=>x.date===date && x.time===time)
  if(conflict) return res.status(409).json({error:'El horario ya está reservado'})

  const id = Date.now().toString()
  const createdAt = new Date().toISOString()
  const entry = {id,name,email,phone,service,date,time,createdAt}
  list.push(entry)
  await writeData(list)
  res.status(201).json(entry)
})

// sync endpoint to replace entire list (used optionally)
app.post('/api/appointments/sync', async (req,res)=>{
  const body = req.body
  if(!Array.isArray(body)) return res.status(400).json({error:'Se esperaba un arreglo'})
  await writeData(body)
  res.json({ok:true,count:body.length})
})

app.delete('/api/appointments/:id', async (req,res)=>{
  const id = req.params.id
  let list = await readData()
  const before = list.length
  list = list.filter(x=>String(x.id)!==String(id))
  await writeData(list)
  res.json({ok:true, removed: before-list.length})
})

app.delete('/api/appointments', async (req,res)=>{
  await writeData([])
  res.json({ok:true})
})

app.listen(PORT, ()=>{
  console.log(`AMAUNA server listening on http://localhost:${PORT}`)
})
