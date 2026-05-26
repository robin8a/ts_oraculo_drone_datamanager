/**
 * Lambda datadroneuser — POST /users
 * Crea usuario en Cognito, asigna rol/grupo y envía credenciales por SES.
 */

const {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminGetUserCommand,
  AdminListGroupsForUserCommand,
  ListUsersCommand,
  ListUsersInGroupCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
} = require('@aws-sdk/client-cognito-identity-provider');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const cognitoRegion = process.env.COGNITO_REGION || 'us-east-1';
const sesRegion = process.env.SES_REGION || cognitoRegion;

const cognito = new CognitoIdentityProviderClient({ region: cognitoRegion });
const ses = new SESClient({ region: sesRegion });

const USER_POOL_ID = process.env.USER_POOL_ID;
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL;
const APP_LOGIN_URL = (process.env.APP_LOGIN_URL || '').replace(/\/$/, '');
const APP_NAME = process.env.APP_NAME || 'Terrasacha';
const BUILD_ID = 'datadroneuser-2026-05-26f';

/** Nombres de atributos custom en tu User Pool (solo los que existan en Cognito). */
const ATTR_ROLE = process.env.CUSTOM_ATTR_ROLE || 'custom:role';
/** Requiere atributo `supervisor_id` creado en el User Pool. Vacío en env = no guardar. */
const ATTR_SUPERVISOR =
  process.env.CUSTOM_ATTR_SUPERVISOR === ''
    ? ''
    : process.env.CUSTOM_ATTR_SUPERVISOR || 'custom:supervisor_id';
const ATTR_PROJECT_IDS = process.env.CUSTOM_ATTR_PROJECT_IDS || '';

const GROUPS = ['ADMIN', 'SUPERVISOR', 'ANALYST'];

const log = (level, msg, extra) => {
  const line = extra !== undefined ? `${msg} ${JSON.stringify(extra)}` : msg;
  if (level === 'error') {
    console.error(`[datadroneuser] ${line}`);
  } else {
    console.log(`[datadroneuser] ${line}`);
  }
};

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  },
  body: JSON.stringify({ build: BUILD_ID, ...body }),
});

const formatAwsError = (err, step) => {
  const name = err?.name || err?.Code || 'Error';
  const message = err?.message || String(err);
  log('error', `Fallo en ${step}`, { name, message });
  return { message, errorName: name, step };
};

const parseEventBody = (event) => {
  if (!event.body) {
    return {};
  }
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  return JSON.parse(raw);
};

const isOptionsRequest = (event) => {
  const method =
    event.requestContext?.http?.method || event.httpMethod || '';
  return method.toUpperCase() === 'OPTIONS';
};

const parseBearer = (event) => {
  const headers = event.headers || {};
  const auth =
    headers.authorization ||
    headers.Authorization ||
    Object.entries(headers).find(([k]) => k.toLowerCase() === 'authorization')?.[1] ||
    '';
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  return m ? m[1] : null;
};

const decodeJwtPayload = (token) => {
  try {
    const part = token.split('.')[1];
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

const VALID_ROLES = new Set(['ADMIN', 'SUPERVISOR', 'ANALYST']);

const normalizeRole = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }
  const upper = value.trim().toUpperCase();
  if (upper === 'ANALISTA') {
    return 'ANALYST';
  }
  return VALID_ROLES.has(upper) ? upper : null;
};

const parseGroupsFromPayload = (payload) => {
  const raw = payload['cognito:groups'];
  if (Array.isArray(raw)) {
    return raw.filter((g) => typeof g === 'string');
  }
  if (typeof raw === 'string') {
    return [raw];
  }
  return [];
};

const isAdminFromRoleAndGroups = (customRole, groups) =>
  normalizeRole(customRole) === 'ADMIN' || groups.includes('ADMIN');

const getUsernameFromPayload = (payload) =>
  payload['cognito:username'] || payload.username || payload.preferred_username || null;

