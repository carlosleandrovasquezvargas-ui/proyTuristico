let experiencias = [];
let reservas = [];
let categoriaActiva = "todas";
let ordenActual = "precio-asc";

const catalogo = document.querySelector("#catalogo");
const contador = document.querySelector("#contador");
const botonesFiltro = document.querySelectorAll("[data-categoria]");
const inputBusqueda = document.querySelector("#busqueda");
const selectOrden = document.querySelector("#ordenar");
const inputPrecioMax = document.querySelector("#precio-max");

const estado = document.querySelector("#estado");
const listaReservas = document.querySelector("#listaReservas");
const totalSpan = document.querySelector("#total");
const totalPersonasSpan = document.querySelector("#total-personas");
const btnVaciar = document.querySelector("#btn-vaciar");
const divMensajes = document.querySelector("#mensajes-sistema");

// 1. Cargar JSON
async function cargarExperiencias() {
  try {
    estado.textContent = "Cargando experiencias...";
    const respuesta = await fetch("./data/experiencias.json");
    if (!respuesta.ok) throw new Error("No fue posible cargar las experiencias");
    
    experiencias = await respuesta.json();
    estado.style.display = "none";
    actualizarCatalogo();
  } catch (error) {
    estado.textContent = "Error al cargar la información";
    console.error(error);
  }
}

// 2. Filtros y Orden (Incluye reto de precio máximo)
function getResultados() {
  const textoBusqueda = inputBusqueda.value.trim().toLowerCase();
  const precioMax = Number(inputPrecioMax.value);

  let resultados = experiencias.filter((experiencia) => {
    const coincideCategoria = categoriaActiva === "todas" || experiencia.categoria === categoriaActiva;
    const coincideTexto = textoBusqueda === "" || experiencia.nombre.toLowerCase().includes(textoBusqueda);
    const coincidePrecio = precioMax === 0 || experiencia.precio <= precioMax;

    return coincideCategoria && coincideTexto && coincidePrecio;
  });

  if (ordenActual === "precio-desc") {
    resultados = [...resultados].sort((a, b) => b.precio - a.precio);
  } else {
    resultados = [...resultados].sort((a, b) => a.precio - b.precio);
  }

  return resultados;
}

// 3. Renderizar Catálogo
function actualizarCatalogo() {
  const lista = getResultados();

  if (lista.length === 0) {
    catalogo.innerHTML = '<div class="sin-resultados">No se encontraron experiencias con ese filtro.</div>';
    contador.textContent = "0 experiencias";
    return;
  }

  catalogo.innerHTML = lista.map((experiencia) => `
        <article class="tarjeta">
          <div class="imagen ${experiencia.categoria}">${experiencia.icono}</div>
          <div class="informacion">
            <span class="etiqueta">${experiencia.etiqueta}</span>
            <h3>${experiencia.nombre}</h3>
            <p>Cupo disponible: ${experiencia.cupo}</p>
            <p class="precio">$${experiencia.precio} MXN</p>
            
            <label class="cantidad-label">Personas:
              <input type="number" class="input-cantidad" id="cantidad-${experiencia.id}" min="1" max="${experiencia.cupo}" value="1">
            </label>
            <button class="btn-reservar" data-id="${experiencia.id}">Agregar a reserva</button>
          </div>
        </article>
      `
    ).join("");

  contador.textContent = `${lista.length} ${lista.length === 1 ? "experiencia" : "experiencias"}`;
  agregarEventosReservar();
}

// 4. Agregar a Reservas
function agregarEventosReservar() {
  const botonesReservar = document.querySelectorAll(".btn-reservar");
  botonesReservar.forEach(boton => {
    boton.addEventListener("click", () => {
      const id = Number(boton.dataset.id);
      agregarReserva(id);
    });
  });
}

