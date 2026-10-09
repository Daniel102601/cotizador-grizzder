
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "./DetalleCotizacion.css";
import ConceptosCotizacion from "./ConceptosCotizacion";
import { generarPDFCotizacion } from "../utils/generarPDFCotizacion";

function formatearFecha(fecha) {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

function formatearCOP(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function DetalleCotizacion({ cotizacionId, onVolver }) {
  const [cotizacion, setCotizacion] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const [formulario, setFormulario] = useState({
    cliente_id: "",
    fecha: "",
    margen_objetivo: "30",
    modo_presentacion: "global",
    garantia: "",
    tiempo_entrega: "",
    observaciones: "",
  });

  useEffect(() => {
    let activa = true;

    async function cargarCotizacion() {
      setCargando(true);
      setError("");

      const [
        respuestaCotizacion,
        respuestaClientes,
      ] = await Promise.all([
        supabase
          .from("cotizaciones")
          .select("*")
          .eq("id", cotizacionId)
          .maybeSingle(),

        supabase
          .from("clientes")
          .select("id, nombre, documento, telefono, correo")
          .order("nombre"),
      ]);

      if (!activa) return;

      if (respuestaCotizacion.error || !respuestaCotizacion.data) {
        setError("No se pudo cargar la cotización.");
        setCargando(false);
        return;
      }

      if (respuestaClientes.error) {
        setError("No se pudo cargar la lista de clientes.");
        setCargando(false);
        return;
      }

      const datos = respuestaCotizacion.data;
      const listaClientes = respuestaClientes.data ?? [];

      setCotizacion(datos);
      setClientes(listaClientes);
      setCliente(
        listaClientes.find(
          (item) => String(item.id) === String(datos.cliente_id)
        ) ?? null
      );

      setFormulario({
        cliente_id: datos.cliente_id
          ? String(datos.cliente_id)
          : "",
        fecha: datos.fecha ?? "",
        margen_objetivo: String(datos.margen_objetivo ?? 30),
        modo_presentacion: datos.modo_presentacion ?? "global",
        garantia: datos.garantia ?? "",
        tiempo_entrega: datos.tiempo_entrega ?? "",
        observaciones: datos.observaciones ?? "",
      });

      setCargando(false);
    }

    cargarCotizacion();

    return () => {
      activa = false;
    };
  }, [cotizacionId]);

  function actualizarCampo(evento) {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  }

  function iniciarEdicion() {
    setError("");
    setMensaje("");

    setFormulario({
      cliente_id: cotizacion.cliente_id
        ? String(cotizacion.cliente_id)
        : "",
      fecha: cotizacion.fecha ?? "",
      margen_objetivo: String(cotizacion.margen_objetivo ?? 30),
      modo_presentacion: cotizacion.modo_presentacion ?? "global",
      garantia: cotizacion.garantia ?? "",
      tiempo_entrega: cotizacion.tiempo_entrega ?? "",
      observaciones: cotizacion.observaciones ?? "",
    });

    setEditando(true);
  }

  async function guardarCambios(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    const margen = Number(formulario.margen_objetivo);

    if (
      !Number.isFinite(margen) ||
      margen < 0 ||
      margen >= 100
    ) {
      setError("El margen debe estar entre 0 % y menos de 100 %.");
      return;
    }

    if (!formulario.fecha) {
      setError("Selecciona la fecha de la cotización.");
      return;
    }

    if (
      !["global", "desglosada"].includes(
        formulario.modo_presentacion
      )
    ) {
      setError("Selecciona un modo de presentación válido.");
      return;
    }

    setGuardando(true);

    const cambios = {
      cliente_id: formulario.cliente_id
        ? Number(formulario.cliente_id)
        : null,
      fecha: formulario.fecha,
      margen_objetivo: margen,
      modo_presentacion: formulario.modo_presentacion,
      garantia: formulario.garantia.trim() || null,
      tiempo_entrega: formulario.tiempo_entrega.trim() || null,
      observaciones: formulario.observaciones.trim() || null,
    };

    const { data, error: errorGuardado } = await supabase
      .from("cotizaciones")
      .update(cambios)
      .eq("id", cotizacionId)
      .select("*")
      .maybeSingle();

    setGuardando(false);

    if (errorGuardado || !data) {
      console.error(
        "Error al actualizar la cotización:",
        errorGuardado
      );
      setError("No se pudieron guardar los cambios.");
      return;
    }

    setCotizacion((actual) => ({
      ...actual,
      ...data,
    }));

    setCliente(
      clientes.find(
        (item) => String(item.id) === String(data.cliente_id)
      ) ?? null
    );

    setEditando(false);
    setMensaje("Los cambios se guardaron correctamente.");
  }

  
    async function descargarPDF() {
      setGenerandoPDF(true);
      setError("");
      setMensaje("");

      try {
        await generarPDFCotizacion(cotizacionId);
        setMensaje("PDF generado correctamente.");
      } catch (errorPDF) {
        console.error("Error al generar PDF:", errorPDF);
        setError(
          "No se pudo generar el PDF. Revisa la consola del navegador."
        );
      } finally {
        setGenerandoPDF(false);
      }
    }


  if (cargando) {
    return <p className="detalle-cargando">Cargando cotización...</p>;
  }

  if (!cotizacion) {
    return (
      <main className="detalle-cotizacion">
        <p className="detalle-error" role="alert">
          {error || "No se encontró la cotización solicitada."}
        </p>

        <button
          type="button"
          className="detalle-boton detalle-boton-secundario"
          onClick={onVolver}
        >
          Volver a cotizaciones
        </button>
      </main>
    );
  }

  return (
    <main className="detalle-cotizacion">
      <div className="detalle-encabezado">
        <div>
          <p className="detalle-etiqueta">GESTIÓN COMERCIAL</p>
          <h2>{cotizacion.numero}</h2>
          <p className="detalle-descripcion">
            Detalle de la propuesta comercial.
          </p>
        </div>

        <button
          type="button"
          className="detalle-boton detalle-boton-secundario"
          onClick={onVolver}
        >
          Volver al listado
        </button>

          <button
            type="button"
            className="detalle-boton detalle-boton-principal"
            onClick={descargarPDF}
            disabled={generandoPDF}
          >
            {generandoPDF ? "Generando PDF..." : "Generar PDF"}
          </button>



      </div>

      {error && (
        <p className="detalle-error" role="alert">
          {error}
        </p>
      )}

      {mensaje && (
        <p className="detalle-aviso" role="status">
          {mensaje}
        </p>
      )}

      <section className="detalle-tarjeta">
        <div className="detalle-tarjeta-encabezado">
          <h3>Información general</h3>
          <span className={`detalle-estado estado-${cotizacion.estado}`}>
            {cotizacion.estado}
          </span>
        </div>

        <div className="detalle-datos">
          <div>
            <span>Número</span>
            <strong>{cotizacion.numero}</strong>
          </div>

          <div>
            <span>Fecha</span>
            <strong>{formatearFecha(cotizacion.fecha)}</strong>
          </div>

          <div>
            <span>Cliente</span>
            <strong>{cliente?.nombre || "Cliente no disponible"}</strong>
          </div>

          {cliente?.documento && (
            <div>
              <span>Documento</span>
              <strong>{cliente.documento}</strong>
            </div>
          )}

          {cliente?.telefono && (
            <div>
              <span>Teléfono</span>
              <strong>{cliente.telefono}</strong>
            </div>
          )}

          {cliente?.correo && (
            <div>
              <span>Correo electrónico</span>
              <strong>{cliente.correo}</strong>
            </div>
          )}
        </div>
      </section>

      <section className="detalle-tarjeta">
        <div className="detalle-tarjeta-encabezado">
          <h3>Configuración comercial</h3>

          {!editando && (
            <button
              type="button"
              className="detalle-boton detalle-boton-principal"
              onClick={iniciarEdicion}
            >
              Editar cotización
            </button>
          )}
        </div>

        {editando ? (
          <form onSubmit={guardarCambios}>
            <div className="detalle-formulario">
              <div className="detalle-campo">
                <label htmlFor="editor-cliente">Cliente</label>

                <select
                  id="editor-cliente"
                  name="cliente_id"
                  value={formulario.cliente_id}
                  onChange={actualizarCampo}
                >
                  <option value="">Sin cliente asociado</option>

                  {clientes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                      {item.documento ? ` — ${item.documento}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="detalle-campo">
                <label htmlFor="editor-fecha">Fecha</label>

                <input
                  id="editor-fecha"
                  type="date"
                  name="fecha"
                  value={formulario.fecha}
                  onChange={actualizarCampo}
                  required
                />
              </div>

              <div className="detalle-campo">
                <label htmlFor="editor-margen">
                  Margen objetivo global (%)
                </label>

                <input
                  id="editor-margen"
                  type="number"
                  name="margen_objetivo"
                  min="0"
                  max="99.99"
                  step="0.01"
                  value={formulario.margen_objetivo}
                  onChange={actualizarCampo}
                  required
                />
              </div>

              <div className="detalle-campo">
                <label htmlFor="editor-presentacion">
                  Modo de presentación
                </label>

                <select
                  id="editor-presentacion"
                  name="modo_presentacion"
                  value={formulario.modo_presentacion}
                  onChange={actualizarCampo}
                >
                  <option value="global">Precio global</option>
                  <option value="desglosada">
                    Desglose comercial
                  </option>
                </select>
              </div>

              <div className="detalle-campo">
                <label htmlFor="editor-garantia">Garantía</label>

                <input
                  id="editor-garantia"
                  name="garantia"
                  value={formulario.garantia}
                  onChange={actualizarCampo}
                  placeholder="Ej. 6 meses"
                />
              </div>

              <div className="detalle-campo">
                <label htmlFor="editor-entrega">
                  Tiempo de entrega
                </label>

                <input
                  id="editor-entrega"
                  name="tiempo_entrega"
                  value={formulario.tiempo_entrega}
                  onChange={actualizarCampo}
                  placeholder="Ej. 5 días hábiles"
                />
              </div>

              <div className="detalle-campo detalle-campo-completo">
                <label htmlFor="editor-observaciones">
                  Observaciones
                </label>

                <textarea
                  id="editor-observaciones"
                  name="observaciones"
                  value={formulario.observaciones}
                  onChange={actualizarCampo}
                  rows="4"
                  placeholder="Condiciones adicionales de la cotización..."
                />
              </div>
            </div>

            {error && (
              <p className="detalle-error" role="alert">
                {error}
              </p>
            )}

            <div className="detalle-acciones-editor">
              <button
                type="submit"
                className="detalle-boton detalle-boton-principal"
                disabled={guardando}
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                className="detalle-boton detalle-boton-secundario"
                disabled={guardando}
                onClick={() => {
                  setEditando(false);
                  setError("");
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="detalle-datos">
              <div>
                <span>Margen objetivo global</span>
                <strong>
                  {Number(cotizacion.margen_objetivo ?? 30).toLocaleString(
                    "es-CO"
                  )}
                  %
                </strong>
              </div>

              <div>
                <span>Presentación</span>
                <strong>
                  {cotizacion.modo_presentacion === "desglosada"
                    ? "Desglose comercial"
                    : "Precio global"}
                </strong>
              </div>

              <div>
                <span>Garantía</span>
                <strong>{cotizacion.garantia || "Sin especificar"}</strong>
              </div>

              <div>
                <span>Tiempo de entrega</span>
                <strong>
                  {cotizacion.tiempo_entrega || "Sin especificar"}
                </strong>
              </div>
            </div>

            {cotizacion.observaciones && (
              <div className="detalle-observaciones">
                <span>Observaciones</span>
                <p>{cotizacion.observaciones}</p>
              </div>
            )}
          </>
        )}
      </section>

      <ConceptosCotizacion
        cotizacionId={cotizacion.id}
        onTotalesActualizados={(totales) => {
          setCotizacion((actual) => ({
            ...actual,
            ...totales,
          }));
        }}
      />

      <section className="detalle-tarjeta detalle-totales">
        <div>
          <span>Subtotal</span>
          <strong>{formatearCOP(cotizacion.subtotal)}</strong>
        </div>

        <div className="detalle-total-final">
          <span>Total</span>
          <strong>{formatearCOP(cotizacion.total)}</strong>
        </div>
      </section>
    </main>
  );
}

export default DetalleCotizacion;