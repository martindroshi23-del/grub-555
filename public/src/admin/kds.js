import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "../config/firebase.config.js";

// --- INYECCIÓN DE ESTILOS CSS (Para compactos y miniaturas) ---
const kdsStyles = document.createElement('style');
kdsStyles.innerHTML = `
  .kds-card-body.compact-mode { display: none; }
  .kds-toggle-btn { width: 100%; background: rgba(0,0,0,0.1); border: none; padding: 10px; cursor: pointer; display: flex; justify-content: center; align-items: center; border-radius: 8px; margin-bottom: 10px; transition: background 0.2s; }
  .kds-toggle-btn:hover { background: rgba(0,0,0,0.2); }
  .kds-miniature { display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary, #2a2a2a); border-left: 4px solid #888; padding: 10px 15px; margin-bottom: 10px; border-radius: 6px; opacity: 0.8; }
  .kds-miniature h4 { margin: 0; font-size: 1.1rem; color: #ccc; }
  .kds-miniature span { font-size: 0.9rem; color: #aaa; font-style: italic; display: flex; align-items: center; gap: 5px; }
`;
document.head.appendChild(kdsStyles);

// --- SISTEMA DE AUDIO (Web Audio API) ---
window.audioCtx = null;
let estadoAnteriorPedidos = {}; // Para rastrear cambios y hacer sonar las alarmas

const reproducirSonido = (tipo) => {
    if (!window.audioCtx) return;
    try {
        const osc = window.audioCtx.createOscillator();
        const gain = window.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(window.audioCtx.destination);

        if (tipo === 'nuevo') {
            // Sonido "Din-Don" (amable y llamativo)
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, window.audioCtx.currentTime); // C5
            osc.frequency.setValueAtTime(659.25, window.audioCtx.currentTime + 0.15); // E5
            gain.gain.setValueAtTime(0, window.audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, window.audioCtx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, window.audioCtx.currentTime + 0.5);
            osc.start(); osc.stop(window.audioCtx.currentTime + 0.5);
        } else if (tipo === 'listo') {
            // Sonido "Bloop" (confirmación suave)
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, window.audioCtx.currentTime); // A5
            gain.gain.setValueAtTime(0, window.audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, window.audioCtx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, window.audioCtx.currentTime + 0.3);
            osc.start(); osc.stop(window.audioCtx.currentTime + 0.3);
        }
    } catch (e) { console.error("Error reproduciendo audio:", e); }
};

const verificarCambiosParaSonido = (pedidosActuales) => {
    let hayNuevos = false;
    let hayListos = false;

    pedidosActuales.forEach(v => {
        const estadoViejo = estadoAnteriorPedidos[v.id];
        if (!estadoViejo && v.estado === "Pendiente") {
            hayNuevos = true; // Pedido totalmente nuevo
        } else if (estadoViejo === "En preparación" && v.estado === "Listo") {
            hayListos = true; // Pedido terminado
        }
        estadoAnteriorPedidos[v.id] = v.estado;
    });

    // Ignoramos el sonido en la carga inicial
    if (Object.keys(estadoAnteriorPedidos).length > pedidosActuales.length) {
        if (hayNuevos) reproducirSonido('nuevo');
        if (hayListos) reproducirSonido('listo');
    }
};

// Layout Switcher Logic
window.setKdsView = (view) => {
  const c1 = document.getElementById("kds-preparando-container");
  const c2 = document.getElementById("kds-pendientes-container");
  const btns = document.querySelectorAll(".kds-view-btn");

  btns.forEach((btn) => btn.classList.remove("active"));
  document.querySelector(`.kds-view-btn[data-view="${view}"]`).classList.add("active");

  if (c1) c1.className = `kds-grid view-${view}`;
  if (c2) c2.className = `kds-grid view-${view}`;
};

// Funciones de UI
window.toggleDetallePedido = (id) => {
    const body = document.getElementById(`kds-body-${id}`);
    const svg = document.getElementById(`kds-arrow-${id}`);
    if (body.classList.contains('compact-mode')) {
        body.classList.remove('compact-mode');
        svg.style.transform = "rotate(180deg)";
    } else {
        body.classList.add('compact-mode');
        svg.style.transform = "rotate(0deg)";
    }
};

