# AMAUNA — Sitio estático (Demo)

Sitio web estático para AMAUNA (Chile) con servicios de meditación, breathwork y psicoterapia. Incluye funcionalidad básica de agendar horas almacenadas localmente en el navegador (localStorage).

Archivos principales:
- `index.html` — página principal.
- `styles.css` — estilos y responsive.
- `app.js` — lógica de agendamiento local (validaciones, almacenamiento, exportar CSV).
- `assets/logo.svg` — logo simple.

Cómo usar:
1. Abrir `index.html` en un navegador moderno (Chrome/Edge/Firefox). No requiere servidor, pero para evitar restricciones de algunas características con archivos locales, puedes servir con un servidor simple.

En PowerShell puedes ejecutar (opcional):

```powershell
# Si tienes Python 3 instalado
python -m http.server 8000
# luego abrir http://localhost:8000 en el navegador
```

Notas y siguientes pasos sugeridos:
- Integrar con un backend (Node/Flask) para persistencia real y notificaciones por email.
- Integrar con Google Calendar o Calendly para sincronizar reservas.
- Añadir formulario de pago si corresponde y políticas de privacidad.

Contacto: placeholder `contacto@amauna.cl`

Backend (opcional):

Se agregó un backend simple en Node/Express para persistir reservas en `appointments.json`.

Comandos (PowerShell):

```powershell
Set-Location 'c:\Users\kayze\Desktop\PROGRAMACION\Prueba ia vc'
npm install
npm start
# luego abrir http://localhost:3000
```

Endpoints disponibles (misma origin):
- GET  /api/ping
- GET  /api/appointments
- POST /api/appointments    (body JSON: name,email,service,date,time,phone?)
- POST /api/appointments/sync (reemplaza lista entera)
- DELETE /api/appointments/:id
- DELETE /api/appointments  (borra todo)

Si no quieres usar el backend, el frontend seguirá funcionando con almacenamiento local (localStorage).