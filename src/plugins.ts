import { Guarapi, bodyParserPlugin, middlewarePlugin } from 'guarapi';
import guarapiAuthPlugin, { GuarapiAuthPluginConfig } from './guarapi-auth-plugin';
import guarapiEnvPlugin from './guarapi-env-plugin';

interface PayloadRequest {
  userId: string;
}

export default async function initPlugins(app: Guarapi) {
  const authConfig: GuarapiAuthPluginConfig<{ sub: string; userId: string }> = {
    signIn: {
      route: '/auth/signin',
      getJWTPayload: async (req) =>
        Promise.resolve({ sub: 'teste', userId: (req.body as PayloadRequest)?.userId }),
      expiresIn: '1h',
    },
    refreshToken: {
      route: '/auth/refresh',
      getJWTPayload: async (req) =>
        Promise.resolve({ sub: 'teste', userId: (req.body as PayloadRequest)?.userId }),
      expiresIn: '24h',
    },
    audience: 'teste',
    issuer: 'issuer-1',
    salt: 'secret',
  };

  app.plugin(bodyParserPlugin);
  app.plugin(guarapiEnvPlugin);
  app.plugin(middlewarePlugin);
  app.plugin(guarapiAuthPlugin(authConfig));
}
