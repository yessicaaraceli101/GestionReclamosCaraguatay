let usuarioActual = null;
let reclamosCache = [];
let reclamoEliminarId = null;

function setMsg(t){
  document.getElementById('loginMsg').textContent = t || '';
}

function fmtFecha(value){
  if(!value) return '-';

  let fechaTexto = String(value);

  // Si Supabase devuelve sin zona horaria, le agregamos UTC
  if(!fechaTexto.endsWith('Z') && !fechaTexto.includes('+')){
    fechaTexto = fechaTexto + 'Z';
  }

  return new Date(fechaTexto).toLocaleString('es-PY', {
    timeZone: 'America/Asuncion',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
function cortoId(id){
  return String(id || '').slice(0, 8);
}

async function login(){
  setMsg('');

  const usuario = document.getElementById('loginUsuario').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  if(!usuario || !password){
    setMsg('Completá usuario y contraseña');
    return;
  }

  const { data, error } = await supabaseClient
    .from('usuarios')
    .select('*')
    .eq('usuario', usuario)
    .eq('password', password)
    .single();

  if(error || !data){
    setMsg('Usuario o contraseña incorrectos');
    return;
  }

  const ahora = new Date().toISOString();

  await supabaseClient
    .from('usuarios')
    .update({ ultimo_ingreso: ahora })
    .eq('id', data.id);

  usuarioActual = { ...data, ultimo_ingreso: ahora };
  localStorage.setItem('usuarioActual', JSON.stringify(usuarioActual));

  mostrarApp();
}

function mostrarApp(){
  document.getElementById('loginView').classList.add('hidden');
  document.getElementById('appView').classList.remove('hidden');

  document.getElementById('userInfo').textContent =
    `${usuarioActual.nombre} (${usuarioActual.rol})`;

  cargarUltimoIngreso();
  cargarReclamos();
}

function logout(){
  document.getElementById('modalSalir').classList.remove('hidden');
}

function cerrarModalSalir(){
  document.getElementById('modalSalir').classList.add('hidden');
}

function confirmarSalir(){
  localStorage.removeItem('usuarioActual');
  usuarioActual = null;
  location.reload();
}

async function crearReclamo(){
  const payload = {
    cliente: document.getElementById('cliente').value.trim(),
    telefono: document.getElementById('telefono').value.trim(),
    ubicacion: document.getElementById('ubicacion').value.trim(),
    fecha: document.getElementById('fecha').value,
    descripcion: document.getElementById('descripcion').value.trim(),
    estado: 'pendiente',
    creado_por: usuarioActual.usuario
  };

  if(!payload.cliente || !payload.telefono || !payload.ubicacion || !payload.fecha){
    alert('Completá cliente, teléfono, ubicación y fecha');
    return;
  }

  const { error } = await supabaseClient
    .from('reclamos')
    .insert(payload);

  if(error){
    alert('Error al guardar: ' + error.message);
    return;
  }

  ['cliente','telefono','ubicacion','fecha','descripcion'].forEach(id => {
    document.getElementById(id).value = '';
  });

  cargarReclamos();
}

async function cargarReclamos(){
  const { data, error } = await supabaseClient
    .from('reclamos')
    .select('*')
    .order('fecha', { ascending: false });

  if(error){
    alert('Error al cargar reclamos: ' + error.message);
    return;
  }

  reclamosCache = data || [];

  const pendientes = reclamosCache.filter(r => r.estado !== 'resuelto');
  const resueltos = reclamosCache.filter(r => r.estado === 'resuelto');

  document.getElementById('countPendientes').textContent = pendientes.length;
  document.getElementById('countResueltos').textContent = resueltos.length;

  renderLista('pendientesList', pendientes, false);
  renderLista('resueltosList', resueltos, true);
}

function renderLista(id, lista, resuelto){
  const box = document.getElementById(id);
  box.innerHTML = '';

  if(lista.length === 0){
    box.innerHTML = '<p class="empty">Sin registros.</p>';
    return;
  }

  lista.forEach(r => {
    const div = document.createElement('div');
    div.className = `claim ${resuelto ? 'done' : 'pending'}`;
    div.onclick = () => verDetalle(r.id);

    div.innerHTML = `
      <h4>${r.cliente || 'Sin cliente'}</h4>
      <p><b>ID:</b> ${cortoId(r.id)}</p>
      <p><b>Teléfono:</b> ${r.telefono || '-'}</p>
      <p><b>Ubicación:</b> ${r.ubicacion || '-'}</p>
      <p><b>Fecha reclamo:</b> ${r.fecha || '-'}</p>
      <p><b>Descripción:</b> ${r.descripcion || '-'}</p>
      <p><b>Creado por:</b> ${r.creado_por || '-'}</p>

      ${
        resuelto
          ? `<small>Resuelto por: ${r.resuelto_por || '-'}<br>Fecha: ${fmtFecha(r.resuelto_en)}</small>`
          : `<button class="done-btn" onclick="marcarResuelto(event,'${r.id}')">Marcar resuelto</button>`
      }

      ${
        resuelto && usuarioActual.rol === 'admin'
          ? `<button class="danger" onclick="pedirEliminar(event,'${r.id}')">Eliminar</button>`
          : ''
      }
    `;

    box.appendChild(div);
  });
}

function verDetalle(id){
  const r = reclamosCache.find(x => x.id === id);
  if(!r) return;

  alert(
    `Cliente: ${r.cliente || '-'}\n` +
    `ID: ${r.id || '-'}\n` +
    `Teléfono: ${r.telefono || '-'}\n` +
    `Ubicación: ${r.ubicacion || '-'}\n` +
    `Fecha reclamo: ${r.fecha || '-'}\n` +
    `Descripción: ${r.descripcion || '-'}\n` +
    `Estado: ${r.estado || '-'}\n` +
    `Creado por: ${r.creado_por || '-'}\n` +
    `Resuelto por: ${r.resuelto_por || '-'}`
  );
}

async function marcarResuelto(e, id){
  e.stopPropagation();

  const { error } = await supabaseClient
    .from('reclamos')
    .update({
      estado: 'resuelto',
      resuelto_por: usuarioActual.usuario,
      resuelto_en: new Date().toISOString()
    })
    .eq('id', id);

  if(error){
    alert('Error al marcar resuelto: ' + error.message);
    return;
  }

  cargarReclamos();
}

function pedirEliminar(e, id){
  e.stopPropagation();

  if(usuarioActual.rol !== 'admin'){
    alert('Solo el administrador puede eliminar reclamos.');
    return;
  }

  reclamoEliminarId = id;
  document.getElementById('modalEliminar').classList.remove('hidden');
}

function cerrarModalEliminar(){
  reclamoEliminarId = null;
  document.getElementById('modalEliminar').classList.add('hidden');
}

async function confirmarEliminar(){
  if(!reclamoEliminarId) return;

  if(usuarioActual.rol !== 'admin'){
    alert('Solo el administrador puede eliminar reclamos.');
    cerrarModalEliminar();
    return;
  }

  const { error } = await supabaseClient
    .from('reclamos')
    .delete()
    .eq('id', reclamoEliminarId);

  if(error){
    alert('Error al eliminar: ' + error.message);
    return;
  }

  cerrarModalEliminar();
  cargarReclamos();
}

function abrirPendientes(){
  const lista = reclamosCache.filter(r => r.estado !== 'resuelto');
  const cont = document.getElementById('listaPendientesModal');

  cont.innerHTML = '';

  if(lista.length === 0){
    cont.innerHTML = '<p class="empty">No hay reclamos pendientes.</p>';
  }

  lista.forEach(r => {
    cont.innerHTML += `
      <div class="claim pending">
        <h4>${r.cliente || 'Sin cliente'}</h4>
        <p><b>ID:</b> ${cortoId(r.id)}</p>
        <p><b>Teléfono:</b> ${r.telefono || '-'}</p>
        <p><b>Ubicación:</b> ${r.ubicacion || '-'}</p>
        <p><b>Fecha:</b> ${r.fecha || '-'}</p>
        <p><b>Descripción:</b> ${r.descripcion || '-'}</p>
      </div>
    `;
  });

  document.getElementById('modalPendientes').classList.remove('hidden');
}

function cerrarModalPendientes(){
  document.getElementById('modalPendientes').classList.add('hidden');
}

function abrirResueltos(){
  const lista = reclamosCache.filter(r => r.estado === 'resuelto');
  const cont = document.getElementById('listaResueltosModal');

  cont.innerHTML = '';

  if(lista.length === 0){
    cont.innerHTML = '<p class="empty">No hay reclamos resueltos.</p>';
  }

  lista.forEach(r => {
    cont.innerHTML += `
      <div class="claim done">
        <h4>${r.cliente || 'Sin cliente'}</h4>
        <p><b>ID:</b> ${cortoId(r.id)}</p>
        <p><b>Teléfono:</b> ${r.telefono || '-'}</p>
        <p><b>Ubicación:</b> ${r.ubicacion || '-'}</p>
        <p><b>Fecha:</b> ${r.fecha || '-'}</p>
        <p><b>Descripción:</b> ${r.descripcion || '-'}</p>
        <small>Resuelto por: ${r.resuelto_por || '-'}<br>Fecha: ${fmtFecha(r.resuelto_en)}</small>
        ${
          usuarioActual.rol === 'admin'
            ? `<button class="danger" onclick="pedirEliminar(event,'${r.id}')">Eliminar</button>`
            : ''
        }
      </div>
    `;
  });

  document.getElementById('modalResueltos').classList.remove('hidden');
}

function cerrarModalResueltos(){
  document.getElementById('modalResueltos').classList.add('hidden');
}

async function cargarUltimoIngreso(){
  const { data, error } = await supabaseClient
    .from('usuarios')
    .select('usuario, ultimo_ingreso')
    .not('ultimo_ingreso', 'is', null)
    .order('ultimo_ingreso', { ascending: false })
    .limit(2);

  if(error || !data || data.length === 0){
    document.getElementById('lastLogin').textContent = 'Sin registro';
    return;
  }

  const anterior = data.find(u => u.usuario !== usuarioActual.usuario);

  if(!anterior){
    document.getElementById('lastLogin').textContent = 'Sin ingreso anterior';
    return;
  }

  document.getElementById('lastLogin').textContent =
    `${anterior.usuario} - ${fmtFecha(anterior.ultimo_ingreso)}`;
}
window.addEventListener('load', () => {
  const saved = localStorage.getItem('usuarioActual');

  if(saved){
    usuarioActual = JSON.parse(saved);
    mostrarApp();
  }
});