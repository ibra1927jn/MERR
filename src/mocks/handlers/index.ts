import { authHandlers } from './auth';
import { rpcHandlers, databaseHandlers } from './database';
import { functionsHandlers } from './functions';
import { storageHandlers } from './storage';

// Orden importa: RPC y funciones antes que el handler genérico de tablas
export const handlers = [
  ...authHandlers,
  ...rpcHandlers,
  ...functionsHandlers,
  ...storageHandlers,
  ...databaseHandlers,
];
