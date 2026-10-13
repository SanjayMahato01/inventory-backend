"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const pino_http_1 = __importDefault(require("pino-http"));
const logger_1 = require("../lib/logger");
exports.requestLogger = (0, pino_http_1.default)({
    logger: logger_1.logger,
    autoLogging: {
        ignore: (req) => req.url === '/health',
    },
    customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500)
            return 'error';
        if (res.statusCode >= 400)
            return 'warn';
        return 'info';
    },
    customSuccessMessage: (req, res) => `${req.method} ${req.url} → ${res.statusCode}`,
});
