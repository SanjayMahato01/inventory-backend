import 'dotenv/config'
import type { SignOptions } from 'jsonwebtoken'

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`❌ Missing required env: ${name}`)
    process.exit(1)
  }
  return value
}

export const env = {
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as
    | 'development'
    | 'production'
    | 'test',
  PORT: Number(process.env.PORT ?? 5000),
  JWT_SECRET: required('JWT_SECRET'),
  JWT_EXPIRES_IN: (process.env.JWT_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'],
  FRONTEND_URL: required('FRONTEND_URL')
}

if (env.JWT_SECRET.length < 16) {
  console.error('❌ JWT_SECRET must be at least 16 characters')
  process.exit(1)
}