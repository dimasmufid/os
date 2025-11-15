import type { User } from 'better-auth';
import { Injectable } from '@nestjs/common';
import { Resend, type CreateEmailOptions } from 'resend';

import { env } from '../config/env';
import { CreateEmailDto } from './dto/create-email.dto';

type AuthEmailPayload = {
  user: User;
  url: string;
  token: string;
};

type EmailCopy = {
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
};

@Injectable()
export class EmailService {
  private readonly resend = new Resend(env.resendApiKey);

  async send(payload: CreateEmailDto) {
    await this.dispatch({
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    return {
      status: 'queued',
    };
  }

  async sendVerificationEmail(payload: AuthEmailPayload) {
    await this.dispatch({
      to: payload.user.email,
      subject: 'Verify your email',
      ...this.renderAuthCopy({
        title: `Welcome, ${payload.user.name || 'friend'}!`,
        description:
          'Confirm your email address to activate your OS account and begin exploring the world.',
        actionLabel: 'Verify email',
        actionUrl: payload.url,
      }),
    });
  }

  async sendResetPasswordEmail(payload: AuthEmailPayload) {
    await this.dispatch({
      to: payload.user.email,
      subject: 'Reset your password',
      ...this.renderAuthCopy({
        title: 'Reset your password',
        description:
          'We received a password reset request for your OS account. If this was you, click the button below to pick a new password.',
        actionLabel: 'Reset password',
        actionUrl: payload.url,
      }),
    });
  }

  private renderAuthCopy(copy: EmailCopy) {
    const html = `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px">
        <h1 style="font-size: 22px; font-weight: 600; margin-bottom: 16px; color: #111827;">${copy.title}</h1>
        <p style="font-size: 15px; line-height: 24px; margin-bottom: 24px; color: #374151;">
          ${copy.description}
        </p>
        <a
          href="${copy.actionUrl}"
          style="display: inline-block; padding: 12px 20px; font-weight: 600; background-color: #4338CA; color: #ffffff; text-decoration: none; border-radius: 8px;"
        >
          ${copy.actionLabel}
        </a>
        <p style="font-size: 13px; margin-top: 24px; color: #6B7280;">
          If the button does not work, copy and paste the link below into your browser.<br/>
          <a href="${copy.actionUrl}" style="color: #4338CA; word-break: break-all;">${copy.actionUrl}</a>
        </p>
      </div>
    `;

    const text = `${copy.title}\n\n${copy.description}\n\n${copy.actionLabel}: ${copy.actionUrl}`;

    return { html, text };
  }

  private async dispatch({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }) {
    const message: CreateEmailOptions = html
      ? {
          from: env.resendFromEmail,
          to: [to],
          subject,
          html,
          text: text ?? html,
        }
      : {
          from: env.resendFromEmail,
          to: [to],
          subject,
          text: text ?? ' ',
        };

    const { error } = await this.resend.emails.send(message);

    if (error) {
      throw new Error(error.message);
    }
  }
}
