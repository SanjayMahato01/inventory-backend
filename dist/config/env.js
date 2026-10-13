"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
function required(name) {
    const value = process.env[name];
    if (!value) {
        console.error(`❌ Missing required env: ${name}`);
        process.exit(1);
    }
    return value;
}
exports.env = {
    NODE_ENV: (process.env.NODE_ENV ?? 'development'),
    PORT: Number(process.env.PORT ?? 5000),
    JWT_SECRET: required('JWT_SECRET'),
    JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN ?? '7d'),
    FRONTEND_URL: required('FRONTEND_URL')
};
if (exports.env.JWT_SECRET.length < 16) {
    console.error('❌ JWT_SECRET must be at least 16 characters');
    process.exit(1);
}
