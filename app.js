// app.js — frontend that uses backend if available, with fallback to localStorage
const STORAGE_KEY = 'amauna_appointments'
const API_BASE = '/api' // same origin when server running

function el(id) { return document.getElementById(id) }

function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10)
}

function isWeekday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  return day !== 0 && day !== 6
}

function isValidSlot(timeStr) {
  const m = /^([0-1]?\d|2[0-3]):([0-5]\d)$/.exec(timeStr)
  if (!m) return false
  const hour = parseInt(m[1], 10)
  const minute = parseInt(m[2], 10)
  if (minute !== 0) return false
  if (hour < 8 || hour > 20) return false
  return true
}

async function fetchJson(url, opts) {
  try {
    const res = await fetch(url, opts)
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  } catch (e) {
    // propagate to caller to decide fallback
    throw e
  }
}

async function backendAvailable() {
  try {
    const res = await fetch(API_BASE + '/ping', { method: 'GET' })
    return res.ok
  } catch (e) { return false }
}

// load appointments: prefer backend, fallback to localStorage
async function loadAppointments() {
  if (await backendAvailable()) {
    try {
      return await fetchJson(API_BASE + '/appointments')
    } catch (e) { console.warn('backend fetch failed, using localStorage', e) }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) { console.error(e); return [] }
}

async function saveAppointments(list) {
  if (await backendAvailable()) {
    try {
      // send entire list is not necessary; we rely on POST per item. Keep local copy in sync.
      return await fetchJson(API_BASE + '/appointments/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(list) })
    } catch (e) { console.warn('sync failed, saving locally', e) }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
}

async function renderAppointments() {
  const list = (await loadAppointments()).slice().sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))
  const container = el('appointments')
  container.innerHTML = ''
  if (!list || list.length === 0) { container.innerHTML = '<p class="note">No hay reservas. Sé el primero en agendar.</p>'; return }
  list.forEach((app, idx) => {
    const div = document.createElement('div')
    div.className = 'app-item'
    div.innerHTML = `<div>
      <strong>${app.name}</strong>
      <small>${app.service} — ${app.date} ${app.time}</small>
      <small>${app.email} ${app.phone ? '· ' + app.phone : ''}</small>
    </div>
    <div>
      <button data-id="${app.id ?? idx}" class="btn small ghost delete">Borrar</button>
    </div>`
    container.appendChild(div)
  })
  // attach delete handlers
  container.querySelectorAll('.delete').forEach(b => b.addEventListener('click', async e => {
    const id = e.currentTarget.dataset.id
    await deleteAppointment(id)
  }))
}

async function deleteAppointment(id) {
  if (!id) return
  if (await backendAvailable()) {
    try {
      await fetchJson(API_BASE + '/appointments/' + id, { method: 'DELETE' })
      await renderAppointments()
      return
    } catch (e) { console.warn('delete via backend failed, falling back', e) }
  }
  const list = await loadAppointments()
  const idx = list.findIndex(a => String(a.id) === String(id))
  if (idx === -1) return
  list.splice(idx, 1)
  await saveAppointments(list)
  await renderAppointments()
}

async function clearAll() {
  if (!confirm('¿Borrar todas las reservas? Esta acción no se puede deshacer.')) return
  if (await backendAvailable()) {
    try {
      await fetchJson(API_BASE + '/appointments', { method: 'DELETE' })
      await renderAppointments()
      return
    } catch (e) { console.warn('clear backend failed, clearing local', e) }
  }
  await saveAppointments([])
  await renderAppointments()
}

async function exportCSV() {
  const list = await loadAppointments()
  if (!list || list.length === 0) { alert('No hay datos para exportar'); return }
  const header = ['Nombre', 'Email', 'Teléfono', 'Servicio', 'Fecha', 'Hora']
  const rows = list.map(r => [r.name, r.email, r.phone || '', r.service, r.date, r.time])
  const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'amauna_reservas.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function setMinDate() {
  const dateEl = el('date')
  dateEl.min = todayISO()
}

