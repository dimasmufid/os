"""Email utilities for transactional notifications."""

from __future__ import annotations

import asyncio
import logging
import ssl
from email.message import EmailMessage
from smtplib import SMTP, SMTP_SSL, SMTPException
from typing import Iterable

from src.config import settings

logger = logging.getLogger(__name__)

_DEFAULT_FALLBACK_TEXT = (
    "This email contains HTML content. If you see this message, enable HTML view."
)
_SMTP_TIMEOUT_SECONDS = 20


async def send_email(
    *,
    to: Iterable[str],
    subject: str,
    html: str,
    text: str | None = None,
    from_email: str | None = None,
) -> None:
    """Send an email via the configured SMTP server.

    When SMTP configuration is incomplete the call becomes a no-op so
    environments without outbound email still work.
    """

    recipients = list(to)
    smtp_host = settings.SMTP_HOST
    if not smtp_host:
        logger.info(
            "SMTP host not configured; skipping email delivery to %s", recipients
        )
        return

    sender = from_email or settings.EMAIL_FROM
    if not sender:
        logger.info(
            "Sender email not configured; skipping email delivery to %s", recipients
        )
        return

    message = EmailMessage()
    message["From"] = sender
    message["To"] = ", ".join(recipients)
    message["Subject"] = subject

    if text:
        message.set_content(text)
    else:
        message.set_content(_DEFAULT_FALLBACK_TEXT)

    message.add_alternative(html, subtype="html")

    await _deliver_message(
        message=message,
        host=smtp_host,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASS,
    )


async def _deliver_message(
    *,
    message: EmailMessage,
    host: str,
    port: int | None,
    username: str | None,
    password: str | None,
) -> None:
    smtp_port = port or 587

    def _send() -> None:
        context = ssl.create_default_context()

        if smtp_port == 465:
            with SMTP_SSL(
                host=host,
                port=smtp_port,
                timeout=_SMTP_TIMEOUT_SECONDS,
                context=context,
            ) as client:
                client.ehlo()
                if username:
                    client.login(username, password or "")
                client.send_message(message)
                return

        with SMTP(host=host, port=smtp_port, timeout=_SMTP_TIMEOUT_SECONDS) as client:
            client.ehlo()
            client.starttls(context=context)
            client.ehlo()
            if username:
                client.login(username, password or "")
            client.send_message(message)

    try:
        await asyncio.to_thread(_send)
    except SMTPException as exc:
        logger.error("SMTP email delivery failed: %s", exc)
    except OSError as exc:
        logger.error("SMTP connection failed: %s", exc)


async def send_invitation_email(
    *,
    invitee_email: str,
    inviter_name: str,
    organization_name: str,
    invite_url: str,
) -> None:
    """Send the organization invitation email with a primary call-to-action."""

    subject = f"You're invited to join {organization_name} on Entrefine Omnichannel"
    text_body = (
        f"{inviter_name} invited you to join the {organization_name} workspace "
        f"on Entrefine Omnichannel.\n"
        f"Accept the invitation: {invite_url}"
    )

    html_body = f"""
    <div
      style="font-family: 'Inter', -apple-system, BlinkMacSystemFont,
             'Segoe UI', sans-serif;"
    >
      <p style="font-size: 16px;">Hi there,</p>
      <p style="font-size: 16px;">
        <strong>{inviter_name}</strong> invited you to collaborate in the
        <strong>{organization_name}</strong> workspace on Entrefine Omnichannel.
      </p>
      <p style="font-size: 16px;">
        Entrefine Omnichannel centralizes marketplace and storefront sales so your team can
        make decisions faster.
      </p>
      <p style="margin: 32px 0; text-align: center;">
        <a
          href="{invite_url}"
          style="display: inline-block; padding: 14px 24px; border-radius: 8px;
                 background-color: #18181b; color: #ffffff;
                 text-decoration: none; font-weight: 600;"
          target="_blank"
          rel="noopener noreferrer"
        >
          Accept invitation
        </a>
      </p>
      <p style="font-size: 14px; color: #52525b;">
        This link takes you to Entrefine Omnichannel, where you can finish setting up your
        account using the email <strong>{invitee_email}</strong>.
      </p>
      <p style="font-size: 14px; color: #52525b;">
        If you weren't expecting this, you can safely ignore it.
      </p>
      <p style="font-size: 14px; color: #52525b; margin-top: 32px;">
        — Team Entrefine Omnichannel
      </p>
    </div>
    """

    await send_email(
        to=[invitee_email],
        subject=subject,
        html=html_body,
        text=text_body,
    )


