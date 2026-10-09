
import { useState } from "react";
import { supabase } from "../lib/supabase";

function Login({ onLogin }) {
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e) {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: correo,
          password: contrasena,
        });

      if (error) throw error;

      const { data: perfil, error: errorPerfil } =
        await supabase
          .from("perfiles")
          .select("rol, activo")
          .eq("id", data.user.id)
          .single();

      if (
        errorPerfil ||
        !perfil ||
        perfil.rol !== "admin" ||
        !perfil.activo
      ) {
        await supabase.auth.signOut();
        throw new Error(
          "Tu cuenta no tiene autorización para acceder."
        );
      }

      onLogin(data.session);
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main>
      <h1>Cotizador Grizzder Technology</h1>
      <p>Ingresa con tu cuenta para continuar.</p>

      <form onSubmit={iniciarSesion}>
        <label htmlFor="correo">Correo electrónico</label>
        <input
          id="correo"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          autoComplete="username"
          required
        />

        <label htmlFor="contrasena">Contraseña</label>
        <input
          id="contrasena"
          type="password"
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={cargando}>
          {cargando ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </main>
  );
}

export default Login;