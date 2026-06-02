window.switchEditorTab = (tabId) => {
    document.querySelectorAll('.sidebar-btn-editor').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = '#777';
    });

    // Find matching button
    if(tabId === 'menu-digital') {
        let btn = document.querySelector('.sidebar-btn-editor[onclick="switchEditorTab(\'menu-digital\')"]');
        if(btn) { btn.classList.add('active'); btn.style.color = 'white'; }
        document.getElementById('tab-menu-digital').style.display = 'flex';
        document.getElementById('tab-diseno-ticket').style.display = 'none';
    } else if(tabId === 'diseno-ticket') {
        let btn = document.querySelector('.sidebar-btn-editor[onclick="switchEditorTab(\'diseno-ticket\')"]');
        if(btn) { btn.classList.add('active'); btn.style.color = 'white'; }
        document.getElementById('tab-menu-digital').style.display = 'none';
        document.getElementById('tab-diseno-ticket').style.display = 'flex';
        renderTicketSimulador();
    }
};

window.renderTicketSimulador = () => {
    // Tomar el primer pedido de ventasGlobales o mock data si no hay
    let v = null;
    if (window.ventasGlobales && window.ventasGlobales.length > 0) {
        v = window.ventasGlobales[0];
    } else {
        v = {
            cliente: "Juan Perez",
            telefono: "1122334455",
            direccion: "Calle Falsa 123",
            envio: 500,
            total: 6500,
            pagado: false,
            detalle: [
                { nombreBase: "Hamburguesa Simple", cantidad: 1, subtotal: 3000, categoria: "Hamburguesas", modificadores: [
                    { tipo: "A quitar", nombre: "Sin cebolla" },
                    { tipo: "Extras", nombre: "Doble cheddar" }
                ]},
                { nombreBase: "Coca Cola 1.5L", cantidad: 1, subtotal: 1000, categoria: "Bebidas", modificadores: [] },
                { nombreBase: "Pizza Muzzarella", cantidad: 1, subtotal: 2000, categoria: "Pizzas", modificadores: [] }
            ]
        };
    }

    document.getElementById("ticket-cliente-nombre").innerHTML = `<strong>Cliente:</strong> ${v.cliente || '-'}`;
    document.getElementById("ticket-cliente-tel").innerHTML = `<strong>Tel:</strong> ${v.telefono || '-'}`;
    document.getElementById("ticket-cliente-dir").innerHTML = `<strong>Dir:</strong> ${v.direccion || '-'}`;

    let notaEl = document.getElementById("ticket-cliente-nota");
    if (v.nota || v.notas) {
        notaEl.innerHTML = `<strong>Nota:</strong> ${v.nota || v.notas}`;
        notaEl.style.display = "block";
    } else {
        notaEl.style.display = "none";
    }

    document.getElementById("ticket-costo-envio").innerText = `$${v.envio || 0}`;
    document.getElementById("ticket-total").innerText = `$${v.total || 0}`;

    let estadoPagoEl = document.getElementById("ticket-estado-pago");
    if (v.pagado) {
        estadoPagoEl.innerText = "PAGADO";
        estadoPagoEl.style.background = "#fff";
        estadoPagoEl.style.color = "#000";
        estadoPagoEl.style.border = "2px solid #000";
    } else {
        estadoPagoEl.innerText = "NO PAGADO";
        estadoPagoEl.style.background = "#000";
        estadoPagoEl.style.color = "#fff";
        estadoPagoEl.style.border = "2px solid #000";
    }

    let itemsPrincipales = v.detalle.filter(i => i.categoria !== "Bebidas");
    let bebidas = v.detalle.filter(i => i.categoria === "Bebidas");

    let htmlPrincipales = "";
    itemsPrincipales.forEach(item => {
        let precioCalculado = item.precioFinal ? (item.precioFinal * item.cantidad) : (item.precio ? item.precio * item.cantidad : item.subtotal || 0);
        htmlPrincipales += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold;">
                <span style="flex:1;">${item.cantidad}x ${item.nombreBase}</span>
                <span>$${precioCalculado}</span>
            </div>
        `;

        let extraInfo = [];
        if (item.desglose) {
            for (let key in item.desglose) {
                let val = item.desglose[key];
                if (key === 'A quitar' || key === 'Sin') {
                    extraInfo.push({ texto: `- ${val}`, bold: true });
                } else {
                    extraInfo.push({ texto: `+ ${val}`, bold: false });
                }
            }
        } else if (item.modificadores && item.modificadores.length > 0) {
             item.modificadores.forEach(m => {
                if (m.tipo === "A quitar" || m.tipo === "Sin") {
                     extraInfo.push({ texto: `- ${m.nombre}`, bold: true });
                } else {
                     extraInfo.push({ texto: `+ ${m.nombre}`, bold: false });
                }
            });
        }

        if (extraInfo.length > 0) {
            htmlPrincipales += `<div style="padding-left: 10px; font-size: 12px; margin-bottom: 5px; line-height: 1.2;">`;
            extraInfo.forEach(info => {
                 if (info.bold) {
                     htmlPrincipales += `<div style="font-weight: bold;">${info.texto}</div>`;
                 } else {
                     htmlPrincipales += `<div>${info.texto}</div>`;
                 }
            });
            htmlPrincipales += `</div>`;
        }
    });
    document.getElementById("ticket-productos-list").innerHTML = htmlPrincipales || "<div style='text-align:center;'>No hay productos</div>";

    let htmlBebidas = "";
    bebidas.forEach(item => {
         let precioCalculado = item.precioFinal ? (item.precioFinal * item.cantidad) : (item.precio ? item.precio * item.cantidad : item.subtotal || 0);
         htmlBebidas += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold;">
                <span style="flex:1;">${item.cantidad}x ${item.nombreBase}</span>
                <span>$${precioCalculado}</span>
            </div>
        `;
    });
    document.getElementById("ticket-bebidas-list").innerHTML = htmlBebidas || "<div style='text-align:center;'>No hay bebidas</div>";

    // Puntos PD
    let pdEl = document.getElementById("ticket-pd-info");
    let pdPuntos = 0;
    if (v.telefono && window.pdClientesGlobal) {
        let cliente = window.pdClientesGlobal.find(c => c.telefono === v.telefono || c.telefono === v.telefono.replace(/\s+/g, ''));
        if (cliente) {
            pdPuntos = cliente.puntos || 0;
        }
    }

    if (pdPuntos > 0) {
        pdEl.style.display = "block";
        let cuadritos = "🔳".repeat(pdPuntos) + "⬜".repeat(10 - pdPuntos);
        pdEl.innerHTML = `
            <div style="font-size: 0.9em; font-weight: bold; margin-bottom: 5px;">Hasta ahora tienes ${pdPuntos} puntos</div>
            <div style="letter-spacing: 2px; margin-bottom: 5px; font-size: 1.1em;">${cuadritos}</div>
            <div style="font-size: 0.8em;">Compra más para ganar un premio</div>
        `;
    } else {
        pdEl.style.display = "none";
    }
};
