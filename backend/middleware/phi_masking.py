import re
import logging

class PHIMaskingFilter(logging.Filter):
    """
    Healthcare Data Governance Log Filter.
    Automatically masks sensitive Patient Health Information (PHI) in application logs.
    """
    EMAIL_REGEX = re.compile(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)")
    PHONE_REGEX = re.compile(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b")
    SSN_REGEX = re.compile(r"\b\d{3}-\d{2}-\d{4}\b")

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = self.mask_phi(record.msg)
        return True

    @classmethod
    def mask_phi(cls, text: str) -> str:
        text = cls.EMAIL_REGEX.sub("[EMAIL_PHI_MASKED]", text)
        text = cls.PHONE_REGEX.sub("[PHONE_PHI_MASKED]", text)
        text = cls.SSN_REGEX.sub("[SSN_PHI_MASKED]", text)
        return text
