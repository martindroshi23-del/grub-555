let temporizadorAlerta;

export const mostrarBurbuja = (mensaje, esError = false) => {
  let toast = document.getElementById("toast-alerta");
  if (!toast) return;
  toast.innerText = mensaje;
  if (esError) {
    toast.classList.add("error");
  } else {
    toast.classList.remove("error");
  }
  setTimeout(() => toast.classList.add("mostrar"), 10);
  clearTimeout(temporizadorAlerta);
  temporizadorAlerta = setTimeout(ocultarBurbuja, 3000); // Admin has 3500 but standardizing to 3000 for client or keeping behavior logic
};

export const ocultarBurbuja = () => {
  let toast = document.getElementById("toast-alerta");
  if (toast) {
    toast.classList.remove("mostrar");
  }
};

export const copiarAlPortapapeles = (texto, msj) => {
  navigator.clipboard.writeText(texto).then(() => {
    mostrarBurbuja(msj);
  }).catch(err => {
    console.error("Error al copiar al portapapeles:", err);
  });
};

export const formatCronometro = (ms) => {
  if (ms < 0) ms = 0;
  let seg = Math.floor(ms / 1000);
  let h = Math.floor(seg / 3600);
  let m = Math.floor((seg % 3600) / 60);
  let s = seg % 60;
  if (h >= 3) return "03:00:00+";
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};
