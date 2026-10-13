"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const logger_1 = require("./lib/logger");
const requestLogger_1 = require("./middleware/requestLogger");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const product_routes_1 = __importDefault(require("./routes/product.routes"));
const transaction_routes_1 = __importDefault(require("./routes/transaction.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const app = (0, express_1.default)();
exports.app = app;
const PORT = env_1.env.PORT ?? 5000;
app.use(requestLogger_1.requestLogger);
app.use((0, cors_1.default)({
    origin: env_1.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.get('/health', (_req, res) => {
    res.json({ ok: true });
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/products', product_routes_1.default);
app.use('/api/transactions', transaction_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use((_req, res) => {
    res.status(404).json({ message: 'Route not found' });
});
app.use((err, _req, res, _next) => {
    logger_1.logger.error({ err }, 'Unhandled error');
    res.status(500).json({ message: 'Something went wrong' });
});
async function startServer() {
    try {
        await (0, db_1.connectDB)();
        app.listen(PORT, () => {
            logger_1.logger.info(`Server running at http://localhost:${PORT}`);
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error }, 'Failed to start server');
        process.exit(1);
    }
}
startServer();
