import { Module } from "@nestjs/common";

import { BookingsModule } from "../bookings/bookings.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { BookingPaymentsController } from "./booking-payments.controller";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { MockPaymentProvider } from "./providers/mock-payment.provider";
import { PAYMENT_PROVIDER } from "./providers/payment-provider.interface";

@Module({
  imports: [BookingsModule, NotificationsModule],
  controllers: [BookingPaymentsController, PaymentsController],
  providers: [
    MockPaymentProvider,
    { provide: PAYMENT_PROVIDER, useExisting: MockPaymentProvider },
    PaymentsService,
  ],
})
export class PaymentsModule {}