const fetchRoleFromCognito = async (username) => {
  const got = await cognito.send(
    new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    })
  );
  const attrs = {};
  for (const a of got.UserAttributes || []) {
    attrs[a.Name] = a.Value;
  }
  const customRole = attrs[ATTR_ROLE];

  let groups = [];
  try {
    const listed = await cognito.send(
      new AdminListGroupsForUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      })
    );
    groups = (listed.Groups || []).map((g) => g.GroupName).filter(Boolean);
  } catch (groupErr) {
    log('error', 'AdminListGroupsForUser', { username, message: groupErr.message });
  }

  return { customRole, groups };
};

const assertAdmin = async (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return { ok: false, status: 401, message: 'Token inválido' };
  }

  const tokenGroups = parseGroupsFromPayload(payload);
  const tokenRole = payload[ATTR_ROLE];

  if (isAdminFromRoleAndGroups(tokenRole, tokenGroups)) {
    return { ok: true, source: 'token' };
  }

  const username = getUsernameFromPayload(payload);
  if (!username) {
    log('error', 'Auth: sin username en token', {
      tokenRole: normalizeRole(tokenRole),
      tokenGroups,
    });
    return { ok: false, status: 403, message: 'Solo administradores' };
  }

  try {
    const { customRole, groups } = await fetchRoleFromCognito(username);
    log('info', 'Auth Cognito', {
      username,
      customRole: normalizeRole(customRole),
      groups,
      tokenRole: normalizeRole(tokenRole),
      tokenGroups,
    });

    if (isAdminFromRoleAndGroups(customRole, groups)) {
      return { ok: true, source: 'cognito' };
    }
  } catch (err) {
    log('error', 'Auth AdminGetUser', { username, message: err.message });
    return {
      ok: false,
      status: 500,
      message: err.message || 'Error al verificar rol en Cognito',
      step: 'auth',
    };
  }

  return {
    ok: false,
    status: 403,
    message:
      'Solo administradores. Asigna custom:role=ADMIN o grupo ADMIN en Cognito al usuario con el que iniciaste sesión.',
  };
};

const mapUser = (u) => {
  const attrs = {};
  for (const a of u.UserAttributes || u.Attributes || []) {
    attrs[a.Name] = a.Value;
  }
  let projectIds = [];
  try {
    projectIds = ATTR_PROJECT_IDS
      ? JSON.parse(attrs[ATTR_PROJECT_IDS] || '[]')
      : [];
  } catch {
    projectIds = [];
  }
  return {
    username: u.Username,
    email: attrs.email || '',
    role: attrs[ATTR_ROLE] || 'ANALYST',
    supervisorId: ATTR_SUPERVISOR ? attrs[ATTR_SUPERVISOR] || null : null,
    projectIds,
    enabled: u.Enabled,
    status: u.UserStatus,
  };
};

const ensureGroup = async (username, role) => {
  if (!GROUPS.includes(role)) {
    throw new Error(`Rol inválido: ${role}`);
  }
  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: role,
    })
  );
};

const setUserAttributes = async (username, { role, supervisorId, projectIds }) => {
  const attrs = [];
  if (role && ATTR_ROLE) {
    attrs.push({ Name: ATTR_ROLE, Value: role });
  }
  if (supervisorId !== undefined && ATTR_SUPERVISOR) {
    attrs.push({ Name: ATTR_SUPERVISOR, Value: supervisorId || '' });
  }
  if (projectIds && ATTR_PROJECT_IDS) {
    attrs.push({ Name: ATTR_PROJECT_IDS, Value: JSON.stringify(projectIds) });
  }
  if (attrs.length === 0) {
    log('info', 'setUserAttributes: sin atributos custom configurados', { username, role });
    return;
  }
  log('info', 'setUserAttributes', { username, names: attrs.map((a) => a.Name) });
  await cognito.send(
    new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      UserAttributes: attrs,
    })
  );
};

