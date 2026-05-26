import { CUSTOM_ROLE_ATTRIBUTE } from '../constants/roles';

export function NoRoleBanner() {
  return (
    <div
      className="rounded-2xl border border-amber-400/50 bg-amber-50 px-5 py-4 text-sm text-amber-950"
      role="alert"
    >
      <p className="font-semibold">Tu cuenta no tiene rol asignado</p>
      <p className="mt-2 leading-6">
        Un administrador debe configurar el atributo{' '}
        <code className="rounded bg-amber-100 px-1 text-xs">{CUSTOM_ROLE_ATTRIBUTE}</code> en
        Cognito con uno de estos valores: <strong>ADMIN</strong>, <strong>SUPERVISOR</strong> o{' '}
        <strong>ANALYST</strong>. Cierra sesión y vuelve a entrar después del cambio.
      </p>
    </div>
  );
}
