import { mostrarBurbuja } from '../shared/utils.js';

export let carrito = [];
export let total = 0;

export function vaciarCarrito() {
  carrito = [];
  total = 0;
}

export function addToCarrito(item) {
    let idxItem = carrito.findIndex(i => i.nombre === item.nombre && JSON.stringify(i.notas) === JSON.stringify(item.notas));
    if (idxItem > -1) {
        carrito[idxItem].cantidad++;
    } else {
        carrito.push(item);
    }
}

export function actualizarBotonFlotante() {
  total = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  let cantItems = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  let btn = document.getElementById("btnCarrito");
  if (cantItems > 0) { 
      btn.style.display = "block"; 
      document.getElementById("cantidadTotal").innerText = cantItems; 
      document.getElementById("precioTotalFloat").innerText = total; 
  } else { 
      btn.style.display = "none"; 
  }
}

window.abrirCarrito = () => {
  document.getElementById("modalCarrito").style.display = "flex";
  let lista = document.getElementById("listaCarrito"); 
  lista.innerHTML = "";
  carrito.forEach((item, index) => {
    let div = document.createElement("div"); 
    div.className = "item-carrito";
    let infoHTML = `<div><strong style="color:var(--primary);">${item.cantidad}x</strong> <strong>${item.nombre}</strong><br>`;
    if (item.notas.length > 0) infoHTML += `<small style="color:var(--text-light); display:block; margin-top:4px;">${item.notas.join(" | ")}</small>`;
    infoHTML += `</div>`;
    div.innerHTML = `${infoHTML}<div style="display:flex; align-items:center; gap:15px;"><strong>$${item.precio * item.cantidad}</strong><button class="btn-eliminar" onclick="eliminarDelCarrito(${index})">✕</button></div>`;
    lista.appendChild(div);
  });
  document.getElementById("totalCarritoTexto").innerText = total;
}

window.eliminarDelCarrito = (index) => { 
    carrito.splice(index, 1); 
    actualizarBotonFlotante(); 
    window.abrirCarrito(); 
    if (carrito.length === 0) window.cerrarModal('modalCarrito'); 
}

function generarNombreAnonimo() {
  let hoy = new Date().toDateString();
  let fechaGuardada = localStorage.getItem("grub_fecha_pedidos");
  let contador = parseInt(localStorage.getItem("grub_contador_pedidos")) || 0;
  if (hoy !== fechaGuardada) { 
      contador = 1; 
      localStorage.setItem("grub_fecha_pedidos", hoy); 
  } else { 
      contador++; 
  }
  localStorage.setItem("grub_contador_pedidos", contador); 
  return "Cliente #" + contador;
}

window.enviarPedido = async (event) => {
  let nombre = document.getElementById("nombreCliente").value.trim();
  let dir = document.getElementById("dirCliente").value.trim();

  if (!dir) { 
      if (event) event.stopPropagation(); 
      mostrarBurbuja("Por favor, ingresa tu dirección para el envío."); 
      return; 
  }
  if (!nombre) nombre = generarNombreAnonimo();

  let detalle = carrito.map(i => {
    let texto = `- ${i.cantidad}x ${i.nombre} ($${i.precio * i.cantidad})`;
    if (i.notas.length > 0) texto += `\n   -> ${i.notas.join("\n   -> ")}`;
    return texto;
  }).join("\n\n");

  let msg = `¡Hola Grub! Quiero hacer el siguiente pedido:\n\n${detalle}\n\n*TOTAL: $${total}*\n\nNombre: ${nombre}\nDirección: ${dir}`;
  let numWa = window.configuracionWhatsAppCliente || "5493813457043";
  window.open(`https://wa.me/${numWa}?text=` + encodeURIComponent(msg));
  
  vaciarCarrito();
  actualizarBotonFlotante(); 
  window.cerrarModal('modalCarrito');
}