const sendWelcomeEmail = async ({ email, username, temporaryPassword, role }) => {
  if (!SES_FROM_EMAIL) {
    throw new Error('SES_FROM_EMAIL no configurado');
  }

  const loginHtml = APP_LOGIN_URL
    ? `<p><a href="${APP_LOGIN_URL}">${APP_LOGIN_URL}</a></p>`
    : '';

  await ses.send(
    new SendEmailCommand({
      Source: SES_FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Message: {
        Subject: { Charset: 'UTF-8', Data: `Acceso a ${APP_NAME}` },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: `
              <h2>Bienvenido a ${APP_NAME}</h2>
              <p><b>Usuario:</b> ${username}</p>
              <p><b>Correo:</b> ${email}</p>
              <p><b>Contraseña temporal:</b> ${temporaryPassword}</p>
              <p><b>Rol:</b> ${role}</p>
              ${loginHtml}
              <p>En el primer acceso deberás cambiar la contraseña.</p>
            `,
          },
          Text: {
            Charset: 'UTF-8',
            Data: `Usuario: ${username}\nCorreo: ${email}\nContraseña temporal: ${temporaryPassword}\nRol: ${role}${APP_LOGIN_URL ? `\nURL: ${APP_LOGIN_URL}` : ''}`,
          },
        },
      },
    })
  );
};

const listUsersInGroup = async (groupName) => {
  const users = [];
  let nextToken;
  do {
    const res = await cognito.send(
      new ListUsersInGroupCommand({
        UserPoolId: USER_POOL_ID,
        GroupName: groupName,
        NextToken: nextToken,
        Limit: 60,
      })
    );
    for (const u of res.Users || []) {
      const attrs = {};
      for (const a of u.Attributes || []) {
        attrs[a.Name] = a.Value;
      }
      users.push({
        username: u.Username,
        email: attrs.email || '',
        role: groupName,
      });
    }
    nextToken = res.NextToken;
  } while (nextToken);
  return users;
};

const listAllPoolUsers = async () => {
  const users = [];
  let paginationToken;
  do {
    const res = await cognito.send(
      new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        PaginationToken: paginationToken,
        Limit: 60,
      })
    );
    for (const u of res.Users || []) {
      users.push(mapUser(u));
    }
    paginationToken = res.PaginationToken;
  } while (paginationToken);
  return users.sort((a, b) => a.username.localeCompare(b.username));
};

const handleGetUsers = async (reqId) => {
  log('info', 'GET /users', { reqId });
  try {
    const users = await listAllPoolUsers();
    return json(200, { users, total: users.length });
  } catch (err) {
    return json(500, formatAwsError(err, 'listUsers'));
  }
};

const handleGetSupervisors = async (reqId) => {
  log('info', 'GET /users/supervisors', { reqId });
  try {
    const supervisors = await listUsersInGroup('SUPERVISOR');
    const byUsername = new Map();
    for (const u of supervisors) {
      byUsername.set(u.username, u);
    }
    return json(200, { supervisors: [...byUsername.values()] });
  } catch (err) {
    if (err?.name === 'ResourceNotFoundException') {
      return json(200, {
        supervisors: [],
        hint: 'Crea el grupo SUPERVISOR en Cognito y añade usuarios supervisores.',
      });
    }
    return json(500, formatAwsError(err, 'listSupervisors'));
  }
};

