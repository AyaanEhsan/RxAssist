# email_generator.py

import google.generativeai as genai
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os


from models.checkforupdaterequest import CheckForUpdateRequest
from models.tierinsightrequest import TierInsightRequest
from models.tierchange import TierChange
from models.tiersnapshot import TierSnapshot
from models.costpoint import CostPoint
from models.tiersnapshot import TierSnapshot
from models.tiercomparison import TierComparison
from models.emaildraftcontext import EmailDraftContext
from models.tierinsightresponse import TierInsightResponse


from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = os.getenv("SENDER_EMAIL")
SENDER_PASSWORD = os.getenv("SENDER_PASSWORD")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-2.5-flash")


def generate_and_send_email(recipient_email: str, patient_name: str, tier_changes: list):
    """
    Generates an email using Gemini based on tier changes and sends it.
    Only sends if there are actual tier changes.
    """
    # Filter only drugs that actually changed tiers
    changed_drugs = [tc for tc in tier_changes if tc.has_tier_changed]

    if not changed_drugs:
        print("No tier changes detected. Skipping email.")
        return

    # Build a summary of changes for the prompt
    changes_summary = "\n".join([
        f"- Drug RXCUI {tc.rxcui} (NDC: {tc.ndc}): Tier {tc.tier_before} → Tier {tc.tier_after}"
        for tc in changed_drugs
    ])

    prompt = f"""
Generate a professional and empathetic email for a Medicare patient named {patient_name}.

The following drugs have had their formulary tier increased in their Medicare Part D plan:

{changes_summary}

A higher tier means higher out-of-pocket costs for the patient.
Advise them to contact their plan provider or doctor to explore lower-tier alternatives or request an exception.
Keep the tone clear, warm, and easy to understand for an elderly patient.

Format strictly as:
Subject: <subject line>
<blank line>
<email body>
"""

    response = model.generate_content(prompt)
    generated_text = response.text.strip()

    # Parse subject and body
    lines = generated_text.split("\n")
    subject = lines[0].replace("Subject:", "").strip()
    body = "\n".join(lines[1:]).strip()

    print("Generated Subject:", subject)
    print("Generated Body:\n", body)

    # Send email
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = SENDER_EMAIL
    msg["To"] = recipient_email
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, recipient_email, msg.as_string())

    print(f"Email sent successfully to {recipient_email}!")