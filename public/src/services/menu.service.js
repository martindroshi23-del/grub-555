import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "../config/firebase.config.js";

/**
 * Optimiza la lectura del menú usando una versión de caché.
 * Si la versión en la base de datos (config/menu_version) coincide con la versión local,
 * devuelve los productos almacenados en localStorage.
 * Si es diferente o no existe el caché, realiza un getDocs completo a 'productos',
 * actualiza el localStorage con los nuevos datos y la nueva versión, y los devuelve.
 */
export const obtenerMenuOptimizado = async () => {
    try {
        // 1. Obtener la versión actual del menú desde Firebase
        const versionRef = doc(db, "config", "menu_version");
        const versionSnap = await getDoc(versionRef);
        
        let versionFirebase = 0;
        if (versionSnap.exists()) {
            versionFirebase = versionSnap.data().version || 0;
        }

        // 2. Comprobar la versión local en localStorage
        const versionLocal = parseInt(localStorage.getItem("grub_menu_version")) || 0;
        const cacheLocal = localStorage.getItem("grub_menu_cache");

        // 3. Si las versiones coinciden y existe el caché, devolvemos el caché
        if (versionFirebase === versionLocal && cacheLocal) {
            console.log("Cargando menú desde caché local (versión coincidente).");
            return JSON.parse(cacheLocal);
        }

        // 4. Si difieren o no hay caché, obtenemos los datos frescos (getDocs de 'productos')
        console.log("Versión del menú desactualizada o no encontrada. Descargando desde Firebase...");
        const productosRef = collection(db, "productos");
        const querySnapshot = await getDocs(productosRef);
        
        const productosNuevos = [];
        querySnapshot.forEach((docSnap) => {
            let p = docSnap.data();
            p.id = docSnap.id;
            productosNuevos.push(p);
        });

        // 5. Actualizamos el caché en localStorage y la versión
        localStorage.setItem("grub_menu_cache", JSON.stringify(productosNuevos));
        localStorage.setItem("grub_menu_version", versionFirebase.toString());

        return productosNuevos;
    } catch (error) {
        console.error("Error al obtener el menú optimizado:", error);
        
        // Intentar fallback al caché si falla la red
        const cacheLocal = localStorage.getItem("grub_menu_cache");
        if (cacheLocal) {
            console.log("Fallo de red, sirviendo desde caché local.");
            return JSON.parse(cacheLocal);
        }
        
        return [];
    }
};
