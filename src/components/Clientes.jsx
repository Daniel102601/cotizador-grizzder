
import { useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

const formularioInicial = {
  nombre: "",
  documento: "",
  telefono: "",
  correo: "",
  direccion: "",
  ciudad: "",
}

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [formulario, setFormulario] = useState(formularioInicial)
  const [clienteEditando, setClienteEditando] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [error, setError] = useState("")

  // READ: consultar clientes al iniciar el componente
  useEffect(() => {
    cargarClientes()
  }, [])

  async function cargarClientes() {
    setCargando(true)
    setError("")

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("id", { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setClientes(data ?? [])
    }

    setCargando(false)
  }

  // Actualizar el estado de un campo del formulario
  function manejarCambio(evento) {
    const { name, value } = evento.target

    setFormulario((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  // CREATE / UPDATE: guardar o actualizar un cliente
  async function manejarEnvio(evento) {
    evento.preventDefault()

    setGuardando(true)
    setMensaje("")
    setError("")

    try {
      const datosCliente = {
        ...formulario,
        nombre: formulario.nombre.trim(),
      }

      let resultado

      if (clienteEditando !== null) {
        resultado = await supabase
          .from("clientes")
          .update(datosCliente)
          .eq("id", clienteEditando)
      } else {
        resultado = await supabase
          .from("clientes")
          .insert([datosCliente])
      }

      if (resultado.error) {
        throw resultado.error
      }

      setMensaje(
        clienteEditando !== null
          ? "Cliente actualizado correctamente."
          : "Cliente creado correctamente."
      )

      limpiarFormulario()
      await cargarClientes()
    } catch (error) {
      setError(error.message)
    } finally {
      setGuardando(false)
    }
  }

  // Preparar los datos de un cliente para editarlos
  function editarCliente(cliente) {
    setFormulario({
      nombre: cliente.nombre ?? "",
      documento: cliente.documento ?? "",
      telefono: cliente.telefono ?? "",
      correo: cliente.correo ?? "",
      direccion: cliente.direccion ?? "",
      ciudad: cliente.ciudad ?? "",
    })

    setClienteEditando(cliente.id)
    setMensaje("")
    setError("")
  }

  // DELETE: eliminar un cliente
  async function eliminarCliente(id) {
    const confirmar = window.confirm(
      "¿Seguro que deseas eliminar este cliente?"
    )

    if (!confirmar) return

    setMensaje("")
    setError("")

    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", id)

    if (error) {
      setError(error.message)
      return
    }

    if (clienteEditando === id) {
      limpiarFormulario()
    }

    setMensaje("Cliente eliminado correctamente.")
    await cargarClientes()
  }

  function limpiarFormulario() {
    setFormulario(formularioInicial)
    setClienteEditando(null)
  }

  const clientesFiltrados = clientes.filter((cliente) => {
    const texto = busqueda.toLowerCase()

    return [
      cliente.nombre,
      cliente.documento,
      cliente.telefono,
      cliente.correo,
    ].some((dato) => (dato ?? "").toLowerCase().includes(texto))
  })

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px" }}>
      <h1>Grizzder Technology</h1>
      <h2>Gestión de clientes</h2>
      <p>Administra los clientes de tus cotizaciones.</p>

      {mensaje && <p role="status">{mensaje}</p>}
      {error && <p role="alert">Error: {error}</p>}

      <section>
        <h3>
          {clienteEditando !== null
            ? "Editar cliente"
            : "Registrar cliente"}
        </h3>

        <form onSubmit={manejarEnvio}>
          <div style={estilos.formulario}>
            <input
              name="nombre"
              placeholder="Nombre o razón social *"
              value={formulario.nombre}
              onChange={manejarCambio}
              required
            />

            <input
              name="documento"
              placeholder="Documento o NIT"
              value={formulario.documento}
              onChange={manejarCambio}
            />

            <input
              name="telefono"
              placeholder="Teléfono"
              value={formulario.telefono}
              onChange={manejarCambio}
            />

            <input
              name="correo"
              type="email"
              placeholder="Correo electrónico"
              value={formulario.correo}
              onChange={manejarCambio}
            />

            <input
              name="direccion"
              placeholder="Dirección"
              value={formulario.direccion}
              onChange={manejarCambio}
            />

            <input
              name="ciudad"
              placeholder="Ciudad"
              value={formulario.ciudad}
              onChange={manejarCambio}
            />
          </div>

          <button type="submit" disabled={guardando}>
            {guardando
              ? "Guardando..."
              : clienteEditando !== null
                ? "Guardar cambios"
                : "Registrar cliente"}
          </button>

          {clienteEditando !== null && (
            <button type="button" onClick={limpiarFormulario}>
              Cancelar edición
            </button>
          )}
        </form>
      </section>

      <hr />

      <section>
        <h3>Clientes registrados ({clientes.length})</h3>

        <input
          type="search"
          placeholder="Buscar por nombre, documento, teléfono o correo..."
          value={busqueda}
          onChange={(evento) => setBusqueda(evento.target.value)}
          style={{ width: "100%", padding: "10px", boxSizing: "border-box" }}
        />

        {cargando ? (
          <p>Cargando clientes...</p>
        ) : clientesFiltrados.length === 0 ? (
          <p>No se encontraron clientes.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={estilos.tabla}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Ciudad</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id}>
                    <td>{cliente.nombre}</td>
                    <td>{cliente.documento || "—"}</td>
                    <td>{cliente.telefono || "—"}</td>
                    <td>{cliente.correo || "—"}</td>
                    <td>{cliente.ciudad || "—"}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => editarCliente(cliente)}
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => eliminarCliente(cliente.id)}
                      >
                        Eliminar
                      </button>
                    </td>
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
  formulario: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },
  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "16px",
  },
}

export default Clientes