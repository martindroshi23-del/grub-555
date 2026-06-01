import "../shared/toast.js";
import "./inventory.js";
import "./core.js";
import "./pd.js";
import "./ui.js";
import "./editor.js";
import "./kds.js";
import "./ticket_sim.js";

import { iniciarEscuchaAuth, ingresar, cerrarSesion } from "../services/auth.service.js";

window.ingresar = ingresar;
window.cerrarSesion = cerrarSesion;

window.cambiarTab = (idTab, btnEl) => { 
  if (window.rolActual === 'cajero' && (idTab === 'tab-inventario' || idTab === 'tab-editor-menu' || idTab === 'tab-usuarios')) {
    return;
  }

  document.querySelectorAll('.sidebar-btn').forEach(btn => btn.classList.remove('active')); 
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active')); 
  if (btnEl) btnEl.classList.add('active'); 
  document.getElementById(idTab).classList.add('active'); 
  
  if (idTab === 'tab-editor-menu') {
      if (typeof window.renderEditor === 'function') {
          window.renderEditor();
      }
  }
};

window.cambiarDash = (tipo) => {
  document.getElementById('btnDashPend').classList.remove('active');
  document.getElementById('btnDashStock').classList.remove('active');
  document.getElementById('dash-pendientes').style.display = 'none';
  document.getElementById('dash-stock').style.display = 'none';
  document.getElementById('btnDashMovimientos').classList.remove('active');
  document.getElementById('dash-movimientos').style.display = 'none';

  if (tipo === 'pendientes') {
      document.getElementById('btnDashPend').classList.add('active');
      document.getElementById('dash-pendientes').style.display = 'block';
  } else if (tipo === 'stock') {
      document.getElementById('btnDashStock').classList.add('active');
      document.getElementById('dash-stock').style.display = 'block';
  } else if (tipo === 'movimientos') {
      document.getElementById('btnDashMovimientos').classList.add('active');
      document.getElementById('dash-movimientos').style.display = 'block';
  }
};

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

        // Hide Inventario, Editar Menú and Usuarios
        btnsSidebar.forEach((btn, index) => {
            const tooltip = btn.getAttribute('data-tooltip');
            if (tooltip === "Inventario Nube" || tooltip === "Editar Menú" || tooltip === "Gestionar Usuarios") {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'flex';
            }
        });
        // Activar Ventas por defecto
        const btnVentas = Array.from(btnsSidebar).find(b => b.getAttribute('data-tooltip') === "Ventas en Vivo");
        if(btnVentas) window.cambiarTab('tab-ventas', btnVentas);
    } else if (window.rolActual === 'cocina') {
        document.getElementById('admin-screen').style.display = 'none';
        document.getElementById('main-sidebar').style.display = 'none';
        cocinaScreen.style.display = 'flex';
        if (typeof window.renderizarKDS === 'function') {
            window.renderizarKDS();
        }
    }
};

window.rolActual = null;

// Initialize authentication listener
iniciarEscuchaAuth(
    window.aplicarInterfazPorRol, 
    () => {
        if (typeof window.cargarNubeEnTiempoReal === 'function') {
            window.cargarNubeEnTiempoReal();
        }
    }
);
