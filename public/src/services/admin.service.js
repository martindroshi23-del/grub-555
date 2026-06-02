import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, increment } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "../config/firebase.config.js";

// Actualiza o crea el config/menu_version para invalidar caché
async function invalidarCacheMenu() {
    try {
        const versionRef = doc(db, "config", "menu_version");
        await setDoc(versionRef, {
            version: increment(1),
            lastUpdated: new Date().toISOString()
        }, { merge: true });
        console.log("Caché de menú invalidado exitosamente (versión incrementada).");
    } catch (e) {
        console.error("Error al invalidar caché del menú:", e);
    }
}

export const guardarProductoEnNube = async () => {
    // Si hay un archivo pendiente de subir, lo subimos antes de guardar en Firestore
    if (typeof window.uploadToCloudinary === 'function') {
        const fileInput = document.getElementById('fileUploadAdmin');
        // Si hay archivo seleccionado, llamamos a la función de subida.
        // Si ya se subió no hace nada (o si no se seleccionó nada)
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const url = await window.uploadToCloudinary();
            if (!url) {
                // If upload fails or returns null, we block saving to avoid losing data
                return;
            }
        }
    }

    let idForm = document.getElementById("editId").value;
    
    // Usamos directamente las etiquetas globales de inventory.js
    let tagsAct = window._tagsActuales || { tipos: [], extras: [], quitar: [] };
    
    let precioOfertaVal = document.getElementById("precioOfertaAdmin") ? parseInt(document.getElementById("precioOfertaAdmin").value) : null;

    let p = {
        esBebida: document.getElementById("tipoItemAdmin").value === "bebida", 
        categoria: document.getElementById("catAdmin").value || "Otros",
        nombre: document.getElementById("nombreAdmin").value, 
        precio: parseInt(document.getElementById("precioAdmin").value),
        precioOferta: isNaN(precioOfertaVal) ? null : (precioOfertaVal || null),
        stock: parseInt(document.getElementById("stockAdmin").value) || 0, 
        img: document.getElementById("imgAdmin").value,
        vistas: idForm ? undefined : 0, 
        ingredientes: document.getElementById("ingredientesAdmin").value,
        tipos: tagsAct.tipos,
        quitar: tagsAct.quitar,
        extras: tagsAct.extras
    };
    
    if (!p.nombre || isNaN(p.precio)) return alert("Faltan datos importantes.");
    
    try {
        if (idForm) { 
            delete p.vistas; 
            await updateDoc(doc(db, "productos", idForm), p); 
        } else { 
            const docRef = await addDoc(collection(db, "productos"), p);
            // Auto-add to menu layout
            if (!window.layoutConfig) window.layoutConfig = { columnas: 2, orden: [] };
            if (!window.layoutConfig.orden) window.layoutConfig.orden = [];
            window.layoutConfig.orden.push(docRef.id);
            if (typeof window.guardarConfigLayout === 'function') {
                window.guardarConfigLayout();
            }
        }
        
        // INVALIDAR CACHÉ
        await invalidarCacheMenu();

        if (typeof window.limpiarFormulario === 'function') {
            window.limpiarFormulario();
        }
    } catch (error) { 
        alert("Error al guardar."); 
        console.error(error);
    }
};

export const modificarStockNube = async (idFirebase, stockActual) => { 
    let cant = parseInt(document.getElementById('mod_' + idFirebase).value); 
    if (isNaN(cant)) return alert("Ingresa un número"); 
    
    let nuevoStock = stockActual + cant; 
    if (nuevoStock < 0) nuevoStock = 0; 
    
    try {
        await updateDoc(doc(db, "productos", idFirebase), { stock: nuevoStock }); 
        document.getElementById('mod_' + idFirebase).value = ""; 
        
        // INVALIDAR CACHÉ (El stock cambia, el cliente necesita saberlo)
        await invalidarCacheMenu();
    } catch (error) {
        console.error("Error al modificar stock:", error);
    }
};

export const borrarDeNube = async (idFirebase) => { 
    if(confirm("¿Borrar esto de la base de datos oficial?")) {
        try {
            await deleteDoc(doc(db, "productos", idFirebase)); 
            
            // INVALIDAR CACHÉ
            await invalidarCacheMenu();
        } catch (error) {
            console.error("Error al borrar producto:", error);
        }
    }
};

// Exponer al objeto global para atributos onclick
window.guardarProductoEnNube = guardarProductoEnNube;
window.modificarStockNube = modificarStockNube;
window.borrarDeNube = borrarDeNube;
