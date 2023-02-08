import config from 'config';

export const prefix = `${config.get('SchemaRegistry.Protocol')}://${config.get('SchemaRegistry.Hostname')}:${config.get('SchemaRegistry.Port')}/apis/registry`;
