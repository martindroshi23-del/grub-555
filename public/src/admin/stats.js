import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "../config/firebase.config.js";

window.renderizarEstadisticas = async function() {
    let vistasTotales = 0;
    try {
        let statsSnap = await getDoc(doc(db, "stats", "general"));
        if(statsSnap.exists()) vistasTotales = statsSnap.data().vistasTotales || 0;
    } catch(e) {}

    let topProductos = [...window.productosNube].sort((a,b) => (b.vistas||0) - (a.vistas||0)).slice(0, 5);

    let html = '<div style="background:var(--primary); color:white; padding:15px; border-radius:12px; margin-bottom:20px; text-align:center;"><h2 style="margin:0;">Vistas Totales de la Página: ' + vistasTotales + '</h2></div><h3 style="color:var(--primary); margin-bottom:15px;">Productos más vistos</h3>';

    if(topProductos.length === 0 || topProductos[0].vistas === 0) {
        html += '<p style="font-size:0.9rem; color:#888;">Tus clientes aún no han hecho clic en tus productos.</p>';
    } else {
        topProductos.forEach((p, idx) => {
            if((p.vistas||0) > 0) {
                let medalla = idx === 0 ? "🥇" : (idx === 1 ? "🥈" : (idx === 2 ? "🥉" : "🔸"));
                html += '<div class="stat-row" style="display:flex; justify-content:space-between; padding:10px 0; border-bottom:1px solid #333;"><span>' + medalla + ' ' + p.nombre + '</span> <strong>' + p.vistas + ' clics</strong></div>';
            }
        });
    }

    document.getElementById("estadisticasUI").innerHTML = html;
}
