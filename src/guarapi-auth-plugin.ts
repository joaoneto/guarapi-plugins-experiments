import { Plugin, Request } from 'guarapi';
// @todo export Methods
import { Methods } from 'guarapi/dist/lib/router';
import { sign } from 'jsonwebtoken';

export interface JWTPayload {
  sub: string | number;
}

export interface SingConfig<P extends JWTPayload> {
  route: string;
  expiresIn: string;
  getJWTPayload: (req: Request) => Promise<P>;
}

export interface GuarapiAuthPluginConfig<P extends JWTPayload> {
  signIn?: SingConfig<P>;
  refreshToken?: SingConfig<P>;
  salt: string;
  issuer: string;
  audience: string;
}

export default function guarapiAuthPlugin<P extends JWTPayload>(
  guarapiAuthPluginConfig: GuarapiAuthPluginConfig<P>,
) {
  const { salt, audience, issuer, signIn, refreshToken } = guarapiAuthPluginConfig;

  const routesMap: Record<string, SingConfig<P> | undefined> = {
    [signIn?.route || '']: signIn,
    [refreshToken?.route || '']: refreshToken,
  };

  async function getTokens(req: Request, route: SingConfig<P>) {
    const { sub, ...jwtPayload } = await route.getJWTPayload(req);
    const { expiresIn } = route;

    return {
      token: sign({ sub, ...jwtPayload }, salt, {
        expiresIn,
        audience,
        issuer,
      }),

      refreshToken: sign({ sub, ...jwtPayload }, salt, {
        expiresIn,
        audience,
        issuer,
      }),
    };
  }

  const plugin: Plugin = (app) => {
    app.use(async (req, res, next) => {
      const route = routesMap[req.url || ''];
      const method = req.method?.toLocaleLowerCase();

      if (route && method === Methods.POST) {
        const tokens = await getTokens(req, route);
        res.json(tokens);
        return;
      }

      next();
    });

    return {
      name: 'guarapiAuthPlugin',
    };
  };

  return plugin;
}
