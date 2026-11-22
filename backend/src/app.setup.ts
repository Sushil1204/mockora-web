import type { INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix("api/v1");
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.FRONTEND_URL ?? "http://localhost:3000")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });
  app.useGlobalFilters(new AllExceptionsFilter());
}
