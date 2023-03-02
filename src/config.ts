import * as clowder from 'app-common-js';

const apicurio = clowder.PrivateDependencyEndpoints['xjoin-apicurio']['service'];

const config = {
  port: Number(clowder.LoadedConfig.privatePort) || 10000,
  interval: Number(process.env.GRAPHS_SYNC_INTERVAL) || 60000,
  log_level: process.env.LOG_LEVEL || 'info',
  registry: `${process.env.SCHEMA_REGISTRY_PROTOCOL || 'http'}://${apicurio.hostname}:${apicurio.port}/apis/registry`,
  timeout: Number(process.env.REQUEST_TIMEOUT) || 3000,
};

export default config;