// --- CONTROL ROBUSTO DE USUARIO KDS ---
window.verificarUsuarioKDS = () => {
  if (window.rolActual !== "cocina") {
    const modal = document.getElementById("modalLoginKDS");
    if (modal) modal.style.setProperty("display", "none", "important");
    return false;
  }

  const nombreCocinero = localStorage.getItem("grub_kds_nombre");
  const modal = document.getElementById("modalLoginKDS");
  const nameDisp = document.getElementById("kdsNombreDisplay");

  if (!nombreCocinero || nombreCocinero.trim() === "" || nombreCocinero === "null" || nombreCocinero === "undefined") {
    if (modal) {
      modal.style.setProperty("display", "flex", "important");
      modal.style.setProperty("z-index", "999999", "important");
      modal.style.setProperty("opacity", "1", "important");
    }
    if (nameDisp) nameDisp.innerText = "";
    return false;
  } else {
    if (modal) modal.style.setProperty("display", "none", "important");
    if (nameDisp && nameDisp.innerText !== nombreCocinero) nameDisp.innerText = nombreCocinero;
    return true;
  }
};

// Authentication Logic
window.iniciarSesionKDS = () => {
    const inputElement = document.getElementById("kdsNombreCocinero");
    if (!inputElement) return;
    
    const nombreInput = inputElement.value.trim();
    if (!nombreInput) {
        alert("Por favor, ingresa tu nombre.");
        return;
    }

    // Inicializar Audio Context con el primer click (política de navegadores)
    if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();

    localStorage.setItem("grub_kds_nombre", nombreInput);
    inputElement.value = "";
    
    window.verificarUsuarioKDS();
    window.renderizarKDS();
};

window.cerrarSesionKDS = () => {
    localStorage.removeItem("grub_kds_nombre");
    const inputElement = document.getElementById("kdsNombreCocinero");
    if (inputElement) inputElement.value = "";
    
    window.verificarUsuarioKDS();
    window.renderizarKDS();
};

