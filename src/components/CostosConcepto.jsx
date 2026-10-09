
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const tiposCosto = [
  { valor: "material", etiqueta: "Material" },
  { valor: "mano_obra", etiqueta: "Mano de obra" },
  { valor: "transporte", etiqueta: "Transporte" },
  { valor: "otro", etiqueta: "Otro gasto" },
];

const formularioInicial = {
  tipo: "material",
  descripcion: "",
  material_id: "",
  cantidad: "1",
  unidad: "unidad",
  costo_unitario: "0",
};

function monedaCOP(valor) {
  return Number(valor || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

function CostosConcepto({ itemId, onCostoActualizado }) {
  const [materiales, setMateriales] = useState([]);
  const [costos, setCostos] = useState([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editandoId, setEditandoId] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    cargarDatos();
  }, [itemId]);

  async function cargarDatos() {
    setCargando(true);
    setError("");

    const [respuestaMateriales, respuestaCostos] = await Promise.all([
      supabase
        .from("materiales")
        .select(
          "id, nombre, unidad, precio_compra, costo_adicional_unitario, costo_referencia"
        )
        .eq("activo", true)
        .order("nombre"),

      supabase
        .from("cotizacion_item_costos")
        .select("*")
        .eq("cotizacion_item_id", itemId)
        .order("id"),
    ]);

    if (respuestaMateriales.error || respuestaCostos.error) {
      console.error(
        "Error al cargar costos:",
        respuestaMateriales.error || respuestaCostos.error
      );
      setError("No se pudieron cargar los materiales o costos.");
      setCargando(false);
      return;
    }

    setMateriales(respuestaMateriales.data || []);
    setCostos(respuestaCostos.data || []);
    setCargando(false);
  }

  function actualizarCampo(evento) {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  }

  function seleccionarTipo(evento) {
    const tipo = evento.target.value;

    setFormulario({
      ...formularioInicial,
      tipo,
      unidad: tipo === "mano_obra" ? "hora" : "unidad",
    });

    setEditandoId(null);
    setError("");
    setMensaje("");
  }

  function seleccionarMaterial(evento) {
    const id = evento.target.value;
    const material = materiales.find(
      (item) => String(item.id) === id
    );

    setFormulario((actual) => ({
      ...actual,
      material_id: id,
      descripcion: material?.nombre || "",
      unidad: material?.unidad || actual.unidad,
      costo_unitario: material
        ? String(material.costo_referencia ?? material.precio_compra ?? 0)
        : actual.costo_unitario,
    }));
  }

  function editarCosto(costo) {
    setEditandoId(costo.id);
    setError("");
    setMensaje("");

    setFormulario({
      tipo: costo.tipo,
      descripcion: costo.tipo === "material"
        ? costo.material_nombre_snapshot || costo.descripcion
        : costo.descripcion,
      material_id: costo.material_id ? String(costo.material_id) : "",
      cantidad: String(costo.cantidad),
      unidad: costo.unidad,
      costo_unitario: String(costo.costo_unitario),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setFormulario(formularioInicial);
    setError("");
    setMensaje("");
  }

  async function actualizarCostoTotal() {
    const { data, error: errorLectura } = await supabase
      .from("cotizacion_item_costos")
      .select("costo_total")
      .eq("cotizacion_item_id", itemId);

    if (errorLectura) throw errorLectura;

    const costoTotal = (data || []).reduce(
      (suma, costo) => suma + Number(costo.costo_total || 0),
      0
    );

    const { error: errorActualizacion } = await supabase
      .from("cotizacion_items")
      .update({ costo_total_interno: costoTotal })
      .eq("id", itemId);

    if (errorActualizacion) throw errorActualizacion;

    onCostoActualizado?.(costoTotal);
    return costoTotal;
  }

  async function guardarCosto(evento) {
    evento.preventDefault();
    setError("");
    setMensaje("");

    const descripcion = formulario.descripcion.trim();
    const cantidad = Number(formulario.cantidad);
    const costoUnitario = Number(formulario.costo_unitario);

    if (!descripcion) {
      setError("Escribe una descripción para el costo.");
      return;
    }

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }

    if (!Number.isFinite(costoUnitario) || costoUnitario < 0) {
      setError("El costo unitario no puede ser negativo.");
      return;
    }

    const materialSeleccionado =
      formulario.tipo === "material" && formulario.material_id
        ? materiales.find(
            (item) => String(item.id) === formulario.material_id
          )
        : null;

    const registro = {
      cotizacion_item_id: itemId,
      tipo: formulario.tipo,
      descripcion,
      cantidad,
      unidad: formulario.unidad.trim() || "unidad",
      costo_unitario: costoUnitario,
      costo_total: cantidad * costoUnitario,
      material_id: materialSeleccionado
        ? materialSeleccionado.id
        : null,
      material_nombre_snapshot: materialSeleccionado
        ? materialSeleccionado.nombre
        : formulario.tipo === "material"
          ? descripcion
          : null,
      material_unidad_snapshot: materialSeleccionado
        ? materialSeleccionado.unidad
        : formulario.tipo === "material"
          ? formulario.unidad.trim() || "unidad"
          : null,
    };

    setGuardando(true);

    try {
      const respuesta = editandoId
        ? await supabase
            .from("cotizacion_item_costos")
            .update(registro)
            .eq("id", editandoId)
            .eq("cotizacion_item_id", itemId)
        : await supabase
            .from("cotizacion_item_costos")
            .insert(registro);

      if (respuesta.error) throw respuesta.error;

      await actualizarCostoTotal();
      await cargarDatos();

      setFormulario(formularioInicial);
      setEditandoId(null);
      setMensaje(
        editandoId ? "Costo actualizado correctamente." : "Costo agregado correctamente."
      );
    } catch (err) {
      console.error("Error al guardar el costo:", err);
      setError(
        err.message ||
          "No se pudo guardar el costo. Revisa la consola para más detalles."
      );
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarCosto(costo) {
    const confirmar = window.confirm(
      `¿Quieres eliminar el costo "${costo.descripcion}"?`
    );

    if (!confirmar) return;

    setError("");
    setMensaje("");

    const { error: errorEliminar } = await supabase
      .from("cotizacion_item_costos")
      .delete()
      .eq("id", costo.id)
      .eq("cotizacion_item_id", itemId);

    if (errorEliminar) {
      setError("No se pudo eliminar el costo.");
      return;
    }

    try {
      await actualizarCostoTotal();
      if (editandoId === costo.id) cancelarEdicion();
      await cargarDatos();
      setMensaje("Costo eliminado correctamente.");
    } catch (err) {
      console.error("Error al actualizar el costo total:", err);
      setError("El costo se eliminó, pero no se pudo actualizar el total del concepto.");
    }
  }

  const costoFormulario =
    Number(formulario.cantidad || 0) *
    Number(formulario.costo_unitario || 0);

  const costoTotal = costos.reduce(
    (suma, costo) => suma + Number(costo.costo_total || 0),
    0
  );

  if (cargando) {
    return <p>Cargando costos internos...</p>;
  }

  return (
    <section className="detalle-tarjeta">
      <h3>Costos internos del concepto</h3>
      <p>
        Registra los gastos necesarios para ejecutar esta actividad.
        Estos valores son internos y no deben mostrarse al cliente en la cotización.
      </p>

      <form onSubmit={guardarCosto}>
        <div className="nc-cuadricula">
          <div className="nc-campo">
            <label htmlFor={`costo-tipo-${itemId}`}>Tipo de costo</label>
            <select
              id={`costo-tipo-${itemId}`}
              value={formulario.tipo}
              onChange={seleccionarTipo}
            >
              {tiposCosto.map((tipo) => (
                <option key={tipo.valor} value={tipo.valor}>
                  {tipo.etiqueta}
                </option>
              ))}
            </select>
          </div>

          {formulario.tipo === "material" && (
            <div className="nc-campo">
              <label htmlFor={`costo-material-${itemId}`}>
                Material del catálogo (opcional)
              </label>
              <select
                id={`costo-material-${itemId}`}
                value={formulario.material_id}
                onChange={seleccionarMaterial}
              >
                <option value="">Registrar material manualmente</option>
                {materiales.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="nc-campo nc-campo-completo">
            <label htmlFor={`costo-descripcion-${itemId}`}>
              {formulario.tipo === "material"
                ? "Nombre del material"
                : "Descripción del costo"}
            </label>
            <input
              id={`costo-descripcion-${itemId}`}
              value={formulario.descripcion}
              name="descripcion"
              onChange={actualizarCampo}
              placeholder={
                formulario.tipo === "mano_obra"
                  ? "Ej. Instalación y configuración"
                  : formulario.tipo === "transporte"
                    ? "Ej. Desplazamiento al sitio"
                    : formulario.tipo === "otro"
                      ? "Ej. Alquiler de herramienta"
                      : "Ej. Cable UTP categoría 6"
              }
              required
            />
          </div>

          <div className="nc-campo">
            <label htmlFor={`costo-cantidad-${itemId}`}>Cantidad</label>
            <input
              id={`costo-cantidad-${itemId}`}
              type="number"
              name="cantidad"
              min="0.001"
              step="0.001"
              value={formulario.cantidad}
              onChange={actualizarCampo}
              required
            />
          </div>

          <div className="nc-campo">
            <label htmlFor={`costo-unidad-${itemId}`}>Unidad</label>
            <input
              id={`costo-unidad-${itemId}`}
              name="unidad"
              value={formulario.unidad}
              onChange={actualizarCampo}
              placeholder="unidad, metro, hora, día..."
              required
            />
          </div>

          <div className="nc-campo nc-campo-completo">
            <label htmlFor={`costo-precio-${itemId}`}>
              Costo unitario (COP)
            </label>
            <input
              id={`costo-precio-${itemId}`}
              type="number"
              name="costo_unitario"
              min="0"
              step="1"
              value={formulario.costo_unitario}
              onChange={actualizarCampo}
              required
            />
          </div>
        </div>

        <p style={{ margin: "16px 0" }}>
          Total de este registro: <strong>{monedaCOP(costoFormulario)}</strong>
        </p>

        {error && <p className="nc-error" role="alert">{error}</p>}
        {mensaje && <p role="status">{mensaje}</p>}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="submit"
            className="nc-boton nc-boton-principal"
            disabled={guardando}
          >
            {guardando
              ? "Guardando..."
              : editandoId
                ? "Guardar cambios"
                : "Agregar costo"}
          </button>

          {editandoId && (
            <button
              type="button"
              className="nc-boton nc-boton-secundario"
              onClick={cancelarEdicion}
              disabled={guardando}
            >
              Cancelar edición
            </button>
          )}
        </div>
      </form>

      <hr style={{ margin: "24px 0", border: 0, borderTop: "1px solid #e5e9ef" }} />

      <h3>Desglose de costos</h3>

      {costos.length === 0 ? (
        <p>Aún no se han registrado costos para este concepto.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "10px" }}>Tipo</th>
                <th style={{ textAlign: "left", padding: "10px" }}>Descripción</th>
                <th style={{ textAlign: "right", padding: "10px" }}>Cantidad</th>
                <th style={{ textAlign: "right", padding: "10px" }}>Costo unitario</th>
                <th style={{ textAlign: "right", padding: "10px" }}>Total</th>
                <th style={{ padding: "10px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {costos.map((costo) => (
                <tr key={costo.id}>
                  <td style={{ padding: "10px" }}>
                    {tiposCosto.find((tipo) => tipo.valor === costo.tipo)?.etiqueta || costo.tipo}
                  </td>
                  <td style={{ padding: "10px" }}>{costo.descripcion}</td>
                  <td style={{ textAlign: "right", padding: "10px" }}>
                    {costo.cantidad} {costo.unidad}
                  </td>
                  <td style={{ textAlign: "right", padding: "10px" }}>
                    {monedaCOP(costo.costo_unitario)}
                  </td>
                  <td style={{ textAlign: "right", padding: "10px" }}>
                    {monedaCOP(costo.costo_total)}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        type="button"
                        className="nc-boton nc-boton-secundario"
                        onClick={() => editarCosto(costo)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="nc-boton nc-boton-secundario"
                        onClick={() => eliminarCosto(costo)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="4" style={{ textAlign: "right", padding: "12px", fontWeight: "bold" }}>
                  Costo interno total
                </td>
                <td style={{ textAlign: "right", padding: "12px", fontWeight: "bold" }}>
                  {monedaCOP(costoTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

export default CostosConcepto;