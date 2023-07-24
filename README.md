# xjoin-api-gateway

GraphQL service that uses [Apollo Federation](https://www.apollographql.com/docs/federation/) to build a supergraph from
subgraphs defined in an Apicurio schema registry.

### Dependencies

- Node.js v18
- A running instance of an [Apicurio schema registry](https://www.apicur.io/registry/)

### Environment Variables

| Name                     | Description                                                | Default Value |
|--------------------------|------------------------------------------------------------|---------------|
| LOG_LEVEL                | Logging verbosity (error, warn, info, http, debug)         | info          |
| SCHEMA_REGISTRY_PROTOCOL | Protocol of the schema registry to connect to (http/https) | http          |
| GRAPH_SYNC_INTERVAL      | Interval between graph synchronization                     | 60000         |
| REQUEST_TIMEOUT          | Timeout tolerance when talking to the service registry     | 3000          |
| ACG_CONFIG               | Path to the clowder configmap JSON file (impliciy)         |               |

### Running the server
Set each environment variable to the value specific to your environment before running the server.


```shell
npm run start
```
