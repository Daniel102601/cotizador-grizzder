
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

const formularioInicial = {
  nombre: "",
  categoria: "",
  descripcion: "",
  precio: "",
}

function Servicios() {
  const [servicios, setServicios] = useState([])
  const [formulario, setFormulario] = useState(formularioInicial)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")
  const [mensaje, setMensaje] = useState("")

  useEffect(() => {
    cargarServicios()
  }, [])

  async function cargarServicios() {
    setCargando(true)
    setError("")

    try {
      const { data, error } = await supabase
        .from("servicios")
        .select("*")
        .order("nombre", { ascending: true })

      if (error) throw error

      setServicios(data ?? [])
    } catch (error) {
      setError(error.message)
    } finally {
      setCargando(false)
    }
  }

  function manejarCambio(evento) {
    const { name, value } = evento.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  async function manejarEnvio(evento) {
    evento.preventDefault()
    setGuardando(true)
    setError("")
    setMensaje("")

    try {
      const nuevoServicio = {
        nombre: formulario.nombre.trim(),
        categoria: formulario.categoria,
        descripcion: formulario.descripcion.trim() || null,
        precio: Number(formulario.precio),
        activo: true,
      }

      const { error } = await supabase
        .from("servicios")
        .insert([nuevoServicio])

      if (error) throw error

      setMensaje("Servicio registrado correctamente.")
      setFormulario({ ...formularioInicial })

      await cargarServicios()
    } catch (error) {
      setError(error.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main style={estilos.contenedor}>
      <h1>Grizzder Technology</h1>
      <h2>Catálogo de servicios</h2>
      <p>Administra los servicios y precios de la empresa.</p>

      {mensaje && <p role="status">{mensaje}</p>}
      {error && <p role="alert">Error: {error}</p>}

      <section style={estilos.seccion}>
        <h3>Registrar servicio</h3>

        <form onSubmit={manejarEnvio}>
          <div style={estilos.formulario}>
            <label>
              Nombre del servicio *
              <input
                name="nombre"
                value={formulario.nombre}
                onChange={manejarCambio}
                placeholder="Ej. Mantenimiento de computadores"
                required
                style={estilos.input}
              />
            </label>

            <label>
              Categoría *
              <select
                name="categoria"
                value={formulario.categoria}
                onChange={manejarCambio}
                required
                style={estilos.input}
              >
                <option value="">Selecciona una categoría</option>
                <option value="Cámaras y CCTV">Cámaras y CCTV</option>
                <option value="Redes">Redes y cableado</option>
                <option value="Soporte técnico">Soporte técnico</option>
                <option value="Desarrollo web">Desarrollo web</option>
                <option value="Venta de equipos">Venta de equipos</option>
                <option value="Otros">Otros</option>
              </select>
            </label>

            <label>
              Precio en pesos colombianos *
              <input
                name="precio"
                type="number"
                min="0"
                step="0.01"
                value={formulario.precio}
                onChange={manejarCambio}
                placeholder="Ej. 150000"
                required
                style={estilos.input}
              />
            </label>

            <label>
              Descripción
              <textarea
                name="descripcion"
                value={formulario.descripcion}
                onChange={manejarCambio}
                placeholder="Detalles del servicio (opcional)"
                rows={3}
                style={estilos.input}
              />
            </label>
          </div>

          <button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Registrar servicio"}
          </button>
        </form>
      </section>

      <section style={estilos.seccion}>
        <h3>Servicios registrados ({servicios.length})</h3>

        {cargando ? (
          <p>Cargando servicios...</p>
        ) : servicios.length === 0 ? (
          <p>Aún no hay servicios registrados.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={estilos.tabla}>
              <thead>
                <tr>
                  <th>Servicio</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Estado</th>
                </tr>
              </thead>

              <tbody>
                {servicios.map((servicio) => (
                  <tr key={servicio.id}>
                    <td>
                      <strong>{servicio.nombre}</strong>
                      {servicio.descripcion && (
                        <p>{servicio.descripcion}</p>
                      )}
                    </td>
                    <td>{servicio.categoria}</td>
                    <td>
                      {Number(servicio.precio).toLocaleString("es-CO", {
                        style: "currency",
                        currency: "COP",
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td>{servicio.activo ? "Activo" : "Inactivo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

const estilos = {
  contenedor: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },
  seccion: {
    marginTop: "28px",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "10px",
  },
  formulario: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "18px",
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: "10px",
    marginTop: "6px",
  },
  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
}

export default Servicios