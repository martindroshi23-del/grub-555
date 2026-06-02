import { guardarProductoEnNube, modificarStockNube, borrarDeNube } from "../services/admin.service.js";

// MANEJO DE CATEGORIAS
let categoriasGuardadas = JSON.parse(localStorage.getItem("grub_categorias")) || ["Pizzas", "Hamburguesas", "Bebidas", "Acompañamientos", "Promociones"];

// Asegurarse de que "Promociones" esté en la lista por defecto
if (!categoriasGuardadas.includes("Promociones")) {
    categoriasGuardadas.push("Promociones");
    localStorage.setItem("grub_categorias", JSON.stringify(categoriasGuardadas));
}

function actualizarSelectCategorias() {
    let select = document.getElementById("catAdmin"); 
    if(!select) return;
    
    select.innerHTML = "";
    categoriasGuardadas.forEach(c => {
        select.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

window.agregarNuevaCategoria = () => { 
    let nueva = prompt("Nombre de la categoría:"); 
    if(nueva && nueva.trim() !== "") { 
        categoriasGuardadas.push(nueva.trim()); 
        localStorage.setItem("grub_categorias", JSON.stringify(categoriasGuardadas)); 
        actualizarSelectCategorias(); 
        document.getElementById("catAdmin").value = nueva.trim(); 
    } 
};

// Cargar UI inicial
actualizarSelectCategorias();


// LÓGICA DE UPLOAD CLOUDINARY
let cropper = null;
let currentFile = null;
let currentFileType = null;

const processSelectedFile = (file) => {
    if (!file) return;

    currentFile = file;
    currentFileType = file.type.startsWith('video/') ? 'video' : 'image';

    const previewContainer = document.getElementById('uploadPreviewContainer');
    const cropperWrapper = document.getElementById('cropperWrapper');
    const imageHelperText = document.getElementById('imageHelperText');
    const videoPreviewWrapper = document.getElementById('videoPreviewWrapper');
    const videoHelperText = document.getElementById('videoHelperText');
    const imageToCrop = document.getElementById('imageToCrop');
    const videoPreview = document.getElementById('videoPreview');
    const uploadStatus = document.getElementById('uploadStatus');

    previewContainer.style.display = 'block';
    uploadStatus.innerText = '';

    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    if (currentFileType === 'image') {
        cropperWrapper.style.display = 'block';
        imageHelperText.style.display = 'block';
        videoPreviewWrapper.style.display = 'none';
        videoHelperText.style.display = 'none';

        const reader = new FileReader();
        reader.onload = (e) => {
            imageToCrop.src = e.target.result;
            cropper = new Cropper(imageToCrop, {
                aspectRatio: 4 / 3,
                viewMode: 1,
                autoCropArea: 1,
                background: false
            });
        };
        reader.readAsDataURL(file);
    } else if (currentFileType === 'video') {
        cropperWrapper.style.display = 'none';
        imageHelperText.style.display = 'none';
        videoPreviewWrapper.style.display = 'block';
        videoHelperText.style.display = 'block';

        if (file.size > 10 * 1024 * 1024) {
            alert('El video supera los 10MB permitidos.');
            document.getElementById('fileUploadAdmin').value = '';
            previewContainer.style.display = 'none';
            currentFile = null;
            return;
        }

        const url = URL.createObjectURL(file);
        videoPreview.src = url;
    }
};

// Setup Event Listeners for File Upload and Drag & Drop
document.addEventListener("DOMContentLoaded", () => {
    const fileUploadAdmin = document.getElementById("fileUploadAdmin");
    const dropzoneAdmin = document.getElementById("dropzoneAdmin");

    if (fileUploadAdmin) {
        fileUploadAdmin.addEventListener("change", (e) => {
            processSelectedFile(e.target.files[0]);
        });
    }

    if (dropzoneAdmin) {
        dropzoneAdmin.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropzoneAdmin.classList.add("dragover");
        });

        dropzoneAdmin.addEventListener("dragleave", (e) => {
            e.preventDefault();
            dropzoneAdmin.classList.remove("dragover");
        });

        dropzoneAdmin.addEventListener("drop", (e) => {
            e.preventDefault();
            dropzoneAdmin.classList.remove("dragover");

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                // Update the file input manually so its state matches
                if (fileUploadAdmin) {
                    fileUploadAdmin.files = e.dataTransfer.files;
                }
                processSelectedFile(e.dataTransfer.files[0]);
            }
        });
    }
});

