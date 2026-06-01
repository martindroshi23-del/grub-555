import { doc, onSnapshot, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "../config/firebase.config.js";
import { obtenerMenuOptimizado } from "../services/menu.service.js";
import { mostrarBurbuja, ocultarBurbuja } from "../shared/utils.js";
import { addToCarrito, actualizarBotonFlotante } from "./cart.js";

// Exported utility mapped to window for HTML events
window.mostrarBurbuja = mostrarBurbuja;
window.ocultarBurbuja = ocultarBurbuja;
document.addEventListener("click", window.ocultarBurbuja);

window.cerrarModal = (id) => {
    document.getElementById(id).style.display = "none";
};

let productos = [];
let layoutConfig = null;
let currentViewport = 'mobile';

// Registrar visita global de la página
setDoc(doc(db, "stats", "general"), { vistasTotales: increment(1) }, { merge: true }).catch(e => console.log(e));

function updateViewportInfo() {
    let width = window.innerWidth;
    if (width >= 1024) currentViewport = 'pc';
    else if (width >= 768) currentViewport = 'tablet';
    else currentViewport = 'mobile';
    
    if (productos.length > 0 && layoutConfig) mostrarMenu();
}

window.addEventListener('resize', updateViewportInfo);
updateViewportInfo();

// Escuchar cambios en la configuración del layout
onSnapshot(doc(db, "config", "layout"), (docSnap) => {
    if (docSnap.exists()) {
        layoutConfig = docSnap.data();
        if (productos.length > 0) mostrarMenu();
    }
});

// Cargar menú usando el servicio optimizado
async function inicializarMenu() {
    productos = await obtenerMenuOptimizado();
    mostrarMenu();

    // Escuchar solo la versión del menú en vivo. Si cambia, volvemos a descargar.
    onSnapshot(doc(db, "config", "menu_version"), async (docSnap) => {
        if (docSnap.exists()) {
            const versionFirebase = docSnap.data().version || 0;
            const versionLocal = parseInt(localStorage.getItem("grub_menu_version")) || 0;
            if (versionFirebase !== versionLocal) {
                console.log("Nueva versión detectada, actualizando menú...");
                productos = await obtenerMenuOptimizado();
                mostrarMenu();
            }
        }
    });
}
inicializarMenu();


function mostrarMenu() {
  let contenedor = document.getElementById("menu-contenedor");
  contenedor.innerHTML = "";
  if (productos.length === 0) { 
      contenedor.innerHTML = "No hay productos disponibles por ahora."; 
      return; 
  }

  // Determinar la configuración basándonos en la nueva estructura del editor (layoutConfig.orden)
  // o haciendo fallback a la estructura antigua por viewport.
  let conf = { columns: 2, order: [], dock: [], sizes: {} };

  if (layoutConfig) {
      if (layoutConfig.orden && Array.isArray(layoutConfig.orden)) {
          // Nueva versión del editor usa 'orden' y 'columnas' globales
          conf.columns = layoutConfig.columnas || 2;
          conf.order = layoutConfig.orden;
      } else if (layoutConfig[currentViewport] && layoutConfig[currentViewport].order) {
          // Versión antigua por viewport
          conf.columns = layoutConfig[currentViewport].columns || 2;
          conf.order = layoutConfig[currentViewport].order || [];
          conf.dock = layoutConfig[currentViewport].dock || [];
          conf.sizes = layoutConfig[currentViewport].sizes || {};
      } else if (Array.isArray(layoutConfig)) {
          // Versión muy antigua donde era solo un array
          conf.order = layoutConfig;
      }
  }

  let principales = productos.filter(p => !p.esBebida);
  let categoriasUsadas = [...new Set(principales.map(p => p.categoria || "Otros"))];
  
      let qlHtml = `<span class="quick-links-title">¿Qué buscas?</span>`;
      categoriasUsadas.forEach(cat => {
        let emoji = cat.toLowerCase().includes('pizza') ? '🍕' : (cat.toLowerCase().includes('hamburguesa') ? '🍔' : '🍽️');
        qlHtml += `<a href="#cat-${cat}" class="quick-link-btn">${emoji} ${cat}</a>`;
      });
      document.getElementById("quickLinks").innerHTML = qlHtml;
      
      categoriasUsadas.forEach(cat => {
        let titulo = document.createElement("h2"); 
        titulo.className = "seccion-titulo"; 
        titulo.id = "cat-" + cat; 
        titulo.innerText = cat;
        contenedor.appendChild(titulo);
  
        let grid = document.createElement("div"); 
        grid.className = "grid";
        grid.style.gridTemplateColumns = `repeat(${conf.columns || 2}, 1fr)`;

        // Creamos un set para buscar rápido qué IDs ya están en el orden
        let orderSet = new Set(conf.order);
        
        conf.order.forEach(id => {
            let isPlaceholder = id.startsWith('empty_');
            let p = isPlaceholder ? null : principales.find(prod => prod.id === id);
            
            let isMatch = false;
            if(p && (p.categoria || "Otros") === cat) isMatch = true;
            if(isPlaceholder && id.includes(`_${cat}_`)) isMatch = true;
            if(isPlaceholder && !id.includes('_cat_') && cat === categoriasUsadas[0]) isMatch = true;
            
            if (isMatch) {
                if (isPlaceholder) {
                    let div = document.createElement("div");
                    div.style.minHeight = "90px"; 
                    if (conf.sizes && conf.sizes[id] && conf.sizes[id].height) {
                        div.style.height = `${conf.sizes[id].height}px`;
                    }
                    grid.appendChild(div);
                    return;
                }
                
                if (!p || (conf.dock && conf.dock.includes(id))) return;
                
                let agotado = p.stock <= 0;
                let card = document.createElement("div"); 
                card.className = "card " + (agotado ? "agotado" : "");
                
                if (conf.sizes && conf.sizes[id]) {
                    if (conf.sizes[id].span) card.style.gridColumn = `span ${conf.sizes[id].span}`;
                    if (conf.sizes[id].height) card.style.height = `${conf.sizes[id].height}px`;
                }
                
                let imgUrl = p.img || "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80";
                let isVideo = imgUrl.includes('/video/') || imgUrl.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i);
                let mediaElement = isVideo
                    ? `<video muted loop playsinline class="video-menu" src="${imgUrl}"></video>`
                    : `<img src="${imgUrl}" alt="${p.nombre}">`;
                
                card.innerHTML = `
                  <div class="img-container">${mediaElement}${agotado ? '<div class="overlay-agotado">AGOTADO</div>' : ''}</div>
                  <div class="card-info">
                    <div class="card-nombre">${p.nombre}</div>
                    <div class="card-precio">$${p.precio}</div>
                    <button class="btn-agregar" ${agotado ? 'disabled' : ''}>${agotado ? 'Agotado' : 'Pedir'}</button>
                  </div>`;
                if (!agotado) card.onclick = () => window.abrirUIProducto(p);
                grid.appendChild(card);
            }
        });

        // REVISIÓN: Añadir productos de esta categoría que no estén en conf.order ni en dock
        let productosRestantes = principales.filter(p => (p.categoria || "Otros") === cat && !orderSet.has(p.id) && !(conf.dock && conf.dock.includes(p.id)));

        productosRestantes.forEach(p => {
            let agotado = p.stock <= 0;
            let card = document.createElement("div");
            card.className = "card " + (agotado ? "agotado" : "");

            let imgUrl = p.img || "https://images.unsplash.com/photo-1550547660-d9450f859349?w=500&q=80";
            let isVideo = imgUrl.includes('/video/') || imgUrl.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i);
            let mediaElement = isVideo
                ? `<video muted loop playsinline class="video-menu" src="${imgUrl}"></video>`
                : `<img src="${imgUrl}" alt="${p.nombre}">`;

            card.innerHTML = `
              <div class="img-container">${mediaElement}${agotado ? '<div class="overlay-agotado">AGOTADO</div>' : ''}</div>
              <div class="card-info">
                <div class="card-nombre">${p.nombre}</div>
                <div class="card-precio">$${p.precio}</div>
                <button class="btn-agregar" ${agotado ? 'disabled' : ''}>${agotado ? 'Agotado' : 'Pedir'}</button>
              </div>`;
            if (!agotado) card.onclick = () => window.abrirUIProducto(p);
            grid.appendChild(card);
        });

        contenedor.appendChild(grid);
      });

      initVideoObserver();
}

