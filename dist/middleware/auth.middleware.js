"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const env_1 = require("../config/env");
const requireAuth = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, name: true },
        });
        if (!user) {
            return res.status(401).json({ message: "User no longer exists" });
        }
        req.user = user;
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};
exports.requireAuth = requireAuth;