window.uploadToCloudinary = async () => {
    if (!currentFile && !cropper) return null;

    const statusEl = document.getElementById('uploadStatus');
    statusEl.innerText = 'Subiendo archivo, por favor espera...';
    statusEl.style.color = '#ff9800';

    const formData = new FormData();
    formData.append('upload_preset', 'menu_grub');

    try {
        if (currentFileType === 'image' && cropper) {
            const blob = await new Promise(resolve => cropper.getCroppedCanvas({ width: 800, height: 600 }).toBlob(resolve, 'image/jpeg', 0.8));
            formData.append('file', blob);
        } else if (currentFileType === 'video') {
            formData.append('file', currentFile);
        } else {
            return null;
        }

        const res = await fetch('https://api.cloudinary.com/v1_1/dtsl83iyh/auto/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Error al subir a Cloudinary');

        const data = await res.json();
        document.getElementById('imgAdmin').value = data.secure_url;

        statusEl.innerText = '¡Subida exitosa!';
        statusEl.style.color = '#00c853';

        return data.secure_url;
    } catch (err) {
        console.error(err);
        statusEl.innerText = 'Error en la subida.';
        statusEl.style.color = '#ff3c3c';
        alert('Hubo un error al subir el archivo.');
        return null;
    }
};

// LÓGICA DE UI DEL INVENTARIO
window.cargarParaEditar = (idFirebase) => {
    // Note: productosNube will be available globally from admin.html inline script as it hasn't been extracted yet.
    if (typeof window.productosNube === 'undefined') {
        console.error("productosNube no está definido aún.");
        return;
    }

    let p = window.productosNube.find(x => x.id === idFirebase); 
    if(!p) return;
    
    document.getElementById("editId").value = p.id; 
    document.getElementById("tituloFormAdmin").innerText = "Editando: " + p.nombre; 
    document.getElementById("btnGuardarAdmin").innerText = "Actualizar Cambios"; 
    document.getElementById("btnCancelarEdicion").style.display = "block";
    
    document.getElementById("tipoItemAdmin").value = p.esBebida ? "bebida" : "producto"; 
    document.getElementById("catAdmin").value = p.categoria || ""; 
    document.getElementById("nombreAdmin").value = p.nombre || ""; 
    document.getElementById("precioAdmin").value = p.precio || ""; 
    document.getElementById("precioOfertaAdmin").value = p.precioOferta || "";
    document.getElementById("stockAdmin").value = p.stock || ""; 
    document.getElementById("imgAdmin").value = p.img || ""; 
    
    // Reset file uploads
    document.getElementById("fileUploadAdmin").value = "";
    document.getElementById("uploadPreviewContainer").style.display = "none";
    document.getElementById("uploadStatus").innerText = "";
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    currentFile = null;

    document.getElementById("ingredientesAdmin").value = p.ingredientes || "";
    
    // Asignar los tags a las variables globales para visualización
    window._tagsActuales = {
        tipos: (p.tipos || []).map(e => typeof e === 'string' ? {nombre: e, precio: 0} : e),
        extras: (p.extras || []).map(e => typeof e === 'string' ? {nombre: e, precio: 0} : e),
        quitar: (p.quitar || []).map(e => typeof e === 'string' ? {nombre: e, precio: 0} : e)
    };
    window.renderizarTags();
    
    // Smooth scroll to the form panel (derecho) instead of top of page
    let panelDerecho = document.querySelector('.panel-derecho');
    if (panelDerecho) {
        panelDerecho.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        window.scrollTo(0, 0);
    }
};

window.limpiarFormulario = () => { 
    document.getElementById("editId").value = ""; 
    document.getElementById("tituloFormAdmin").innerText = "Nube: Añadir Nuevo Producto"; 
    document.getElementById("btnGuardarAdmin").innerText = "Guardar en la Nube ☁️"; 
    document.getElementById("btnCancelarEdicion").style.display = "none"; 
    document.querySelectorAll('#tab-inventario input:not([type="hidden"])').forEach(i => i.value = ''); 
    document.getElementById("ingredientesAdmin").value = "";
    document.getElementById("imgAdmin").value = "";

    window._tagsActuales = { tipos: [], extras: [], quitar: [] };
    window.renderizarTags();
    document.getElementById("fileUploadAdmin").value = "";
    document.getElementById("uploadPreviewContainer").style.display = "none";
    document.getElementById("uploadStatus").innerText = "";
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    currentFile = null;
};

// Sistema de Tags
window._tagsActuales = { tipos: [], extras: [], quitar: [] };

