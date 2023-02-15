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
import { Logger, logRequestMiddleware } from './logger/logger';
import bodyParser from 'body-parser';

const defaultSuperGraph = readFileSync('./default-super-graph.graphql').toString();

async function fetchArtifacts(): Promise<Response<ArtifactsResponse>> {

    // Function to fetch artifacts from Schema Registry
    // In dev we use Apicurio
    const artifactsPath = 'v2/search/artifacts?labels=graphql'
    Logger.debug(`Fetching artifacts at: ${PREFIX}/${artifactsPath}`)
    return await got(artifactsPath, {
        prefixUrl: PREFIX,
        responseType: 'json',
        headers: {
            Accept: 'application/json'
        }
    });

}

async function fetchArtifactsDetails(artifact: Artifact): Promise<Response<string>> {

    let artifactPath = '';
    if (artifact.groupId !== undefined) {
        artifactPath = `v1/groups/${artifact.groupId}/artifacts/${artifact.id}`
        Logger.debug(`Artifact has group, using resource path: ${artifactPath}`)
    } else {
        artifactPath = `v1/artifacts/${artifact.id}`
        Logger.debug(`Using resource path: ${artifactPath}`)
    }

    Logger.debug(`Fetching artifact details at: ${PREFIX}/${artifactPath}`)
    return await got(artifactPath, {
        prefixUrl: PREFIX
    });
}

function extractSubgraphUrl(artifact: Artifact) {

    Logger.debug(`Extracting Subgraph URL from artifact: ${artifact.id}`)
    let url = ''

    if (artifact.labels !== undefined) {
        for (const label of artifact.labels) {
            if (label.startsWith('xjoin-subgraph-url=')) {
                url = label.split('xjoin-subgraph-url=')[1]
            }
        }
    }

    Logger.debug(`Extracted URL from artifact: ${url}`)
    return url
}

async function loadSubgraphSchemas(): Promise<ServiceDefinition[]> {

    Logger.info("Fetching artifacts from Schema Registry")
    const artifactsRespose: Response<ArtifactsResponse> = await fetchArtifacts();

    const serviceDefinitions: ServiceDefinition[] = [];
    const artifacts: Artifact[] = artifactsRespose.body.artifacts;

    if (artifacts.length == 0) {
        Logger.warn("No artifacts found at the Schame Registry")
        return [];
    }

    Logger.info(`Found ${artifacts.length} artifacts`)
    for (const artifact of artifacts) {
        Logger.info(`Fetching details of artifact: ${artifact.id}`)
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
            Logger.info(`Fetching Subgraph Schemas every ${config.get("GRAPHS_SYNC_INTERVAL")}ms`)
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
            }, config.get("GRAPHS_SYNC_INTERVAL"));
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

    Logger.info("Starting Apollo Server")
    await server.start()

    app.use(bodyParser.json())
    app.use(logRequestMiddleware)
    server.applyMiddleware({ app })

    app.listen({ port: config.get("Port") }, () => {
        Logger.info(`Server ready at http://localhost:${config.get("Port")}${server.graphqlPath}`)
    })
}

start()
