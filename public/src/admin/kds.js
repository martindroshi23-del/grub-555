import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "../config/firebase.config.js";

// --- ESTADO PARA EL BOT脫N DEL OJITO ---
window.kdsVerOtros = false;
window.toggleVerOtrosKDS = () => {
    window.kdsVerOtros = !window.kdsVerOtros;
    window.renderizarKDS();
};

// --- INYECCI脫N DE ESTILOS CSS ---
const kdsStyles = document.createElement('style');
kdsStyles.innerHTML = `
  /* 1. Cabecera Fija Totalmente Limpia */
  header, .kds-header, #header {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      justify-content: flex-end !important;
      align-items: center !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 60px !important;
      background: #111 !important;
      z-index: 1000 !important;
      padding: 0 10px !important;
      box-sizing: border-box !important;
      border-bottom: 1px solid #333 !important;
  }
  
  header h1, .kds-header h1, h1.header-title, .header-title, header .logo, header .brand {
      display: none !important;
  }

  /* 2. Usuario (Sin Emojis) */
  #kdsNombreDisplay {
      background: #ff9800 !important;
      color: #000 !important;
      padding: 6px 15px !important;
      border-radius: 8px !important;
      font-weight: 900 !important;
      font-size: 1.2rem !important;
      text-transform: uppercase !important;
      z-index: 9999 !important;
      display: block !important;
      box-shadow: 2px 2px 10px rgba(0,0,0,0.5) !important;
      margin: 0 !important;
  }

  header button, header a.btn, .kds-header button {
      padding: 6px 10px !important;
      font-size: 0.8rem !important;
      white-space: nowrap !important;
      margin-left: 5px !important;
  }

  /* 3. Anti-Solapamiento Extremo: Empujar todo el body muy hacia abajo */
  body {
      margin: 0 !important;
      padding-top: 90px !important; 
      overflow-x: hidden !important;
  }

  .kds-view-btn, .view-switcher, .kds-tabs, .kds-status-text { display: none !important; }

  /* 4. Zona Izquierda (Mis Pedidos) */
  #kds-preparando-container {
      display: grid !important;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)) !important;
      gap: 15px !important;
      width: calc(100% - 95px) !important; 
      height: calc(100vh - 90px) !important;
      padding: 30px 15px 40px 15px !important;
      margin-top: 10px !important; 
      overflow-y: auto !important; 
      overflow-x: hidden !important;
      align-content: start !important;
      box-sizing: border-box !important;
  }

  .kds-card {
      width: 100% !important;
      margin: 0 !important;
      height: max-content !important;
      display: flex !important;
      flex-direction: column !important;
  }

  /* 5. Zona Derecha (Barra Lateral Fija de Pendientes) */
  #kds-pendientes-container {
      position: fixed !important;
      top: 60px !important;
      right: 0 !important;
      width: 95px !important;
      height: calc(100vh - 60px) !important; 
      background: #1a1a1a !important;
      border-left: 2px solid #333 !important;
      padding: 10px 6px 30px 6px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      z-index: 999 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
      box-sizing: border-box !important;
  }

  /* Bot贸n Ojito (Toggle) */
  .kds-btn-eye {
      background: #333 !important;
      border: 1px solid #555 !important;
      border-radius: 6px !important;
      color: #ccc !important;
      padding: 8px !important;
      cursor: pointer !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: 100% !important;
      margin-bottom: 5px !important;
      transition: background 0.2s !important;
  }
  .kds-btn-eye:hover { background: #444 !important; }

  /* Tarjetas de Pendientes */
  .compact-card {
      background: #252525 !important;
      border: 1px solid #444 !important;
      border-radius: 6px !important;
      padding: 8px 6px !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: center !important;
      gap: 6px !important;
      text-align: center !important;
  }
  .compact-card h2 {
      font-size: 1.1rem !important;
      color: #ff9800 !important;
      margin: 0 !important;
  }
  .compact-time {
      background: #111 !important;
      padding: 3px 6px !important;
      border-radius: 4px !important;
      font-size: 0.8rem !important;
      color: #ddd !important;
      width: 100% !important;
      box-sizing: border-box !important;
  }
  .kds-btn-take-compact {
      background: #28a745 !important;
      color: white !important;
      border: none !important;
      padding: 8px 0 !important;
      width: 100% !important;
      border-radius: 4px !important;
      font-size: 0.85rem !important;
      font-weight: bold !important;
      cursor: pointer !important;
      margin-top: 2px !important;
  }

  /* Miniaturas de otros cocineros */
  .kds-miniature-compact {
      background: #222 !important;
      border-left: 3px solid #888 !important;
      border: 1px solid #444 !important;
      padding: 6px !important;
  }
  .kds-miniature-compact small {
      font-size: 0.75rem !important;
      color: #aaa !important;
      word-break: break-word;
      line-height: 1.1;
  }
`;
document.head.appendChild(kdsStyles);

