# xjoin-api-gateway

GraphQL service that uses [Apollo Federation](https://www.apollographql.com/docs/federation/) to build a supergraph from
subgraphs defined in an Apicurio schema registry.

### Dependencies

- Node.js v16
- A running instance of an [Apicurio schema registry](https://www.apicur.io/registry/)

### Environment Variables

| Name                     | Description                                                | Default Value |
|--------------------------|------------------------------------------------------------|---------------|
| SCHEMA_REGISTRY_PROTOCOL | Protocol of the schema registry to connect to (http/https) | http          |
| SCHEMA_REGISTRY_HOSTNAME | Hostname of the schema registry to connect to              | localhost     |
| SCHEMA_REGISTRY_PORT     | Port of the schema registry to connect to                  | 1080          |
| PORT                     | Port to use for the xjoin-api-gateway service              | 4000          |
| NODE_CONFIG_DIR          | Directory of config variables                              | dist/config   |

### Running the server
Set each environment variable to the value specific to your environment before running the server.

```shell
npm run start
```