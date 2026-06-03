import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "../config/firebase.config.js";

// Layout Switcher Logic
window.setKdsView = (view) => {
  const c1 = document.getElementById("kds-preparando-container");
  const c2 = document.getElementById("kds-pendientes-container");
  const btns = document.querySelectorAll(".kds-view-btn");

  // Update active class on buttons
  btns.forEach((btn) => btn.classList.remove("active"));
  document
    .querySelector(`.kds-view-btn[data-view="${view}"]`)
    .classList.add("active");

  // Update container class
  if (c1) c1.className = `kds-grid view-${view}`;
  if (c2) c2.className = `kds-grid view-${view}`;
};

// Authentication Logic
window.iniciarSesionKDS = () => {
    const nombreInput = document.getElementById("kdsNombreCocinero").value.trim();
    if (!nombreInput) {
        alert("Por favor, ingresa tu nombre.");
        return;
    }

    // Almacenar localmente
    sessionStorage.setItem("grub_kds_nombre", nombreInput);
    document.getElementById("modalLoginKDS").style.display = "none";

    // Renderizar
    window.renderizarKDS();
};

window.cerrarSesionKDS = () => {
    sessionStorage.removeItem("grub_kds_nombre");
    document.getElementById("modalLoginKDS").style.display = "flex";
};

