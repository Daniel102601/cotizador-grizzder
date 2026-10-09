
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import CostosConcepto from "./CostosConcepto";

function formatearCOP(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

// Calcula el precio de venta según el margen sobre el precio de venta.
function calcularPrecioSugerido(costo, margen) {
  const costoNumerico = Number(costo || 0);
  const margenNumerico = Number(margen);

  if (
    !Number.isFinite(costoNumerico) ||
    !Number.isFinite(margenNumerico) ||
    costoNumerico < 0 ||
    margenNumerico < 0 ||
    margenNumerico >= 100
  ) {
    return null;
  }

  return Math.ceil(costoNumerico / (1 - margenNumerico / 100));
}

function ConceptosCotizacion({
  cotizacionId,
  onTotalesActualizados,
}) {
  const [servicios, setServicios] = useState([]);
  const [conceptos, setConceptos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [conceptoCostosId, setConceptoCostosId] = useState(null);
  const [margenGlobal, setMargenGlobal] = useState(30);
  const [aplicandoPrecioId, setAplicandoPrecioId] = useState(null);
  const [conceptoEditandoId, setConceptoEditandoId] = useState(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [formularioEdicion, setFormularioEdicion] = useState({
    concepto: "",
    descripcion: "",
    cantidad: "1",
    precio_unitario: "0",
  });

  const [formulario, setFormulario] = useState({
    servicio_id: "",
    concepto: "",
    descripcion: "",
    cantidad: "1",
    precio_unitario: "0",
  });

  // Carga los servicios, conceptos y margen de la cotización.
  async function cargarDatos() {
    setCargando(true);
    setError("");

    try {
      const [
        respuestaServicios,
        respuestaConceptos,
        respuestaCotizacion,
      ] = await Promise.all([
        supabase
          .from("servicios")
          .select("id, nombre, categoria, descripcion, precio")
          .eq("activo", true)
          .order("nombre"),

        supabase
          .from("cotizacion_items")
          .select("*")
          .eq("cotizacion_id", cotizacionId)
          .order("id"),

        supabase
          .from("cotizaciones")
          .select("margen_objetivo")
          .eq("id", cotizacionId)
          .single(),
      ]);

      if (
        respuestaServicios.error ||
        respuestaConceptos.error ||
        respuestaCotizacion.error
      ) {
        console.error(
          "Error al cargar los datos:",
          respuestaServicios.error ||
            respuestaConceptos.error ||
            respuestaCotizacion.error
        );

        setError("No se pudieron cargar los datos de la cotización.");
        return;
      }

      setServicios(respuestaServicios.data ?? []);
      setConceptos(respuestaConceptos.data ?? []);

      setMargenGlobal(
        Number(respuestaCotizacion.data.margen_objetivo ?? 30)
      );
    } catch (errorCarga) {
      console.error("Error inesperado al cargar:", errorCarga);
      setError("Ocurrió un error al cargar los datos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarDatos();
  }, [cotizacionId]);

  function actualizarCampo(evento) {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  }

  function seleccionarServicio(evento) {
    const id = evento.target.value;
    const servicio = servicios.find(
      (item) => String(item.id) === id
    );

    setFormulario((actual) => ({
      ...actual,
      servicio_id: id,
      concepto: servicio?.nombre ?? "",
      descripcion: servicio?.descripcion ?? "",
      precio_unitario: servicio
        ? String(servicio.precio ?? 0)
        : "0",
    }));
  }

  // Prepara un concepto existente para editarlo.
  function iniciarEdicion(item) {
    setError("");
    setConceptoEditandoId(item.id);
    setFormularioEdicion({
      concepto: item.concepto ?? "",
      descripcion: item.descripcion ?? "",
      cantidad: String(item.cantidad ?? 1),
      precio_unitario: String(item.precio_unitario ?? 0),
    });
  }

  function actualizarCampoEdicion(evento) {
    const { name, value } = evento.target;
    setFormularioEdicion((actual) => ({ ...actual, [name]: value }));
  }

  function cancelarEdicion() {
    setConceptoEditandoId(null);
    setFormularioEdicion({
      concepto: "",
      descripcion: "",
      cantidad: "1",
      precio_unitario: "0",
    });
    setError("");
  }

  // Guarda cambios sin modificar ni eliminar los costos internos del concepto.
  async function guardarEdicion(evento) {
    evento.preventDefault();
    setError("");

    const original = conceptos.find(
      (item) => item.id === conceptoEditandoId
    );
    const nombre = formularioEdicion.concepto.trim();
    const cantidad = Number(formularioEdicion.cantidad);
    const precio = Number(formularioEdicion.precio_unitario);

    if (!original) {
      setError("No se encontró el concepto que deseas editar.");
      return;
    }
    if (!nombre) {
      setError("El nombre del concepto es obligatorio.");
      return;
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }
    if (!Number.isFinite(precio) || precio < 0) {
      setError("El precio unitario no puede ser negativo.");
      return;
    }

    setGuardandoEdicion(true);
    try {
      const precioCambio = precio !== Number(original.precio_unitario);
      const { error: errorEdicion } = await supabase
        .from("cotizacion_items")
        .update({
          concepto: nombre,
          descripcion: formularioEdicion.descripcion.trim() || null,
          cantidad,
          precio_unitario: precio,
          total: cantidad * precio,
          ...(precioCambio ? { precio_editado_manualmente: true } : {}),
        })
        .eq("id", original.id)
        .eq("cotizacion_id", cotizacionId);

      if (errorEdicion) {
        console.error("Error al editar el concepto:", errorEdicion);
        setError("No se pudieron guardar los cambios del concepto.");
        return;
      }

      await actualizarTotales();
      cancelarEdicion();
      await cargarDatos();
    } catch (errorEdicion) {
      console.error("Error al actualizar el concepto:", errorEdicion);
      setError("El concepto se actualizó, pero no se pudieron recalcular los totales.");
      await cargarDatos();
    } finally {
      setGuardandoEdicion(false);
    }
  }

  // Recalcula los totales de todos los conceptos de la cotización.
  async function actualizarTotales() {
    const { data, error: errorLectura } = await supabase
      .from("cotizacion_items")
      .select("total, descuento")
      .eq("cotizacion_id", cotizacionId);

    if (errorLectura) {
      throw errorLectura;
    }

    const subtotal = data.reduce(
      (suma, item) => suma + Number(item.total || 0),
      0
    );

    const descuento = data.reduce(
      (suma, item) => suma + Number(item.descuento || 0),
      0
    );

    const total = subtotal - descuento;

    const { error: errorActualizacion } = await supabase
      .from("cotizaciones")
      .update({
        subtotal,
        descuento,
        total,
      })
      .eq("id", cotizacionId);

    if (errorActualizacion) {
      throw errorActualizacion;
    }

    onTotalesActualizados?.({
      subtotal,
      descuento,
      total,
    });

    return { subtotal, descuento, total };
  }

  // Agrega un nuevo concepto.
  async function guardarConcepto(evento) {
    evento.preventDefault();
    setError("");

    const cantidad = Number(formulario.cantidad);
    const precio = Number(formulario.precio_unitario);
    const nombre = formulario.concepto.trim();

    if (!nombre) {
      setError("Escribe el nombre del concepto.");
      return;
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }

    if (!Number.isFinite(precio) || precio < 0) {
      setError("El precio unitario no puede ser negativo.");
      return;
    }

    setGuardando(true);

    try {
      const nuevoConcepto = {
        cotizacion_id: cotizacionId,
        servicio_id: formulario.servicio_id
          ? Number(formulario.servicio_id)
          : null,
        concepto: nombre,
        descripcion: formulario.descripcion.trim() || null,
        cantidad,
        precio_unitario: precio,
        descuento: 0,
        total: cantidad * precio,
        tipo_calculo: "simple",
        margen_objetivo: null,
        costo_total_interno: 0,
        precio_sugerido: precio,
        precio_editado_manualmente: true,
      };

      const { error: errorGuardado } = await supabase
        .from("cotizacion_items")
        .insert(nuevoConcepto);

      if (errorGuardado) {
        console.error("Error al guardar concepto:", errorGuardado);
        setError("No se pudo guardar el concepto.");
        return;
      }

      await actualizarTotales();

      setFormulario({
        servicio_id: "",
        concepto: "",
        descripcion: "",
        cantidad: "1",
        precio_unitario: "0",
      });

      await cargarDatos();
    } catch (errorGuardado) {
      console.error("Error al guardar o actualizar:", errorGuardado);
      setError(
        "El concepto pudo guardarse, pero ocurrió un error al actualizar los totales. Verifica la cotización."
      );
      await cargarDatos();
    } finally {
      setGuardando(false);
    }
  }

  // Elimina un concepto y actualiza los totales.
  async function eliminarConcepto(id) {
    const confirmar = window.confirm(
      "¿Quieres eliminar este concepto de la cotización?"
    );

    if (!confirmar) return;

    setError("");

    try {
      const { error: errorEliminar } = await supabase
        .from("cotizacion_items")
        .delete()
        .eq("id", id)
        .eq("cotizacion_id", cotizacionId);

      if (errorEliminar) {
        console.error("Error al eliminar:", errorEliminar);
        setError("No se pudo eliminar el concepto.");
        return;
      }

      if (conceptoCostosId === id) {
        setConceptoCostosId(null);
      }

      await actualizarTotales();
      await cargarDatos();
    } catch (errorEliminar) {
      console.error("Error al actualizar después de eliminar:", errorEliminar);
      setError(
        "El concepto se eliminó, pero hubo un error al actualizar los totales."
      );
      await cargarDatos();
    }
  }

  // Aplica al concepto el precio sugerido a partir de su costo y margen.
  async function aplicarPrecioSugerido(item) {
    setError("");

    const costo = Number(item.costo_total_interno || 0);
    const margen = Number(item.margen_objetivo ?? margenGlobal);

    if (costo <= 0) {
      setError(
        `Registra primero los costos internos de "${item.concepto}".`
      );
      return;
    }

    const precioSugerido = calcularPrecioSugerido(costo, margen);

    if (precioSugerido === null) {
      setError(
        `El margen de "${item.concepto}" debe ser igual o mayor que 0 % y menor que 100 %.`
      );
      return;
    }

    setAplicandoPrecioId(item.id);

    try {
      const cantidad = Number(item.cantidad || 0);

      const { error: errorPrecio } = await supabase
        .from("cotizacion_items")
        .update({
          precio_unitario: precioSugerido,
          precio_sugerido: precioSugerido,
          precio_editado_manualmente: false,
          total: cantidad * precioSugerido,
        })
        .eq("id", item.id)
        .eq("cotizacion_id", cotizacionId);

      if (errorPrecio) {
        console.error("Error al aplicar el precio:", errorPrecio);
        setError("No se pudo aplicar el precio sugerido.");
        return;
      }

      await actualizarTotales();
      await cargarDatos();
    } catch (errorPrecio) {
      console.error("Error al actualizar el precio:", errorPrecio);
      setError(
        "El precio pudo actualizarse, pero hubo un error al recalcular los totales."
      );
      await cargarDatos();
    } finally {
      setAplicandoPrecioId(null);
    }
  }

  if (cargando) {
    return <p>Cargando conceptos...</p>;
  }

  return (
    <section className="detalle-tarjeta">
      <h3>Conceptos de la cotización</h3>

      <p>
        Margen global de referencia:{" "}
        <strong>{margenGlobal}%</strong>
      </p>

      <form onSubmit={guardarConcepto}>
        <div className="nc-cuadricula">
          <div className="nc-campo nc-campo-completo">
            <label htmlFor="cc-servicio">
              Servicio del catálogo (opcional)
            </label>

            <select
              id="cc-servicio"
              value={formulario.servicio_id}
              onChange={seleccionarServicio}
            >
              <option value="">Concepto personalizado</option>

              {servicios.map((servicio) => (
                <option key={servicio.id} value={servicio.id}>
                  {servicio.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="nc-campo nc-campo-completo">
            <label htmlFor="cc-concepto">
              Nombre del concepto
            </label>

            <input
              id="cc-concepto"
              name="concepto"
              value={formulario.concepto}
              onChange={actualizarCampo}
              placeholder="Ej. Instalación de cámaras"
              required
            />
          </div>

          <div className="nc-campo nc-campo-completo">
            <label htmlFor="cc-descripcion">Descripción</label>

            <textarea
              id="cc-descripcion"
              name="descripcion"
              value={formulario.descripcion}
              onChange={actualizarCampo}
              rows="2"
              placeholder="Detalles del trabajo..."
            />
          </div>

          <div className="nc-campo">
            <label htmlFor="cc-cantidad">Cantidad</label>

            <input
              id="cc-cantidad"
              name="cantidad"
              type="number"
              min="0.001"
              step="0.001"
              value={formulario.cantidad}
              onChange={actualizarCampo}
              required
            />
          </div>

          <div className="nc-campo">
            <label htmlFor="cc-precio">
              Precio unitario (COP)
            </label>

            <input
              id="cc-precio"
              name="precio_unitario"
              type="number"
              min="0"
              step="1"
              value={formulario.precio_unitario}
              onChange={actualizarCampo}
              required
            />
          </div>
        </div>

        <p style={{ margin: "18px 0" }}>
          Total del concepto:{" "}
          <strong>
            {formatearCOP(
              Number(formulario.cantidad || 0) *
                Number(formulario.precio_unitario || 0)
            )}
          </strong>
        </p>

        {error && (
          <p className="nc-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="nc-boton nc-boton-principal"
          disabled={guardando}
        >
          {guardando ? "Guardando..." : "Agregar concepto"}
        </button>
      </form>

      <hr
        style={{
          margin: "24px 0",
          border: 0,
          borderTop: "1px solid #e5e9ef",
        }}
      />

      <h3>Conceptos agregados</h3>

      {conceptoEditandoId !== null && (
        <form onSubmit={guardarEdicion} className="nc-formulario-edicion" style={{ margin: "16px 0 24px", padding: "16px", border: "1px solid #dbe2ea", borderRadius: "10px" }}>
          <h4 style={{ marginTop: 0 }}>Editar concepto</h4>
          <div className="nc-cuadricula">
            <div className="nc-campo nc-campo-completo">
              <label htmlFor="cc-editar-concepto">Nombre del concepto</label>
              <input id="cc-editar-concepto" name="concepto" value={formularioEdicion.concepto} onChange={actualizarCampoEdicion} required />
            </div>
            <div className="nc-campo nc-campo-completo">
              <label htmlFor="cc-editar-descripcion">Descripción</label>
              <textarea id="cc-editar-descripcion" name="descripcion" rows="2" value={formularioEdicion.descripcion} onChange={actualizarCampoEdicion} />
            </div>
            <div className="nc-campo">
              <label htmlFor="cc-editar-cantidad">Cantidad</label>
              <input id="cc-editar-cantidad" name="cantidad" type="number" min="0.001" step="0.001" value={formularioEdicion.cantidad} onChange={actualizarCampoEdicion} required />
            </div>
            <div className="nc-campo">
              <label htmlFor="cc-editar-precio">Precio unitario (COP)</label>
              <input id="cc-editar-precio" name="precio_unitario" type="number" min="0" step="1" value={formularioEdicion.precio_unitario} onChange={actualizarCampoEdicion} required />
            </div>
          </div>
          <p style={{ margin: "14px 0" }}>Total actualizado: <strong>{formatearCOP(Number(formularioEdicion.cantidad || 0) * Number(formularioEdicion.precio_unitario || 0))}</strong></p>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button type="submit" className="nc-boton nc-boton-principal" disabled={guardandoEdicion}>
              {guardandoEdicion ? "Guardando..." : "Guardar cambios"}
            </button>
            <button type="button" className="nc-boton nc-boton-secundario" onClick={cancelarEdicion} disabled={guardandoEdicion}>Cancelar</button>
          </div>
        </form>
      )}

      {conceptos.length === 0 ? (
        <p>Aún no has agregado conceptos a esta cotización.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px" }}>
                  Concepto
                </th>

                <th style={{ textAlign: "right", padding: "10px" }}>
                  Cantidad
                </th>

                <th style={{ textAlign: "right", padding: "10px" }}>
                  Costo interno
                </th>

                <th style={{ textAlign: "right", padding: "10px" }}>
                  Precio sugerido
                </th>

                <th style={{ textAlign: "right", padding: "10px" }}>
                  Precio unitario
                </th>

                <th style={{ textAlign: "right", padding: "10px" }}>
                  Total
                </th>

                <th style={{ padding: "10px" }}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {conceptos.map((item) => {
                const costo = Number(item.costo_total_interno || 0);
                const margen = Number(
                  item.margen_objetivo ?? margenGlobal
                );

                const precioSugerido = calcularPrecioSugerido(
                  costo,
                  margen
                );

                return (
                  <tr key={item.id}>
                    <td style={{ padding: "10px" }}>
                      <strong>{item.concepto}</strong>

                      {item.descripcion && (
                        <div>{item.descripcion}</div>
                      )}
                    </td>

                    <td
                      style={{
                        textAlign: "right",
                        padding: "10px",
                      }}
                    >
                      {item.cantidad}
                    </td>

                    <td
                      style={{
                        textAlign: "right",
                        padding: "10px",
                      }}
                    >
                      {formatearCOP(costo)}
                    </td>

                    <td
                      style={{
                        textAlign: "right",
                        padding: "10px",
                      }}
                    >
                      {costo <= 0 || precioSugerido === null
                        ? "Registra costos"
                        : formatearCOP(precioSugerido)}
                    </td>

                    <td
                      style={{
                        textAlign: "right",
                        padding: "10px",
                      }}
                    >
                      {formatearCOP(item.precio_unitario)}
                    </td>

                    <td
                      style={{
                        textAlign: "right",
                        padding: "10px",
                      }}
                    >
                      {formatearCOP(item.total)}
                    </td>

                    <td style={{ padding: "10px" }}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          minWidth: "160px",
                        }}
                      >
                        <button
                          type="button"
                          className="nc-boton nc-boton-secundario"
                          onClick={() => iniciarEdicion(item)}
                        >
                          Editar concepto
                        </button>

                        <button
                          type="button"
                          className="nc-boton nc-boton-secundario"
                          onClick={() =>
                            setConceptoCostosId((actual) =>
                              actual === item.id ? null : item.id
                            )
                          }
                        >
                          {conceptoCostosId === item.id
                            ? "Cerrar costos"
                            : "Gestionar costos"}
                        </button>

                        <button
                          type="button"
                          className="nc-boton nc-boton-principal"
                          disabled={
                            costo <= 0 ||
                            precioSugerido === null ||
                            aplicandoPrecioId === item.id
                          }
                          onClick={() => aplicarPrecioSugerido(item)}
                        >
                          {aplicandoPrecioId === item.id
                            ? "Aplicando..."
                            : "Aplicar precio sugerido"}
                        </button>

                        <button
                          type="button"
                          className="nc-boton nc-boton-secundario"
                          onClick={() => eliminarConcepto(item.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {conceptoCostosId !== null && (
            <CostosConcepto
              key={conceptoCostosId}
              itemId={conceptoCostosId}
              onCostoActualizado={() => cargarDatos()}
            />
          )}
        </div>
      )}
    </section>
  );
}

export default ConceptosCotizacion;