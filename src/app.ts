import guarapi, { Middleware, MiddlewareError, Router } from 'guarapi';
import fs from 'node:fs';
import path from 'node:path';
import initPlugins from './plugins';

const certs = {
  key: fs.readFileSync(path.resolve('./cert/key.pem')),
  cert: fs.readFileSync(path.resolve('./cert/cert.pem')),
};
// server http2 without TLS, will fail in most cases

// without TLS (not working inn most cases):
// curl --http2-prior-knowledge  'http://127.0.0.1:3000/' -v

// with TLS:
// curl 'https://127.0.0.1:3000/' -v -k

// we recommend take e look at:
// https://nodejs.org/api/http2.html#compatibility-api
// https://nodejs.org/api/http2.html#alpn-negotiation

const app = guarapi({
  serverOptions: {
    isSSL: true,
    isHTTP2: true,
    allowHTTP1: true,
    ...certs,
  },
});

const router = Router();

type GuarapiACLRole = string | number;

interface GuarapiACL {
  roles: GuarapiACLRole[];
}

interface GuarapiACLConfig<T extends GuarapiACL> {
  name: string;
  roles: GuarapiACLRole[];
  getList: () => Promise<T>;
}

const aclResource = async <T extends GuarapiACL>(
  config: GuarapiACLConfig<T>,
  fn: Middleware,
): Promise<Middleware> => {
  const acl = await config.getList();
  // @todo: push to bulk DB insert?
  console.log(`Initializing protected ACL ${config.name} resource`);
  return async (req, res, next) => {
    const hasEveryRoles = acl.roles.every((item) => config.roles.includes(item));
    if (hasEveryRoles) {
      next();
      return;
    }
    fn(req, res, next);
  };
};

export async function initApp() {
  await initPlugins(app);

  router.get('/', (_req, res) => {
    res.status(200).json(process.env.NODE_ENV);
  });

  router.get(
    '/protected',
    await aclResource(
      {
        name: 'protected',
        roles: ['admin'],
        getList: async () => Promise.resolve({ roles: ['admin'] }),
      },
      (req, res) => {
        res.status(200).json(process.env.NODE_ENV);
      },
    ),
  );

  router.get(
    '/admin-fail-role',
    await aclResource(
      {
        name: 'admin',
        roles: ['admin'],
        getList: async () => Promise.resolve({ roles: ['normal'] }),
      },
      (req, res) => {
        res.status(200).json({ ok: true });
      },
    ),
  );

  app.use('/', router);

  app.use<MiddlewareError>((error, _req, res, _next) => {
    res.status((error as Error)?.message === 'Not Found' ? 404 : 500);
    res.json({ error: (error as Error)?.message || 'Internal Server Error' });
  });

  app.listen(3000, '127.0.0.1', () => {
    console.log('> Running: http://localhost:3000');
  });
}
