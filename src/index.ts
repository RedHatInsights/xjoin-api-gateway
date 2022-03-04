import {gql, ServerInfo} from "apollo-server";

import {ApolloServer} from 'apollo-server';
import {ApolloGateway, IntrospectAndCompose, ServiceDefinition} from "@apollo/gateway";
import config from 'config';
import got, {Response} from "got";
import {parse} from "graphql";
import {composeServices} from '@apollo/composition';
import {readFileSync} from "fs";

const defaultSuperGraph = readFileSync('./default-super-graph.graphql').toString();

async function loadSubgraphSchemas(): Promise<ServiceDefinition[]> {
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
        artifacts: Artifact[]
    }

    const prefix = `${config.get('SchemaRegistry.Protocol')}://${config.get('SchemaRegistry.Hostname')}:${config.get('SchemaRegistry.Port')}/apis/registry`;

    const res: Response<ArtifactsResponse> = await got('v2/search/artifacts?labels=graphql', {
        prefixUrl: prefix,
        responseType: 'json',
        headers: {
            Accept: 'application/json'
        }
    });

    const serviceDefinitions: ServiceDefinition[] = [];
    const artifacts: Artifact[] = res.body.artifacts;

    if (artifacts.length == 0) {
        return [];
    }

    for (const artifact of artifacts) {
        let artifactPath = '';
        if (artifact.groupId !== undefined) {
            artifactPath = `v1/groups/${artifact.groupId}/artifacts/${artifact.id}`
        } else {
            artifactPath = `v1/artifacts/${artifact.id}`
        }

        const gqlRes: Response<string> = await got(artifactPath, {
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

    return serviceDefinitions;
}

const server = new ApolloServer({
    introspection: true,
    gateway: new ApolloGateway({
        async supergraphSdl({update, healthCheck}) {
            const poll = function () {
                setTimeout(async () => {
                    try {
                        const compositionResult = await composeServices(await loadSubgraphSchemas())
                        if (!compositionResult.errors) {
                            // await healthCheck(compositionResult.supergraphSdl) //TODO parameterize so this is disabled in dev, enabled in prod
                            update(compositionResult.supergraphSdl)
                        }
                    } catch (e) {
                        console.error(e);
                    }

                    poll();
                }, 2000);
            }

            await poll();

            const compositionResult = await composeServices(await loadSubgraphSchemas())
            if (!compositionResult.errors) {
                return {
                    supergraphSdl: compositionResult.supergraphSdl
                }
            } else {
                return {
                    supergraphSdl: defaultSuperGraph
                }
            }
        },
    }),
});

server.listen({
    port: config.get("Port")
}).then((url: ServerInfo) => {
    console.log(`🚀 Server ready at ${url.url}/graphql`);
})