import winston from 'winston'
import config from 'config'

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
}

const transports = [
    new winston.transports.Console(),
]

export const Logger = winston.createLogger({
    level: config.get("LOG_LEVEL"),
    levels,
    format: winston.format.json(),
    transports,
})
