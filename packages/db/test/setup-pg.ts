import { setEngineFactory } from '@oahs/core';
import { createPgSyncEngine } from '../src/sync-engine.js';

setEngineFactory(createPgSyncEngine);
