import os
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests
from dotenv import load_dotenv


from src.celery import celery_app
from src.config import settings

load_dotenv()

# SMTP_HOST = "mail.smtp2go.com"
# SMTP_PORT = 2525
# SMTP_USER = "chapmoney.org"
# SMTP_PASSWORD = "8TvtWLNspl8KYKeP"
# ADMIN_EMAIL = "chapmoneyapp@chapmoney.org"

# USER_MAIL = "diarra.msa@gmail.com"

API_KEY = os.getenv("RUSEND_API_KEY")
URL = "https://api.beta.rusender.ru/api/v1/external-mails/send"

dashboard_url = settings.ADMIN_DASHBOARD_URL

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def send_transaction_email(self, transaction_id: str):
    transaction_url = f"{dashboard_url}/{transaction_id}"

    payload = {
        "idempotencyKey": str(uuid.uuid4()),  # Clé unique recommandée
        "mail": {
            "to": {
                "email": "diarra.msa@gmail.com",
                "name": "Moustapha Diarra"
            },
            "from": {
                "email": "admin@chapdemo.ru",
                "name": "ChapDemo"
            },
            "subject": "💸New transaction",
            "previewTitle": "Vous avez une nouvelle en cours",
            "html": f"""
                <html>
                    <head>
                        <style>
                            body {{ 
                                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                                line-height: 1.6; 
                                color: #444444;
                                margin: 0;
                                padding: 20px;
                            }}
                            .container {{ 
                                max-width: 600px; 
                                margin: 0 auto; 
                                background: #ffffff;
                                border-radius: 10px;
                                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            }}
                            .header {{
                                background: #2ECC71;
                                padding: 30px;
                                border-radius: 10px 10px 0 0;
                                text-align: center;
                            }}
                            .header h1 {{ 
                                color: white; 
                                margin: 0;
                                font-size: 24px;
                            }}
                            .content {{ 
                                padding: 30px;
                            }}
                            .alert {{
                                color: #c0392b;
                                font-weight: bold;
                                font-size: 18px;
                                margin-bottom: 20px;
                            }}
                            .button {{
                                display: inline-block;
                                background: #2ECC71;
                                color: white !important;
                                padding: 12px 25px;
                                text-decoration: none;
                                border-radius: 5px;
                                margin: 20px 0;
                                font-weight: bold;
                            }}
                            .footer {{
                                text-align: center;
                                padding: 20px;
                                background: #f7f7f7;
                                border-radius: 0 0 10px 10px;
                                font-size: 12px;
                                color: #666666;
                            }}
                            @media screen and (max-width: 600px) {{
                                .container {{
                                    width: 100% !important;
                                }}
                            }}
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>🔄 Transaction en Cours - ChapMoney</h1>
                            </div>
        
                            <div class="content">
                                <p>Bonjour Administrateur,</p>
        
                                <p class="alert">❗ Une nouvelle transaction nécessite votre attention !</p>
        
                                <p>Une activité financière vient d'être initiée sur la plateforme ChapMoney.</p>
        
                                <p><strong>Détails importants :</strong></p>
                                <ul>
                                    <li>Type de transaction: Paiement</li>
                                    <li>Statut: En attente de validation</li>
                                    <li>Action requise: Vérification manuelle</li>
                                </ul>
        
                                <center>
                                    <a href="{transaction_url}" class="button">Vérifier la transaction</a>
                                </center>
        
                                <p>Pour des raisons de sécurité, cette opération doit être approuvée dans les plus brefs délais.</p>
                            </div>
        
                            <div class="footer">
                                <p>© 2024 ChapMoney - Tous droits réservés</p>
                                <p>Ceci est un message automatique, merci de ne pas y répondre</p>
                            </div>
                        </div>
                    </body>
                </html>
        """
    }}

    headers = {
        "Content-Type": "application/json",
        "X-Api-Key": API_KEY
    }

    # ==== Envoi ====
    response = requests.post(URL, json=payload, headers=headers)

    # ==== Résultat ====
    print("Status code:", response.status_code)
    print("Response JSON:", response.json())


# @celery_app.task(bin=True, max_retries=3, default_retry_delay=60)
# def send_password_reset_email(user_email: str, reset_link: str):
#     msg = MIMEMultipart('alternative')
#     msg['Subject'] = "🔐 Réinitialisation de mot de passe"
#     msg["From"] = "ChapMoney Support <chapmoneyapp@chapmoney.org>"
#     msg['To'] = user_email

