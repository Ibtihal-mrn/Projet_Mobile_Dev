import { expo } from "@better-auth/expo";
import prisma from "@my-better-t-app/db";
import { env } from "@my-better-t-app/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: [
    env.CORS_ORIGIN,
    "my-better-t-app://",
    "mybettertapp://",
    "exp://", 
    "exp://**",
    ...(env.NODE_ENV === "development"
      ? [ "exp://192.168.*.*:*/**", "http://localhost:8081"]
      : []),
  ],
  emailAndPassword: {
    enabled: true,
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const base =
            (user.name || user.email.split("@")[0] || "user")
              .toLowerCase()
              .replace(/[^a-z0-9_]/g, "") || "user";

          let username = base;
          for (let i = 0; i < 5; i++) {
            const taken = await prisma.appUser.findUnique({ where: { username } });
            if (!taken) break;
            username = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
          }

          await prisma.appUser.upsert({
            where: { email: user.email },
            create: {
              email: user.email,
              username,
              passwordHash: "managed-by-better-auth",
            },
            update: {},
          });
        },
      },
    },
  },
  plugins: [tanstackStartCookies(), expo()],
});
