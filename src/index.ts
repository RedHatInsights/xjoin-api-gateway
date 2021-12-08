import {ServerInfo} from "apollo-server";

import {ApolloServer} from 'apollo-server';
import {XJoinGateway} from './xjoingateway';
import {ApolloGateway, RemoteGraphQLDataSource} from "@apollo/gateway";
import config from 'config';

const gateway = new XJoinGateway({
  serviceList: [],
  debug: true,
  experimental_pollInterval: 10000, // 10 sec
});

// Pass the ApolloGateway to the ApolloServer constructor
const server = new ApolloServer({
  gateway
});

server.listen({
  port: config.get("Port")
}).then((url: ServerInfo) => {
  console.log(`🚀 Server ready at ${url.url}`);
})