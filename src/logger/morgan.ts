import morgan, { StreamOptions } from "morgan";
import { IncomingMessage, ServerResponse } from "http";
import { Logger } from "./logger";

interface Request extends IncomingMessage {
    body: {
        query: String;
    };
}

const stream: StreamOptions = {
    write: (message) =>
        Logger.http(message.substring(0, message.lastIndexOf("\n"))),
};

const skip = (req: Request, res: ServerResponse): boolean => {
    //IntrospectionQueries are noisy, skip logging them
    if (req.method === 'OPTIONS') {
        return true;
    } else {
        return req.body !== undefined && req.body.query !== undefined && req.body.query.indexOf('IntrospectionQuery') !== -1;
    }
};

const registerSuperGraphToken = () => {
    morgan.token("super-graph", (req: Request) => {
        if (req !== undefined && req.body !== undefined)
            return `Supergraph query: ${req.body.query}`
    })
}

registerSuperGraphToken()

export const morganMiddleware = morgan(
    ":method :url :status :res[content-length] - :response-time ms\n:super-graph",
    { stream, skip }
);
