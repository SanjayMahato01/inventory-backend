"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.logout = exports.login = exports.signup = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const env_1 = require("../config/env");
const COOKIE_NAME = "token";
const signToken = (userId) => jsonwebtoken_1.default.sign({ userId }, env_1.env.JWT_SECRET, {
    expiresIn: env_1.env.JWT_EXPIRES_IN,
});
const cookieOptions = {
    httpOnly: true,
    secure: env_1.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
const signup = async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }
        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters" });
        }
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ message: "Email already in use" });
        }
        const hashed = await bcryptjs_1.default.hash(password, 10);
        const user = await prisma_1.prisma.user.create({
            data: { email, password: hashed, name },
            select: { id: true, email: true, name: true, createdAt: true },
        });
        const token = signToken(user.id);
        res.cookie(COOKIE_NAME, token, cookieOptions);
        return res.status(201).json({ user });
    }
    catch (err) {
        console.error("signup error:", err);
        return res.status(500).json({ message: "Something went wrong" });
    }
};
exports.signup = signup;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password);
        if (!valid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const token = signToken(user.id);
        res.cookie(COOKIE_NAME, token, cookieOptions);
        return res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        });
    }
    catch (err) {
        console.error("login error:", err);
        return res.status(500).json({ message: "Something went wrong" });
    }
};
exports.login = login;
const logout = async (_req, res) => {
    res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: env_1.env.NODE_ENV === "production",
        sameSite: "lax",
    });
    return res.json({ message: "Logged out" });
};
exports.logout = logout;
const me = async (req, res) => {
    return res.json({ user: req.user });
};
exports.me = me;
