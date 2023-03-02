import { ApolloServer } from "apollo-server-express";
import { ApolloGateway, IntrospectAndCompose, ServiceDefinition } from "@apollo/gateway";
import config from "./config";
import got, { Response } from "got";
import { parse } from "graphql";
import { composeServices } from "@apollo/composition";
import { readFileSync } from "fs";
import { Artifact, ArtifactsResponse } from "./interfaces";
import express from "express";
import { Logger, logRequestMiddleware } from "./logger/logger";


const defaultSuperGraph = readFileSync("./default-super-graph.graphql").toString();

async function fetchArtifacts(): Promise<Response<ArtifactsResponse>> {

    // Function to fetch artifacts from Schema Registry
    // In dev we use Apicurio
    const artifactsPath = "v2/search/artifacts?labels=graphql"; // Make it constant

    try {
        Logger.debug(`Fetching artifacts at: ${config.registry}/${artifactsPath}`);
        const artifacts: Response<ArtifactsResponse> = await got.get(artifactsPath, {
            prefixUrl: config.registry,
            responseType: "json",
            headers: {
                Accept: "application/json"
            },
            timeout: {
                request: config.timeout
            }
        });
        Logger.debug(`Successfully fetched artifacts from: ${config.registry}/${artifactsPath}`);
        return artifacts;
    } catch (err: any) {
        Logger.error(`Failed to fetch artifacts from: ${config.registry}/${artifactsPath}`);
        throw (err);
    }

}

async function fetchArtifactsDetails(artifact: Artifact): Promise<Response<string>> {

    let artifactPath = "";
    if (artifact.groupId !== undefined) {
        artifactPath = `v1/groups/${artifact.groupId}/artifacts/${artifact.id}`;
        Logger.debug(`Artifact has group, using resource path: ${artifactPath}`);
    } else {
        artifactPath = `v1/artifacts/${artifact.id}`;
        Logger.debug(`Using resource path: ${artifactPath}`);
    }

    try {

        Logger.debug(`Fetching artifact details at: ${config.registry}/${artifactPath}`);
        const artifact: Response<string> = await got.get(artifactPath, {
            prefixUrl: config.registry,
            timeout: {
                request: config.timeout
            },
        });
        Logger.debug(`Successfully fetched artifact details from: ${config.registry}/${artifactPath}`);
        return artifact;
    } catch (err: any) {
        Logger.error(`Failed to fetch artifact details from: ${config.registry}/${artifactPath}`);
        throw (err);
    }
}

function extractSubgraphUrl(artifact: Artifact) {

    Logger.debug(`Extracting Subgraph URL from artifact: ${artifact.id}`);
    let url = "";

    if (artifact.labels !== undefined) {
        for (const label of artifact.labels) {
            if (label.startsWith("xjoin-subgraph-url=")) {
                url = label.split("xjoin-subgraph-url=")[1];
            }
        }
    }

    Logger.debug(`Extracted URL from artifact: ${url}`);
    return url;
}

async function loadSubgraphSchemas(): Promise<ServiceDefinition[]> {

    let artifacts: Artifact[];
    const serviceDefinitions: ServiceDefinition[] = [];

    try {
        Logger.info("Fetching artifacts from Schema Registry")
        const artifactsRespose: Response<ArtifactsResponse> = await fetchArtifacts();
        artifacts = artifactsRespose.body.artifacts;
    } catch (err: any) {
        Logger.error(`Failed to fetch artifacts with error: ${err.message}`);
        return err;
    }

    if (artifacts.length == 0) {
        Logger.warn("No artifacts found at the Schema Registry");
        return [];
    }

    Logger.info(`Found ${artifacts.length} artifacts`);
    for (const artifact of artifacts) {
        try {
            Logger.info(`Fetching details of artifact: ${artifact.id}`);
            const gqlResponse: Response<string> = await fetchArtifactsDetails(artifact);

            const url = extractSubgraphUrl(artifact);

            serviceDefinitions.push({
                name: artifact.id,
                url: url,
                typeDefs: parse(gqlResponse.body)
            });
        } catch (err: any) {
            Logger.error(`Failed to fetch artifact details with error: ${err.message}`);
            throw (err);
        }
    }

    return serviceDefinitions;


}

const gateway = new ApolloGateway({

    async supergraphSdl({ update, healthCheck }) {
        const interval = Number(config.interval);

        const poll = function () {
            Logger.info(`Fetching Subgraph Schemas every ${interval}ms`)
            setTimeout(async () => {
                try {

                    const compositionResult = await composeServices(await loadSubgraphSchemas());
                    if (!compositionResult.errors) {
                        // await healthCheck(compositionResult.supergraphSdl) //TODO parameterize so this is disabled in dev, enabled in prod
                        update(compositionResult.supergraphSdl);
                    }
                } catch (e: any) {
                    Logger.error(e.message);
                }

                poll();
            }, interval);
        };
        await poll();
        const compositionResult = await composeServices(await loadSubgraphSchemas());
        if (!compositionResult.errors) {
            return {
                supergraphSdl: compositionResult.supergraphSdl
            };
        } else {
            return {
                supergraphSdl: defaultSuperGraph
            };
        }
    },
});

async function start() {

    const app = express();

    app.use(express.json());
    app.use(logRequestMiddleware);

    app.listen({ port: config.port }, () => {
        Logger.info(`Server ready at http://localhost:${config.port}${server.graphqlPath}`);
    });

    const server = new ApolloServer({
        introspection: true,
        gateway: gateway
    });

    await server.start().then(() => {
        Logger.info("Starting Apollo Server");
    });

    server.applyMiddleware({ app });
}

start();