// Render Logic Principal
window.renderizarKDS = () => {
  window.verificarUsuarioKDS();

  const containerPreparando = document.getElementById("kds-preparando-container");
  const containerPendientes = document.getElementById("kds-pendientes-container");

  if (!containerPreparando || !containerPendientes || window.rolActual !== "cocina") return;

  const nombreCocinero = localStorage.getItem("grub_kds_nombre");

  let htmlMiEstacion = "";
  let htmlPendientesYOtros = "";

  const todasLasOrdenes = window.ventasGlobales || [];
  
  // Auditar cambios para los sonidos
  verificarCambiosParaSonido(todasLasOrdenes);

  // Filtrar y ordenar
  const activeOrders = todasLasOrdenes
    .filter((v) => v.estado === "Pendiente" || v.estado === "En preparación")
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  if (activeOrders.length === 0) {
    containerPreparando.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #777; margin-top: 20px; font-size: 1.2rem;">Tu estación está limpia. ¡Buen trabajo!</div>`;
    containerPendientes.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #777; margin-top: 20px; font-size: 1.2rem;">No hay pedidos en cola.</div>`;
    return;
  }

  activeOrders.forEach((v) => {
    const numOrdStr = "#" + String(v.numeroOrden || 0).padStart(3, "0");
    const orderTime = new Date(v.fecha);
    const delayed = (new Date() - orderTime) > 15 * 60 * 1000;
    
    const isMine = v.estado === "En preparación" && v.cocineroAsignado === nombreCocinero;
    const isOthers = v.estado === "En preparación" && v.cocineroAsignado !== nombreCocinero;
    const isPending = v.estado === "Pendiente";

    // 1. SI ES DE OTRO COCINERO (MINIATURA)
    if (isOthers) {
        htmlPendientesYOtros += `
            <div class="kds-miniature">
                <h4>${numOrdStr}</h4>
                <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    Armando: ${v.cocineroAsignado}
                </span>
            </div>`;
        return; // Salimos de la iteración para este pedido
    }

    // 2. CONSTRUCCIÓN DEL CUERPO DEL PEDIDO (Para Míos y Pendientes)
    let bodyHtml = "";
    if (v.detalle && Array.isArray(v.detalle)) {
      let orderedItems = typeof window.ordenarItemsPedido === "function" ? window.ordenarItemsPedido(v.detalle) : v.detalle;

      orderedItems.forEach((item) => {
        let modsHtml = "";
        let extraInfo = [];
        
        if (item.desglose) {
            if (item.desglose.tipo && item.desglose.tipo.nombre) {
                extraInfo.push({ text: `Tipo: ${item.desglose.tipo.nombre}`, type: 'add' });
            }
            if (item.desglose.extras && Array.isArray(item.desglose.extras)) {
                item.desglose.extras.forEach(e => extraInfo.push({ text: `${e.nombre}`, type: 'add' }));
            }
            if (item.desglose.quitar && Array.isArray(item.desglose.quitar)) {
                item.desglose.quitar.forEach(q => extraInfo.push({ text: `Sin ${q.nombre}`, type: 'remove' }));
            }
        } else {
            if (item.modificadores && Array.isArray(item.modificadores)) {
                item.modificadores.forEach(m => {
                    if (m.tipo === "A quitar" || m.tipo === "Sin") extraInfo.push({ text: `Sin ${m.nombre}`, type: 'remove' });
                    else extraInfo.push({ text: `${m.nombre}`, type: 'add' });
                });
            }
            if (item.notas && Array.isArray(item.notas)) {
                item.notas.forEach(nota => {
                    if (nota.toLowerCase().startsWith('sin ')) extraInfo.push({ text: nota, type: 'remove' });
                    else extraInfo.push({ text: nota, type: 'add' });
                });
            }
        }

        extraInfo.forEach(info => {
            if (info.type === 'remove') {
                modsHtml += `<div class="kds-mod remove"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg> ${info.text}</div>`;
            } else {
                modsHtml += `<div class="kds-mod add"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> ${info.text}</div>`;
            }
        });

        let isBeverage = item.categoria === 'Bebidas';
        let itemClass = isBeverage ? 'kds-item kds-item-beverage' : 'kds-item';

        bodyHtml += `
            <div class="${itemClass}">
                <div class="kds-item-main"><span class="kds-item-qty">${item.cantidad}x</span> ${item.nombreBase || item.nombre}</div>
                ${modsHtml ? `<div class="kds-mods">${modsHtml}</div>` : ""}
            </div>`;
      });
    }

    if (v.notas || v.nota) {
      bodyHtml += `<div style="margin-top: 15px; padding: 10px; background: rgba(255,152,0,0.1); border-left: 4px solid var(--primary); color: #fff; font-size: 1.1rem;"><strong>Nota Global:</strong> ${v.notas || v.nota}</div>`;
    }

    let footerHtml = "";
    // Botón para expandir/contraer (Solo visible en Pendientes)
    let toggleBtn = isPending ? `
        <button class="kds-toggle-btn" onclick="window.toggleDetallePedido('${v.id}')">
            <svg id="kds-arrow-${v.id}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.3s;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>` : "";

    if (isPending) {
        footerHtml = `
            <button class="kds-btn-take" onclick="window.tomarPedidoKDS('${v.id}')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                Tomar Pedido
            </button>
        `;
    } else if (isMine) {
        footerHtml = `
            <button class="kds-btn-ready" onclick="marcarListoKDS('${v.id}')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Marcar como Listo
            </button>
            <button class="kds-btn-release" onclick="window.liberarPedidoKDS('${v.id}')">Liberar</button>
        `;
    }

    let cardHtml = `
        <div class="kds-card ${isMine ? "status-preparando" : "status-pendiente"}" id="kds-card-${v.id}">
            <div class="kds-card-header">
                <h2 class="kds-order-number">${numOrdStr}</h2>
                <div class="kds-order-time ${delayed ? "delayed" : ""}" data-time="${orderTime.getTime()}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span class="timer-text">00:00</span>
                </div>
            </div>
            <div class="kds-client-name">
                <span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    ${v.cliente || 'Mostrador'}
                </span>
            </div>
            ${toggleBtn}
            <div class="kds-card-body ${isPending ? 'compact-mode' : ''}" id="kds-body-${v.id}">
                ${bodyHtml}
            </div>
            <div class="kds-card-footer">
                ${footerHtml}
            </div>
        </div>`;

    if (isMine) {
        htmlMiEstacion += cardHtml;
    } else if (isPending) {
        htmlPendientesYOtros += cardHtml;
    }
  });

  containerPreparando.innerHTML = htmlMiEstacion || `<div style="grid-column: 1 / -1; text-align: center; color: #777; margin-top: 20px; font-size: 1.2rem;">Tu estación está limpia. ¡Buen trabajo!</div>`;
  containerPendientes.innerHTML = htmlPendientesYOtros || `<div style="grid-column: 1 / -1; text-align: center; color: #777; margin-top: 20px; font-size: 1.2rem;">No hay pedidos en cola.</div>`;

  updateKDSTimers();
};

