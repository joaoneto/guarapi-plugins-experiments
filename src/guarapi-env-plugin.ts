import dotenv from 'dotenv';
import { Plugin } from 'guarapi';
import path from 'node:path';

const guarapiEnvPlugin: Plugin = (_app) => {
  const CWD = process.cwd();
  return {
    name: 'guarapiEnvPlugin',
    pre: (_req, _res, next) => {
      dotenv.config({
        path: [
          path.resolve(CWD, '.env.local'),
          path.resolve(CWD, '.env.test'),
          path.resolve(CWD, '.env'),
        ],
      });
      next();
    },
  };
};

export default guarapiEnvPlugin;