// --- SISTEMA DE AUDIO ---
window.audioCtx = null;
let estadoAnteriorPedidos = {};

window.toggleMuteKDS = () => {
    const nombreCocinero = localStorage.getItem("grub_kds_nombre");
    if (!nombreCocinero) return;

    let isMuted = localStorage.getItem('grub_kds_muted_' + nombreCocinero) === 'true';
    isMuted = !isMuted;
    localStorage.setItem('grub_kds_muted_' + nombreCocinero, isMuted);

    const btn = document.getElementById('kdsMuteBtn');
    if (btn) {
        if (isMuted) {
            btn.innerHTML = '🔕';
            btn.style.color = '#ff6b6b';
        } else {
            btn.innerHTML = '🔊';
            btn.style.color = '#4caf50';
        }
    }
};

const reproducirSonido = (tipo) => {
    if (!window.audioCtx) return;
    const nombreCocinero = localStorage.getItem("grub_kds_nombre");
    if (nombreCocinero && localStorage.getItem('grub_kds_muted_' + nombreCocinero) === 'true') {
        return;
    }
    try {
        const osc = window.audioCtx.createOscillator();
        const gain = window.audioCtx.createGain();
        osc.connect(gain);
        gain.connect(window.audioCtx.destination);

        if (tipo === 'nuevo') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(523.25, window.audioCtx.currentTime);
            osc.frequency.setValueAtTime(659.25, window.audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0, window.audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.5, window.audioCtx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, window.audioCtx.currentTime + 0.5);
            osc.start(); osc.stop(window.audioCtx.currentTime + 0.5);
        } else if (tipo === 'listo') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, window.audioCtx.currentTime);
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
        if (!estadoViejo && v.estado === "Pendiente") hayNuevos = true;
        else if (estadoViejo === "En preparaci贸n" && v.estado === "Listo") hayListos = true;
        
        estadoAnteriorPedidos[v.id] = v.estado;
    });

    if (Object.keys(estadoAnteriorPedidos).length > pedidosActuales.length) {
        if (hayNuevos) reproducirSonido('nuevo');
        if (hayListos) reproducirSonido('listo');
    }
};

window.setKdsView = (view) => {}; 

// --- CONTROL ROBUSTO DE USUARIO ---
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

