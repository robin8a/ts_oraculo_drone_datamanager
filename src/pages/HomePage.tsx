import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <section className="brand-card overflow-hidden p-8">
        <p className="brand-kicker">Terrasacha</p>
        <h1 className="brand-page-title mt-4">Centro documental de proyectos</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-terra-deep/80">
          Una interfaz más alineada con la marca Terrasacha: ecológica, moderna y legible, pensada para explorar archivos y proyectos con una presencia visual consistente.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button onClick={() => navigate('/projects')} className="brand-button-primary px-6 py-3">
            Ir a proyectos
          </button>
          <button onClick={() => navigate('/files')} className="brand-button-secondary px-6 py-3">
            Abrir archivos
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="brand-panel p-6">
          <p className="brand-kicker">Usuario</p>
          <h2 className="mt-3 text-2xl font-semibold text-terra-deep">
            Hola, {user?.username}
          </h2>
          <p className="mt-3 text-sm leading-6 text-terra-deep/75">
            Tu sesión está activa y lista para gestionar información del entorno Terrasacha.
          </p>
        </article>
        <article className="brand-panel p-6">
          <p className="brand-kicker">Proyectos</p>
          <h2 className="mt-3 text-3xl font-semibold text-terra-deep">
            {user?.project_ids.length || 0}
          </h2>
          <p className="mt-3 text-sm leading-6 text-terra-deep/75">
            Cantidad de proyectos disponibles según tu perfil de acceso.
          </p>
        </article>
        <article className="brand-panel p-6">
          <p className="brand-kicker">Esencia</p>
          <h2 className="mt-3 text-2xl font-semibold text-terra-deep">
            Innovación con conciencia
          </h2>
          <p className="mt-3 text-sm leading-6 text-terra-deep/75">
            La interfaz prioriza legibilidad, calidez visual y una paleta inspirada en tierra, bosque y sostenibilidad.
          </p>
        </article>
      </section>
      <section className="brand-card p-6">
        <p className="brand-kicker">Slogan</p>
        <p className="mt-3 font-display text-2xl font-bold tracking-wide text-terra-primary">
          Pioneros del Mañana
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-terra-deep/75">
          El sistema transmite transformación, colectividad y responsabilidad visual en cada pantalla principal.
        </p>
      </section>
    </div>
  );
}

