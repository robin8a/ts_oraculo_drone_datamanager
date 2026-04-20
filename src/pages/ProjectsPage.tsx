import { useAuth } from '../contexts/AuthContext';
import { useProject } from '../contexts/ProjectContext';
import { useNavigate } from 'react-router-dom';

export function ProjectsPage() {
  const { user } = useAuth();
  const { selectedProject, setSelectedProject } = useProject();
  const navigate = useNavigate();

  const handleSelectProject = (projectId: string) => {
    setSelectedProject(projectId);
    navigate('/files');
  };

  return (
    <div className="space-y-6">
      <section>
        <p className="brand-kicker">Portafolio</p>
        <h1 className="brand-page-title mt-3">Proyectos disponibles</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-terra-deep/75">
          Cada proyecto es un prefijo en el bucket. Dentro, la documentación se organiza por jerarquía territorial: país,
          departamento, municipio, predio, parcela e identificador de árbol; después puedes añadir carpetas de vuelo u
          otros archivos.
        </p>
      </section>
      <div className="brand-card p-6 md:p-8">
        {user?.project_ids && user.project_ids.length > 0 ? (
          <div className="grid gap-4">
            {user.project_ids.map((projectId) => (
              <div
                key={projectId}
                className={`cursor-pointer rounded-[1.25rem] border p-5 transition ${
                  selectedProject === projectId
                    ? 'border-terra-primary bg-terra-sand/30 shadow-soft'
                    : 'border-terra-moss/30 bg-white/70 hover:border-terra-primary/40 hover:bg-terra-cream/70'
                }`}
                onClick={() => handleSelectProject(projectId)}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="brand-kicker">Proyecto</p>
                    <span className="mt-3 block text-lg font-semibold text-terra-deep">{projectId}</span>
                    <p className="mt-2 text-sm text-terra-deep/70">
                      Espacio de trabajo documental listo para navegación y operaciones sobre archivos.
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectProject(projectId);
                    }}
                    className="brand-button-primary min-w-28"
                  >
                    Abrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-terra-deep/70">No hay proyectos disponibles</p>
        )}
      </div>
    </div>
  );
}