window.marcarListoKDS = async (idVenta) => {
  const card = document.getElementById(`kds-card-${idVenta}`);
  if (card) {
    card.classList.add("fade-out");
    setTimeout(async () => {
      try {
        const now = new Date();
        const v = window.ventasGlobales.find(x => x.id === idVenta);

        let updateData = {
          estado: "Listo",
          fechaListo: now.toISOString(),
        };

        if (v && v.horaTomado) {
            const tomado = new Date(v.horaTomado);
            const diffMs = now.getTime() - tomado.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            updateData.tiempoPreparacionMinutos = diffMin;
        }

        await updateDoc(doc(db, "ventas", idVenta), updateData);
        reproducirSonido('listo'); // Forzar sonido local al tocar el botón
      } catch (err) {
        console.error("Error al marcar como listo en KDS:", err);
        card.classList.remove("fade-out");
        alert("Error al marcar como listo.");
      }
    }, 300);
  }
};

// Timer logic
let kdsTimerInterval;
function updateKDSTimers() {
  const timers = document.querySelectorAll(".kds-order-time");
  const now = new Date().getTime();

  timers.forEach((t) => {
    const orderTime = parseInt(t.getAttribute("data-time"));
    const diffMs = now - orderTime;

    if (diffMs > 15 * 60 * 1000) {
      t.classList.add("delayed");
    } else {
      t.classList.remove("delayed");
    }

    const diffSecs = Math.floor(diffMs / 1000);
    const h = Math.floor(diffSecs / 3600);
    const m = Math.floor((diffSecs % 3600) / 60);
    const s = diffSecs % 60;

    let text = h > 0 ? 
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : 
      `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

    const textSpan = t.querySelector(".timer-text");
    if (textSpan) textSpan.innerText = text;
  });
}

if (kdsTimerInterval) clearInterval(kdsTimerInterval);
kdsTimerInterval = setInterval(() => {
  if (window.rolActual === "cocina") {
    window.verificarUsuarioKDS();
    updateKDSTimers();
  }
}, 1000);

window.tomarPedidoKDS = async (idVenta) => {
  const nombreCocinero = localStorage.getItem("grub_kds_nombre");
  if (!nombreCocinero) {
      window.verificarUsuarioKDS();
      return;
  }

  const v = window.ventasGlobales.find(x => x.id === idVenta);
  if (v && v.cocineroAsignado && v.cocineroAsignado !== nombreCocinero) {
      alert(`Este pedido ya fue tomado por ${v.cocineroAsignado}.`);
      return;
  }

  // Activar audio context por si el cocinero nunca hizo clic en "login" en esta sesión
  if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (window.audioCtx.state === 'suspended') window.audioCtx.resume();

  try {
      await updateDoc(doc(db, "ventas", idVenta), {
          estado: "En preparación",
          cocineroAsignado: nombreCocinero,
          horaTomado: new Date().toISOString()
      });
  } catch (err) {
      console.error("Error al tomar pedido:", err);
      alert("Error al tomar el pedido.");
  }
};

window.liberarPedidoKDS = async (idVenta) => {
  if (confirm("¿Estás seguro que deseas liberar este pedido? Volverá a estar pendiente para todos.")) {
      try {
          await updateDoc(doc(db, "ventas", idVenta), {
              estado: "Pendiente",
              cocineroAsignado: null,
              horaTomado: null
          });
      } catch (err) {
          console.error("Error al liberar pedido:", err);
          alert("Error al liberar el pedido.");
      }
  }
};