function agregarReserva(id) {
  const experiencia = experiencias.find(e => e.id === id);
  const entradaCantidad = document.querySelector(`#cantidad-${id}`);
  const cantidad = Number(entradaCantidad.value);

  if (cantidad < 1 || cantidad > experiencia.cupo) {
    mostrarMensaje("Cantidad no válida.", "error");
    return;
  }

  const reservaExistente = reservas.find(r => r.experienciaId === id);

  if (reservaExistente) {
    const nuevaCantidad = reservaExistente.cantidad + cantidad;
    if (nuevaCantidad > experiencia.cupo) {
      mostrarMensaje("La cantidad supera el cupo disponible.", "error");
      return;
    }
    reservaExistente.cantidad = nuevaCantidad;
    reservaExistente.subtotal = nuevaCantidad * experiencia.precio;
  } else {
    reservas.push({
      experienciaId: id,
      nombre: experiencia.nombre,
      precio: experiencia.precio,
      cantidad: cantidad,
      subtotal: experiencia.precio * cantidad,
      cupoMaximo: experiencia.cupo
    });
  }
  
  mostrarMensaje(`Agregaste ${cantidad} persona(s) a ${experiencia.nombre}.`, "exito");
  mostrarReservas();
}

// 5. Renderizar Resumen y Totales
function mostrarReservas() {
  if (reservas.length === 0) {
    listaReservas.innerHTML = '<div class="sin-resultados">No hay experiencias seleccionadas.</div>';
    totalSpan.textContent = "$0 MXN";
    totalPersonasSpan.textContent = "0";
    return;
  }

  listaReservas.innerHTML = reservas.map(r => `
      <article class="item-reserva">
        <div class="reserva-info">
          <strong>${r.nombre}</strong>
          <p>${r.cantidad} persona(s) x $${r.precio}</p>
        </div>
        <div class="reserva-acciones">
            <strong>$${r.subtotal} MXN</strong>
            <!-- Botones del reto -->
            <button class="btn-mini" onclick="modificarCantidad(${r.experienciaId}, 1)">+</button>
            <button class="btn-mini" onclick="modificarCantidad(${r.experienciaId}, -1)">-</button>
            <button class="btn-eliminar" onclick="eliminarReserva(${r.experienciaId})">Eliminar</button>
        </div>
      </article>
  `).join("");

  const totalSuma = reservas.reduce((acumulado, r) => acumulado + r.subtotal, 0);
  const totalPers = reservas.reduce((acumulado, r) => acumulado + r.cantidad, 0);
  
  totalSpan.textContent = `$${totalSuma} MXN`;
  totalPersonasSpan.textContent = totalPers;
}

// 6. Funciones del Carrito (Reto)
window.eliminarReserva = function(id) {
  // 1. Pedir confirmación al usuario
  if (confirm("¿Estás seguro de eliminar esta experiencia de tu reservación?")) {
    
    // 2. Si acepta, filtramos el arreglo para quitar esa experiencia
    reservas = reservas.filter(r => r.experienciaId !== id);
    
    // 3. Actualizamos la vista y mostramos el mensaje de éxito
    mostrarReservas();
    mostrarMensaje("Experiencia eliminada correctamente.", "exito");
  }
}

window.modificarCantidad = function(id, cambio) {
    const reserva = reservas.find(r => r.experienciaId === id);
    if (!reserva) return;

    const nuevaCantidad = reserva.cantidad + cambio;
    if (nuevaCantidad > reserva.cupoMaximo) {
        mostrarMensaje("No puedes agregar más, supera el cupo.", "error");
        return;
    }
    if (nuevaCantidad < 1) {
        eliminarReserva(id);
        return;
    }

    reserva.cantidad = nuevaCantidad;
    reserva.subtotal = nuevaCantidad * reserva.precio;
    mostrarReservas();
}

btnVaciar.addEventListener("click", () => {
    if(reservas.length > 0 && confirm("¿Estás seguro de vaciar tu reservación?")) {
        reservas = [];
        mostrarReservas();
        mostrarMensaje("Reservación vaciada con éxito.", "exito");
    }
});

// 7. Sistema de mensajes sin alert()
function mostrarMensaje(texto, tipo) {
    divMensajes.innerHTML = `<div class="alerta ${tipo}">${texto}</div>`;
    setTimeout(() => { divMensajes.innerHTML = ""; }, 3000);
}

// 8. Eventos de los filtros
botonesFiltro.forEach(boton => {
  boton.addEventListener("click", () => {
    botonesFiltro.forEach(el => el.classList.remove("activo"));
    boton.classList.add("activo");
    categoriaActiva = boton.dataset.categoria;
    actualizarCatalogo();
  });
});

inputBusqueda.addEventListener("input", actualizarCatalogo);
inputPrecioMax.addEventListener("input", actualizarCatalogo);
selectOrden.addEventListener("change", (e) => {
  ordenActual = e.target.value;
  actualizarCatalogo();
});

// 9. Iniciar APP
cargarExperiencias();