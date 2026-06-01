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
        htmlPrincipales += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold;">
                <span style="flex:1;">${item.cantidad}x ${item.nombreBase}</span>
                <span>$${item.subtotal || 0}</span>
            </div>
        `;
        if (item.modificadores && item.modificadores.length > 0) {
            htmlPrincipales += `<div style="padding-left: 10px; font-size: 12px; margin-bottom: 5px;">`;
            item.modificadores.forEach(m => {
                if (m.tipo === "A quitar") {
                    htmlPrincipales += `<div style="font-weight: bold;">- ${m.nombre}</div>`;
                } else {
                    htmlPrincipales += `<div>+ ${m.nombre}</div>`;
                }
            });
            htmlPrincipales += `</div>`;
        }
    });
    document.getElementById("ticket-productos-list").innerHTML = htmlPrincipales || "<div style='text-align:center;'>No hay productos</div>";

    let htmlBebidas = "";
    bebidas.forEach(item => {
         htmlBebidas += `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span style="flex:1;">${item.cantidad}x ${item.nombreBase}</span>
                <span>$${item.subtotal || 0}</span>
            </div>
        `;
    });
    document.getElementById("ticket-bebidas-list").innerHTML = htmlBebidas || "<div style='text-align:center;'>No hay bebidas</div>";
};