const handlePostUsers = async (reqId, body) => {
  const { username, email, temporaryPassword, role, supervisorId, projectIds } = body;

  if (!username || !email || !temporaryPassword || !role) {
    return json(400, { message: 'Faltan campos obligatorios', step: 'validate' });
  }
  if (role === 'ANALYST' && !supervisorId) {
    return json(400, {
      message: 'Analista requiere supervisorId',
      step: 'validate',
    });
  }
  if (role === 'ANALYST' && !ATTR_SUPERVISOR) {
    return json(500, {
      message:
        'Configura CUSTOM_ATTR_SUPERVISOR=custom:supervisor_id en la Lambda y crea el atributo en Cognito',
      step: 'config',
    });
  }

  log('info', 'POST /users', { reqId, username, email, role });

  try {
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
        TemporaryPassword: temporaryPassword,
        UserAttributes: [
          { Name: 'email', Value: email },
          { Name: 'email_verified', Value: 'true' },
        ],
        MessageAction: 'SUPPRESS',
      })
    );
  } catch (err) {
    return json(500, formatAwsError(err, 'AdminCreateUser'));
  }

  try {
    await setUserAttributes(username, {
      role,
      supervisorId: role === 'ANALYST' ? supervisorId : '',
      projectIds: projectIds || [],
    });
  } catch (err) {
    return json(500, formatAwsError(err, 'setUserAttributes'));
  }

  try {
    await ensureGroup(username, role);
  } catch (err) {
    return json(500, formatAwsError(err, 'ensureGroup'));
  }

  try {
    await sendWelcomeEmail({ email, username, temporaryPassword, role });
  } catch (err) {
    return json(500, {
      ...formatAwsError(err, 'sendWelcomeEmail'),
      hint: 'Verifica SES (remitente y destino en sandbox).',
    });
  }

  try {
    const got = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username,
      })
    );
    return json(201, { ...mapUser(got), emailSent: true });
  } catch (err) {
    return json(500, formatAwsError(err, 'AdminGetUser'));
  }
};

exports.handler = async (event) => {
  const reqId = event.requestContext?.requestId || 'unknown';

  try {
    require.resolve('@aws-sdk/client-cognito-identity-provider');
    require.resolve('@aws-sdk/client-ses');
  } catch (depErr) {
    return json(500, {
      message: 'Faltan dependencias en el zip. Ejecuta npm install y vuelve a crear datadroneuser.zip',
      errorName: 'DependencyError',
      step: 'init',
      detail: depErr.message,
    });
  }

  try {
    log('info', 'Invocación', {
      build: BUILD_ID,
      reqId,
      method: event.requestContext?.http?.method || event.httpMethod,
      path: event.path || event.rawPath,
      USER_POOL_ID: USER_POOL_ID ? 'ok' : 'FALTA',
      SES_FROM_EMAIL: SES_FROM_EMAIL ? 'ok' : 'FALTA',
      ATTR_ROLE,
      ATTR_SUPERVISOR: ATTR_SUPERVISOR || '(no)',
      ATTR_PROJECT_IDS: ATTR_PROJECT_IDS || '(no)',
    });

    if (isOptionsRequest(event)) {
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        },
        body: '',
      };
    }

    if (!USER_POOL_ID) {
      return json(500, { message: 'USER_POOL_ID no configurado', step: 'config' });
    }

    const token = parseBearer(event);
    if (!token) {
      return json(401, { message: 'Authorization Bearer requerido', step: 'auth' });
    }

    const auth = await assertAdmin(token);
    if (!auth.ok) {
      if (auth.status && auth.message) {
        return json(auth.status, { message: auth.message, step: 'auth' });
      }
      return auth;
    }

    const method = (
      event.httpMethod ||
      event.requestContext?.http?.method ||
      ''
    ).toUpperCase();
    const path = event.path || event.rawPath || '';

    const isSupervisorsRoute =
      path.endsWith('/users/supervisors') || path === '/users/supervisors';
    const isUsersListRoute =
      (path.endsWith('/users') || path === '/users') && !isSupervisorsRoute;

    if (method === 'GET' && isSupervisorsRoute) {
      return await handleGetSupervisors(reqId);
    }

    if (method === 'GET' && isUsersListRoute) {
      return await handleGetUsers(reqId);
    }

    if (method === 'POST' && (path.endsWith('/users') || path === '/users')) {
      let body;
      try {
        body = parseEventBody(event);
      } catch {
        return json(400, { message: 'JSON inválido', step: 'parseBody' });
      }
      return await handlePostUsers(reqId, body);
    }

    return json(404, {
      message: 'Rutas: GET /users, GET /users/supervisors, POST /users',
      step: 'route',
    });
  } catch (err) {
    log('error', 'Handler crash', {
      reqId,
      name: err?.name,
      message: err?.message,
      stack: err?.stack,
    });
    return json(500, {
      message: err?.message || 'Error interno',
      errorName: err?.name || 'UnhandledError',
      step: 'handler',
    });
  }
};