window.renderizarTags = () => {
    ['tipos', 'extras', 'quitar'].forEach(cat => {
        const container = document.getElementById('tags' + cat.charAt(0).toUpperCase() + cat.slice(1));
        if(!container) return;
        container.innerHTML = '';

        window._tagsActuales[cat].forEach((tag, idx) => {
            const div = document.createElement('div');
            let colorMap = { tipos: '#4CAF50', extras: '#ff9800', quitar: '#ff5722' };
            div.style.cssText = `background: ${colorMap[cat]}22; border: 1px solid ${colorMap[cat]}; color: #fff; padding: 4px 10px; border-radius: 16px; font-size: 0.85em; display: flex; align-items: center; gap: 8px; cursor: pointer;`;

            let precioTxt = tag.precio === 0 ? '' : (tag.precio > 0 ? `(+$${tag.precio})` : `(-$${Math.abs(tag.precio)})`);

            div.innerHTML = `
                <span onclick="window.editarEtiqueta('${cat}', ${idx})">${tag.nombre} ${precioTxt}</span>
                <span onclick="window.eliminarEtiqueta('${cat}', ${idx})" style="color: #ff6b6b; font-weight: bold; margin-left: 5px;">&times;</span>
            `;
            container.appendChild(div);
        });
    });
};

window.abrirModalEtiqueta = (categoria) => {
    let tituloMap = { tipos: 'Tipo / Tamaño', extras: 'Adicional / Extra', quitar: 'A Quitar' };
    document.getElementById('tituloModalEtiqueta').innerText = `Agregar ${tituloMap[categoria]}`;
    document.getElementById('tagModalCategoria').value = categoria;
    document.getElementById('tagModalIndex').value = '-1';
    document.getElementById('tagModalNombre').value = '';
    document.getElementById('tagModalPrecio').value = '0';
    document.getElementById('modalEtiqueta').style.display = 'flex';
};

window.editarEtiqueta = (categoria, index) => {
    let tag = window._tagsActuales[categoria][index];
    let tituloMap = { tipos: 'Tipo / Tamaño', extras: 'Adicional / Extra', quitar: 'A Quitar' };
    document.getElementById('tituloModalEtiqueta').innerText = `Editar ${tituloMap[categoria]}`;
    document.getElementById('tagModalCategoria').value = categoria;
    document.getElementById('tagModalIndex').value = index;
    document.getElementById('tagModalNombre').value = tag.nombre;
    document.getElementById('tagModalPrecio').value = tag.precio;
    document.getElementById('modalEtiqueta').style.display = 'flex';
};

window.eliminarEtiqueta = (categoria, index) => {
    window._tagsActuales[categoria].splice(index, 1);
    window.renderizarTags();
};

window.guardarEtiqueta = () => {
    const categoria = document.getElementById('tagModalCategoria').value;
    const index = parseInt(document.getElementById('tagModalIndex').value);
    let nombre = document.getElementById('tagModalNombre').value.trim();
    let precio = parseInt(document.getElementById('tagModalPrecio').value) || 0;

    if (!nombre) {
        window.mostrarToast('El nombre no puede estar vacío', 'error');
        return;
    }

    // Capitalize first letter
    nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();

    if (index === -1) {
        window._tagsActuales[categoria].push({ nombre, precio });
    } else {
        window._tagsActuales[categoria][index] = { nombre, precio };
    }

    window.renderizarTags();
    document.getElementById('modalEtiqueta').style.display = 'none';
};

// Asignar listeners del DOM de forma robusta
const attachTagListeners = () => {
    const btnTipos = document.getElementById('btnAgregarTipo');
    const btnExtras = document.getElementById('btnAgregarExtra');
    const btnQuitar = document.getElementById('btnAgregarQuitar');
    const btnGuardarEtiqueta = document.getElementById('btnGuardarEtiqueta');

    if (btnTipos && !btnTipos.onclick) btnTipos.onclick = () => window.abrirModalEtiqueta('tipos');
    if (btnExtras && !btnExtras.onclick) btnExtras.onclick = () => window.abrirModalEtiqueta('extras');
    if (btnQuitar && !btnQuitar.onclick) btnQuitar.onclick = () => window.abrirModalEtiqueta('quitar');
    if (btnGuardarEtiqueta && !btnGuardarEtiqueta.onclick) btnGuardarEtiqueta.onclick = () => window.guardarEtiqueta();
};

document.addEventListener('DOMContentLoaded', attachTagListeners);
// Fallback in case it's loaded late:
setTimeout(attachTagListeners, 500);


// Mapear funciones de servicio a window para que los botones de admin.html puedan usarlos
window.guardarProductoEnNube = guardarProductoEnNube;
window.modificarStockNube = modificarStockNube;
window.borrarDeNube = borrarDeNube;
