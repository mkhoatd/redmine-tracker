import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { genericOAuth } from "better-auth/plugins";
import { getAuthDatabase } from "./auth-config";

// PostgreSQL configuration
const DATABASE_URL = getAuthDatabase();

console.log("Initializing auth with database:", DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

// Create pool with more aggressive timeout settings
const pool = new Pool({
  connectionString: DATABASE_URL,
  connectionTimeoutMillis: 30000, // 30 seconds
  idleTimeoutMillis: 30000,
  max: 5,
  keepAlive: false, // Disable keep-alive to avoid hanging connections
  allowExitOnIdle: true,
});

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BASE_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "default-secret-please-change",
  
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "mkhoatd",
          clientId: process.env.OIDC_CLIENT_ID!,
          clientSecret: process.env.OIDC_CLIENT_SECRET!,
          discoveryUrl: "https://auth.mkhoatd.com/.well-known/openid-configuration",
          scopes: ["openid", "profile", "email"],
          mapProfileToUser: (profile) => ({
            id: profile.sub,
            name: profile.name,
            email: profile.email,
            image: profile.picture,
          }),
        },
      ],
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
});
