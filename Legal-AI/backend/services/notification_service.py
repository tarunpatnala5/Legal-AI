import logging

class NotificationService:
    def __init__(self):
        self.logger = logging.getLogger("NotificationService")

    async def send_email(self, user_email: str, subject: str, message: str):
        # Placeholder: Send grid or SMTP implementation
        self.logger.info(f"Sending Email to {user_email} | Subject: {subject}")
        print(f"EMAIL SENT TO {user_email}: {message}")

    async def create_system_notification(self, user_id: int, message: str):
        # Write to database notification table
        self.logger.info(f"System Notification for User {user_id}: {message}")

notification_service = NotificationService()
