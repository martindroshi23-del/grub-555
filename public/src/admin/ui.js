// SISTEMA DE ALERTAS (TOAST)
window.temporizadorAlerta = null;
window.mostrarBurbuja = (mensaje, esError = false) => {
    let toast = document.getElementById("toast-alerta");
    if(!toast) return;
    toast.innerText = mensaje;
    if (esError) {
    toast.classList.add("error");
    } else {
    toast.classList.remove("error");
    }
    setTimeout(() => toast.classList.add("mostrar"), 10);
    clearTimeout(window.temporizadorAlerta);
    window.temporizadorAlerta = setTimeout(window.ocultarBurbuja, 3500);
}

window.ocultarBurbuja = () => {
    let toast = document.getElementById("toast-alerta");
    if(toast) toast.classList.remove("mostrar");
}

window.copiarAlPortapapeles = (texto, msj) => {
    navigator.clipboard.writeText(texto).then(() => {
    window.mostrarBurbuja(msj);
    });
};
