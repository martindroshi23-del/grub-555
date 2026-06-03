import { updateDoc, doc, writeBatch, setDoc, getDoc, collection, onSnapshot, addDoc, deleteDoc, increment } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "../config/firebase.config.js";

window.productosNube = window.productosNube || [];
window.ventasGlobales = window.ventasGlobales || [];
window.pdClientesGlobal = window.pdClientesGlobal || [];
window.intervalCronometros = window.intervalCronometros || null;
window.movimientosGlobales = window.movimientosGlobales || [];
window.gastosGlobales = window.gastosGlobales || [];

// ----------------------------------------------------
// NUBE Y VENTAS LÓGICA ORIGINAL A CONTINUACIÓN
// ----------------------------------------------------

    // VARIABLES GLOBALES DE DATOS










window.ordenarItemsPedido = (detalle) => {
    if (!detalle) return [];
    return detalle.slice().sort((a, b) => {
        if (a.esBebida && !b.esBebida) return 1;
        if (!a.esBebida && b.esBebida) return -1;
        return 0;
    });
};

window.copiarPedidoTexto = (idVenta) => {
        let v = window.ventasGlobales.find(x => x.id === idVenta);
        if(!v) return;

        let numOrd = String(v.numeroOrden || 0).padStart(3, '0');
        let texto = `*Pedido #${numOrd}*\n`;
        texto += `Cliente: ${v.cliente}\n`;
        if(v.telefono) texto += `Tel: ${v.telefono}\n`;
        if(v.direccion) texto += `Dir: ${v.direccion}\n`;
        if(v.notas) texto += `Notas: ${v.notas}\n`;
        texto += `----------------------\n`;

        let itemsOrdenados = window.ordenarItemsPedido(v.detalle);
        itemsOrdenados.forEach(d => {
            texto += `*${d.cantidad}x ${d.nombreBase}*\n`;
            if (d.desglose) {
                if (d.desglose.tipo) texto += `  ↳ Tipo: ${d.desglose.tipo.nombre}\n`;
                if (d.desglose.extras && d.desglose.extras.length > 0) texto += `  ↳ Extra: ${d.desglose.extras.map(e => e.nombre).join(', ')}\n`;
                if (d.desglose.quitar && d.desglose.quitar.length > 0) texto += `  ↳ Quitar: ${d.desglose.quitar.map(q => q.nombre).join(', ')}\n`;
            } else if(d.notas && d.notas.length > 0) {
                texto += `  ↳ ${d.notas.join(' | ')}\n`;
            }
        });

        texto += `----------------------\n`;
        if(v.envio && v.envio > 0) texto += `Envío: $${v.envio}\n`;
        texto += `*TOTAL: $${v.total}*\n`;
        texto += `Método: ${v.metodoPago}\n`;

        window.copiarAlPortapapeles(texto, "Pedido copiado al portapapeles");
    };

    function formatCronometro(ms) {
        if(ms < 0) ms = 0;
        let seg = Math.floor(ms/1000);
        let h = Math.floor(seg/3600);
        let m = Math.floor((seg%3600)/60);
        let s = seg % 60;
        if (h >= 3) return "03:00:00+";
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
    }

    function iniciarCicloCronometros() {
        if(intervalCronometros) clearInterval(intervalCronometros);
        intervalCronometros = setInterval(() => {
            let ahora = new Date().getTime();
            document.querySelectorAll('.cronometro.activo').forEach(el => {
                let inicio = new Date(el.dataset.inicio).getTime();
                el.innerText = formatCronometro(ahora - inicio);
            });
        }, 1000);
    }

    // CARGA EN TIEMPO REAL DESDE FIREBASE

    // Guardar Configuración de Layout
    window.guardarConfigLayout = async () => {
        try {
            await setDoc(doc(db, "config", "layout"), window.layoutConfig || {});
            if (typeof window.mostrarBurbuja === 'function') window.mostrarBurbuja("Configuración de menú guardada correctamente");
        } catch (error) {
            console.error(error);
            if (typeof window.mostrarBurbuja === 'function') window.mostrarBurbuja("Error al guardar layout", true);
        }
    };

    // Cargar Configuración de Layout en Firebase
    function cargarConfigLayout(callback) {
        onSnapshot(doc(db, "config", "layout"), (docSnap) => {
            if (docSnap.exists()) {
                window.layoutConfig = docSnap.data();
            }
            if(callback) callback();
        });
    }

    window.guardarConfigWhatsApp = async () => {
        let wpVal = document.getElementById("config-whatsapp-number").value.trim();
        try {
            await setDoc(doc(db, "config", "whatsapp"), { numero: wpVal });
            if (typeof window.mostrarBurbuja === 'function') window.mostrarBurbuja("Número de WhatsApp guardado");
        } catch(e) {
            console.error(e);
            if (typeof window.mostrarBurbuja === 'function') window.mostrarBurbuja("Error al guardar número de WhatsApp", true);
        }
    };

    function cargarConfigWhatsApp() {
        onSnapshot(doc(db, "config", "whatsapp"), (docSnap) => {
            if (docSnap.exists() && docSnap.data().numero) {
                document.getElementById("config-whatsapp-number").value = docSnap.data().numero;
                window.configuracionWhatsApp = docSnap.data().numero;
            }
        });
    }

    window.aplicarInterfazPorRol = () => {
        const btnsSidebar = document.querySelectorAll('.sidebar-btn');

        // Ensure "cocina-screen" exists or handle dynamically
        let cocinaScreen = document.getElementById('cocina-screen');

        if (window.rolActual === 'admin') {
            document.getElementById('admin-screen').style.display = 'block';
            document.getElementById('main-sidebar').style.display = 'flex';
            cocinaScreen.style.display = 'none';

            // All buttons visible
            btnsSidebar.forEach(btn => btn.style.display = 'flex');
        } else if (window.rolActual === 'cajero') {
            document.getElementById('admin-screen').style.display = 'block';
            document.getElementById('main-sidebar').style.display = 'flex';
            cocinaScreen.style.display = 'none';

        // Hide Inventario, Editar Menú, Usuarios, Configuraciones, Promos
            btnsSidebar.forEach((btn, index) => {
                const tooltip = btn.getAttribute('data-tooltip');
            if (tooltip === "Inventario Nube" || tooltip === "Editar Menú" || tooltip === "Gestionar Usuarios" || tooltip === "Configuraciones" || tooltip === "Promos y Ofertas") {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'flex';
                }
            });
            // Activar Ventas por defecto
            const btnVentas = Array.from(btnsSidebar).find(b => b.getAttribute('data-tooltip') === "Ventas en Vivo");
            if(btnVentas) cambiarTab('tab-ventas', btnVentas);
        } else if (window.rolActual === 'cocina') {
            document.getElementById('admin-screen').style.display = 'none';
            document.getElementById('main-sidebar').style.display = 'none';
            cocinaScreen.style.display = 'flex';

            // Requerir login de cocinero al entrar a la vista de cocina
            const nombreCocinero = sessionStorage.getItem("grub_kds_nombre");
            if (!nombreCocinero) {
                document.getElementById("modalLoginKDS").style.setProperty("display", "flex", "important");
            }

            if (typeof window.renderizarKDS === 'function') {
                window.renderizarKDS();
            }
        }
    };

    // Asegurar inicialización después de que los productos carguen
    // Ya que renderEditor() depende de window.productosNube
    window.renderizarNube = () => {
        let listaHtml = "";
        let htmlStockMini = "";

        let busqueda = "";
        let inputBuscador = document.getElementById("filtroBuscadorInventario");
        if (inputBuscador) {
            busqueda = inputBuscador.value.toLowerCase();
        }

        let productosFiltrados = window.productosNube;
        if (busqueda) {
            productosFiltrados = window.productosNube.filter(p => p.nombre.toLowerCase().includes(busqueda) || (p.categoria || "").toLowerCase().includes(busqueda));
        }

        if (productosFiltrados.length === 0) {
            document.getElementById("listaAdmin").innerHTML = "<p style='color:#aaa; text-align:center; padding:20px;'>No se encontraron productos.</p>";
        } else {
            let sortedStock = [...productosFiltrados].sort((a,b) => a.stock - b.stock);

            sortedStock.forEach(p => {
          let badgeTipo = p.esBebida ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><path d="M10 20v-5.5c0-1.4 1-2.5 2-2.5s2 1.1 2 2.5V20"></path><path d="M8 20h8"></path><path d="M12 4v4"></path><path d="M10 4h4"></path><path d="M6 10h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10z"></path></svg>Bebida' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><path d="M12 2a5 5 0 0 0-5 5v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a5 5 0 0 0-5-5z"></path><path d="M5 16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3z"></path></svg>Menú';
          let isLow = p.stock > 0 && p.stock <= 10;
          let isOut = p.stock <= 0;
          let stockInfo = p.stock > 1000 ? "Infinito" : p.stock;

          listaHtml += `
          <div class="admin-card" style="margin-bottom: 10px; padding: 15px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
              <div><strong>${p.nombre}</strong> <span style="font-size:0.8rem; background:#444; padding:2px 6px; border-radius:5px;">${badgeTipo}</span></div>
              <span style="color:var(--primary); font-weight:bold;">Stock: ${stockInfo}</span>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
              <div style="display:flex; gap:5px;">
                <input type="number" id="mod_${p.id}" placeholder="+ o -" style="width:75px; padding:8px; margin:0;">
                <button class="btn-primary" style="padding:8px; width:auto;" onclick="modificarStockNube('${p.id}', ${p.stock})">Suma/Resta</button>
              </div>
              <div style="display:flex; gap:10px;">
                <button class="btn-primary" style="background:#555; padding:8px 15px; width:auto;" onclick="cargarParaEditar('${p.id}')">Editar</button>
                <button class="btn-primary" style="background:#ff3c3c; padding:8px 15px; width:auto;" onclick="borrarDeNube('${p.id}')">Borrar</button>
              </div>
            </div>
          </div>`;

          let colorStock = isOut ? "#ff3c3c" : (isLow ? "#ffcc00" : "#00c853");
          htmlStockMini += `
          <div style="display:flex; justify-content:space-between; padding: 8px 0; border-bottom:1px solid #222; font-size: 0.9rem;">
             <span>${p.esBebida ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M10 20v-5.5c0-1.4 1-2.5 2-2.5s2 1.1 2 2.5V20"></path><path d="M8 20h8"></path><path d="M12 4v4"></path><path d="M10 4h4"></path><path d="M6 10h12v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V10z"></path></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M12 2a5 5 0 0 0-5 5v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V7a5 5 0 0 0-5-5z"></path><path d="M5 16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3z"></path></svg>'} ${p.nombre}</span>
             <strong style="color: ${colorStock}">${stockInfo}</strong>
          </div>`;
        });

            document.getElementById("listaAdmin").innerHTML = listaHtml;
        }

        // Only update these globally if not filtering (to avoid breaking other parts of the app)
        if (!busqueda) {
            document.getElementById("listaStockMini").innerHTML = htmlStockMini || "<p>No hay productos.</p>";

            let selectVenta = document.getElementById("vProductosSelect");
            if (selectVenta) {
                selectVenta.innerHTML = "";
                let sorted = [...window.productosNube].sort((a,b) => a.nombre.localeCompare(b.nombre));
                sorted.forEach(p => {
                  selectVenta.innerHTML += `<option value="${p.id}">${p.nombre} (Base: $${p.precio})</option>`;
                });
            }
        }
    };

    window.cargarNubeEnTiempoReal = function() {
      // Cargar configuración de layout de manera independiente
      cargarConfigLayout(() => {
          if(document.getElementById('tab-editor-menu').classList.contains('active')) {
              renderEditor();
          }
      });
      cargarConfigWhatsApp();
      onSnapshot(collection(db, "productos"), (snapshot) => {
        window.productosNube = [];
        snapshot.forEach((docSnap) => {
          let p = docSnap.data();
          p.id = docSnap.id;
          window.productosNube.push(p);
        });

        window.renderizarNube();

        if(document.getElementById('tab-editor-menu').classList.contains('active')) {
            renderEditor();
        }
      });

      onSnapshot(collection(db, "ventas"), (snapshot) => {
        let ventas = [];
        snapshot.forEach(docSnap => {
          let v = docSnap.data();
          v.id = docSnap.id;
          ventas.push(v);
        });
        window.ventasGlobales = ventas;
        renderizarTablaVentas();
        if (typeof window.renderizarKDS === 'function') {
            window.renderizarKDS();
        }
      });

      onSnapshot(collection(db, "gastos"), (snapshot) => {
        let gas = [];
        snapshot.forEach(docSnap => {
          let g = docSnap.data();
          g.id = docSnap.id;
          gas.push(g);
        });
        window.gastosGlobales = gas;
        if (typeof window.renderizarTablaGastos === 'function') {
            window.renderizarTablaGastos();
        }
      });

      onSnapshot(collection(db, "movimientos"), (snapshot) => {
        let movs = [];
        snapshot.forEach(docSnap => {
          let m = docSnap.data();
          m.id = docSnap.id;
          movs.push(m);
        });
        window.movimientosGlobales = movs;
        if (typeof window.renderizarTablaMovimientos === 'function') {
            window.renderizarTablaMovimientos();
        }
        if (typeof window.limpiarMovimientosAntiguos === 'function') {
            window.limpiarMovimientosAntiguos();
        }
      });

      onSnapshot(collection(db, "pd_clientes"), (snapshot) => {
        window.pdClientesGlobal = [];
        snapshot.forEach(docSnap => {
          let c = docSnap.data();
          c.id = docSnap.id;
          window.pdClientesGlobal.push(c);
        });
        if (typeof window.renderizarTablaPD === 'function') {
            window.renderizarTablaPD();
        }
      });
    }

    window.renderizarTablaVentas = () => {
        let busqueda = document.getElementById("filtroBuscadorHistorial").value.toLowerCase();
        let modoVista = document.getElementById("filtroVistaOrden").value;

        let filtradas = window.ventasGlobales.filter(v => {
            let numStr = String(v.numeroOrden || "").toLowerCase();
            return v.cliente.toLowerCase().includes(busqueda) || numStr.includes(busqueda);
        });

        if (modoVista === "completados") filtradas = filtradas.filter(v => v.estado === "Listo");

        filtradas.sort((a,b) => (b.numeroOrden || 0) - (a.numeroOrden || 0));

        if (modoVista === "pendientes_primero") {
            filtradas.sort((a, b) => {
                let aPend = a.estado === "Pendiente" ? 1 : 0;
                let bPend = b.estado === "Pendiente" ? 1 : 0;
                if(aPend !== bPend) return bPend - aPend;
                return (b.numeroOrden || 0) - (a.numeroOrden || 0);
            });
        }

        let htmlVentas = "";
        let htmlPendientesMini = "";

        // Carga del mini dashboard de pendientes
        let soloPendientes = [...window.ventasGlobales]
            .filter(v => v.estado === "Pendiente")
            .sort((a,b) => new Date(a.fecha) - new Date(b.fecha));

        soloPendientes.forEach((v, index) => {
           let numOrdStr = String(v.numeroOrden || 0).padStart(3, '0');
           let extraStyle = index === 0 ? 'urgente' : 'normal';

           htmlPendientesMini += `
            <div class="mini-card ${extraStyle}">
               <div>
                  <div style="font-weight:bold; color:var(--primary);">#${numOrdStr} - ${v.cliente}</div>
                  <div class="cronometro activo" data-inicio="${v.fecha}" style="font-size: 1.2rem; padding: 2px 0;">00:00:00</div>
               </div>
               <button class="btn-primary" style="width:auto; padding: 8px 12px; font-size: 0.8rem; background:#333;" onclick="abrirModalDetalleVenta('${v.id}')">Ver</button>
            </div>
           `;
        });

        document.getElementById("listaPendientesMini").innerHTML = htmlPendientesMini || '<p style="color:#777; text-align:center; padding: 20px 0;">Cocina libre. No hay pedidos pendientes.</p>';

        filtradas.forEach(v => {
          let numOrdStr = String(v.numeroOrden || 0).padStart(3, '0');

          let btnDetalle = `<button style="background:none; border:1px solid #444; color:var(--primary); padding:4px 8px; border-radius:6px; font-size:0.75rem; cursor:pointer;" onclick="abrirModalDetalleVenta('${v.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>Resumen</button>`;
          let costoEnvioHtml = v.envio > 0 ? `<span style="color:#ffcc00; font-size:0.75rem; margin-left:5px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>$${v.envio}</span>` : '';

          let htmlCrono = "";
          if (v.estado === "Pendiente") {
              htmlCrono = `<div class="cronometro activo" data-inicio="${v.fecha}">00:00:00</div>`;
          } else if (v.fechaListo) {
              let diff = new Date(v.fechaListo).getTime() - new Date(v.fecha).getTime();
              htmlCrono = `<div class="cronometro inactivo">T. ${formatCronometro(diff)}</div>`;
          }

          let accionesHtml = `
            <div class="grid-acciones">
                <button class="btn-accion-mini" style="background:#4CAF50; color:#fff;" onclick="imprimirTicketLocal('${v.id}')" title="Imprimir Ticket Local"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg></button>
                <button class="btn-accion-mini" style="background:#607D8B; color:#fff;" onclick="copiarPedidoTexto('${v.id}')" title="Copiar Pedido"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg></button>
                <button class="btn-accion-mini" style="background:#555; color:#fff;" onclick="editarPedido('${v.id}')" title="Editar"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                ${v.estado !== 'Cancelado'
                    ? `<button class="btn-accion-mini" style="background:rgba(255,0,0,0.2); color:#ff3c3c;" onclick="abrirModalCancelar('${v.id}')" title="Cancelar Pedido"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>`
                    : ''}
            </div>
          `;

          htmlVentas += `<tr class="${v.estado === 'Cancelado' ? 'estado-cancelado' : ''}">
            <td>
              <strong style="color:var(--primary); font-size:1.1rem;">#${numOrdStr}</strong><br>${htmlCrono}
            </td>
            <td>
              <strong>${v.cliente}</strong><br>
              ${v.telefono ? `<span class="copiable" style="color:#aaa; font-size:0.85rem;" onclick="copiarAlPortapapeles('${v.telefono}', 'Teléfono copiado')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:2px;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> ${v.telefono}</span><br>` : ''}
              ${v.direccion ? `<span class="copiable" style="color:#aaa; font-size:0.85rem; max-width: 150px; display: inline-block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; vertical-align: bottom;" onclick="copiarAlPortapapeles('${v.direccion}', 'Dirección copiada')" title="${v.direccion}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:2px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> ${v.direccion}</span><br>` : ''}
              <small style="color:#888;">$${v.total}</small>
            </td>
            <td>
              <div style="margin-bottom:6px;">${btnDetalle} ${costoEnvioHtml}</div>
              ${accionesHtml}
            </td>
            <td style="text-align:center; padding: 5px;">
              <div style="display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: center; height: 100%;">
                ${v.estado === 'Pendiente' ? `<button class="btn-estado pendiente" onclick="toggleVentaLista('${v.id}', true)">Marcar Listo</button>` : ''}
                ${v.estado === 'Listo' ? `<button class="btn-estado listo" onclick="toggleVentaLista('${v.id}', false)">Completado</button>` : ''}

                ${v.estado !== 'Cancelado' ? (!v.pagado ? `<button class="btn-estado pendiente" onclick="toggleVentaPagada('${v.id}', true)">Marcar Pagado</button>` : `<button class="btn-estado listo" onclick="toggleVentaPagada('${v.id}', false)">Pagado</button>`) : ''}

                ${v.estado === 'Cancelado' ? `<span style="color:#ff3c3c; font-weight:bold; font-size:0.8rem;">Cancelado</span>` : ''}
              </div>
            </td>
          </tr>`;
        });

        document.getElementById("tabla-ventas").innerHTML = htmlVentas || `<tr><td colspan="4" style="text-align:center; color:#777; padding:20px;">No se encontraron pedidos.</td></tr>`;
        iniciarCicloCronometros();
    };

    window.abrirModalDetalleVenta = (id) => {
        let v = window.ventasGlobales.find(x => x.id === id);
        if(!v) return;

        let html = `<h3 style="color:var(--primary); margin-bottom: 10px;">Pedido #${String(v.numeroOrden||0).padStart(3,'0')}</h3>`;
        html += `<p style="color:#aaa; font-size:0.9rem; margin-bottom: 15px;"><strong>Cliente:</strong> ${v.cliente}<br><strong>Tel:</strong> ${v.telefono||'-'}<br><strong>Dir:</strong> ${v.direccion||'-'}</p>`;

        let itemsOrdenados = window.ordenarItemsPedido(v.detalle);

        itemsOrdenados.forEach(d => {
            html += `<div style="background:#222; padding:10px; border-radius:8px; margin-bottom:10px; border-left:3px solid var(--primary);">`;
            html += `<div style="font-weight:bold; font-size:1rem; color:#fff;">${d.cantidad}x ${d.nombreBase} <span style="float:right; color:var(--primary);">$${d.precioFinal * d.cantidad}</span></div>`;
            if (d.desglose) {
                html += `<div style="font-size:0.85rem; color:#ccc; margin-top:5px; padding-left:10px; border-left:1px dashed #444;">`;
                html += `Base: $${d.desglose.base}<br>`;
                if (d.desglose.tipo) html += `↳ Tipo: ${d.desglose.tipo.nombre} (${d.desglose.tipo.precio !== 0 ? (d.desglose.tipo.precio>0?'+':'') + d.desglose.tipo.precio : '0'})<br>`;
                if (d.desglose.extras) d.desglose.extras.forEach(e => html += `↳ Extra: ${e.nombre} (+$${e.precio})<br>`);
                if (d.desglose.quitar) d.desglose.quitar.forEach(q => html += `↳ Sin: ${q.nombre} (${q.precio !== 0 ? (q.precio>0?'+':'') + q.precio : '0'})<br>`);
                html += `</div>`;
            } else if(d.notas && d.notas.length > 0) {
                html += `<div style="font-size:0.85rem; color:#ccc; margin-top:5px;">↳ ${d.notas.join('<br>↳ ')}</div>`;
            }
            html += `</div>`;
        });

        if(v.envio && v.envio > 0) html += `<div style="text-align:right; margin-top:10px; color:#ffcc00; font-weight:bold;">Envío: $${v.envio}</div>`;
        html += `<div style="text-align:right; margin-top:5px; color:var(--primary); font-weight:bold; font-size:1.2rem;">TOTAL: $${v.total}</div>`;

        if (v.notas) html += `<div style="margin-top:15px; padding:10px; background:rgba(255,204,0,0.1); border:1px dashed #ffcc00; color:#ffcc00; border-radius:8px;"><strong>Notas:</strong> ${v.notas}</div>`;

        document.getElementById('contenidoDetalleVenta').innerHTML = html;
        document.getElementById('modalDetalleVenta').style.display = 'flex';
    };

    window.filtrarBuscador = () => {
      let filtro = document.getElementById("vFiltroProducto").value.toLowerCase();
      let select = document.getElementById("vProductosSelect");
      Array.from(select.options).forEach(opt => {
        let texto = opt.text.toLowerCase();
        opt.style.display = texto.includes(filtro) ? "block" : "none";
      });
      let primerVisible = Array.from(select.options).find(opt => opt.style.display !== "none");
      if (primerVisible) select.value = primerVisible.value;
    };

    window.getEffectiveTotal = () => {
      let calc = parseInt(document.getElementById("vTotal").value) || 0;
      let manStr = document.getElementById("vTotalManual").value.trim();
      if (manStr !== "" && !isNaN(parseInt(manStr))) return parseInt(manStr);
      return calc;
    };

    let itemsVentaTemp = [];
    let admProdActual = null;
    let admSelActual = { tipo: null, extras: [], quitar: [] };
    let cantTotalTemp = 1;
    let cantActualIndice = 1;
    let itemsTemporalesLote = [];

    window.abrirRegistroNuevo = () => {
      document.getElementById('vEditVentaId').value = "";
      document.getElementById('tituloRegistroVenta').innerText = "Registro de Venta";
      document.getElementById('btnGuardarVenta').innerText = "Guardar Pedido";
      itemsVentaTemp = [];

      document.getElementById("vCliente").value = "";
      document.getElementById("vTelefono").value = "";
      document.getElementById("vDireccion").value = "";
      document.getElementById("vEnvio").value = "0";
      document.getElementById("vRetiroLocal").checked = false;
      toggleEnvio();

      document.getElementById("vTotalManual").value = "";
      document.getElementById("vDetalles").value = "";
      document.getElementById("vEstado").value = "Pendiente";
      document.getElementById("vPagado").value = "false";
      document.getElementById("vMetodoPago").value = "Efectivo";
      toggleMitadPago();

      actualizarPreviewVenta();

      document.getElementById('vistaDashboards').style.display = 'none';
      document.getElementById('formRegistroBox').style.display = 'flex';
    };

    window.cerrarRegistroForm = () => {
      document.getElementById('formRegistroBox').style.display = 'none';
      document.getElementById('vistaDashboards').style.display = 'flex';
    };

    window.editarPedido = (idVenta) => {
      let v = window.ventasGlobales.find(x => x.id === idVenta);
      if(!v) return;

      document.getElementById('vEditVentaId').value = v.id;
      document.getElementById('tituloRegistroVenta').innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:text-bottom; margin-right:6px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>Editando #` + String(v.numeroOrden||0).padStart(3,'0');
      document.getElementById('btnGuardarVenta').innerText = "Actualizar Pedido";

      document.getElementById("vCliente").value = v.cliente || "";
      document.getElementById("vTelefono").value = v.telefono || "";
      document.getElementById("vDireccion").value = v.direccion || "";
      document.getElementById("vEnvio").value = v.envio || "0";

      if (v.envio === 0 && !v.direccion) {
          document.getElementById("vRetiroLocal").checked = true;
      } else {
          document.getElementById("vRetiroLocal").checked = false;
      }
      toggleEnvio();

      document.getElementById("vMetodoPago").value = v.metodoPago || "Efectivo";
      toggleMitadPago();
      if (v.metodoPago === 'Efectivo y Transferencia') {
        document.getElementById("vMontoEfectivo").value = v.montoEfectivo || "";
        document.getElementById("vMontoTransf").value = v.montoTransferencia || "";
      }

      document.getElementById("vEstado").value = v.estado || "Pendiente";
      document.getElementById("vPagado").value = v.pagado ? "true" : "false";
      document.getElementById("vDetalles").value = v.notas || "";

      itemsVentaTemp = JSON.parse(JSON.stringify(v.detalle || []));
      actualizarPreviewVenta();

      let calcTotal = parseInt(document.getElementById("vTotal").value) || 0;
      if (v.total !== calcTotal) {
          document.getElementById("vTotalManual").value = v.total;
      } else {
          document.getElementById("vTotalManual").value = "";
      }

      document.getElementById('vistaDashboards').style.display = 'none';
      document.getElementById('formRegistroBox').style.display = 'flex';
    };

    window.iniciarAgregadoProducto = () => {
      let select = document.getElementById("vProductosSelect");
      if(select.options.length === 0) return;
      let id = select.value;

      cantTotalTemp = parseInt(document.getElementById("vCantidad").value) || 1;
      cantActualIndice = 1;
      itemsTemporalesLote = [];

      admProdActual = window.productosNube.find(p => p.id === id);
      if(!admProdActual) return;

      let tieneOpciones = (admProdActual.tipos && admProdActual.tipos.length > 0) || (admProdActual.extras && admProdActual.extras.length > 0) || (admProdActual.quitar && admProdActual.quitar.length > 0);

      if(tieneOpciones) {
        resetAdmSelActual();
        document.getElementById("modalConfigProd").style.display = "flex";
        renderizarUIConfigProd();
      } else {
        itemsVentaTemp.push({
            idBase: admProdActual.id,
            nombreBase: admProdActual.nombre,
            precioFinal: admProdActual.precio,
            cantidad: cantTotalTemp,
            notas: [],
            desglose: { base: admProdActual.precio, tipo: null, extras: [], quitar: [] },
            categoria: admProdActual.categoria || "Otros",
            esBebida: !!admProdActual.esBebida
        });
        document.getElementById("vCantidad").value = 1;
        actualizarPreviewVenta();
      }
    };

    function resetAdmSelActual() {
      let primerTipo = null;
      if (admProdActual.tipos && admProdActual.tipos.length > 0) {
          primerTipo = typeof admProdActual.tipos[0] === 'string' ? {nombre: admProdActual.tipos[0], precio: 0} : admProdActual.tipos[0];
      }
      admSelActual = { tipo: primerTipo, extras: [], quitar: [] };
    }

    function renderizarUIConfigProd() {
      let ui = document.getElementById("uiConfigProd");
      let pCalc = admProdActual.precio;

      if (admSelActual.tipo && admSelActual.tipo.precio) pCalc += admSelActual.tipo.precio;
      admSelActual.extras.forEach(e => pCalc += e.precio);
      admSelActual.quitar.forEach(q => { if(q.precio) pCalc += q.precio; });

      let tituloText = admProdActual.nombre;
      if (cantTotalTemp > 1) tituloText += ` <span style="color:#aaa; font-size:0.9rem;">(${cantActualIndice} de ${cantTotalTemp})</span>`;
      document.getElementById("tituloConfigProd").innerHTML = tituloText;

      let html = `<h3 style="color:var(--primary); margin-bottom: 20px; font-size: 1.3rem;">Total Unidad: $${pCalc}</h3>`;

      if (admProdActual.tipos && admProdActual.tipos.length > 0) {
        html += `<div class="grupo-opciones"><h4>Tipo de Producto</h4>`;
        admProdActual.tipos.forEach(t => {
          let obj = typeof t === 'string' ? {nombre: t, precio: 0} : t;
          let sel = (admSelActual.tipo && admSelActual.tipo.nombre === obj.nombre);
          let txtPre = obj.precio !== 0 ? ` (${obj.precio>0?'+':''}$${obj.precio})` : '';
          html += `<div class="chip-admin ${sel?'selected':''}" onclick='admSetTipo(${JSON.stringify(obj)})'>${obj.nombre}${txtPre}</div>`;
        });
        html += `</div>`;
      }

      if (admProdActual.extras && admProdActual.extras.length > 0) {
        html += `<div class="grupo-opciones"><h4>Añadir Extras</h4>`;
        admProdActual.extras.forEach(e => {
          let obj = typeof e === 'string' ? {nombre: e, precio: 0} : e;
          let sel = admSelActual.extras.find(x => x.nombre === obj.nombre);
          let txtPre = obj.precio !== 0 ? ` (+ $${obj.precio})` : '';
          html += `<div class="chip-admin ${sel?'selected':''}" onclick='admToggleExtra(${JSON.stringify(obj)})'>+ ${obj.nombre}${txtPre}</div>`;
        });
        html += `</div>`;
      }

      if (admProdActual.quitar && admProdActual.quitar.length > 0) {
        html += `<div class="grupo-opciones"><h4>Quitar Ingredientes</h4>`;
        admProdActual.quitar.forEach(q => {
          let obj = typeof q === 'string' ? {nombre: q, precio: 0} : q;
          let sel = admSelActual.quitar.find(x => x.nombre === obj.nombre);
          let txtPre = obj.precio !== 0 ? ` (${obj.precio>0?'+':''}$${obj.precio})` : '';
          html += `<div class="chip-admin quitar ${sel?'selected':''}" onclick='admToggleQuitar(${JSON.stringify(obj)})'>Sin ${obj.nombre}${txtPre}</div>`;
        });
        html += `</div>`;
      }

      let txtBoton = (cantActualIndice < cantTotalTemp) ? "Confirmar y Seguir ➔" : "Confirmar Lote ✓";
      html += `<button class="btn-primary" onclick="ejecutarAgregadoDirecto()" style="margin-top:10px;">${txtBoton}</button>`;

      ui.innerHTML = html;
    }

    window.admSetTipo = (obj) => {
        admSelActual.tipo = obj;
        renderizarUIConfigProd();
    };

    window.admToggleExtra = (obj) => {
        let i = admSelActual.extras.findIndex(e=>e.nombre===obj.nombre);
        if(i>-1) admSelActual.extras.splice(i,1);
        else admSelActual.extras.push(obj);
        renderizarUIConfigProd();
    };

    window.admToggleQuitar = (obj) => {
        let i = admSelActual.quitar.findIndex(q=>q.nombre===obj.nombre);
        if(i>-1) admSelActual.quitar.splice(i,1);
        else admSelActual.quitar.push(obj);
        renderizarUIConfigProd();
    };

    window.ejecutarAgregadoDirecto = () => {
      let pFinal = admProdActual.precio;
      let notasStr = [];
      let desglose = { base: admProdActual.precio, tipo: null, extras: [], quitar: [] };

      if (admSelActual.tipo) {
          pFinal += (admSelActual.tipo.precio||0);
          notasStr.push(admSelActual.tipo.nombre);
          desglose.tipo = admSelActual.tipo;
      }

      admSelActual.extras.forEach(e => {
          pFinal += e.precio;
          notasStr.push(`+ ${e.nombre}`);
          desglose.extras.push(e);
      });

      admSelActual.quitar.forEach(q => {
          if(q.precio) pFinal += q.precio;
          notasStr.push(`Sin ${q.nombre}`);
          desglose.quitar.push(q);
      });

      itemsTemporalesLote.push({
          idBase: admProdActual.id,
          nombreBase: admProdActual.nombre,
          precioFinal: pFinal,
          cantidad: 1,
          notas: notasStr,
          desglose: desglose,
          categoria: admProdActual.categoria || "Otros",
          esBebida: !!admProdActual.esBebida
      });

      if (cantActualIndice < cantTotalTemp) {
        cantActualIndice++;
        resetAdmSelActual();
        renderizarUIConfigProd();
      } else {
        itemsTemporalesLote.forEach(tempItem => {
          let existing = itemsVentaTemp.find(i => i.idBase === tempItem.idBase && JSON.stringify(i.notas) === JSON.stringify(tempItem.notas));
          if (existing) {
              existing.cantidad += 1;
          } else {
              itemsVentaTemp.push(tempItem);
          }
        });

        document.getElementById("vCantidad").value = 1;
        document.getElementById('modalConfigProd').style.display = 'none';
        actualizarPreviewVenta();
      }
    };

    window.quitarProductoDeVenta = (index) => {
        itemsVentaTemp.splice(index, 1);
        actualizarPreviewVenta();
    };

    window.toggleEnvio = () => {
      let chk = document.getElementById("vRetiroLocal").checked;
      let inEnvio = document.getElementById("vEnvio");
      if(chk) {
          inEnvio.value = "0";
          inEnvio.style.opacity = "0.3";
          inEnvio.disabled = true;
      } else {
          inEnvio.style.opacity = "1";
          inEnvio.disabled = false;
      }
      actualizarPreviewVenta();
    };

    window.actualizarPreviewVenta = () => {
      let contenedor = document.getElementById("vListaItems");
      let totalItems = 0;
      contenedor.innerHTML = "";

      itemsVentaTemp.forEach((item, idx) => {
        let subtotal = item.precioFinal * item.cantidad;
        totalItems += subtotal;

        let htmlDesglose = `<div style="font-size:0.75rem; color:#aaa; margin-top:3px;">`;
        if (item.desglose) {
            if (item.desglose.tipo) {
                htmlDesglose += `↳ ${item.desglose.tipo.nombre}<br>`;
            }
            if (item.desglose.extras && item.desglose.extras.length > 0) {
                htmlDesglose += `↳ Ex: ${item.desglose.extras.map(e=>e.nombre).join(', ')}<br>`;
            }
            if (item.desglose.quitar && item.desglose.quitar.length > 0) {
                htmlDesglose += `↳ Sin: ${item.desglose.quitar.map(q=>q.nombre).join(', ')}<br>`;
            }
        } else if(item.notas && item.notas.length > 0) {
            htmlDesglose += `↳ ${item.notas.join(' | ')}`;
        }
        htmlDesglose += `</div>`;

        contenedor.innerHTML += `
          <div class="item-agregado">
            <div style="flex-grow:1; line-height:1.2;">
              <span style="color:#fff; font-size:0.9rem;"><strong>${item.cantidad}x</strong> ${item.nombreBase}</span>
              ${htmlDesglose}
            </div>
            <div style="display:flex; align-items:flex-start; gap:8px;">
              <span style="color:var(--primary); font-weight:bold;">$${subtotal}</span>
              <button onclick="quitarProductoDeVenta(${idx})" style="background:none; border:none; color:#ff3c3c; cursor:pointer; font-weight:bold;">✕</button>
            </div>
          </div>`;
      });

      if(itemsVentaTemp.length === 0) {
          contenedor.innerHTML = "<p style='font-size:0.85rem; color:#888;'>No hay productos seleccionados.</p>";
      }

      let costoEnvio = parseInt(document.getElementById("vEnvio").value) || 0;
      if (document.getElementById("vRetiroLocal").checked) costoEnvio = 0;

      document.getElementById("vTotal").value = totalItems + costoEnvio;
    };

    window.toggleMitadPago = () => {
        let val = document.getElementById("vMetodoPago").value;
        document.getElementById("divMitadPago").style.display = (val === 'Efectivo y Transferencia') ? 'block' : 'none';
        if(val !== 'Efectivo y Transferencia') {
            document.getElementById("vMontoEfectivo").value = "";
            document.getElementById("vMontoTransf").value = "";
        }
    };

    window.intentarGuardarVenta = () => {
      if(itemsVentaTemp.length === 0) return alert("Agrega al menos un producto al pedido.");

      let metodo = document.getElementById("vMetodoPago").value;
      if (metodo === 'Efectivo y Transferencia') {
        let mEf = document.getElementById("vMontoEfectivo").value;
        let mTr = document.getElementById("vMontoTransf").value;
        if (!mEf && !mTr) {
            document.getElementById('modalAvisoEfTr').style.display = 'flex';
            return;
        }
      }

      ejecutarGuardado();
    };

    window.ejecutarGuardado = async () => {
      document.getElementById('modalAvisoEfTr').style.display = 'none';
      document.getElementById("btnGuardarVenta").innerText = "Guardando...";

      let idEdicion = document.getElementById('vEditVentaId').value;
      let cliente = document.getElementById("vCliente").value.trim() || "Cliente Anónimo";
      let telIngresado = document.getElementById("vTelefono").value.trim();
      let totalNeto = window.getEffectiveTotal();
      let metodo = document.getElementById("vMetodoPago").value;
      let costoEnvio = document.getElementById("vRetiroLocal").checked ? 0 : (parseInt(document.getElementById("vEnvio").value) || 0);

      let mEf = 0, mTr = 0;
      if (metodo === 'Efectivo y Transferencia') {
          mEf = parseInt(document.getElementById("vMontoEfectivo").value) || 0;
          mTr = parseInt(document.getElementById("vMontoTransf").value) || 0;
      }

      let maxOrden = window.ventasGlobales.reduce((max, v) => Math.max(max, v.numeroOrden || 0), 0);
      let numOrdenAsignado = idEdicion ? (window.ventasGlobales.find(v=>v.id === idEdicion).numeroOrden) : (maxOrden + 1);
      let estadoNuevo = document.getElementById("vEstado").value;
      let pagadoVal = document.getElementById("vPagado").value === "true";

      let ventaInfo = {
        numeroOrden: numOrdenAsignado,
        cliente: cliente,
        telefono: telIngresado,
        direccion: document.getElementById("vDireccion").value.trim(),
        total: totalNeto,
        envio: costoEnvio,
        metodoPago: metodo,
        montoEfectivo: mEf,
        montoTransferencia: mTr,
        estado: estadoNuevo,
        pagado: pagadoVal,
        notas: document.getElementById("vDetalles").value.trim(),
        detalle: itemsVentaTemp
      };

      if (!idEdicion) {
          ventaInfo.fecha = new Date().toISOString();
          let telClean = telIngresado.replace(/\D/g, '');

          if (telClean !== "") {
              try {
                  let docRef = doc(db, "pd_clientes", telClean);
                  let docSnap = await getDoc(docRef);

                  let ptsActuales = 0;
                  let primerVis = new Date().toISOString();

                  if (docSnap.exists()) {
                      let uV = docSnap.data().ultimaVisita ? new Date(docSnap.data().ultimaVisita) : new Date();
                      let dInac = Math.floor((new Date() - uV) / (1000 * 60 * 60 * 24));

                      if (dInac <= 120) {
                          ptsActuales = docSnap.data().puntos || 0;
                          primerVis = docSnap.data().primerVisita || primerVis;
                      }
                  }

                  ptsActuales++;
                  let esPremio = false;

                  if (ptsActuales >= 10) {
                      esPremio = true;
                      ptsActuales = 0;
                  }

                  ventaInfo.puntosImpresos = esPremio ? 10 : ptsActuales;
                  ventaInfo.esPremio = esPremio;

                  let pdUpdate = {
                      nombre: cliente !== "Cliente Anónimo" ? cliente : (docSnap.exists() ? docSnap.data().nombre : cliente),
                      telefono: telIngresado,
                      puntos: ptsActuales,
                      ultimaVisita: new Date().toISOString(),
                      primerVisita: primerVis
                  };

                  if (!docSnap.exists() || (docSnap.exists() && Math.floor((new Date() - (docSnap.data().ultimaVisita ? new Date(docSnap.data().ultimaVisita) : new Date())) / (1000 * 60 * 60 * 24)) > 120)) {
                      pdUpdate.totalPedidos = 1;
                  } else {
                      pdUpdate.totalPedidos = increment(1);
                  }

                  await setDoc(docRef, pdUpdate, {merge: true});

              } catch(e) {
                  console.error("Error al registrar PD:", e);
              }
          }
      }

      if (estadoNuevo === "Listo" && (!idEdicion || window.ventasGlobales.find(v=>v.id===idEdicion).estado !== "Listo")) {
          ventaInfo.fechaListo = new Date().toISOString();
      }

      try {
        let actualizaStock = document.getElementById("vDescontarStock").checked;

        if (idEdicion) {
            let ventaVieja = window.ventasGlobales.find(v=>v.id === idEdicion);
            let detallesCambios = [];
            if (ventaVieja.cliente !== ventaInfo.cliente) detallesCambios.push(`Cliente: ${ventaVieja.cliente} -> ${ventaInfo.cliente}`);
            if (ventaVieja.telefono !== ventaInfo.telefono) detallesCambios.push(`Tel: ${ventaVieja.telefono} -> ${ventaInfo.telefono}`);
            if (ventaVieja.direccion !== ventaInfo.direccion) detallesCambios.push(`Dir: ${ventaVieja.direccion} -> ${ventaInfo.direccion}`);
            if (ventaVieja.envio !== ventaInfo.envio) detallesCambios.push(`Envío: ${ventaVieja.envio} -> ${ventaInfo.envio}`);
            if (ventaVieja.total !== ventaInfo.total) detallesCambios.push(`Total: ${ventaVieja.total} -> ${ventaInfo.total}`);
            if (ventaVieja.metodoPago !== ventaInfo.metodoPago) detallesCambios.push(`Pago: ${ventaVieja.metodoPago} -> ${ventaInfo.metodoPago}`);
            if (ventaVieja.notas !== ventaInfo.notas) detallesCambios.push(`Notas: ${ventaVieja.notas} -> ${ventaInfo.notas}`);
            if (JSON.stringify(ventaVieja.detalle) !== JSON.stringify(ventaInfo.detalle)) detallesCambios.push(`Items modificados`);
            if (detallesCambios.length > 0 && typeof window.registrarMovimiento === 'function') window.registrarMovimiento("Edición", detallesCambios.join(" | "), ventaVieja.numeroOrden);
            if(actualizaStock) {
                let ventaVieja = window.ventasGlobales.find(v=>v.id === idEdicion);
                for(let item of ventaVieja.detalle) {
                    await updateDoc(doc(db, "productos", item.idBase), { stock: increment(item.cantidad) }).catch(e=>console.log(e));
                }
                for(let item of itemsVentaTemp) {
                    await updateDoc(doc(db, "productos", item.idBase), { stock: increment(-item.cantidad) }).catch(e=>console.log(e));
                }
            }
            await updateDoc(doc(db, "ventas", idEdicion), ventaInfo);
            window.mostrarBurbuja("Pedido actualizado correctamente");
        } else {
            await addDoc(collection(db, "ventas"), ventaInfo);
            if(actualizaStock) {
                for(let item of itemsVentaTemp) {
                    updateDoc(doc(db, "productos", item.idBase), { stock: increment(-item.cantidad) }).catch(e=>console.log(e));
                }
            }
            window.mostrarBurbuja("Nuevo pedido registrado");
        }

        cerrarRegistroForm();
      } catch(e) {
          console.error(e);
          alert("Error al guardar pedido.");
      }

      document.getElementById("btnGuardarVenta").innerText = "Guardar Pedido";
    };

    window.marcarVentaLista = async (idVenta) => {
        await updateDoc(doc(db, "ventas", idVenta), {estado: "Listo", fechaListo: new Date().toISOString()});
    };

    window.toggleVentaLista = async (idVenta, esListo) => {
        let updateData = esListo ? {estado: "Listo", fechaListo: new Date().toISOString()} : {estado: "Pendiente"};
        await updateDoc(doc(db, "ventas", idVenta), updateData);
    };

    window.marcarVentaPagada = async (idVenta) => {
        await updateDoc(doc(db, "ventas", idVenta), {pagado: true});
        window.mostrarBurbuja("Pedido marcado como pagado");
    };

    window.toggleVentaPagada = async (idVenta, esPagado) => {
        await updateDoc(doc(db, "ventas", idVenta), {pagado: esPagado});
        window.mostrarBurbuja(esPagado ? "Pedido marcado como pagado" : "Pedido desmarcado como pagado");
    };

    let ventaTempCancel = null;

    window.abrirModalCancelar = (idVenta) => {
      let venta = window.ventasGlobales.find(v => v.id === idVenta);
      if(!venta) return;

      ventaTempCancel = venta;
      document.getElementById("cancelIdVenta").value = idVenta;
      document.getElementById("cancelMotivo").value = "";

      let htmlStock = "";
      venta.detalle.forEach((item, idx) => {
          htmlStock += `<label style="display:block; margin-bottom:5px; color:#ddd;"><input type="checkbox" id="chkRestock_${idx}" checked style="width:auto; margin-right:8px;"> ${item.cantidad}x ${item.nombreBase} (Restockear)</label>`;
      });

      document.getElementById("cancelListaStock").innerHTML = htmlStock;
      document.getElementById("modalCancelacion").style.display = "flex";
    };

    window.confirmarCancelacion = async () => {
      let idVenta = document.getElementById("cancelIdVenta").value;
      let motivo = document.getElementById("cancelMotivo").value.trim() || "No declaró motivo";

      try {
        await updateDoc(doc(db, "ventas", idVenta), { estado: "Cancelado", motivoCancelacion: motivo, fechaListo: new Date().toISOString() });
        if (typeof window.registrarMovimiento === 'function') {
            window.registrarMovimiento("Cancelación", `Motivo: ${motivo}`, ventaTempCancel.numeroOrden);
        }

        ventaTempCancel.detalle.forEach((item, idx) => {
          let chk = document.getElementById(`chkRestock_${idx}`);
          if (chk && chk.checked && item.idBase) {
              updateDoc(doc(db, "productos", item.idBase), { stock: increment(item.cantidad) }).catch(e=>console.log(e));
          }
        });

        if (ventaTempCancel.telefono && ventaTempCancel.puntosImpresos) {
             let telClean = ventaTempCancel.telefono.replace(/\D/g, '');
             if(telClean) {
                 let docRef = doc(db, "pd_clientes", telClean);
                 let docSnap = await getDoc(docRef);
                 if(docSnap.exists()) {
                     let currentPts = docSnap.data().puntos || 0;
                     if (ventaTempCancel.esPremio) {
                         currentPts = 9;
                     } else {
                         currentPts = Math.max(0, currentPts - 1);
                     }
                     await setDoc(docRef, { puntos: currentPts }, {merge: true});
                 }
             }
        }

        document.getElementById("modalCancelacion").style.display = "none";
      } catch(e) {
          alert("Error al cancelar");
      }
    };

    window.exportarHistorialCaja = () => {
      if(window.ventasGlobales.length === 0) return alert("No hay pedidos para exportar.");
      let data = [];
      data.push(["N° ORDEN", "FECHA", "CLIENTE", "TELÉFONO", "DIRECCIÓN", "DETALLE DEL PEDIDO", "ENVÍO", "ESTADO", "MÉTODO", "EFECTIVO", "TRANSF.", "TARJETA", "TOT. NETO"]);
      let tEfectivo = 0, tTransf = 0, tTarjeta = 0, tEnvio = 0, tNetoVentas = 0;
      let ventasExport = [...window.ventasGlobales].sort((a,b) => (a.numeroOrden || 0) - (b.numeroOrden || 0));

      ventasExport.forEach(v => {
        let numOrdStr = "#" + String(v.numeroOrden || 0).padStart(3, '0');
        let fecha = new Date(v.fecha).toLocaleString();

        let itemsOrdenados = window.ordenarItemsPedido(v.detalle);
        let det = itemsOrdenados.map(d => {
           let str = `${d.cantidad}x ${d.nombreBase}`;
           if(d.notas && d.notas.length > 0) str += ` [${d.notas.join(', ')}]`;
           return str;
        }).join(' | ');
        if (v.notas) det += ` | NOTAS: ${v.notas}`;

        let envio = v.envio || 0;
        let mEf = 0, mTr = 0, mTa = 0;

        if (v.estado !== "Cancelado") {
          if (v.metodoPago === 'Efectivo y Transferencia') {
              mEf = v.montoEfectivo || 0;
              mTr = v.montoTransferencia || 0;
          }
          else if (v.metodoPago === 'Transferencia') { mTr = v.total; }
          else if (v.metodoPago === 'Tarjeta') { mTa = v.total; }
          else { mEf = v.total; }

          tEfectivo += mEf;
          tTransf += mTr;
          tTarjeta += mTa;
          tEnvio += envio;
          tNetoVentas += v.total;
        }

        let estadoStr = v.estado === "Cancelado" ? `Cancelado (${v.motivoCancelacion || ''})` : v.estado;
        let pagoStr = v.metodoPago || 'Efectivo';
        if(v.metodoPago === 'Efectivo y Transferencia' && v.estado !== "Cancelado") {
            pagoStr = `Efectivo/Transf`;
        }

        data.push([ numOrdStr, fecha, v.cliente, v.telefono || '-', v.direccion || '-', det, v.estado === "Cancelado" ? 0 : envio, estadoStr, pagoStr, v.estado === "Cancelado" ? 0 : mEf, v.estado === "Cancelado" ? 0 : mTr, v.estado === "Cancelado" ? 0 : mTa, v.estado === "Cancelado" ? 0 : v.total ]);
      });

      let tGastos = 0;
      if (window.gastosGlobales && window.gastosGlobales.length > 0) {
          data.push(["", "", "", "", "", "", "", "", "", "", "", "", ""]);
          data.push(["GASTOS REGISTRADOS", "", "", "", "", "", "", "", "", "", "", "", ""]);
          data.push(["FECHA", "HORA", "NOMBRE", "DESCRIPCIÓN", "NOTA", "MONTO", "", "", "", "", "", "", ""]);

          let gastosExport = [...window.gastosGlobales].sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
          gastosExport.forEach(g => {
              tGastos += g.monto;
              let d = new Date(g.fecha);
              data.push([d.toLocaleDateString(), d.toLocaleTimeString(), g.nombre, g.descripcion || '-', g.nota || '-', g.monto, "", "", "", "", "", "", ""]);
          });
      }

      data.push(["", "", "", "", "", "", "", "", "", "", "", "", ""]);
      data.push(["CIERRE DE CAJA", "", "", "", "", "", "", "", "", "", "", "", ""]);
      data.push(["", "", "", "", "", "", "", "TOT. EFECTIVO", `$${tEfectivo}`, "", "", "", ""]);
      data.push(["", "", "", "", "", "", "", "TOT. TRANSF.", "", `$${tTransf}`, "", "", ""]);
      data.push(["", "", "", "", "", "", "", "TOT. TARJETA", "", "", `$${tTarjeta}`, "", ""]);
      data.push(["", "", "", "", "", "", "", "TOT. ENVÍOS", "", "", "", `$${tEnvio}`, ""]);
      data.push(["", "", "", "", "", "", "", "TOT. GASTOS", "", "", "", "", `$${tGastos}`]);
      data.push(["", "", "", "", "", "", "", "TOTAL NETO GLOBAL", "", "", "", "", `$${tNetoVentas + tGastos}`]);


      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [ {wch: 10}, {wch: 16}, {wch: 15}, {wch: 12}, {wch: 35}, {wch: 55}, {wch: 8}, {wch: 12}, {wch: 15}, {wch: 10}, {wch: 10}, {wch: 10}, {wch: 12} ];

      for(let i=0; i<13; i++){
          let cell = ws[XLSX.utils.encode_col(i) + "1"];
          if(cell) {
              cell.s = { fill: { fgColor: {rgb: "FF5E00"} }, font: { bold: true, color: {rgb: "FFFFFF"} }, alignment: { horizontal: "center", vertical: "center" } };
          }
      }

      let startResumen = data.length - 6;

      let estilosHorizontales = [ { bg: "4CAF50", fg: "FFFFFF", endCol: 8 }, { bg: "2196F3", fg: "FFFFFF", endCol: 9 }, { bg: "FF9800", fg: "FFFFFF", endCol: 10 }, { bg: "9C27B0", fg: "FFFFFF", endCol: 11 }, { bg: "F44336", fg: "FFFFFF", endCol: 12 }, { bg: "1B5E20", fg: "FFFFFF", endCol: 12 } ];
      for(let i = 0; i < 6; i++) {
          let r = startResumen + i;
          for (let c = 7; c <= estilosHorizontales[i].endCol; c++) {
              let ref = XLSX.utils.encode_cell({c: c, r: r});
              if (!ws[ref]) { ws[ref] = { v: "", t: "s" }; }
              ws[ref].s = { fill: { fgColor: {rgb: estilosHorizontales[i].bg} }, font: { bold: true, color: {rgb: estilosHorizontales[i].fg} }, alignment: { vertical: "center", horizontal: c === 7 ? "left" : "right" } };
          }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Historial y Caja");
      XLSX.writeFile(wb, "Cierre_Caja_Grub.xlsx");
    };

    window.borrarHistorial = async () => {
      if(confirm("ATENCIÓN: ¿Estás seguro de borrar TODO el historial de ventas? Esta acción es irreversible.")) {
        const batch = writeBatch(db);
        window.ventasGlobales.forEach(v => {
            batch.delete(doc(db, "ventas", v.id));
        });
        await batch.commit();

        if (window.gastosGlobales && window.gastosGlobales.length > 0) {
            alert("Historial borrado de la nube permanentemente.\n\n⚠️ IMPORTANTE: No olvides borrar el historial de GASTOS manualmente desde su panel.");
        } else {
            alert("Historial borrado de la nube permanentemente.");
        }
      }
    };


window.imprimirTicketLocal = (idVenta) => {
    const v = window.ventasGlobales.find(x => x.id === idVenta);
    if (!v) {
        window.mostrarToast('No se encontró el pedido.', 'error');
        return;
    }

    // Format date if needed, or use the exact string from v.fecha
    // Depending on what's inside v.fecha, we can format it.
    let fechaDate = new Date(v.fecha);
    let dia = String(fechaDate.getDate()).padStart(2, '0');
    let mes = String(fechaDate.getMonth() + 1).padStart(2, '0');
    let ano = fechaDate.getFullYear();
    let horas = String(fechaDate.getHours()).padStart(2, '0');
    let minutos = String(fechaDate.getMinutes()).padStart(2, '0');
    let fechaFormateada = `${dia}/${mes}/${ano} ${horas}:${minutos}`;

    // Map the products
    let productos = [];
    if (v.detalle && Array.isArray(v.detalle)) {
        v.detalle.forEach(d => {
            let nombreCompleto = d.nombreBase || d.nombre || '';
            let extraInfo = [];

            // Support for newer string array 'notas'
            if (d.notas && Array.isArray(d.notas)) {
                d.notas.forEach(nota => {
                    if (typeof nota === 'string') {
                        if (nota.toLowerCase().startsWith('sin ')) {
                            extraInfo.push(`- ${nota.substring(4)}`);
                        } else if (nota.startsWith('+ ')) {
                            extraInfo.push(nota);
                        } else {
                            extraInfo.push(`+ ${nota}`);
                        }
                    }
                });
            }
            // Support for legacy object 'desglose'
            else if (d.desglose) {
                for (let key in d.desglose) {
                    let val = d.desglose[key];
                    if (typeof val === 'string') {
                        if (key === 'A quitar' || key === 'Sin') {
                            extraInfo.push(`- ${val}`);
                        } else {
                            extraInfo.push(`+ ${val}`);
                        }
                    }
                }
            }
            // Support for specific 'modificadores' array
            else if (d.modificadores && Array.isArray(d.modificadores)) {
                d.modificadores.forEach(m => {
                    if (typeof m.nombre === 'string') {
                        if (m.tipo === "A quitar" || m.tipo === "Sin") {
                            extraInfo.push(`- ${m.nombre}`);
                        } else {
                            extraInfo.push(`+ ${m.nombre}`);
                        }
                    }
                });
            }

            productos.push({
                "Cantidad": d.cantidad || 1,
                "Nombre": nombreCompleto,
                "ExtraInfo": extraInfo,
                "Precio": Number(d.precioFinal * d.cantidad) || Number(d.precio * d.cantidad) || Number(d.subtotal) || 0,
                "Categoria": d.categoria || ""
            });
        });
    }

    let itemsPrincipales = productos.filter(p => p.Categoria !== "Bebidas");
    let bebidas = productos.filter(p => p.Categoria === "Bebidas");

    let pdPuntos = 0;
    if (v.telefono && window.pdClientesGlobal) {
        let cliente = window.pdClientesGlobal.find(c => c.telefono === v.telefono || c.telefono === v.telefono.replace(/\s+/g, ''));
        if (cliente) {
            pdPuntos = cliente.puntos || 0;
        }
    }

    // Prepare JSON payload
    const payload = {
        "NombreNegocio": "GRUB",
        "PedidoId": String(v.numeroOrden || 0),
        "Fecha": fechaFormateada,
        "Cliente": v.cliente || "Mostrador",
        "Telefono": v.telefono || "-",
        "Direccion": v.direccion || "-",
        "NotaGlobal": v.nota || v.notas || "",
        "Productos": itemsPrincipales,
        "Bebidas": bebidas,
        "Total": Number(v.total) || 0,
        "Envio": Number(v.envio) || 0,
        "Pagado": v.pagado || false,
        "PDPuntos": pdPuntos
    };

    // Mostrar el modal
    document.getElementById('modalImpresion').style.display = 'flex';
    document.getElementById('impresionAppDetectada').style.display = 'none';
    document.getElementById('impresionAppNoDetectada').style.display = 'block';

    const selectImpresora = document.getElementById('selectImpresora');
    selectImpresora.innerHTML = '<option value="">Cargando impresoras...</option>';

    // Guardar el payload actual en un lugar accesible para el botón
    window._payloadImpresionActual = payload;

    // Direct WebUSB printing if already linked
    if (!window.chrome || !window.chrome.webview) {
        if (window._impresoraWebUSBGlobal) {
            // Automatically click the print button logic
            document.getElementById('modalImpresion').style.display = 'none';
            window.mostrarToast('Imprimiendo directamente...', 'success');
            setTimeout(() => {
                const btnImprimirWebUSB = document.getElementById('btnImprimirWebUSB');
                if (btnImprimirWebUSB && btnImprimirWebUSB.onclick) {
                    btnImprimirWebUSB.onclick();
                }
            }, 100);
            return;
        }
    }

    // Verificar si la aplicación está conectada usando WebView2
    if (window.chrome && window.chrome.webview) {
        // App detectada correctamente
        document.getElementById('impresionAppNoDetectada').style.display = 'none';
        document.getElementById('impresionAppDetectada').style.display = 'block';

        // Escuchar la respuesta con la lista de impresoras
        const messageHandler = (event) => {
            const data = event.data;
            if (data && data.action === 'printers_list') {
                const printers = data.printers;
                selectImpresora.innerHTML = '';

                if (printers && printers.length > 0) {
                    printers.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p;
                        opt.textContent = p;
                        selectImpresora.appendChild(opt);
                    });

                    // Auto-seleccionar la mejor si es posible, o guardar preferencia
                    const lastPrinter = localStorage.getItem('grub_last_printer');
                    if (lastPrinter && printers.includes(lastPrinter)) {
                        selectImpresora.value = lastPrinter;
                    }
                } else {
                    selectImpresora.innerHTML = '<option value="">Windows no tiene impresoras instaladas (Falta Driver)</option>';
                }

                // Desvincular el evento para no tener múltiples escuchas
                window.chrome.webview.removeEventListener('message', messageHandler);
            } else if (data && data.action === 'print_status') {
                if (data.status === 'success') {
                    window.mostrarToast('Ticket enviado a la impresora', 'success');
                    document.getElementById('modalImpresion').style.display = 'none';
                } else {
                    window.mostrarToast('Error al intentar imprimir el ticket: ' + (data.message || ''), 'error');
                }
                window.chrome.webview.removeEventListener('message', messageHandler);
            }
        };

        window.chrome.webview.addEventListener('message', messageHandler);

        // Pedir la lista de impresoras
        window.chrome.webview.postMessage(JSON.stringify({ action: 'get_printers' }));

        // Configurar el botón de confirmar impresión
        document.getElementById('btnConfirmarImpresion').onclick = () => {
            const selectedPrinter = selectImpresora.value;
            if (selectedPrinter) {
                localStorage.setItem('grub_last_printer', selectedPrinter);
            }

            const printPayload = { ...window._payloadImpresionActual, PrinterName: selectedPrinter };

            // Volvemos a atachar el listener para la respuesta de impresion
            window.chrome.webview.addEventListener('message', messageHandler);

            // Enviar a imprimir por el puente nativo
            window.chrome.webview.postMessage(JSON.stringify({
                action: 'print',
                payload: printPayload
            }));
        };

        // Alternativa WebUSB (incluso en App de Escritorio)
        setupWebUSBLogic('btnVincularWebUSBApp', 'btnImprimirWebUSBApp', 'infoWebUSBConectadoApp', 'nombreImpresoraWebUSBApp');

    } else {
        console.warn('App de escritorio no detectada (WebView2 no está presente)');
        // El modal ya muestra el mensaje de que no se detectó la app

        setupWebUSBLogic('btnVincularWebUSB', 'btnImprimirWebUSB', 'infoWebUSBConectado', 'nombreImpresoraWebUSB');
    }
};

function setupWebUSBLogic(btnVincularId, btnImprimirId, infoId, nombreId) {
    const btnVincularWebUSB = document.getElementById(btnVincularId);
    const btnImprimirWebUSB = document.getElementById(btnImprimirId);
    const infoWebUSBConectado = document.getElementById(infoId);
    const nombreImpresoraWebUSB = document.getElementById(nombreId);

    // Si el navegador no soporta WebUSB
    if (!navigator.usb) {
        btnVincularWebUSB.style.display = 'none';
        btnImprimirWebUSB.style.display = 'none';
        infoWebUSBConectado.style.display = 'block';
        infoWebUSBConectado.style.color = '#ffcc00';
        nombreImpresoraWebUSB.textContent = 'Tu navegador no soporta WebUSB';
        return;
    }

    if (window._impresoraWebUSBGlobal) {
        btnVincularWebUSB.style.display = 'none';
        btnImprimirWebUSB.style.display = 'block';
        infoWebUSBConectado.style.display = 'block';
        nombreImpresoraWebUSB.textContent = window._impresoraWebUSBGlobal.productName || 'Impresora WebUSB';
    } else {
        btnVincularWebUSB.style.display = 'block';
        btnImprimirWebUSB.style.display = 'none';
        infoWebUSBConectado.style.display = 'none';
    }

    btnVincularWebUSB.onclick = async () => {
        try {
            const device = await navigator.usb.requestDevice({ filters: [] });
            window._impresoraWebUSBGlobal = device;
            window.mostrarToast('Impresora vinculada correctamente', 'success');

            btnVincularWebUSB.style.display = 'none';
            btnImprimirWebUSB.style.display = 'block';
            infoWebUSBConectado.style.display = 'block';
            nombreImpresoraWebUSB.textContent = device.productName || 'Impresora WebUSB';
        } catch (err) {
            console.warn('Vincular WebUSB cancelado o fallido:', err);
        }
    };

    btnImprimirWebUSB.onclick = async () => {
        const device = window._impresoraWebUSBGlobal;
        if (!device) return;

        try {
            await device.open();

            if (device.configuration === null) {
                await device.selectConfiguration(1);
            }

            await device.claimInterface(0);

            const textToEscPos = (text) => {
                const unaccented = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const encoder = new TextEncoder();
                return encoder.encode(unaccented + '\n');
            };

            const LF = new Uint8Array([0x0A]);
            const INIT = new Uint8Array([0x1B, 0x40]);
            const BOLD_ON = new Uint8Array([0x1B, 0x45, 0x01]);
            const BOLD_OFF = new Uint8Array([0x1B, 0x45, 0x00]);
            const CENTER = new Uint8Array([0x1B, 0x61, 0x01]);
            const LEFT = new Uint8Array([0x1B, 0x61, 0x00]);

            let buffer = [];
            buffer.push(INIT);
            buffer.push(CENTER);
            buffer.push(BOLD_ON);

            const nombreLocal = window._payloadImpresionActual.NombreNegocio || 'GRUB TUCUMAN';
            buffer.push(textToEscPos(nombreLocal));

            buffer.push(BOLD_OFF);
            buffer.push(LEFT);
            buffer.push(textToEscPos(`Pedido ID: ${window._payloadImpresionActual.PedidoId}`));
            buffer.push(textToEscPos(`Fecha: ${window._payloadImpresionActual.Fecha}`));
            buffer.push(textToEscPos('--------------------------------'));

            buffer.push(textToEscPos(`Cliente: ${window._payloadImpresionActual.Cliente || '-'}`));
            buffer.push(textToEscPos(`Tel: ${window._payloadImpresionActual.Telefono || '-'}`));

            let dirChunks = (window._payloadImpresionActual.Direccion || '-').match(/.{1,32}/g) || [];
            dirChunks.forEach((chunk, idx) => {
                if(idx === 0) buffer.push(textToEscPos(`Dir: ${chunk}`));
                else buffer.push(textToEscPos(`     ${chunk}`));
            });

            if (window._payloadImpresionActual.NotaGlobal && window._payloadImpresionActual.NotaGlobal.trim() !== '') {
                buffer.push(textToEscPos(`Notas: ${window._payloadImpresionActual.NotaGlobal}`));
            }

            buffer.push(textToEscPos('--------------------------------'));

            if (window._payloadImpresionActual.Productos && window._payloadImpresionActual.Productos.length > 0) {
                window._payloadImpresionActual.Productos.forEach(p => {
                    buffer.push(BOLD_ON);
                    let line = `${p.Cantidad}x ${p.Nombre}`;
                    if (line.length > 22) line = line.substring(0, 22);
                    let spaces = 32 - line.length - String(p.Precio).length - 1;
                    if (spaces < 1) spaces = 1;
                    buffer.push(textToEscPos(line + ' '.repeat(spaces) + '$' + p.Precio));
                    buffer.push(BOLD_OFF);

                    if (p.ExtraInfo && p.ExtraInfo.length > 0) {
                        p.ExtraInfo.forEach(info => {
                            let infoLine = `  ${info}`;
                            if (infoLine.length > 32) infoLine = infoLine.substring(0, 32);
                            if (info.startsWith("- ")) buffer.push(BOLD_ON);
                            buffer.push(textToEscPos(infoLine));
                            if (info.startsWith("- ")) buffer.push(BOLD_OFF);
                        });
                    }
                });
            }

            if (window._payloadImpresionActual.Bebidas && window._payloadImpresionActual.Bebidas.length > 0) {
                buffer.push(textToEscPos('--------------------------------'));
                buffer.push(CENTER);
                buffer.push(textToEscPos('BEBIDAS'));
                buffer.push(LEFT);
                window._payloadImpresionActual.Bebidas.forEach(p => {
                    buffer.push(BOLD_ON);
                    let line = `${p.Cantidad}x ${p.Nombre}`;
                    if (line.length > 22) line = line.substring(0, 22);
                    let spaces = 32 - line.length - String(p.Precio).length - 1;
                    if (spaces < 1) spaces = 1;
                    buffer.push(textToEscPos(line + ' '.repeat(spaces) + '$' + p.Precio));
                    buffer.push(BOLD_OFF);
                });
            }

            buffer.push(textToEscPos('--------------------------------'));
            buffer.push(LEFT);
            if (window._payloadImpresionActual.Envio) {
                buffer.push(textToEscPos(`Costo Envio: $${window._payloadImpresionActual.Envio}`));
            }
            buffer.push(CENTER);
            buffer.push(BOLD_ON);
            buffer.push(textToEscPos(`TOTAL: $${window._payloadImpresionActual.Total}`));

            if (window._payloadImpresionActual.Pagado) {
                buffer.push(textToEscPos(`PAGADO`));
            } else {
                buffer.push(textToEscPos(`NO PAGADO`));
            }
            buffer.push(BOLD_OFF);
            buffer.push(CENTER);
            buffer.push(textToEscPos('Gracias por su compra!'));

            if (window._payloadImpresionActual.PDPuntos !== undefined && window._payloadImpresionActual.PDPuntos > 0) {
                buffer.push(LF);
                buffer.push(textToEscPos('--------------------------------'));
                buffer.push(textToEscPos(`Hasta ahora tienes ${window._payloadImpresionActual.PDPuntos} puntos`));
                let puntosStr = "[X]".repeat(window._payloadImpresionActual.PDPuntos) + "[ ]".repeat(10 - window._payloadImpresionActual.PDPuntos);
                buffer.push(textToEscPos(puntosStr));
                buffer.push(textToEscPos('Compra mas para ganar un premio'));
                buffer.push(textToEscPos('--------------------------------'));
            }

            buffer.push(textToEscPos('Documento no valido como factura'));
            buffer.push(LF);
            buffer.push(LF);
            buffer.push(LF);

            let totalLen = buffer.reduce((acc, val) => acc + val.length, 0);
            let finalBuffer = new Uint8Array(totalLen);
            let offset = 0;
            for (let arr of buffer) {
                finalBuffer.set(arr, offset);
                offset += arr.length;
            }

            const endpointNumber = device.configuration.interfaces[0].alternate.endpoints.find(e => e.direction === 'out').endpointNumber;
            await device.transferOut(endpointNumber, finalBuffer);

            window.mostrarToast('Ticket impreso vía WebUSB', 'success');
            document.getElementById('modalImpresion').style.display = 'none';

        } catch (err) {
            console.error("Error imprimiendo por WebUSB:", err);
            window.mostrarToast('Error al imprimir por WebUSB. Asegúrate de que no esté en uso por otra app.', 'error');
        } finally {
            try {
                if (device.opened) await device.releaseInterface(0);
            } catch(e){}
        }
    };
}
