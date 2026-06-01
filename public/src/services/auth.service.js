import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { auth, db } from "../config/firebase.config.js";

export function iniciarEscuchaAuth(aplicarInterfazPorRol, cargarNubeEnTiempoReal) {
    onAuthStateChanged(auth, async (user) => {
        if (user) { 
            try {
                const rolDoc = await getDoc(doc(db, "usuarios_roles", user.uid));
                
                if (!rolDoc.exists() || rolDoc.data().activo === false) {
                    await signOut(auth);
                    alert("Usuario deshabilitado o sin rol asignado.");
                    return;
                }
                
                window.rolActual = rolDoc.data().rol;
                
                document.getElementById('login-screen').style.display = 'none'; 
                aplicarInterfazPorRol();

                if (cargarNubeEnTiempoReal) {
                    cargarNubeEnTiempoReal();
                }
            } catch (error) {
                console.error("Error al obtener rol:", error);
                await signOut(auth);
                alert("Error de validación de usuario.");
            }
        } else { 
            window.rolActual = null;
            document.getElementById('login-screen').style.display = 'flex'; 
            document.getElementById('main-sidebar').style.display = 'none';
            document.getElementById('admin-screen').style.display = 'none'; 
            
            const cocinaScreen = document.getElementById('cocina-screen');
            if (cocinaScreen) cocinaScreen.style.display = 'none';
        }
    });
}

export const ingresar = async () => { 
    try { 
        await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value); 
    } catch (error) { 
        document.getElementById('login-error').style.display = 'block'; 
    } 
};

export const cerrarSesion = () => signOut(auth);