#     html_content = f"""
#     <html>
#         <head>
#             <style>
#                 body {{ 
#                     font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
#                     line-height: 1.6; 
#                     color: #444444;
#                     margin: 0;
#                     padding: 20px;
#                 }}
#                 .container {{ 
#                     max-width: 600px; 
#                     margin: 0 auto; 
#                     background: #ffffff;
#                     border-radius: 10px;
#                     box-shadow: 0 2px 10px rgba(0,0,0,0.1);
#                 }}
#                 .header {{
#                     background: #3498db;
#                     padding: 30px;
#                     border-radius: 10px 10px 0 0;
#                     text-align: center;
#                 }}
#                 .header h1 {{ 
#                     color: white; 
#                     margin: 0;
#                     font-size: 24px;
#                 }}
#                 .content {{ 
#                     padding: 30px;
#                 }}
#                 .button {{
#                     display: inline-block;
#                     background: #3498db;
#                     color: white !important;
#                     padding: 12px 25px;
#                     text-decoration: none;
#                     border-radius: 5px;
#                     margin: 20px 0;
#                     font-weight: bold;
#                 }}
#                 .footer {{
#                     text-align: center;
#                     padding: 20px;
#                     background: #f7f7f7;
#                     border-radius: 0 0 10px 10px;
#                     font-size: 12px;
#                     color: #666666;
#                 }}
#                 @media screen and (max-width: 600px) {{
#                     .container {{
#                         width: 100% !important;
#                     }}
#                 }}
#             </style>
#         </head>
#         <body>
#             <div class="container">
#                 <div class="header">
#                     <h1>🔐 Réinitialisation de mot de passe</h1>
#                 </div>
#                 <div class="content">
#                     <p>Bonjour,</p>
#                     <p>Vous avez demandé une réinitialisation de votre mot de passe pour votre compte ChapMoney.</p>
#                     <p>Veuillez cliquer sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>

#                     <center>
#                         <a href="{reset_link}" class="button">Réinitialiser le mot de passe</a>
#                     </center>

#                     <p>Ce lien est valable pendant 30 minutes. Si vous n’avez pas fait cette demande, ignorez simplement cet email.</p>
#                 </div>

#                 <div class="footer">
#                     <p>© 2024 ChapMoney - Tous droits réservés</p>
#                     <p>Ceci est un message automatique, merci de ne pas y répondre</p>
#                 </div>
#             </div>
#         </body>
#     </html>
#     """
#     msg.attach(MIMEText(html_content, "html"))

#     with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
#         server.starttls()
#         server.login(SMTP_USER, SMTP_PASSWORD)
#         server.sendmail("chapmoneyapp@chapmoney.org", "contact@chapmoney.org", msg.as_string())


# @celery_app.task(bin=True, max_retries=3, default_retry_delay=60)
# def send_password_reset_otp(user_email: str, otp_code: str):
#     msg = MIMEMultipart('alternative')
#     msg['Subject'] = "🔢 Votre code de vérification ChapMoney"
#     msg["From"] = "ChapMoney Support <chapmoneyapp@chapmoney.org>"
#     msg['To'] = user_email

#     html_content = f"""
#     <html>
#         <head>
#             <style>
#                 body {{
#                     font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
#                     line-height: 1.6;
#                     color: #444444;
#                     margin: 0;
#                     padding: 20px;
#                     background-color: #f7f9fc;
#                 }}
#                 .container {{
#                     max-width: 600px;
#                     margin: 0 auto;
#                     background: #ffffff;
#                     border-radius: 15px;
#                     box-shadow: 0 4px 15px rgba(0,0,0,0.1);
#                 }}
#                 .header {{
#                     background: #2c3e50;
#                     padding: 40px 20px;
#                     border-radius: 15px 15px 0 0;
#                     text-align: center;
#                 }}
#                 .header h1 {{
#                     color: white;
#                     margin: 0;
#                     font-size: 26px;
#                     letter-spacing: 1px;
#                 }}
#                 .content {{
#                     padding: 40px;
#                 }}
#                 .otp-box {{
#                     background: #f4f6f9;
#                     border-radius: 8px;
#                     padding: 25px;
#                     margin: 30px 0;
#                     text-align: center;
#                     border: 2px dashed #3498db;
#                 }}
#                 .otp-code {{
#                     font-size: 32px;
#                     font-weight: 700;
#                     color: #2c3e50;
#                     letter-spacing: 3px;
#                     margin: 15px 0;
#                 }}
#                 .warning {{
#                     color: #e74c3c;
#                     font-size: 14px;
#                     margin-top: 25px;
#                 }}
#                 .footer {{
#                     text-align: center;
#                     padding: 25px;
#                     background: #2c3e50;
#                     border-radius: 0 0 15px 15px;
#                     color: #ecf0f1;
#                     font-size: 12px;
#                 }}
#             </style>
#         </head>
#         <body>
#             <div class="container">
#                 <div class="header">
#                     <h1>🔒 Protection de votre compte</h1>
#                 </div>

#                 <div class="content">
#                     <p>Bonjour,</p>
#                     <p>Vous avez initié une réinitialisation de mot de passe. Utilisez ce code de vérification à usage unique :</p>

#                     <div class="otp-box">
#                         <p style="margin:0 0 10px 0;color: #7f8c8d;">Code de vérification</p>
#                         <div class="otp-code">{otp_code}</div>
#                         <small>Valable pendant 15 minutes</small>
#                     </div>

#                     <p class="warning">⚠️ Ne partagez jamais ce code avec qui que ce soit.</p>

#                     <p>Si vous n'avez pas fait cette demande, veuillez ignorer cet email ou nous contacter immédiatement.</p>
#                 </div>

#                 <div class="footer">
#                     <p>© 2024 ChapMoney - Sécurité des comptes</p>
#                     <p>Cet email a été généré automatiquement - Merci de ne pas y répondre</p>
#                 </div>
#             </div>
#         </body>
#     </html>
#     """
#     msg.attach(MIMEText(html_content, "html"))

#     with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
#         server.starttls()
#         server.login(SMTP_USER, SMTP_PASSWORD)
#         server.sendmail("chapmoneyapp@chapmoney.org", "contact@chapmoney.org", msg.as_string())



