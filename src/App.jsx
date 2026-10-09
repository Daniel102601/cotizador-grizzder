import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import Servicios from "./components/Servicios";
import Materiales from "./components/Materiales";
import Clientes from "./components/Clientes";
import Cotizaciones from "./components/Cotizaciones";
import "./App.css";

const NAVEGACION = [
  { id: "servicios", label: "Servicios", icon: "grid" },
  { id: "materiales", label: "Materiales", icon: "package" },
  { id: "clientes", label: "Clientes", icon: "users" },
  { id: "cotizaciones", label: "Cotizaciones", icon: "file" },
];

const DETALLES_VISTA = {
  servicios: {
    titulo: "Servicios",
    descripcion: "Administra el catálogo de servicios de Grizzder.",
  },
  materiales: {
    titulo: "Materiales",
    descripcion: "Organiza los materiales y sus valores de referencia.",
  },
  clientes: {
    titulo: "Clientes",
    descripcion: "Consulta y administra la información de tus clientes.",
  },
  cotizaciones: {
    titulo: "Cotizaciones",
    descripcion: "Crea, consulta y gestiona tus propuestas comerciales.",
  },
};

function Icono({ nombre, size = 20 }) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: "false",
  };

  const dibujos = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    package: <><path d="m12 3 8.5 4.5v9L12 21l-8.5-4.5v-9L12 3Z" /><path d="m3.8 7.7 8.2 4.5 8.2-4.5M12 12.2V21M7.7 5.3l8.5 4.6" /></>,
    users: <><path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" /><circle cx="9.5" cy="7.5" r="3.5" /><path d="M17 4.3a3.5 3.5 0 0 1 0 6.8M21 20v-1.5a4 4 0 0 0-3-3.87" /></>,
    file: <><path d="M13.5 3.5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z" /><path d="M13 3.5V10h7M8 14h8M8 17.5h8" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  };

  return <svg {...props}>{dibujos[nombre] || dibujos.grid}</svg>;
}

