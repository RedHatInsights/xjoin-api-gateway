import config from 'config';

export const PREFIX = `${config.get('SchemaRegistry.Protocol')}://${config.get('SchemaRegistry.Hostname')}:${config.get('SchemaRegistry.Port')}/apis/registry`;
