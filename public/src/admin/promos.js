import { collection, updateDoc, doc, setDoc, increment, onSnapshot, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "../config/firebase.config.js";

// Helper for invalidating cache
async function invalidarCacheMenu() {
    try {
        const versionRef = doc(db, "config", "menu_version");
        await setDoc(versionRef, {
            version: increment(1),
            lastUpdated: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.error("Error al invalidar caché del menú:", e);
    }
}

// Global state
let todosLosProductos = [];
let promoCropper = null;
let currentPromoFile = null;
window._tagsPromoActuales = { tipos: [], extras: [] };

window.renderizarTagsPromo = () => {
    ['tipos', 'extras'].forEach(cat => {
        const container = document.getElementById('tags' + cat.charAt(0).toUpperCase() + cat.slice(1) + 'Promo');
        if(!container) return;
        container.innerHTML = '';

        window._tagsPromoActuales[cat].forEach((tag, idx) => {
            const div = document.createElement('div');
            let colorMap = { tipos: '#4CAF50', extras: '#ff9800' };
            div.style.cssText = `background: ${colorMap[cat]}22; border: 1px solid ${colorMap[cat]}; color: #fff; padding: 4px 10px; border-radius: 16px; font-size: 0.85em; display: flex; align-items: center; gap: 8px; cursor: pointer;`;

            let precioTxt = tag.precio === 0 ? '' : (tag.precio > 0 ? `(+$${tag.precio})` : `(-$${Math.abs(tag.precio)})`);

            div.innerHTML = `
                <span onclick="window.editarEtiquetaPromo('${cat}', ${idx})">${tag.nombre} ${precioTxt}</span>
                <span onclick="window.eliminarEtiquetaPromo('${cat}', ${idx})" style="color: #ff6b6b; font-weight: bold; margin-left: 5px;">&times;</span>
            `;
            container.appendChild(div);
        });
    });
};

window.abrirModalEtiquetaPromo = (categoria) => {
    let tituloMap = { tipos: 'Tipo / Tamaño Promo', extras: 'Adicional / Extra Promo' };
    document.getElementById('tituloModalEtiquetaPromo').innerText = `Agregar ${tituloMap[categoria]}`;
    document.getElementById('tagModalCategoriaPromo').value = categoria;
    document.getElementById('tagModalIndexPromo').value = '-1';
    document.getElementById('tagModalNombrePromo').value = '';
    document.getElementById('tagModalPrecioPromo').value = '0';
    document.getElementById('modalEtiquetaPromo').style.display = 'flex';
};

window.editarEtiquetaPromo = (categoria, index) => {
    let tag = window._tagsPromoActuales[categoria][index];
    let tituloMap = { tipos: 'Tipo / Tamaño Promo', extras: 'Adicional / Extra Promo' };
    document.getElementById('tituloModalEtiquetaPromo').innerText = `Editar ${tituloMap[categoria]}`;
    document.getElementById('tagModalCategoriaPromo').value = categoria;
    document.getElementById('tagModalIndexPromo').value = index;
    document.getElementById('tagModalNombrePromo').value = tag.nombre;
    document.getElementById('tagModalPrecioPromo').value = tag.precio;
    document.getElementById('modalEtiquetaPromo').style.display = 'flex';
};

window.eliminarEtiquetaPromo = (categoria, index) => {
    window._tagsPromoActuales[categoria].splice(index, 1);
    window.renderizarTagsPromo();
};

window.guardarEtiquetaPromo = () => {
    const categoria = document.getElementById('tagModalCategoriaPromo').value;
    const index = parseInt(document.getElementById('tagModalIndexPromo').value);
    let nombre = document.getElementById('tagModalNombrePromo').value.trim();
    let precio = parseInt(document.getElementById('tagModalPrecioPromo').value) || 0;

    if (!nombre) {
        alert('El nombre no puede estar vacío');
        return;
    }

    // Capitalize first letter
    nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase();

    if (index === -1) {
        window._tagsPromoActuales[categoria].push({ nombre, precio });
    } else {
        window._tagsPromoActuales[categoria][index] = { nombre, precio };
    }

    window.renderizarTagsPromo();
    document.getElementById('modalEtiquetaPromo').style.display = 'none';
};

// Initialize Promos logic once DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    window.renderizarTagsPromo();
    // Listen to all products to populate the Ofertas select and lists
    onSnapshot(collection(db, "productos"), (snapshot) => {
        todosLosProductos = [];
        snapshot.forEach(doc => {
            let data = doc.data();
            data.id = doc.id;
            todosLosProductos.push(data);
        });

        renderizarSelectProductos();
        renderizarListas();
    });

    const selectEl = document.getElementById("ofertaSelectProducto");
    if (selectEl) {
        selectEl.addEventListener("change", (e) => {
            const prod = todosLosProductos.find(p => p.id === e.target.value);
            if (prod) {
                document.getElementById("ofertaPrecioActual").innerText = `$${prod.precio}`;
            } else {
                document.getElementById("ofertaPrecioActual").innerText = `$0`;
            }
        });
    }

    // Image upload handling with Cropper.js for roughly 2.3:1 ratio
    const fileInput = document.getElementById('promoImageUpload');
    const cropperImage = document.getElementById('promoCropperImage');
    const cropperContainer = document.getElementById('promoCropperContainer');

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                currentPromoFile = e.target.files[0];

                if (promoCropper) {
                    promoCropper.destroy();
                    promoCropper = null;
                }

                const reader = new FileReader();
                reader.onload = (ev) => {
                    cropperImage.src = ev.target.result;
                    cropperContainer.style.display = 'block';

                    promoCropper = new Cropper(cropperImage, {
                        aspectRatio: 2.3 / 1.2,
                        viewMode: 1,
                        autoCropArea: 1,
                        background: false
                    });
                };
                reader.readAsDataURL(currentPromoFile);
            }
        });
    }
});

