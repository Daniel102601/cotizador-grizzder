
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import "./NuevaCotizacion.css";

function obtenerFechaLocal() {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function generarNumeroCotizacion() {
  const fecha = obtenerFechaLocal().replaceAll("-", "");
  const sufijo = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `COT-${fecha}-${sufijo}`;
}

function NuevaCotizacion({ onCancelar, onGuardada }) {
  const [clientes, setClientes] = useState([]);
  const [cargandoClientes, setCargandoClientes] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const [formulario, setFormulario] = useState({
    cliente_id: "",
    fecha: obtenerFechaLocal(),
    margen_objetivo: "30",
    modo_presentacion: "global",
    garantia: "",
    tiempo_entrega: "",
    observaciones: "",
  });

  const [numero] = useState(generarNumeroCotizacion);

  useEffect(() => {
    async function cargarClientes() {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nombre")
        .order("nombre", { ascending: true });

      if (error) {
        setError("No se pudieron cargar los clientes.");
      } else {
        setClientes(data ?? []);
      }

      setCargandoClientes(false);
    }

    cargarClientes();
  }, []);

  function actualizarCampo(evento) {
    const { name, value } = evento.target;

    setFormulario((actual) => ({
      ...actual,
      [name]: value,
    }));
  }

  async function guardarCotizacion(evento) {
    evento.preventDefault();
    setError("");

    const margen = Number(formulario.margen_objetivo);

    if (!formulario.cliente_id) {
      setError("Selecciona un cliente para continuar.");
      return;
    }

    if (!Number.isFinite(margen) || margen < 0 || margen >= 100) {
      setError("El margen debe ser igual o mayor a 0 % y menor a 100 %.");
      return;
    }

    setGuardando(true);

    const nuevaCotizacion = {
      numero,
      cliente_id: Number(formulario.cliente_id),
      fecha: formulario.fecha,
      estado: "borrador",
      margen_objetivo: margen,
      modo_presentacion: formulario.modo_presentacion,
      garantia: formulario.garantia.trim() || null,
      tiempo_entrega: formulario.tiempo_entrega.trim() || null,
      observaciones: formulario.observaciones.trim() || null,
      subtotal: 0,
      descuento: 0,
      total: 0,
    };

    const { data, error } = await supabase
      .from("cotizaciones")
      .insert(nuevaCotizacion)
      .select("id, numero")
      .single();

    setGuardando(false);

    if (error) {
      console.error("Error al crear cotización:", error);

      if (error.code === "23505") {
        setError("El número de cotización ya existe. Intenta nuevamente.");
      } else {
        setError("No se pudo guardar la cotización. Revisa los datos e inténtalo de nuevo.");
      }

      return;
    }

    onGuardada(data);
  }

  return (
    <main className="nueva-cotizacion">
      <div className="nueva-cotizacion-encabezado">
        <div>
          <p className="nueva-cotizacion-etiqueta">
            GESTIÓN COMERCIAL
          </p>
          <h2>Nueva cotización</h2>
          <p className="nueva-cotizacion-descripcion">
            Registra las condiciones iniciales de tu propuesta comercial.
          </p>
        </div>

        <button
          type="button"
          className="nc-boton nc-boton-secundario"
          onClick={onCancelar}
          disabled={guardando}
        >
          Cancelar
        </button>
      </div>

      <form className="nc-formulario" onSubmit={guardarCotizacion}>
        <section className="nc-seccion">
          <h3>Información general</h3>

          <div className="nc-cuadricula">
            <div className="nc-campo">
              <label htmlFor="nc-numero">Número de cotización</label>
              <input id="nc-numero" value={numero} readOnly />
              <small>Se genera automáticamente.</small>
            </div>

            <div className="nc-campo">
              <label htmlFor="nc-fecha">Fecha de elaboración</label>
              <input
                id="nc-fecha"
                name="fecha"
                type="date"
                value={formulario.fecha}
                onChange={actualizarCampo}
                required
              />
            </div>

            <div className="nc-campo nc-campo-completo">
              <label htmlFor="nc-cliente">Cliente</label>
              <select
                id="nc-cliente"
                name="cliente_id"
                value={formulario.cliente_id}
                onChange={actualizarCampo}
                disabled={cargandoClientes}
                required
              >
                <option value="">
                  {cargandoClientes
                    ? "Cargando clientes..."
                    : "Selecciona un cliente"}
                </option>

                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>

              {!cargandoClientes && clientes.length === 0 && (
                <small>
                  No hay clientes registrados. Primero agrega uno en el módulo Clientes.
                </small>
              )}
            </div>
          </div>
        </section>

        <section className="nc-seccion">
          <h3>Configuración comercial</h3>

          <div className="nc-cuadricula">
            <div className="nc-campo">
              <label htmlFor="nc-margen">Margen objetivo (%)</label>
              <input
                id="nc-margen"
                name="margen_objetivo"
                type="number"
                min="0"
                max="99.99"
                step="0.01"
                value={formulario.margen_objetivo}
                onChange={actualizarCampo}
                required
              />
              <small>
                Podrás ajustar el margen de cada concepto posteriormente.
              </small>
            </div>

            <div className="nc-campo">
              <label htmlFor="nc-presentacion">Presentación al cliente</label>
              <select
                id="nc-presentacion"
                name="modo_presentacion"
                value={formulario.modo_presentacion}
                onChange={actualizarCampo}
                required
              >
                <option value="global">Precio global</option>
                <option value="desglosada">Desglose comercial</option>
              </select>
              <small>
                Esta opción no mostrará los costos internos ni los márgenes.
              </small>
            </div>
          </div>
        </section>

        <section className="nc-seccion">
          <h3>Condiciones de la propuesta</h3>

          <div className="nc-cuadricula">
            <div className="nc-campo">
              <label htmlFor="nc-garantia">Garantía</label>
              <input
                id="nc-garantia"
                name="garantia"
                value={formulario.garantia}
                onChange={actualizarCampo}
                placeholder="Ej. 6 meses"
              />
            </div>

            <div className="nc-campo">
              <label htmlFor="nc-entrega">Tiempo de entrega</label>
              <input
                id="nc-entrega"
                name="tiempo_entrega"
                value={formulario.tiempo_entrega}
                onChange={actualizarCampo}
                placeholder="Ej. 3 días hábiles"
              />
            </div>

            <div className="nc-campo nc-campo-completo">
              <label htmlFor="nc-observaciones">Observaciones</label>
              <textarea
                id="nc-observaciones"
                name="observaciones"
                value={formulario.observaciones}
                onChange={actualizarCampo}
                rows="4"
                placeholder="Condiciones adicionales de la propuesta..."
              />
            </div>
          </div>
        </section>

        {error && (
          <p className="nc-error" role="alert">
            {error}
          </p>
        )}

        <div className="nc-acciones">
          <button
            type="button"
            className="nc-boton nc-boton-secundario"
            onClick={onCancelar}
            disabled={guardando}
          >
            Cancelar
          </button>

          <button
            type="submit"
            className="nc-boton nc-boton-principal"
            disabled={guardando || cargandoClientes || clientes.length === 0}
          >
            {guardando ? "Guardando..." : "Guardar borrador"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default NuevaCotizacion;