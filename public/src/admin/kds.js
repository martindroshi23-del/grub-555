import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "../config/firebase.config.js";

// Layout Switcher Logic
window.setKdsView = (view) => {
  const container = document.getElementById("kds-container");
  const btns = document.querySelectorAll(".kds-view-btn");

  // Update active class on buttons
  btns.forEach((btn) => btn.classList.remove("active"));
  document
    .querySelector(`.kds-view-btn[data-view="${view}"]`)
    .classList.add("active");

  // Update container class
  container.className = `kds-grid view-${view}`;
};

// Render Logic
window.renderizarKDS = () => {
  const container = document.getElementById("kds-container");
  if (!container || window.rolActual !== "cocina") return;

  let html = "";

  // Filter for active orders (Pendiente / En preparación)
  const activeOrders = (window.ventasGlobales || [])
    .filter((v) => v.estado === "Pendiente" || v.estado === "En preparación")
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // Oldest first

  if (activeOrders.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #777; margin-top: 50px; font-size: 1.5rem;">No hay pedidos activos.</div>`;
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
      // Re-use core sorting logic if available, so side-dishes drop to the bottom
      let orderedItems =
        typeof window.ordenarItemsPedido === "function"
          ? window.ordenarItemsPedido(v.detalle)
          : v.detalle;

      orderedItems.forEach((item) => {
        let modsHtml = "";

        if (item.extras && item.extras.length > 0) {
          item.extras.forEach((ext) => {
            modsHtml += `<div class="kds-mod add"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> ${ext.nombre}</div>`;
          });
        }

        if (item.quitar && item.quitar.length > 0) {
          item.quitar.forEach((q) => {
            modsHtml += `<div class="kds-mod remove"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg> Sin ${q.nombre}</div>`;
          });
        }

        bodyHtml += `
                <div class="kds-item">
                    <div class="kds-item-main"><span class="kds-item-qty">${item.cantidad}x</span> ${item.nombreBase}</div>
                    ${modsHtml ? `<div class="kds-mods">${modsHtml}</div>` : ""}
                </div>`;
      });
    }

    if (v.notas) {
      bodyHtml += `<div style="margin-top: 15px; padding: 10px; background: rgba(255,152,0,0.1); border-left: 4px solid var(--primary); color: #fff; font-size: 1.1rem;"><strong>Nota:</strong> ${v.notas}</div>`;
    }

    html += `
        <div class="kds-card" id="kds-card-${v.id}">
            <div class="kds-card-header">
                <h2 class="kds-order-number">${numOrdStr}</h2>
                <div class="kds-order-time ${delayed ? "delayed" : ""}" data-time="${orderTime.getTime()}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    <span class="timer-text">00:00</span>
                </div>
            </div>
            <div class="kds-client-name">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                ${v.cliente}
            </div>
            <div class="kds-card-body">
                ${bodyHtml}
            </div>
            <div class="kds-card-footer">
                <button class="kds-btn-ready" onclick="marcarListoKDS('${v.id}')">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    Marcar como Listo
                </button>
            </div>
        </div>`;
  });

  container.innerHTML = html;
  updateKDSTimers();
};

window.marcarListoKDS = async (idVenta) => {
  const card = document.getElementById(`kds-card-${idVenta}`);
  if (card) {
    card.classList.add("fade-out");
    // Let animation finish before removing from DB (visually cleaner)
    setTimeout(async () => {
      try {
        await updateDoc(doc(db, "ventas", idVenta), {
          estado: "Listo",
          fechaListo: new Date().toISOString(),
        });
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
