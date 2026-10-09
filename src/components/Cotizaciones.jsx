
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import NuevaCotizacion from "./NuevaCotizacion";
import DetalleCotizacion from "./DetalleCotizacion";
import "./Cotizaciones.css";

const estados = [
  { valor: "todos", etiqueta: "Todos los estados" },
  { valor: "borrador", etiqueta: "Borrador" },
  { valor: "enviada", etiqueta: "Enviada" },
  { valor: "aceptada", etiqueta: "Aceptada" },
  { valor: "rechazada", etiqueta: "Rechazada" },
  { valor: "pagada", etiqueta: "Pagada" },
  { valor: "vencida", etiqueta: "Vencida" },
];

const nombresEstado = {
  borrador: "Borrador",
  enviada: "Enviada",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  pagada: "Pagada",
  vencida: "Vencida",
};

const formatoMoneda = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);

const formatoFecha = (fecha) => {
  if (!fecha) return "—";

  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
};

function Cotizaciones() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cotizacionId, setCotizacionId] = useState(null);
  const [cotizacionCreada, setCotizacionCreada] = useState(null);

  const [cotizaciones, setCotizaciones] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [recargar, setRecargar] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargarHistorial() {
      setCargando(true);
      setError("");

      try {
        const [cotizacionesRes, clientesRes] = await Promise.all([
          supabase
            .from("cotizaciones")
            .select(
              "id, numero, cliente_id, fecha, estado, subtotal, descuento, total, created_at"
            )
            .order("created_at", { ascending: false }),

          supabase.from("clientes").select("id, nombre"),
        ]);

        if (cotizacionesRes.error) throw cotizacionesRes.error;
        if (clientesRes.error) throw clientesRes.error;

        const clientesPorId = new Map(
          (clientesRes.data || []).map((cliente) => [
            String(cliente.id),
            cliente.nombre,
          ])
        );

        const historial = (cotizacionesRes.data || []).map((cotizacion) => ({
          ...cotizacion,
          clienteNombre:
            clientesPorId.get(String(cotizacion.cliente_id)) ||
            "Cliente no asignado",
        }));

        if (activo) {
          setCotizaciones(historial);
        }
      } catch (err) {
        console.error("Error al cargar el historial:", err);

        if (activo) {
          setError(
            err.message ||
              "No fue posible cargar el historial de cotizaciones."
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarHistorial();

    return () => {
      activo = false;
    };
  }, [recargar]);

  const cotizacionesFiltradas = cotizaciones.filter((cotizacion) => {
    const texto = busqueda.trim().toLowerCase();

    const coincideBusqueda =
      !texto ||
      String(cotizacion.numero || "").toLowerCase().includes(texto) ||
      cotizacion.clienteNombre.toLowerCase().includes(texto);

    const coincideEstado =
      filtroEstado === "todos" || cotizacion.estado === filtroEstado;

    return coincideBusqueda && coincideEstado;
  });

  const totalPendientes = cotizaciones.filter((cotizacion) =>
    ["borrador", "enviada"].includes(cotizacion.estado)
  ).length;

  const totalAceptadas = cotizaciones.filter(
    (cotizacion) => cotizacion.estado === "aceptada"
  ).length;

  const valorAceptado = cotizaciones
    .filter((cotizacion) =>
      ["aceptada", "pagada"].includes(cotizacion.estado)
    )
    .reduce((suma, cotizacion) => suma + Number(cotizacion.total || 0), 0);

  async function eliminarCotizacion(cotizacion) {
    const confirmar = window.confirm(
      `¿Deseas eliminar la cotización ${cotizacion.numero}?\n\nEsta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    setError("");

    const { error: errorEliminar } = await supabase
      .from("cotizaciones")
      .delete()
      .eq("id", cotizacion.id);

    if (errorEliminar) {
      setError(
        `No se pudo eliminar la cotización: ${errorEliminar.message}`
      );
      return;
    }

    setCotizaciones((actuales) =>
      actuales.filter((item) => item.id !== cotizacion.id)
    );
  }

  if (cotizacionId !== null) {
    return (
      <DetalleCotizacion
        cotizacionId={cotizacionId}
        onVolver={() => {
          setCotizacionId(null);
          setCotizacionCreada(null);
          setRecargar((actual) => actual + 1);
        }}
      />
    );
  }

  if (mostrarFormulario) {
    return (
      <NuevaCotizacion
        onCancelar={() => setMostrarFormulario(false)}
        onGuardada={(cotizacion) => {
          setCotizacionCreada(cotizacion);
          setCotizacionId(cotizacion.id);
          setMostrarFormulario(false);
        }}
      />
    );
  }

  return (
    <main className="cotizaciones">
      <section className="cotizaciones-encabezado">
        <div>
          <p className="cotizaciones-etiqueta">GESTIÓN COMERCIAL</p>
          <h2>Cotizaciones</h2>
          <p className="cotizaciones-descripcion">
            Administra tus propuestas comerciales y realiza seguimiento
            a cada oportunidad de negocio.
          </p>
        </div>

        <button
          type="button"
          className="cotizaciones-boton-principal"
          onClick={() => setMostrarFormulario(true)}
        >
          + Nueva cotización
        </button>
      </section>

      {cotizacionCreada && (
        <p role="status">
          Borrador creado: {cotizacionCreada.numero}
        </p>
      )}

      {error && (
        <div className="cotizaciones-error" role="alert">
          {error}
          <button
            type="button"
            onClick={() => setRecargar((actual) => actual + 1)}
          >
            Reintentar
          </button>
        </div>
      )}

      <section className="cotizaciones-resumen">
        <article className="cotizaciones-tarjeta">
          <span>Total de cotizaciones</span>
          <strong>{cargando ? "…" : cotizaciones.length}</strong>
          <small>Registradas en el sistema</small>
        </article>

        <article className="cotizaciones-tarjeta">
          <span>Pendientes</span>
          <strong>{cargando ? "…" : totalPendientes}</strong>
          <small>Borradores y enviadas</small>
        </article>

        <article className="cotizaciones-tarjeta">
          <span>Aceptadas</span>
          <strong>{cargando ? "…" : totalAceptadas}</strong>
          <small>Valor aceptado o pagado: {cargando ? "…" : formatoMoneda(valorAceptado)}</small>
        </article>
      </section>

      <section className="cotizaciones-listado">
        <div className="cotizaciones-listado-encabezado">
          <div>
            <h3>Historial de cotizaciones</h3>
            <span>
              {cargando
                ? "Cargando registros…"
                : `${cotizacionesFiltradas.length} resultado(s)`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setRecargar((actual) => actual + 1)}
            disabled={cargando}
          >
            Actualizar
          </button>
        </div>

        <div className="cotizaciones-filtros">
          <input
            type="search"
            aria-label="Buscar cotización"
            placeholder="Buscar por número o cliente…"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />

          <select
            aria-label="Filtrar por estado"
            value={filtroEstado}
            onChange={(event) => setFiltroEstado(event.target.value)}
          >
            {estados.map((estado) => (
              <option key={estado.valor} value={estado.valor}>
                {estado.etiqueta}
              </option>
            ))}
          </select>
        </div>

        {cargando ? (
          <div className="cotizaciones-vacio">
            Cargando historial de cotizaciones…
          </div>
        ) : cotizacionesFiltradas.length === 0 ? (
          <div className="cotizaciones-vacio">
            <div className="cotizaciones-icono">⌕</div>
            <h3>
              {cotizaciones.length === 0
                ? "Todavía no hay cotizaciones"
                : "No encontramos resultados"}
            </h3>
            <p>
              {cotizaciones.length === 0
                ? "Cuando guardes una cotización, aparecerá aquí."
                : "Prueba con otro número, cliente o estado."}
            </p>
          </div>
        ) : (
          <div className="cotizaciones-tabla-contenedor">
            <table className="cotizaciones-tabla">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th>Total</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cotizacionesFiltradas.map((cotizacion) => (
                  <tr key={cotizacion.id}>
                    <td>{cotizacion.numero || "Sin número"}</td>
                    <td>{cotizacion.clienteNombre}</td>
                    <td>{formatoFecha(cotizacion.fecha)}</td>
                    <td>
                      <span
                        className={`cotizaciones-estado cotizaciones-estado-${cotizacion.estado}`}
                      >
                        {nombresEstado[cotizacion.estado] ||
                          cotizacion.estado ||
                          "Sin estado"}
                      </span>
                    </td>
                    <td>{formatoMoneda(cotizacion.total)}</td>
                    <td>
                      <div className="cotizaciones-acciones">
                        <button
                          type="button"
                          onClick={() => setCotizacionId(cotizacion.id)}
                        >
                          Ver detalle
                        </button>

                        <button
                          type="button"
                          className="cotizaciones-boton-eliminar"
                          onClick={() => eliminarCotizacion(cotizacion)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

export default Cotizaciones;