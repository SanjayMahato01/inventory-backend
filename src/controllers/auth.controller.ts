import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middleware/auth.middleware";
import { env } from "../config/env"; 

const COOKIE_NAME = "token";

const signToken = (userId: string) =>
  jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production", 
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, 
};


export const signup = async (req: Request, res: Response) => {
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

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { email, password: hashed, name },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const token = signToken(user.id);
    res.cookie(COOKIE_NAME, token, cookieOptions);

    return res.status(201).json({ user });
  } catch (err) {
    console.error("signup error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
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
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ message: "Something went wrong" });
  }
};


export const logout = async (_req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return res.json({ message: "Logged out" });
};


export const me = async (req: AuthRequest, res: Response) => {

  return res.json({ user: req.user });
};