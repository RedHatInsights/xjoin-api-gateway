import {GatewayConfig} from "@apollo/gateway";
import {parse} from "graphql";
import {Unsubscriber} from "apollo-server-core";
import {ApolloGateway} from '@apollo/gateway';
import {CompositionUpdate, ManagedGatewayConfig, RemoteGatewayConfig} from "@apollo/gateway/dist/config";
import got, {Options,Response} from 'got';
import config from 'config';

interface ServiceDefinition {
    typeDefs: any,
    name: string,
    url: string
}

//loosely based on https://github.com/pipedrive/graphql-schema-registry/blob/master/examples/gateway_service_hard_coded_urls/custom-gateway.js
export class XJoinGateway extends ApolloGateway {
    private readonly serviceDefinitionsCache: ServiceDefinition[];

    constructor(gwConfig?: GatewayConfig) {
        super(gwConfig);

        //TODO: is this necessary?
        this.serviceDefinitionsCache = [
            // Temporary workaround just to make sure that the array won't be empty
            // If "serviceDefinitions" is empty, uncaught expection will be thrown by the library
            {
                name: 'InternalError',
                url: 'InternalError',
                typeDefs: parse(
                    `type InternalError { message: String! } extend type Query { internalError: InternalError }`
                ),
            },
        ];
    }

    // TODO: validate this is necessary
    /*
    // Hack, because for some reason by default the lib doesn't want to add listeners in "unmanaged" mode
    // Without this the schema polling doesn't work properly - server schema won't be updated
    onSchemaChange(callback: (schema: GraphQLSchema) => void): Unsubscriber {
        this.onSchemaChangeListeners.add(callback);

        return () => {
            this.onSchemaChangeListeners.delete(callback);
        };
    }
     */


    //this is where the schemas are loaded from the registry
    async loadServiceDefinitions(rgwConfig: RemoteGatewayConfig | ManagedGatewayConfig): Promise<CompositionUpdate> {
        interface Artifact {
            id: string,
            name: string,
            description: string,
            createdOn: string,
            createdBy: string,
            type: string,
            labels: string[],
            state: string,
            modifiedOn: string,
            groupId: string
        }

        interface ArtifactsResponse {
            artifacts : Artifact[]
        }

        const prefix = `${config.get('SchemaRegistry.Protocol')}://${config.get('SchemaRegistry.Hostname')}:${config.get('SchemaRegistry.Port')}/apis/registry`;

        const res : Response<ArtifactsResponse> = await got('v2/search/artifacts?labels=graphql', {
            prefixUrl: prefix,
            responseType: 'json',
            headers: {
                Accept: 'application/json'
            }
        });

        const serviceDefinitions : ServiceDefinition[] = [];
        const artifacts : Artifact[] = res.body.artifacts;

        if (artifacts.length == 0) {
            return {
                serviceDefinitions: this.serviceDefinitionsCache,
                isNewSchema: true
            };
        }

        for (const artifact of artifacts) {
            let artifactPath = '';
            if (artifact.groupId !== undefined) {
                artifactPath = `v1/groups/${artifact.groupId}/artifacts/${artifact.id}`
            } else {
                artifactPath = `v1/artifacts/${artifact.id}`
            }

            const gqlRes : Response<string> = await got(artifactPath, {
                prefixUrl: prefix
            });

            let url = '';

            if (artifact.labels !== undefined) {
                for (const label of artifact.labels) {
                    if (label.startsWith('xjoin-subgraph-url=')) {
                        url = label.split('xjoin-subgraph-url=')[1]
                    }
                }
            }

            serviceDefinitions.push({
                name: artifact.id,
                url: url,
                typeDefs: parse(gqlRes.body)
            });
        }

        return {
            serviceDefinitions: serviceDefinitions,
            isNewSchema: true
        };
    }
}