function renderizarSelectProductos() {
    const selectOferta = document.getElementById("ofertaSelectProducto");

    // Solo productos normales (no banners)
    let productosNormales = todosLosProductos.filter(p => !p.esPromoBanner);

    // Sort by name
    productosNormales.sort((a, b) => a.nombre.localeCompare(b.nombre));

    let options = '<option value="">Selecciona un producto...</option>';
    productosNormales.forEach(p => {
        options += `<option value="${p.id}">${p.nombre} - $${p.precio}</option>`;
    });

    if (selectOferta && document.activeElement !== selectOferta) {
        selectOferta.innerHTML = options;
    }
}

function renderizarListas() {
    const containerBanners = document.getElementById("listaBannersActivos");
    const containerOfertas = document.getElementById("listaOfertasActivas");

    if (!containerBanners || !containerOfertas) return;

    // Render Banners
    const banners = todosLosProductos.filter(p => p.esPromoBanner);
    if (banners.length === 0) {
        containerBanners.innerHTML = '<span style="color: #666; font-size: 0.9em;">No hay banners activos.</span>';
    } else {
        let html = '';
        banners.forEach(b => {
            html += `
                <div style="background: #222; padding: 10px; border-radius: 5px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #333;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <img src="${b.img || ''}" style="width: 80px; height: 40px; object-fit: cover; border-radius: 4px;">
                        <div>
                            <div style="font-weight: bold; color: #fff;">${b.nombre}</div>
                            <div style="color: var(--primary); font-size: 0.9em;">$${b.precio}</div>
                        </div>
                    </div>
                    <button onclick="window.eliminarBanner('${b.id}')" style="background: #d32f2f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Eliminar</button>
                </div>
            `;
        });
        containerBanners.innerHTML = html;
    }

    // Render Ofertas
    const ofertas = todosLosProductos.filter(p => p.precioOferta != null && !p.esPromoBanner);
    if (ofertas.length === 0) {
        containerOfertas.innerHTML = '<span style="color: #666; font-size: 0.9em;">No hay ofertas activas.</span>';
    } else {
        let html = '';
        ofertas.forEach(o => {
            html += `
                <div style="background: #222; padding: 10px; border-radius: 5px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #333;">
                    <div>
                        <div style="font-weight: bold; color: #fff;">${o.nombre}</div>
                        <div style="color: #888; font-size: 0.9em; text-decoration: line-through;">$${o.precio}</div>
                        <div style="color: #ffcc00; font-weight: bold;">$${o.precioOferta}</div>
                    </div>
                    <button onclick="window.quitarOfertaProducto('${o.id}')" style="background: #d32f2f; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Quitar Oferta</button>
                </div>
            `;
        });
        containerOfertas.innerHTML = html;
    }
}

