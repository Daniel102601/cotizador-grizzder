
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const formatoCOP = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 2,
  }).format(Number(valor) || 0);

function Materiales() {
  const [materiales, setMateriales] = useState([]);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("Cableado");
  const [unidad, setUnidad] = useState("unidad");
  const [precioCompra, setPrecioCompra] = useState("");
  const [costoAdicional, setCostoAdicional] = useState("0");
  const [proveedor, setProveedor] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const precio = Number(precioCompra);
  const adicional = Number(costoAdicional);

  const costoEstimado =
    precioCompra !== "" &&
    costoAdicional !== "" &&
    Number.isFinite(precio) &&
    Number.isFinite(adicional) &&
    precio >= 0 &&
    adicional >= 0
      ? precio + adicional
      : null;

  async function cargarMateriales() {
    setCargando(true);
    setError("");

    const { data, error } = await supabase
      .from("materiales")
      .select("*")
      .order("nombre", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setMateriales(data || []);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarMateriales();
  }, []);

  async function registrarMaterial(e) {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!nombre.trim() || !categoria.trim() || !unidad.trim()) {
      setError("Completa los campos obligatorios.");
      return;
    }

    if (
      precioCompra === "" ||
      !Number.isFinite(precio) ||
      precio < 0
    ) {
      setError("Ingresa un precio de compra válido.");
      return;
    }

    if (
      costoAdicional === "" ||
      !Number.isFinite(adicional) ||
      adicional < 0
    ) {
      setError("Ingresa un costo adicional válido.");
      return;
    }

    setCargando(true);

    try {
      const { error } = await supabase.from("materiales").insert({
        nombre: nombre.trim(),
        categoria: categoria.trim(),
        unidad: unidad.trim(),
        precio_compra: precio,
        costo_adicional_unitario: adicional,
        costo_referencia: precio + adicional,
        proveedor: proveedor.trim() || null,
      });

      if (error) throw error;

      setNombre("");
      setCategoria("Cableado");
      setUnidad("unidad");
      setPrecioCompra("");
      setCostoAdicional("0");
      setProveedor("");
      setMensaje("Material registrado correctamente.");

      await cargarMateriales();
    } catch (err) {
      setError(err.message || "No se pudo registrar el material.");
    } finally {
      setCargando(false);
    }
  }

  async function cambiarEstado(material) {
    setError("");
    setMensaje("");

    const { error } = await supabase
      .from("materiales")
      .update({ activo: !material.activo })
      .eq("id", material.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMensaje("Estado del material actualizado.");
    await cargarMateriales();
  }

  async function eliminarMaterial(material) {
    const confirmar = window.confirm(
      `¿Deseas eliminar "${material.nombre}"?`
    );

    if (!confirmar) return;

    setError("");
    setMensaje("");

    const { error } = await supabase
      .from("materiales")
      .delete()
      .eq("id", material.id);

    if (error) {
      setError(error.message);
      return;
    }

    setMensaje("Material eliminado correctamente.");
    await cargarMateriales();
  }

  return (
    <main>
      <h1>Catálogo de materiales</h1>
      <p>
        Administra los precios de compra y los costos estimados
        de tus materiales.
      </p>

      <form onSubmit={registrarMaterial}>
        <label htmlFor="nombre">Nombre del material *</label>
        <input
          id="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej. Cable UTP categoría 6"
          required
        />

        <label htmlFor="categoria">Categoría *</label>
        <select
          id="categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          required
        >
          <option value="Cableado">Cableado</option>
          <option value="CCTV">CCTV y seguridad</option>
          <option value="Redes">Redes</option>
          <option value="Computación">Computación</option>
          <option value="Eléctrico">Material eléctrico</option>
          <option value="Construcción">Construcción</option>
          <option value="Otro">Otro</option>
        </select>

        <label htmlFor="unidad">Unidad de medida *</label>
        <select
          id="unidad"
          value={unidad}
          onChange={(e) => setUnidad(e.target.value)}
          required
        >
          <option value="unidad">Unidad</option>
          <option value="metro">Metro</option>
          <option value="rollo">Rollo</option>
          <option value="caja">Caja</option>
          <option value="kit">Kit</option>
          <option value="litro">Litro</option>
          <option value="kilogramo">Kilogramo</option>
          <option value="hora">Hora</option>
          <option value="jornada">Jornada</option>
        </select>

        <label htmlFor="precioCompra">Precio de compra (COP) *</label>
        <input
          id="precioCompra"
          type="number"
          min="0"
          step="0.01"
          value={precioCompra}
          onChange={(e) => setPrecioCompra(e.target.value)}
          placeholder="Ej. 2000"
          required
        />

        <label htmlFor="costoAdicional">
          Costo adicional por unidad (COP)
        </label>
        <input
          id="costoAdicional"
          type="number"
          min="0"
          step="0.01"
          value={costoAdicional}
          onChange={(e) => setCostoAdicional(e.target.value)}
          placeholder="Ej. 200"
          required
        />

        <section aria-live="polite">
          <h3>Costo estimado por unidad</h3>
          <p>
            {costoEstimado === null
              ? "Ingresa valores válidos para calcular el costo."
              : formatoCOP(costoEstimado)}
          </p>
          <small>
            Precio de compra + costo adicional unitario.
          </small>
        </section>

        <label htmlFor="proveedor">Proveedor (opcional)</label>
        <input
          id="proveedor"
          value={proveedor}
          onChange={(e) => setProveedor(e.target.value)}
          placeholder="Nombre del proveedor"
        />

        <button type="submit" disabled={cargando}>
          {cargando ? "Procesando..." : "Registrar material"}
        </button>
      </form>

      {error && <p role="alert">Error: {error}</p>}
      {mensaje && <p role="status">{mensaje}</p>}

      <h2>Materiales registrados ({materiales.length})</h2>

      {cargando && <p>Cargando materiales...</p>}

      {!cargando && materiales.length === 0 && (
        <p>Aún no hay materiales registrados.</p>
      )}

      {materiales.map((material) => (
        <article key={material.id}>
          <h3>{material.nombre}</h3>
          <p>Categoría: {material.categoria}</p>
          <p>Proveedor: {material.proveedor || "No especificado"}</p>
          <p>
            Precio de compra: {formatoCOP(material.precio_compra)}
          </p>
          <p>
            Costo adicional:{" "}
            {formatoCOP(material.costo_adicional_unitario)}
          </p>
          <p>
            <strong>
              Costo estimado: {formatoCOP(material.costo_referencia)}
              {" / "}
              {material.unidad}
            </strong>
          </p>
          <p>Estado: {material.activo ? "Activo" : "Inactivo"}</p>

          <button
            type="button"
            disabled={cargando}
            onClick={() => cambiarEstado(material)}
          >
            {material.activo ? "Desactivar" : "Activar"}
          </button>

          <button
            type="button"
            disabled={cargando}
            onClick={() => eliminarMaterial(material)}
          >
            Eliminar
          </button>
        </article>
      ))}
    </main>
  );
}

export default Materiales;