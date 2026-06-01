window.layoutConfig = window.layoutConfig || { columnas: 2, orden: [] };

window.setEditorViewport = (tipo) => {
    let canvas = document.getElementById("editor-canvas");
    document.getElementById("btn-view-mobile").style.background = "#444";
    document.getElementById("btn-view-tablet").style.background = "#444";
    document.getElementById("btn-view-pc").style.background = "#444";

    if (tipo === "mobile") {
        canvas.style.maxWidth = "400px";
        document.getElementById("btn-view-mobile").style.background = "var(--primary)";
    } else if (tipo === "tablet") {
        canvas.style.maxWidth = "768px";
        document.getElementById("btn-view-tablet").style.background = "var(--primary)";
    } else if (tipo === "pc") {
        canvas.style.maxWidth = "100%";
        document.getElementById("btn-view-pc").style.background = "var(--primary)";
    }
};

window.updateEditorColumns = () => {
    let cols = document.getElementById("editor-columns").value;
    window.layoutConfig.columnas = parseInt(cols) || 2;
    document.getElementById("editor-grid").style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
};

window.renderEditor = () => {
    let grid = document.getElementById("editor-grid");
    let dock = document.getElementById("editor-dock");
    if(!grid || !dock) return;

    let cols = window.layoutConfig.columnas || 2;
    document.getElementById("editor-columns").value = cols;
    // We will handle grid styling per category now
    grid.style.display = "flex";
    grid.style.flexDirection = "column";
    grid.style.gap = "20px";

    let orden = window.layoutConfig.orden || [];
    let productosActivos = [];
    let productosOcultos = [];

    let mapProductos = new Map();
    (window.productosNube || []).forEach(p => mapProductos.set(p.id, p));

    orden.forEach(id => {
        if (mapProductos.has(id)) {
            productosActivos.push(mapProductos.get(id));
            mapProductos.delete(id);
        }
    });

    mapProductos.forEach(p => productosOcultos.push(p));

    // Group active products by category
    let categorias = {};
    productosActivos.forEach(p => {
        let cat = p.categoria || (p.esBebida ? 'Bebidas' : 'Otros');
        if (!categorias[cat]) categorias[cat] = [];
        categorias[cat].push(p);
    });

    let createCard = (p, isActive) => {
        return `
            <div class="editor-item" draggable="${isActive ? 'true' : 'false'}" ondragstart="dragStart(event, '${p.id}')" ondragover="dragOver(event)" ondrop="drop(event, '${p.id}')" style="background:#222; border:1px solid #444; border-radius:8px; padding:10px; cursor:grab; position:relative; display:flex; flex-direction:column; align-items:center; text-align:center; min-width: 100px;">
                <div style="font-size:0.8rem; margin-bottom:5px; font-weight:bold; color:#fff;">${p.nombre}</div>
                <div style="font-size:0.7rem; color:#aaa;">$${p.precio}</div>
                <div style="margin-top:auto; display:flex; gap:5px; margin-top: 10px;">
                    ${isActive
                        ? `<button onclick="moverAlDock('${p.id}')" style="background:#ff3c3c; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;">Ocultar</button>`
                        : `<button onclick="moverAlGrid('${p.id}')" style="background:var(--primary); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;">Mostrar en Menú</button>`
                    }
                </div>
            </div>
        `;
    };

    let htmlActivos = "";
    Object.keys(categorias).forEach(cat => {
        htmlActivos += `
        <div style="background:#1a1a1a; border-radius:8px; padding:15px; border: 1px solid #333;">
            <h4 style="color:var(--primary); margin-bottom:15px; border-bottom: 1px solid #333; padding-bottom: 5px; font-size:1.1rem;">${cat}</h4>
            <div style="display:grid; grid-template-columns: repeat(${cols}, 1fr); gap:10px;">
                ${categorias[cat].map(p => createCard(p, true)).join('')}
            </div>
        </div>
        `;
    });

    grid.innerHTML = productosActivos.length ? htmlActivos : '<div style="color:#777; text-align:center; padding: 20px;">No hay productos visibles.</div>';

    // Group docked items too just for neatness
    dock.innerHTML = productosOcultos.length ? productosOcultos.map(p => createCard(p, false)).join('') : '<div style="color:#777; text-align:center; width:100%; padding: 20px;">Todos los productos están en el menú.</div>';
};

let draggedId = null;

window.dragStart = (event, id) => {
    draggedId = id;
    event.dataTransfer.effectAllowed = 'move';
    event.target.style.opacity = '0.5';
};

window.dragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
};

window.drop = (event, targetId) => {
    event.preventDefault();
    event.target.style.opacity = '1';

    if (draggedId && draggedId !== targetId) {
        let arr = window.layoutConfig.orden || [];
        let fromIdx = arr.indexOf(draggedId);
        let toIdx = arr.indexOf(targetId);

        if (fromIdx !== -1 && toIdx !== -1) {
            // Remove dragged item
            arr.splice(fromIdx, 1);
            // Insert at new index
            arr.splice(toIdx, 0, draggedId);
            window.layoutConfig.orden = arr;
            window.renderEditor();
            if (typeof window.guardarConfigLayout === 'function') {
                window.guardarConfigLayout();
            }
        }
    }
    draggedId = null;
};

// Event listener for drag end to reset opacity
document.addEventListener('dragend', (e) => {
    if (e.target.classList && e.target.classList.contains('editor-item')) {
        e.target.style.opacity = '1';
    }
});

window.moverAlDock = (id) => {
    window.layoutConfig.orden = (window.layoutConfig.orden || []).filter(x => x !== id);
    window.renderEditor();
    if (typeof window.guardarConfigLayout === 'function') window.guardarConfigLayout();
};

window.moverAlGrid = (id) => {
    if (!window.layoutConfig.orden) window.layoutConfig.orden = [];
    if (!window.layoutConfig.orden.includes(id)) {
        window.layoutConfig.orden.push(id);
    }
    window.renderEditor();
    if (typeof window.guardarConfigLayout === 'function') window.guardarConfigLayout();
};
