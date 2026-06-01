window.renderizarTablaPD = function() {

        try {
            let html = `<div style="overflow-x: auto;">
              <table style="margin-top:0;">
                <thead><tr><th>Cliente</th><th>Teléfono</th><th>Progreso (PD)</th><th>Actividad</th></tr></thead>
                <tbody>`;

            let ahora = new Date();
            let filtrados = window.pdClientesGlobal.filter(c => {
                if (!c.puntos || c.puntos <= 0) return false;

                let dias = 0;
                if (c.ultimaVisita) {
                    let ultima = new Date(c.ultimaVisita);
                    dias = Math.floor((ahora - ultima) / (1000 * 60 * 60 * 24));
                    if (dias > 120) return false;
                }
                c.diasInactivo = dias;
                return true;
            }).sort((a,b) => b.puntos - a.puntos);

            if(filtrados.length === 0) {
                html += `<tr><td colspan="4" style="text-align:center; color:#777; padding:20px;">No hay clientes activos (compras en los últimos 4 meses).</td></tr>`;
            } else {
                filtrados.forEach(c => {
                    let puntosStr = "⭐".repeat(c.puntos) + "⚪".repeat(10 - c.puntos);
                    let freqText = "";
                    let inactivoText = c.diasInactivo === 0 ? "Hoy" : `Hace ${c.diasInactivo} días`;

                    if (c.totalPedidos && c.totalPedidos > 1 && c.primerVisita) {
                        let dTotales = Math.floor((ahora - new Date(c.primerVisita)) / (1000 * 60 * 60 * 24));
                        let f = Math.max(1, Math.floor(dTotales / c.totalPedidos));
                        freqText = `Compra cada ~${f} días`;
                    } else {
                        freqText = "Primera compra reciente";
                    }

                    html += `<tr>
                        <td><strong>${c.nombre || 'Sin nombre'}</strong></td>
                        <td>${c.telefono}</td>
                        <td><strong style="color:var(--primary);">${c.puntos} / 10</strong><br><small style="letter-spacing:2px;">${puntosStr}</small></td>
                        <td><small style="color:#aaa;"><strong>Última:</strong> ${inactivoText}<br>${freqText}</small></td>
                    </tr>`;
                });
            }
            html += `</tbody></table></div>`;

            let ui = document.getElementById("pd-ui");
            if(ui) ui.innerHTML = html;
        } catch (e) {
            console.error("Error al renderizar PD:", e);
            let ui = document.getElementById("pd-ui");
            if(ui) ui.innerHTML = `<p style="color:#ff3c3c;">Error al cargar datos del programa de descuentos.</p>`;
        }
    }
