import { ApolloServer } from 'apollo-server-express';
import { ApolloGateway, IntrospectAndCompose, ServiceDefinition } from "@apollo/gateway";
import config from 'config';
import got, { Response } from "got";
import { parse } from "graphql";
import { composeServices } from '@apollo/composition';
import { readFileSync } from "fs";
import { Artifact, ArtifactsResponse } from "./interfaces";
import { PREFIX } from "./registry";
import express from 'express';
import { Logger } from './logger/logger';

const defaultSuperGraph = readFileSync('./default-super-graph.graphql').toString();

async function fetchArtifacts(): Promise<Response<ArtifactsResponse>> {

    // Function to fetch artifacts from Schema Registry
    // In dev we use Apicurio

    // TODO: DEBUG log here

    return await got('v2/search/artifacts?labels=graphql', {
        prefixUrl: PREFIX,
        responseType: 'json',
        headers: {
            Accept: 'application/json'
        }
    });

}

async function fetchArtifactsDetails(artifact: Artifact): Promise<Response<string>> {

    // TODO: DEBUG log here
    let artifactPath = '';
    if (artifact.groupId !== undefined) {
        // TODO: DEBUG log here
        artifactPath = `v1/groups/${artifact.groupId}/artifacts/${artifact.id}`
    } else {
        // TODO: DEBUG log here
        artifactPath = `v1/artifacts/${artifact.id}`
    }

    return await got(artifactPath, {
        prefixUrl: PREFIX
    });

    // TODO: DEBUG log here
}

function extractSubgraphUrl(artifact: Artifact) {

    // TODO: DEBUG log here
    let url = ''

    if (artifact.labels !== undefined) {
        for (const label of artifact.labels) {
            if (label.startsWith('xjoin-subgraph-url=')) {
                // TODO: DEBUG log here
                url = label.split('xjoin-subgraph-url=')[1]
            }
        }
    }

    // TODO: DEBUG log here
    return url
}

async function loadSubgraphSchemas(): Promise<ServiceDefinition[]> {
    // TODO: INFO log here
    const artifactsRespose: Response<ArtifactsResponse> = await fetchArtifacts();

    const serviceDefinitions: ServiceDefinition[] = [];
    const artifacts: Artifact[] = artifactsRespose.body.artifacts;

    if (artifacts.length == 0) {
        // TODO: INFO log here
        return [];
    }

    for (const artifact of artifacts) {
        // TODO: INFO log here
        const gqlResponse: Response<string> = await fetchArtifactsDetails(artifact);

        let url = extractSubgraphUrl(artifact);

        serviceDefinitions.push({
            name: artifact.id,
            url: url,
            typeDefs: parse(gqlResponse.body)
        });
    }

    return serviceDefinitions;
}

const gateway = new ApolloGateway({
    async supergraphSdl({ update, healthCheck }) {
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
            }, 2000); // TODO: May this timeout be higher?
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
});

async function start() {

    const app = express();

    const server = new ApolloServer({
        introspection: true,
        gateway: gateway
    });

    await server.start()

    server.applyMiddleware({ app })

    app.listen({ port: config.get("Port") }, () => {
        Logger.info(`Server ready at http://localhost:${config.get("Port")}/graphql`)
    })
}

start()
