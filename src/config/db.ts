import  { prisma }  from "../lib/prisma" ;

export async function connectDB() {
  try {
    await prisma.$connect();
    console.log("Database connected");
  } catch (error) {
    console.error("Failed to connect to the database", error);
    process.exit(1);
  }
}