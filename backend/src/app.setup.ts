import type { INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { requestContext } from "./common/observability/request-context.middleware";

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix("api/v1");

  if (process.env.TRUST_PROXY === "true") {
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  }

  app.use(requestContext);
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