// emit several emoji particles (simple DOM-based animation) near the form message
function emitEmojiBurst(emoji = '🧘🏻', count = 8) {
  const container = document.getElementById('formMessage') || document.body
  const rect = container.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  for (let i = 0; i < count; i++) {
    const span = document.createElement('div')
    span.className = 'emoji-particle'
    span.textContent = emoji
    // random start near center
    const spread = 80
    const sx = cx + (Math.random() - 0.5) * 60
    const sy = cy + (Math.random() - 0.5) * 20
    span.style.left = Math.round(sx) + 'px'
    span.style.top = Math.round(sy) + 'px'
    // random size
    span.style.fontSize = (18 + Math.floor(Math.random() * 20)) + 'px'
    document.body.appendChild(span)
    // force layout then animate
    requestAnimationFrame(() => {
      const dx = (Math.random() - 0.5) * spread
      const dy = -(120 + Math.random() * 180)
      const rot = (Math.random() - 0.5) * 720
      span.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`
      span.style.opacity = '0'
    })
    // cleanup
    setTimeout(() => { if (span && span.parentNode) span.parentNode.removeChild(span) }, 1400 + Math.random() * 300)
  }
}

// render a simple example chart showing stress decreasing during guided breathing
function renderBreathChart() {
  const canvas = el('breathChart')
  if (!canvas || typeof Chart === 'undefined') return
  const ctx = canvas.getContext('2d')
  const labels = Array.from({ length: 11 }, (_, i) => `${i}m`)
  const data = [80, 72, 65, 58, 52, 48, 46, 45, 44, 43, 42]
  // create gradient
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
  grad.addColorStop(0, 'rgba(103,183,167,0.28)')
  grad.addColorStop(1, 'rgba(103,183,167,0.02)')
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Nivel de estrés (relativo)',
        data,
        fill: true,
        backgroundColor: grad,
        borderColor: '#2f9a87',
        pointBackgroundColor: '#fff',
        tension: 0.28,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: false, suggestedMin: 30, suggestedMax: 90 }
      },
      plugins: { legend: { display: false } }
    }
  })
}

async function handleSubmit(e) {
  // Always prevent default to avoid navigation or reload
  e.preventDefault()
  const form = document.getElementById('bookingForm')
  const action = form.getAttribute('action') || ''
  const external = action.startsWith('http') && !action.startsWith(window.location.origin)

  const name = el('name').value.trim()
  const email = el('email').value.trim()
  const phone = el('phone').value.trim()
  const service = el('service').value
  const date = el('date').value
  const time = el('time').value

  if (!name || !email || !date || !time) { showFormMessage('error', 'Completa los campos requeridos'); return }
  const slotDate = new Date(date + 'T' + time)
  if (slotDate < new Date()) { showFormMessage('error', 'No puedes agendar en el pasado'); return }
  if (!isWeekday(date)) { showFormMessage('error', 'Solo se pueden agendar días de lunes a viernes'); return }
  if (!isValidSlot(time)) { showFormMessage('error', 'Horas válidas: 08:00 - 20:00 en pasos de 1 hora (ej: 09:00)'); return }

  const appt = { name, email, phone, service, date, time, createdAt: new Date().toISOString() }

  // If a backend is available, prefer sending there
  if (await backendAvailable()) {
    try {
      const created = await fetchJson(API_BASE + '/appointments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(appt) })
      showFormMessage('success', 'Reserva enviada al servidor y guardada.')
      document.getElementById('bookingForm').reset()
      setMinDate()
      await renderAppointments()
      return
    } catch (e) { console.warn('post to backend failed, saving local', e) }
  }

  // fallback local save
  const list = await loadAppointments()
  const conflict = list.find(a => a.date === date && a.time === time)
  if (conflict) { if (!confirm('Ya existe una reserva en ese horario. ¿Deseas igual intentarlo?')) return }

  appt.id = Date.now()
  list.push(appt)
  await saveAppointments(list)
  await renderAppointments()
  // If the form posts externally (e.g. FormSubmit), send via fetch and show inline message
  if (external) {
    try {
      // send form as FormData to external endpoint to avoid navigation
      const fd = new FormData(form)
      // ensure we include the same fields that we saved locally
      // (FormData already contains form inputs because they have name attributes)
      const resp = await fetch(action, { method: 'POST', body: fd })
      if (resp.ok) {
        showFormMessage('success', 'Reserva enviada. Revisa tu correo para confirmación.')
        form.reset()
        setMinDate()
        return
      } else {
        let text = ''
        try { text = await resp.text() } catch (e) { }
        showFormMessage('error', 'Error al enviar la reserva. Intenta de nuevo.')
        console.warn('Form submit failed', resp.status, text)
        return
      }
    } catch (err) {
      console.error('Submit error', err)
      showFormMessage('error', 'Error de red al enviar la reserva. Se guardó localmente.')
      form.reset()
      setMinDate()
      return
    }
  }

  // otherwise reset the form and notify (local save path)
  document.getElementById('bookingForm').reset()
  setMinDate()
  showFormMessage('success', 'Reserva guardada localmente.')
}

async function init() {
  el('year').textContent = new Date().getFullYear()
  setMinDate()
  await renderAppointments()
  // render the breathing chart (if Chart.js loaded)
  try{ renderBreathChart() }catch(e){/* ignore */}
  document.getElementById('bookingForm').addEventListener('submit', handleSubmit)
  el('clearBtn').addEventListener('click', () => { document.getElementById('bookingForm').reset(); setMinDate() })
  el('clearAll').addEventListener('click', clearAll)
  el('exportCsv').addEventListener('click', exportCSV)
  
  // Initialize scroll animations
  initScrollAnimations()
}

// Scroll animation observer
function initScrollAnimations() {
  const fadeElements = document.querySelectorAll('.fade-in-section')
  
  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible')
        // Optionally unobserve after animation to improve performance
        observer.unobserve(entry.target)
      }
    })
  }, observerOptions)
  
  fadeElements.forEach(element => {
    observer.observe(element)
  })
}

window.addEventListener('DOMContentLoaded', init)

function showFormMessage(type, text) {
  const c = document.getElementById('formMessage')
  if (!c) return
  c.innerHTML = ''
  const div = document.createElement('div')
  div.className = 'form-msg ' + (type === 'success' ? 'form-msg--success' : 'form-msg--error')
  div.textContent = text
  c.appendChild(div)
  // launch confetti on success if the library is available
  if (type === 'success') {
    try {
      if (typeof window !== 'undefined' && typeof window.confetti === 'function') {
        // nice burst
        window.confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } })
        // small follow-up bursts for visual richness
        setTimeout(() => { window.confetti({ particleCount: 40, spread: 100, origin: { y: 0.6 } }) }, 250)
      }
    } catch (e) { console.warn('Confetti failed', e) }
    // emoji burst as decorative particles
    try { emitEmojiBurst('🧘🏻', 10) } catch (e) { /* ignore */ }
  }
  // auto-hide after 6s
  setTimeout(() => { if (c.contains(div)) c.removeChild(div) }, 6000)
}
