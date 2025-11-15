import { EmailService } from '../email/email.service';
import { createBetterAuthInstance } from './better-auth.factory';

const emailService = new EmailService();

export const auth = createBetterAuthInstance(emailService);