function App() {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [error, setError] = useState("");
  const [vista, setVista] = useState("servicios");
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  useEffect(() => {
    let activa = true;

    async function comprobarSesion() {
      const { data, error: errorSesion } = await supabase.auth.getSession();
      if (!activa) return;

      if (errorSesion) {
        setError("No se pudo comprobar la sesión. Intenta nuevamente.");
        setCargando(false);
        return;
      }

      setSesion(data.session);
      setCargando(false);
    }

    comprobarSesion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion((sesionActual) => {
        const mismoUsuario = sesionActual?.user?.id === nuevaSesion?.user?.id;

        if (!nuevaSesion || !mismoUsuario) {
          setAutorizado(false);
          setError("");
        }

        return nuevaSesion;
      });
      setCargando(false);
    });

    return () => {
      activa = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let activa = true;

    async function comprobarPerfil() {
      if (!sesion?.user?.id) {
        setAutorizado(false);
        return;
      }

      setCargando(true);

      const { data: perfil, error: errorPerfil } = await supabase
        .from("perfiles")
        .select("rol, activo")
        .eq("id", sesion.user.id)
        .maybeSingle();

      if (!activa) return;

      if (errorPerfil || !perfil || perfil.rol !== "admin" || !perfil.activo) {
        setAutorizado(false);
        setError("No tienes autorización para acceder.");
        await supabase.auth.signOut();
        setCargando(false);
        return;
      }

      setAutorizado(true);
      setError("");
      setCargando(false);
    }

    comprobarPerfil();

    return () => {
      activa = false;
    };
  }, [sesion?.user?.id]);

  async function cerrarSesion() {
    setError("");
    const { error: errorCierre } = await supabase.auth.signOut();

    if (errorCierre) {
      setError("No se pudo cerrar la sesión. Intenta nuevamente.");
    }
  }

  function cambiarVista(nuevaVista) {
    setVista(nuevaVista);
    setMenuMovilAbierto(false);
  }

  if (cargando) {
    return (
      <main className="estado-acceso">
        <div className="estado-acceso__marca">
          <img src="/logo_1.png" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          <span>GRIZZDER <b>TECHNOLOGY</b></span>
        </div>
        <div className="estado-acceso__spinner" />
        <p>Verificando acceso seguro...</p>
      </main>
    );
  }

  if (!sesion) {
    return (
      <div className="pantalla-login">
        {error && <p className="mensaje-error" role="alert">{error}</p>}
        <Login onLogin={setSesion} />
      </div>
    );
  }

  if (!autorizado) {
    return (
      <main className="estado-acceso">
        <div className="estado-acceso__marca">
          <span>GRIZZDER <b>TECHNOLOGY</b></span>
        </div>
        <Icono nombre="shield" size={34} />
        <p>{error || "Verificando permisos de usuario..."}</p>
      </main>
    );
  }

  const detalleVista = DETALLES_VISTA[vista] || DETALLES_VISTA.servicios;
  const correoUsuario = sesion.user?.email || "Usuario administrador";
  const inicialUsuario = (sesion.user?.email || "G").charAt(0).toUpperCase();

  return (
    <div className="app-shell">
      {menuMovilAbierto && (
        <button
          className="sidebar-overlay"
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuMovilAbierto(false)}
        />
      )}

      <aside className={`sidebar ${menuMovilAbierto ? "sidebar--abierto" : ""}`}>
        <div className="sidebar__marca">
          <div className="sidebar__logo">
            <img
              src="/logo_1.png"
              alt="Grizzder Technology"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
          <div className="sidebar__marca-texto">
            <strong>GRIZZDER</strong>
            <span>TECHNOLOGY</span>
          </div>
          <button
            className="sidebar__cerrar-movil"
            type="button"
            onClick={() => setMenuMovilAbierto(false)}
            aria-label="Cerrar menú"
          >
            ×
          </button>
        </div>

        <div className="sidebar__separador" />

        <p className="sidebar__etiqueta">ESPACIO DE TRABAJO</p>
        <nav className="sidebar__nav" aria-label="Navegación principal">
          {NAVEGACION.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${vista === item.id ? "nav-item--activo" : ""}`}
              onClick={() => cambiarVista(item.id)}
              aria-current={vista === item.id ? "page" : undefined}
            >
              <span className="nav-item__icono"><Icono nombre={item.icon} /></span>
              <span>{item.label}</span>
              {vista === item.id && <span className="nav-item__indicador" />}
            </button>
          ))}
        </nav>

        <div className="sidebar__relleno" />

        <div className="sidebar__ayuda">
          <div className="sidebar__ayuda-icono"><Icono nombre="shield" size={18} /></div>
          <div>
            <strong>Área segura</strong>
            <span>Acceso administrativo</span>
          </div>
        </div>

        <div className="sidebar__usuario">
          <div className="usuario-avatar">{inicialUsuario}</div>
          <div className="usuario-datos">
            <strong>Administrador</strong>
            <span title={correoUsuario}>{correoUsuario}</span>
          </div>
          <button
            className="usuario-salir"
            type="button"
            onClick={cerrarSesion}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <Icono nombre="logout" size={19} />
          </button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            className="topbar__menu"
            type="button"
            onClick={() => setMenuMovilAbierto(true)}
            aria-label="Abrir menú"
          >
            <Icono nombre="menu" size={22} />
          </button>
          <div className="topbar__migas">
            <span>Grizzder Suite</span>
            <Icono nombre="chevron" size={15} />
            <strong>{detalleVista.titulo}</strong>
          </div>
          <div className="topbar__estado">
            <span className="estado-punto" />
            Sistema operativo
          </div>
        </header>

        <main className="contenido">
          <div className="contenido__encabezado">
            <div>
              <p className="contenido__sobretitulo">GESTIÓN EMPRESARIAL</p>
              <h1>{detalleVista.titulo}</h1>
              <p className="contenido__descripcion">{detalleVista.descripcion}</p>
            </div>
            <div className="contenido__sello">
              <span>GT</span>
              <div>
                <strong>GRIZZDER</strong>
                <small>TECHNOLOGY</small>
              </div>
            </div>
          </div>

          {error && <p className="mensaje-error" role="alert">{error}</p>}

          <section className="contenido__panel" aria-label={detalleVista.titulo}>
            {vista === "clientes" && <Clientes />}
            {vista === "servicios" && <Servicios />}
            {vista === "materiales" && <Materiales />}
            {vista === "cotizaciones" && <Cotizaciones />}
          </section>

          <footer className="app-footer">
            <span>GRIZZDER TECHNOLOGY</span>
            <span>Soluciones empresariales integrales</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default App;
