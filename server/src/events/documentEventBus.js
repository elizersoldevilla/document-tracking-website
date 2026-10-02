import { EventEmitter } from 'node:events';

export const documentEventBus = new EventEmitter();
documentEventBus.setMaxListeners(0);