window.iniciarSesionKDS = () => {
    const inputElement = document.getElementById("kdsNombreCocinero");
    if (!inputElement) return;
    
    const nombreInput = inputElement.value.trim();
    if (!nombreInput) {
        alert("Por favor, ingresa tu nombre.");
        return;
    }

    if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();

    localStorage.setItem("grub_kds_nombre", nombreInput);
    inputElement.value = "";
    
    // Update mute button state for this user
    const btnMute = document.getElementById('kdsMuteBtn');
    if (btnMute) {
        let isMuted = localStorage.getItem('grub_kds_muted_' + nombreInput) === 'true';
        if (isMuted) {
            btnMute.innerHTML = '🔕';
            btnMute.style.color = '#ff6b6b';
        } else {
            btnMute.innerHTML = '🔊';
            btnMute.style.color = '#4caf50';
        }
    }

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

// LIMPIEZA SEGURA DE TEXTOS BASURA (Ahora no rompe divs contenedores)
const limpiarTextosKDS = () => {
    const elementos = document.querySelectorAll('h1, h2, h3, p, span, a');
    elementos.forEach(t => {
        if (t.id === 'kdsNombreDisplay' || t.closest('.kds-card') || t.closest('.compact-card')) return;

        // SALVAVIDAS: Solo evaluamos etiquetas que no contengan otras etiquetas adentro (texto final)
        if (t.children.length === 0) {
            const texto = t.innerText ? t.innerText.trim().toLowerCase() : '';
            if (texto.includes('monitor de cocina') || texto === 'kds' || texto.includes('馃敟 en preparaci贸n') || texto.includes('(visi贸n global)')) {
                // Removed aggressive hiding of elements to preserve our custom layout.
            }
        }
    });
};

// Render Logic Principal
window.renderizarKDS = () => {
  window.verificarUsuarioKDS();
  limpiarTextosKDS();

  const containerPreparando = document.getElementById("kds-preparando-container");
  const containerPendientes = document.getElementById("kds-pendientes-container");

  if (!containerPreparando || !containerPendientes || window.rolActual !== "cocina") return;

  const nombreCocinero = localStorage.getItem("grub_kds_nombre");

  let htmlMiEstacion = "";
  let htmlPendientes = "";
  let htmlMiniaturas = "";

  const todasLasOrdenes = window.ventasGlobales || [];
  verificarCambiosParaSonido(todasLasOrdenes);

  const activeOrders = todasLasOrdenes
    .filter((v) => v.estado === "Pendiente" || v.estado === "En preparaci贸n")
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  activeOrders.forEach((v) => {
    const numOrdStr = "#" + String(v.numeroOrden || 0).padStart(3, "0");
    const orderTime = new Date(v.fecha);
    const delayed = (new Date() - orderTime) > 15 * 60 * 1000;
    
    const isMine = v.estado === "En preparaci贸n" && v.cocineroAsignado === nombreCocinero;
    const isOthers = v.estado === "En preparaci贸n" && v.cocineroAsignado !== nombreCocinero;
    const isPending = v.estado === "Pendiente";

    // 1. MINIATURAS DE OTROS (Derecha - Solo si el ojito est谩 activo)
    if (isOthers) {
        if (window.kdsVerOtros) {
            htmlMiniaturas += `
                <div class="compact-card kds-miniature-compact">
                    <h2>${numOrdStr}</h2>
                    <small>Armando:<br><b>${v.cocineroAsignado}</b></small>
                </div>`;
        }
        return; 
    }

    // 2. PEDIDOS PENDIENTES ULTRA-COMPACTOS (Derecha)
    if (isPending) {
        htmlPendientes += `
            <div class="compact-card" id="kds-card-${v.id}">
                <h2>${numOrdStr}</h2>
                <div class="compact-time ${delayed ? "delayed" : ""}" data-time="${orderTime.getTime()}">
                    <span class="timer-text">00:00</span>
                </div>
                <button class="kds-btn-take-compact" onclick="window.tomarPedidoKDS('${v.id}')">
                    Tomar
                </button>
            </div>`;
        return; 
    }

    // 3. MIS PEDIDOS DETALLADOS (Izquierda)
    if (isMine) {
        let bodyHtml = "";
        if (v.detalle && Array.isArray(v.detalle)) {
            let orderedItems = typeof window.ordenarItemsPedido === "function" ? window.ordenarItemsPedido(v.detalle) : v.detalle;
            orderedItems.forEach((item) => {
                let modsHtml = "";
                let extraInfo = [];
                
                if (item.desglose) {
                    if (item.desglose.tipo && item.desglose.tipo.nombre) extraInfo.push({ text: `Tipo: ${item.desglose.tipo.nombre}`, type: 'add' });
                    if (item.desglose.extras && Array.isArray(item.desglose.extras)) item.desglose.extras.forEach(e => extraInfo.push({ text: `${e.nombre}`, type: 'add' }));
                    if (item.desglose.quitar && Array.isArray(item.desglose.quitar)) item.desglose.quitar.forEach(q => extraInfo.push({ text: `Sin ${q.nombre}`, type: 'remove' }));
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
                    if (info.type === 'remove') modsHtml += `<div class="kds-mod remove"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg> ${info.text}</div>`;
                    else modsHtml += `<div class="kds-mod add"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> ${info.text}</div>`;
                });

                let itemClass = item.categoria === 'Bebidas' ? 'kds-item kds-item-beverage' : 'kds-item';
                bodyHtml += `
                    <div class="${itemClass}">
                        <div class="kds-item-main"><span class="kds-item-qty">${item.cantidad}x</span> ${item.nombreBase || item.nombre}</div>
                        ${modsHtml ? `<div class="kds-mods">${modsHtml}</div>` : ""}
                    </div>`;
            });
        }

        if (v.notas || v.nota) {
            bodyHtml += `<div style="margin-top: 10px; padding: 5px 10px; background: rgba(255,152,0,0.1); border-left: 4px solid var(--primary); color: #fff; font-size: 1rem;"><strong>Nota:</strong> ${v.notas || v.nota}</div>`;
        }

        let footerHtml = `
            <button class="kds-btn-ready" onclick="marcarListoKDS('${v.id}')">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Marcar como Listo
            </button>
            <button class="kds-btn-release" onclick="window.liberarPedidoKDS('${v.id}')">Liberar</button>
        `;

        htmlMiEstacion += `
            <div class="kds-card status-preparando" id="kds-card-${v.id}">
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
                <div class="kds-card-body" id="kds-body-${v.id}">
                    ${bodyHtml}
                </div>
                <div class="kds-card-footer">
                    ${footerHtml}
                </div>
            </div>`;
    }
  });

  // Renderizar Izquierda
  containerPreparando.innerHTML = htmlMiEstacion || `
    <div style="width:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#777; grid-column: 1 / -1; margin-top: 40px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 13.5V21a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7.5M6 13.5l-2-2a2 2 0 0 1 0-2.828l7-7a2 2 0 0 1 2.828 0l7 7a2 2 0 0 1 0 2.828l-2 2M6 13.5V13.5"></path></svg>
        <p style="margin-top:15px; text-align:center;">No tomaste ningún pedido.<br>Seleccioná uno de la barra 👉</p>
    </div>`;

  // Renderizar Derecha (Con el bot贸n Ojito)
  const ojoIcono = window.kdsVerOtros 
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>` 
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`; 

  const btnToggleOjito = `
      <button class="kds-btn-eye" onclick="window.toggleVerOtrosKDS()" title="Ver qu茅 arman mis compa帽eros">
          ${ojoIcono}
      </button>
  `;
  containerPendientes.innerHTML = btnToggleOjito + htmlMiniaturas + htmlPendientes;

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
        reproducirSonido('listo'); 
      } catch (err) {
        console.error("Error al marcar como listo en KDS:", err);
        card.classList.remove("fade-out");
        alert("Error al marcar como listo.");
      }
    }, 300);
  }
};

