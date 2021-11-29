import {ServerInfo} from "apollo-server";

import {ApolloServer} from 'apollo-server';
import {XJoinGateway} from './xjoingateway';
import {ApolloGateway, RemoteGraphQLDataSource} from "@apollo/gateway";

const gateway = new XJoinGateway({
  serviceList: [],
  debug: true,
  experimental_pollInterval: 10000, // 10 sec
});

// Pass the ApolloGateway to the ApolloServer constructor
const server = new ApolloServer({
  gateway
});

server.listen().then((url: ServerInfo) => {
  console.log(`🚀 Server ready at ${url.url}`);
})