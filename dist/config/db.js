"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const prisma_1 = require("../lib/prisma");
async function connectDB() {
    try {
        await prisma_1.prisma.$connect();
        console.log("Database connected");
    }
    catch (error) {
        console.error("Failed to connect to the database", error);
        process.exit(1);
    }
}