async def send_password_reset_email(
    *,
    to_email: str,
    reset_url: str,
    full_name: str | None = None,
) -> None:
    """Send the password reset email with reset instructions."""

    display_name = full_name or "there"
    subject = "Reset your Entrefine Omnichannel password"
    text_body = (
        f"Hi {display_name},\n\n"
        f"We received a request to reset your Entrefine Omnichannel password.\n"
        f"Reset your password: {reset_url}\n\n"
        "If you didn't request this, you can ignore this email."
    )

    html_body = f"""
    <div
      style="font-family: 'Inter', -apple-system, BlinkMacSystemFont,
             'Segoe UI', sans-serif;"
    >
      <p style="font-size: 16px;">Hi {display_name},</p>
      <p style="font-size: 16px;">
        We received a request to reset your Entrefine Omnichannel password.
      </p>
      <p style="margin: 32px 0; text-align: center;">
        <a
          href="{reset_url}"
          style="display: inline-block; padding: 14px 24px; border-radius: 8px;
                 background-color: #18181b; color: #ffffff;
                 text-decoration: none; font-weight: 600;"
          target="_blank"
          rel="noopener noreferrer"
        >
          Reset password
        </a>
      </p>
      <p style="font-size: 14px; color: #52525b;">
        If you didn't request this, you can safely ignore this email.
      </p>
      <p style="font-size: 14px; color: #52525b; margin-top: 32px;">
        — Team Entrefine Omnichannel
      </p>
    </div>
    """

    await send_email(
        to=[to_email],
        subject=subject,
        html=html_body,
        text=text_body,
    )


async def send_verification_email(
    *,
    to_email: str,
    verify_url: str,
    full_name: str | None = None,
) -> None:
    """Send the email verification message with primary CTA."""

    display_name = full_name or "there"
    subject = "Verify your Entrefine Omnichannel email"
    text_body = (
        f"Hi {display_name},\n\n"
        "Thanks for creating an Entrefine Omnichannel account.\n"
        f"Verify your email: {verify_url}\n\n"
        "If you did not sign up, you can safely ignore this email."
    )

    html_body = f"""
    <div
      style="font-family: 'Inter', -apple-system, BlinkMacSystemFont,
             'Segoe UI', sans-serif;"
    >
      <p style="font-size: 16px;">Hi {display_name},</p>
      <p style="font-size: 16px;">
        Thanks for creating an Entrefine Omnichannel account. Please confirm your email
        address to secure your workspace.
      </p>
      <p style="margin: 32px 0; text-align: center;">
        <a
          href="{verify_url}"
          style="display: inline-block; padding: 14px 24px; border-radius: 8px;
                 background-color: #18181b; color: #ffffff;
                 text-decoration: none; font-weight: 600;"
          target="_blank"
          rel="noopener noreferrer"
        >
          Verify email
        </a>
      </p>
      <p style="font-size: 14px; color: #52525b;">
        If you did not sign up for Entrefine Omnichannel, you can safely ignore this email.
      </p>
      <p style="font-size: 14px; color: #52525b; margin-top: 32px;">
        — Team Entrefine Omnichannel
      </p>
    </div>
    """

    await send_email(
        to=[to_email],
        subject=subject,
        html=html_body,
        text=text_body,
    )
