import { createLogger, format, transports } from 'winston'
import config from 'config'
import { Response, NextFunction } from 'express'
import { IncomingMessage } from 'http'

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
}

interface Request extends IncomingMessage {
    body: {
        query: String;
    };
}

const { combine, timestamp, printf } = format;

const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
})

export const logRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.method == 'OPTIONS') {
        next()
    } else if (req.body !== undefined && req.body.query !== undefined && req.body.query.indexOf('IntrospectionQuery') !== -1) {
        next()
    } else if (req !== undefined && req.body !== undefined) {
        Logger.http(`Supergraph query: ${req.body.query}`)
        next()
    } else {
        next()
    }
}

export const Logger = createLogger({
    level: config.get("LOG_LEVEL"),
    levels,
    format: combine(
        timestamp(),
        logFormat,
        format.json()
    ),
    transports: [new transports.Console()]
})