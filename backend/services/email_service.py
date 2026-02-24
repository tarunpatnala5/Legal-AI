import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
APP_URL = os.getenv("APP_URL", "http://localhost:3000")

def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """
    Send a password reset email. Returns True if sent, False if SMTP not configured.
    If SMTP is not configured, logs the reset link to the console for dev use.
    """
    reset_link = f"{APP_URL}/auth/reset-password?token={reset_token}"

    if not SMTP_EMAIL or not SMTP_PASSWORD:
        print(f"[EMAIL - NO SMTP CONFIGURED] Password reset link for {to_email}:")
        print(f"  {reset_link}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Legal AI - Password Reset Request"
        msg["From"] = f"Legal AI Assistant <{SMTP_EMAIL}>"
        msg["To"] = to_email

        html = f"""
        <html><body style="font-family:sans-serif;max-width:600px;margin:auto;padding:20px;">
            <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
                <h1 style="color:white;margin:0;">⚖️ Legal AI Assistant</h1>
            </div>
            <div style="background:#f8fafc;padding:30px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;">
                <h2 style="color:#1e293b;">Password Reset Request</h2>
                <p style="color:#475569;">You requested to reset your password. Click the button below to set a new one:</p>
                <div style="text-align:center;margin:30px 0;">
                    <a href="{reset_link}" 
                       style="background:#2563eb;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color:#94a3b8;font-size:0.85em;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
                <p style="color:#94a3b8;font-size:0.8em;">Or copy this link: <a href="{reset_link}">{reset_link}</a></p>
            </div>
        </body></html>
        """

        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())

        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send email to {to_email}: {e}")
        return False
