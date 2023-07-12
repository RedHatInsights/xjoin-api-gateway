import { createLogger, format, transports } from "winston";
import { Response, NextFunction } from "express";
import { IncomingMessage } from "http";
import config from '../config.js';

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

interface Request extends IncomingMessage {
    body: {
        query: string;
    };
}

const { combine, timestamp, printf } = format;

/*
Possible bug here, returning: Property 'timestamp' does not exist on type 'TransformableInfo'
when running tsc
Need to add timestamp to the interface here: https://github.com/winstonjs/logform/blob/master/index.d.ts#L8
*/
// @ts-ignore
const logFormat = printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
});

export const logRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.method == "OPTIONS") {
        next();
    } else if (req.body !== undefined && req.body.query !== undefined && req.body.query.indexOf("IntrospectionQuery") !== -1) {
        next();
    } else if (req !== undefined && req.body !== undefined) {
        Logger.http(`Supergraph query: ${req.body.query}`);
        next();
    } else {
        next();
    }
};

export const Logger = createLogger({
    level: config.log_level,
    levels,
    format: combine(
        timestamp(),
        logFormat,
        format.json()
    ),
    transports: [new transports.Console()]
});