window.guardarPromoBanner = async () => {
    const btn = document.getElementById("btnGuardarPromoBanner");
    const status = document.getElementById("promoUploadStatus");
    const nombre = document.getElementById("promoNombre").value.trim();
    const precio = parseInt(document.getElementById("promoPrecio").value);
    const descripcion = document.getElementById("promoDescripcion").value.trim();
    const activo = document.getElementById("promoActivo").checked;

    if (!nombre || isNaN(precio)) {
        alert("Falta nombre o precio.");
        return;
    }

    if (!currentPromoFile && !promoCropper) {
        alert("Debes subir una imagen para el banner.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Subiendo y guardando...";
    status.innerText = "Subiendo imagen...";
    status.style.color = "#ff9800";

    try {
        // Use Cloudinary logic with Cropper blob
            const blob = await new Promise(resolve => promoCropper.getCroppedCanvas({ width: 1200, height: 626 }).toBlob(resolve, 'image/jpeg', 0.8));

        const formData = new FormData();
        formData.append('upload_preset', 'menu_grub');
        formData.append('file', blob);

        const res = await fetch('https://api.cloudinary.com/v1_1/dtsl83iyh/auto/upload', {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Error al subir a Cloudinary');

        const data = await res.json();
        const imgUrl = data.secure_url;

        status.innerText = "Guardando en base de datos...";

        // Save as a product with esPromoBanner flag
        const p = {
            esPromoBanner: true,
            categoria: "Promociones", // Just to have a category
            nombre: nombre,
            precio: precio,
            descripcion: descripcion,
            ingredientes: descripcion, // Map it so the UI renders it like normal product ingredients
            activo: activo,
            img: imgUrl,
            stock: 9999, // practically infinite
            vistas: 0,
            tipos: _tagsPromoActuales.tipos || [],
            extras: _tagsPromoActuales.extras || [],
            quitar: []
        };

        const docRef = await addDoc(collection(db, "productos"), p);

        // Ensure it appears in layout if needed (though we'll render banners separately, this is a fallback)
        if (!window.layoutConfig) window.layoutConfig = { columnas: 2, orden: [] };
        if (!window.layoutConfig.orden) window.layoutConfig.orden = [];
        window.layoutConfig.orden.push(docRef.id);
        if (typeof window.guardarConfigLayout === 'function') {
            window.guardarConfigLayout();
        }

        await invalidarCacheMenu();

        // Reset UI
        document.getElementById("promoNombre").value = "";
        document.getElementById("promoPrecio").value = "";
        document.getElementById("promoDescripcion").value = "";
        document.getElementById("promoActivo").checked = true;
        document.getElementById("promoImageUpload").value = "";
        document.getElementById("promoCropperContainer").style.display = "none";
        window._tagsPromoActuales = { tipos: [], extras: [] };
        window.renderizarTagsPromo();
        if (promoCropper) {
            promoCropper.destroy();
            promoCropper = null;
        }
        currentPromoFile = null;
        status.innerText = "¡Banner guardado exitosamente!";
        status.style.color = "#00c853";
        setTimeout(() => { status.innerText = ""; }, 3000);

    } catch (err) {
        console.error(err);
        status.innerText = "Error al guardar.";
        status.style.color = "#d32f2f";
        alert("Hubo un error al guardar el banner.");
    } finally {
        btn.disabled = false;
        btn.innerText = "Crear Banner Promocional";
    }
};

window.eliminarBanner = async (id) => {
    if (confirm("¿Seguro que deseas eliminar este banner?")) {
        try {
            await deleteDoc(doc(db, "productos", id));
            await invalidarCacheMenu();
        } catch (e) {
            console.error("Error al borrar banner:", e);
        }
    }
};

window.aplicarOfertaProducto = async () => {
    const id = document.getElementById("ofertaSelectProducto").value;
    const nuevoPrecio = parseInt(document.getElementById("ofertaPrecioNuevo").value);

    if (!id) {
        alert("Selecciona un producto.");
        return;
    }

    if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
        alert("Ingresa un precio de oferta válido.");
        return;
    }

    try {
        await updateDoc(doc(db, "productos", id), {
            precioOferta: nuevoPrecio
        });
        await invalidarCacheMenu();

        // Reset UI
        document.getElementById("ofertaSelectProducto").value = "";
        document.getElementById("ofertaPrecioNuevo").value = "";
        document.getElementById("ofertaPrecioActual").innerText = "$0";
        alert("Oferta aplicada correctamente.");

    } catch (e) {
        console.error("Error al aplicar oferta:", e);
        alert("Error al aplicar la oferta.");
    }
};

window.quitarOfertaProducto = async (id) => {
    if (confirm("¿Seguro que deseas quitar la oferta de este producto?")) {
        try {
            await updateDoc(doc(db, "productos", id), {
                precioOferta: null
            });
            await invalidarCacheMenu();
        } catch (e) {
            console.error("Error al quitar oferta:", e);
        }
    }
};
