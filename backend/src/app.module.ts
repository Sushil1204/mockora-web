import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";

import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CandidateModule } from "./candidate/candidate.module";
import { ExpertModule } from "./expert/expert.module";
import { RolesGuard } from "./auth/roles.guard";
import { SessionAuthGuard } from "./auth/session-auth.guard";
import { validateEnv } from "./config/env";
import { HealthController } from "./health/health.controller";
import { MarketplaceModule } from "./marketplace/marketplace.module";
import { PrismaModule } from "./prisma/prisma.module";
import { TaxonomyModule } from "./taxonomy/taxonomy.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env.local", ".env"],
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    AdminModule,
    CandidateModule,
    ExpertModule,
    MarketplaceModule,
    TaxonomyModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