let videoObserver = null;

function initVideoObserver() {
    if (videoObserver) {
        videoObserver.disconnect();
    }

    videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                video.play().catch(e => console.log("Video auto-play prevenido:", e));
            } else {
                video.pause();
            }
        });
    }, {
        threshold: 0.4
    });

    document.querySelectorAll('.video-menu').forEach(video => {
        videoObserver.observe(video);
    });
}

let productoActual = null;
let seleccionActual = { tipo: null, extras: [], quitar: [], bebidas: [] };

window.abrirUIProducto = async (producto) => {
  if (producto.id) { 
      setDoc(doc(db, "productos", producto.id), { vistas: increment(1) }, { merge: true }).catch(e => console.log("Error vistas:", e)); 
  }
  
  productoActual = producto;
  
  let primerTipo = null;
  if (producto.tipos && producto.tipos.length > 0) {
    primerTipo = typeof producto.tipos[0] === 'string' ? {nombre: producto.tipos[0], precio: 0} : producto.tipos[0];
  }
  
  seleccionActual = { tipo: primerTipo, extras: [], quitar: [], bebidas: [] };
  renderizarOpcionesProducto(); 
  document.getElementById("modalProducto").style.display = "flex";
}

function renderizarOpcionesProducto() {
  let ui = document.getElementById("uiProducto");
  let precioBaseOriginal = productoActual.precio;
  let precioCalculado = precioBaseOriginal;

  if (seleccionActual.tipo && seleccionActual.tipo.precio) precioCalculado += seleccionActual.tipo.precio;
  seleccionActual.extras.forEach(e => precioCalculado += e.precio);
  seleccionActual.quitar.forEach(q => { if(q.precio) precioCalculado += q.precio; });
  seleccionActual.bebidas.forEach(b => precioCalculado += (b.precio * b.cantidad));

  let html = `<h2 style="margin-bottom: 5px; font-weight: 700;">${productoActual.nombre}</h2>`;
  
  if (productoActual.ingredientes) {
    html += `<p style="margin-top: 0; margin-bottom: 15px; color: #aaa; font-size: 0.9rem; font-style: italic; line-height: 1.4;">${productoActual.ingredientes}</p>`;
  }

  if (precioCalculado < precioBaseOriginal) {
    html += `<h3 style="margin-bottom: 25px;"><span style="text-decoration: line-through; color: #888; font-size: 1rem; margin-right: 10px;">$${precioBaseOriginal}</span> <span style="color:var(--primary); font-size: 1.4rem;">$${precioCalculado}</span></h3>`;
  } else {
    html += `<h3 style="color:var(--primary); margin-bottom: 25px; font-size: 1.4rem;">$${precioCalculado}</h3>`;
  }

  if (productoActual.tipos && productoActual.tipos.length > 0) {
    html += `<div class="opcion-grupo"><h4>Tipo</h4>`;
    productoActual.tipos.forEach(t => {
      let objT = typeof t === 'string' ? {nombre: t, precio: 0} : t;
      let seleccionado = (seleccionActual.tipo && seleccionActual.tipo.nombre === objT.nombre);
      let clase = seleccionado ? "chip seleccionado" : "chip";
      let textoPrecio = objT.precio !== 0 ? ` (${objT.precio > 0 ? '+' : ''}$${objT.precio})` : '';
      // We escape the JSON for inline onclick
      html += `<div class="${clase}" onclick='setTipo(${JSON.stringify(objT).replace(/'/g, "&apos;")})'>${objT.nombre}${textoPrecio}</div>`;
    });
    html += `</div>`;
  }
  
  if (productoActual.extras && productoActual.extras.length > 0) {
    html += `<div class="opcion-grupo"><h4>Agregar Extras</h4>`;
    productoActual.extras.forEach(e => {
      let objE = typeof e === 'string' ? {nombre: e, precio: 0} : e;
      let seleccionado = seleccionActual.extras.find(ex => ex.nombre === objE.nombre);
      let clase = seleccionado ? "chip seleccionado" : "chip";
      html += `<div class="${clase}" onclick='toggleExtra("${objE.nombre.replace(/"/g, '&quot;')}", ${objE.precio})'>+ ${objE.nombre} (+$${objE.precio})</div>`;
    });
    html += `</div>`;
  }
  
  if (productoActual.quitar && productoActual.quitar.length > 0) {
    html += `<div class="opcion-grupo"><h4>Quitar Ingredientes</h4>`;
    productoActual.quitar.forEach(q => {
      let objQ = typeof q === 'string' ? {nombre: q, precio: 0} : q;
      let seleccionado = seleccionActual.quitar.find(item => item.nombre === objQ.nombre);
      let clase = seleccionado ? "chip quitar seleccionado" : "chip quitar";
      let textoPrecio = objQ.precio !== 0 ? ` (${objQ.precio > 0 ? '+' : ''}$${objQ.precio})` : '';
      html += `<div class="${clase}" onclick='toggleQuitar(${JSON.stringify(objQ).replace(/'/g, "&apos;")})'>Sin ${objQ.nombre}${textoPrecio}</div>`;
    });
    html += `</div>`;
  }

  let bebidasDisponibles = productos.filter(p => p.esBebida && p.stock > 0);
  if (bebidasDisponibles.length > 0) {
    html += `<div class="opcion-grupo"><h4>🥤 ¿Agregamos una bebida?</h4>`;
    bebidasDisponibles.forEach(b => {
      let sel = seleccionActual.bebidas.find(sel => sel.id === b.id);
      let cantidadActual = sel ? sel.cantidad : 0;
      let bordeActivo = cantidadActual > 0 ? 'border-color: var(--primary); background: rgba(255, 94, 0, 0.1);' : '';
      let imgUrl = b.img || "https://via.placeholder.com/100";
      let isVideo = imgUrl.includes('/video/') || imgUrl.match(/\.(mp4|webm|mov|ogg)(\?.*)?$/i);
      let mediaElement = isVideo
          ? `<video muted loop playsinline class="video-menu" src="${imgUrl}"></video>`
          : `<img src="${imgUrl}" alt="${b.nombre}">`;
      
      html += `
        <div class="bebida-card" style="cursor:default; ${bordeActivo}">
          ${mediaElement}
          <div class="bebida-info"><div class="bebida-nombre">${b.nombre}</div><div class="bebida-precio">+$${b.precio}</div></div>
          <div style="display:flex; align-items:center; gap:12px;">
            <button class="btn-counter" onclick="modificarBebida(-1, '${b.id}', '${b.nombre.replace(/'/g, "\\'")}', ${b.precio})">-</button>
            <span style="font-weight:bold; font-size:1.1rem; width:15px; text-align:center;">${cantidadActual}</span>
            <button class="btn-counter" onclick="modificarBebida(1, '${b.id}', '${b.nombre.replace(/'/g, "\\'")}', ${b.precio})">+</button>
          </div>
        </div>`;
    });
    html += `</div>`;
  }

  html += `<button class="btn-enviar-final" onclick="confirmarAgregado()">Agregar al Pedido - $${precioCalculado}</button>`;
  ui.innerHTML = html;
}