let kdsTimerInterval;
function updateKDSTimers() {
  limpiarTextosKDS(); 

  const timers = document.querySelectorAll(".kds-order-time, .compact-time");
  const now = new Date().getTime();

  timers.forEach((t) => {
    const orderTime = parseInt(t.getAttribute("data-time"));
    const diffMs = now - orderTime;

    let safeDiffMs = diffMs < 0 ? 0 : diffMs; 

    if (safeDiffMs > 15 * 60 * 1000) t.classList.add("delayed");
    else t.classList.remove("delayed");

    const diffSecs = Math.floor(safeDiffMs / 1000);
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
  
  if (v && v.estado === "En preparaci贸n" && v.cocineroAsignado && v.cocineroAsignado !== nombreCocinero) {
      alert(`Este pedido ya est谩 siendo preparado por ${v.cocineroAsignado}.`);
      return;
  }

  if (!window.audioCtx) window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (window.audioCtx.state === 'suspended') window.audioCtx.resume();

  try {
      await updateDoc(doc(db, "ventas", idVenta), {
          estado: "En preparaci贸n",
          cocineroAsignado: nombreCocinero,
          horaTomado: new Date().toISOString()
      });
  } catch (err) {
      console.error("Error al tomar pedido:", err);
      alert("Error al tomar el pedido.");
  }
};

window.liberarPedidoKDS = async (idVenta) => {
  if (confirm("驴Est谩s seguro que deseas liberar este pedido? Volver谩 a estar pendiente para todos.")) {
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