// Render Logic
window.renderizarKDS = () => {
  const containerPreparando = document.getElementById("kds-preparando-container");
  const containerPendientes = document.getElementById("kds-pendientes-container");

  if (!containerPreparando || !containerPendientes || window.rolActual !== "cocina") return;

  const nombreCocinero = sessionStorage.getItem("grub_kds_nombre");
  if (!nombreCocinero) {
      document.getElementById("modalLoginKDS").style.display = "flex";
      // No cortamos el renderizado visual de fondo, simplemente no permitiremos acciones
      const nameDisp = document.getElementById("kdsNombreDisplay");
      if (nameDisp) nameDisp.innerText = "";
  } else {
      document.getElementById("modalLoginKDS").style.display = "none";
      const nameDisp = document.getElementById("kdsNombreDisplay");
      if (nameDisp) nameDisp.innerText = nombreCocinero;
  }

  let htmlPreparando = "";
  let htmlPendientes = "";

  // Filter for active orders
  const activeOrders = (window.ventasGlobales || [])
    .filter((v) => v.estado === "Pendiente" || v.estado === "En preparación")
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // Oldest first

  if (activeOrders.length === 0) {
    containerPreparando.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #777; margin-top: 20px; font-size: 1.2rem;">Ningún pedido en preparación.</div>`;
    containerPendientes.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #777; margin-top: 20px; font-size: 1.2rem;">No hay pedidos pendientes.</div>`;
    return;
  }

  activeOrders.forEach((v) => {
    const numOrdStr = "#" + String(v.numeroOrden || 0).padStart(3, "0");
    const orderTime = new Date(v.fecha);
    const now = new Date();
    const diffMs = now - orderTime;
    const delayed = diffMs > 15 * 60 * 1000; // 15 mins

    let bodyHtml = "";
    if (v.detalle && Array.isArray(v.detalle)) {
      let orderedItems = typeof window.ordenarItemsPedido === "function" ? window.ordenarItemsPedido(v.detalle) : v.detalle;

      orderedItems.forEach((item) => {
        let modsHtml = "";

        let extraInfo = [];
        if (item.desglose) {
            for (let key in item.desglose) {
                let val = item.desglose[key];
                if (key === 'A quitar' || key === 'Sin') extraInfo.push({ text: `Sin ${val}`, type: 'remove' });
                else if (key !== 'base' && key !== 'tipo') extraInfo.push({ text: `${val}`, type: 'add' });
                else if (key === 'tipo' && item.desglose.tipo && item.desglose.tipo.nombre) extraInfo.push({ text: `Tipo: ${item.desglose.tipo.nombre}`, type: 'add' });
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

    let isMine = v.cocineroAsignado === nombreCocinero;
    let isAssignedToOther = v.estado === "En preparación" && v.cocineroAsignado && v.cocineroAsignado !== nombreCocinero;

    let footerHtml = "";
    if (v.estado === "Pendiente") {
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
            <button class="kds-btn-release" onclick="window.liberarPedidoKDS('${v.id}')">Liberar Pedido</button>
        `;
    } else {
        footerHtml = `
            <div style="text-align: center; color: #888; font-style: italic; padding: 10px;">Siendo preparado...</div>
        `;
    }

    let assigneeBadge = v.cocineroAsignado ? `<div class="kds-assignee-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> ${v.cocineroAsignado}</div>` : '';

    let cardHtml = `
        <div class="kds-card ${v.estado === "En preparación" ? "status-preparando" : "status-pendiente"}" id="kds-card-${v.id}">
            <div class="kds-card-header">
                <h2 class="kds-order-number">${numOrdStr}</h2>
                <div class="kds-order-time ${delayed ? "delayed" : ""}" data-time="${orderTime.getTime()}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span class="timer-text">00:00</span>
                </div>
            </div>
            <div class="kds-client-name" style="display: flex; justify-content: space-between;">
                <span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    ${v.cliente || 'Mostrador'}
                </span>
                ${assigneeBadge}
            </div>
            <div class="kds-card-body">
                ${bodyHtml}
            </div>
            <div class="kds-card-footer">
                ${footerHtml}
            </div>
        </div>`;

    if (v.estado === "En preparación") {
        htmlPreparando += cardHtml;
    } else {
        htmlPendientes += cardHtml;
    }
  });

  containerPreparando.innerHTML = htmlPreparando || `<div style="grid-column: 1 / -1; text-align: center; color: #777; margin-top: 20px; font-size: 1.2rem;">Ningún pedido en preparación.</div>`;
  containerPendientes.innerHTML = htmlPendientes || `<div style="grid-column: 1 / -1; text-align: center; color: #777; margin-top: 20px; font-size: 1.2rem;">No hay pedidos pendientes.</div>`;

  updateKDSTimers();
};

window.marcarListoKDS = async (idVenta) => {
  const card = document.getElementById(`kds-card-${idVenta}`);
  if (card) {
    card.classList.add("fade-out");
    // Let animation finish before removing from DB (visually cleaner)
    setTimeout(async () => {
      try {
        const now = new Date();
        const v = window.ventasGlobales.find(x => x.id === idVenta);

        let updateData = {
          estado: "Listo",
          fechaListo: now.toISOString(),
        };

        // Calcular tiempo total si existe horaTomado
        if (v && v.horaTomado) {
            const tomado = new Date(v.horaTomado);
            const diffMs = now.getTime() - tomado.getTime();
            const diffMin = Math.floor(diffMs / 60000);
            updateData.tiempoPreparacionMinutos = diffMin;
        }

        await updateDoc(doc(db, "ventas", idVenta), updateData);
        // Snapshot listener will naturally trigger re-render, but visual feedback is immediate
      } catch (err) {
        console.error("Error marking ready in KDS:", err);
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

    // Add delayed class if > 15 mins
    if (diffMs > 15 * 60 * 1000) {
      t.classList.add("delayed");
    } else {
      t.classList.remove("delayed");
    }

    // Calculate M:S or H:M:S
    const diffSecs = Math.floor(diffMs / 1000);
    const h = Math.floor(diffSecs / 3600);
    const m = Math.floor((diffSecs % 3600) / 60);
    const s = diffSecs % 60;

    let text = "";
    if (h > 0) {
      text = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    } else {
      text = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    const textSpan = t.querySelector(".timer-text");
    if (textSpan) textSpan.innerText = text;
  });
}

// Start timer loop
if (kdsTimerInterval) clearInterval(kdsTimerInterval);
kdsTimerInterval = setInterval(() => {
  if (window.rolActual === "cocina") {
    updateKDSTimers();
  }
}, 1000);

window.tomarPedidoKDS = async (idVenta) => {
  const nombreCocinero = sessionStorage.getItem("grub_kds_nombre");
  if (!nombreCocinero) {
      document.getElementById("modalLoginKDS").style.display = "flex";
      return;
  }

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