window.setTipo = (tObj) => { 
    seleccionActual.tipo = tObj; 
    renderizarOpcionesProducto(); 
}

window.toggleExtra = (nombre, precio) => { 
    let idx = seleccionActual.extras.findIndex(e => e.nombre === nombre); 
    if (idx > -1) seleccionActual.extras.splice(idx, 1); 
    else seleccionActual.extras.push({nombre, precio}); 
    renderizarOpcionesProducto(); 
}

window.toggleQuitar = (qObj) => { 
    let idx = seleccionActual.quitar.findIndex(item => item.nombre === qObj.nombre); 
    if (idx > -1) seleccionActual.quitar.splice(idx, 1); 
    else seleccionActual.quitar.push(qObj); 
    renderizarOpcionesProducto(); 
}

window.modificarBebida = (delta, id, nombre, precio) => { 
    let idx = seleccionActual.bebidas.findIndex(b => b.id === id); 
    if (idx > -1) { 
        seleccionActual.bebidas[idx].cantidad += delta; 
        if (seleccionActual.bebidas[idx].cantidad <= 0) seleccionActual.bebidas.splice(idx, 1); 
    } else if (delta > 0) { 
        seleccionActual.bebidas.push({id, nombre, precio, cantidad: delta}); 
    } 
    renderizarOpcionesProducto(); 
}

window.confirmarAgregado = () => {
  let nombreFinal = productoActual.nombre;
  if (seleccionActual.tipo) nombreFinal += ` (${seleccionActual.tipo.nombre})`;
  let notas = [];
  seleccionActual.extras.forEach(e => notas.push(`+ ${e.nombre}`));
  seleccionActual.quitar.forEach(q => notas.push(`Sin ${q.nombre}`));
  seleccionActual.bebidas.forEach(b => notas.push(`Con ${b.cantidad}x ${b.nombre}`));
  
  let precioFinal = productoActual.precio;
  if (seleccionActual.tipo && seleccionActual.tipo.precio) precioFinal += seleccionActual.tipo.precio;
  seleccionActual.extras.forEach(e => precioFinal += e.precio);
  seleccionActual.quitar.forEach(q => { if(q.precio) precioFinal += q.precio; });
  seleccionActual.bebidas.forEach(b => precioFinal += (b.precio * b.cantidad));

  addToCarrito({ nombre: nombreFinal, precio: precioFinal, notas: notas, cantidad: 1 });

  actualizarBotonFlotante(); 
  window.cerrarModal('modalProducto');
}
