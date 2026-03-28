# email/templates.py


def otp_email_html(user_name: str, otp_code: str) -> str:
    """HTML email template for OTP verification."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#FAF7F2;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <tr>
                        <td style="background-color:#1A1210;padding:28px 32px;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">SurveyAgent</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;color:#1A1210;font-size:16px;">Hi {user_name},</p>
                            <p style="margin:0 0 24px;color:#4a4a4a;font-size:15px;line-height:1.5;">
                                Use the verification code below to complete your registration:
                            </p>
                            <div style="background-color:#FAF7F2;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
                                <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1A1210;">{otp_code}</span>
                            </div>
                            <p style="margin:0 0 8px;color:#4a4a4a;font-size:14px;">This code expires in <strong>10 minutes</strong>.</p>
                            <p style="margin:0;color:#888;font-size:13px;">If you didn't sign up for SurveyAgent, you can safely ignore this email.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #f0ebe4;">
                            <p style="margin:0;color:#aaa;font-size:12px;">&copy; SurveyAgent &mdash; getsurveyagent.com</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def completion_email_html(respondent_name: str, survey_title: str) -> str:
    """HTML email template for survey completion thank-you."""
    greeting = f"Hi {respondent_name}," if respondent_name else "Hi there,"
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#FAF7F2;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <tr>
                        <td style="background-color:#1A1210;padding:28px 32px;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">SurveyAgent</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;color:#1A1210;font-size:16px;">{greeting}</p>
                            <p style="margin:0 0 24px;color:#4a4a4a;font-size:15px;line-height:1.5;">
                                Thanks for completing <strong>{survey_title}</strong>. Your responses have been recorded successfully.
                            </p>
                            <p style="margin:0;color:#888;font-size:13px;">Thank you for taking the time to share your thoughts.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #f0ebe4;">
                            <p style="margin:0;color:#aaa;font-size:12px;">&copy; SurveyAgent &mdash; getsurveyagent.com</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def creator_notification_email_html(
    creator_name: str,
    survey_title: str,
    respondent_name: str | None,
    respondent_email: str | None,
    questions_covered: int,
    total_questions: int,
) -> str:
    """HTML email template for notifying survey creator of a completed interview."""
    respondent_info = ""
    if respondent_name or respondent_email:
        details = []
        if respondent_name:
            details.append(f"<strong>Name:</strong> {respondent_name}")
        if respondent_email:
            details.append(f"<strong>Email:</strong> {respondent_email}")
        details.append(f"<strong>Questions covered:</strong> {questions_covered} / {total_questions}")
        respondent_info = f"""
                            <div style="background-color:#FAF7F2;border-radius:8px;padding:16px;margin:0 0 24px;">
                                {'<br>'.join(details)}
                            </div>"""
    else:
        respondent_info = f"""
                            <div style="background-color:#FAF7F2;border-radius:8px;padding:16px;margin:0 0 24px;">
                                <strong>Questions covered:</strong> {questions_covered} / {total_questions}<br>
                                <span style="color:#888;">Anonymous respondent</span>
                            </div>"""

    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#FAF7F2;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <tr>
                        <td style="background-color:#1A1210;padding:28px 32px;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">SurveyAgent</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;color:#1A1210;font-size:16px;">Hi {creator_name},</p>
                            <p style="margin:0 0 24px;color:#4a4a4a;font-size:15px;line-height:1.5;">
                                Someone just completed your survey <strong>{survey_title}</strong>.
                            </p>
                            {respondent_info}
                            <p style="margin:0;color:#888;font-size:13px;">Log in to your dashboard to view the full response and analytics.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #f0ebe4;">
                            <p style="margin:0;color:#aaa;font-size:12px;">&copy; SurveyAgent &mdash; getsurveyagent.com</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def invite_email_html(org_name: str, inviter_name: str, invite_url: str) -> str:
    """HTML email template for org invite."""
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#FAF7F2;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAF7F2;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
                    <tr>
                        <td style="background-color:#1A1210;padding:28px 32px;">
                            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:600;">SurveyAgent</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <p style="margin:0 0 16px;color:#1A1210;font-size:16px;">You've been invited!</p>
                            <p style="margin:0 0 24px;color:#4a4a4a;font-size:15px;line-height:1.5;">
                                <strong>{inviter_name}</strong> has invited you to join
                                <strong>{org_name}</strong> on SurveyAgent.
                            </p>
                            <div style="text-align:center;margin:0 0 24px;">
                                <a href="{invite_url}"
                                   style="display:inline-block;background-color:#C4956A;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
                                    Accept Invite
                                </a>
                            </div>
                            <p style="margin:0 0 8px;color:#4a4a4a;font-size:14px;">This invite expires in <strong>7 days</strong>.</p>
                            <p style="margin:0;color:#888;font-size:13px;">If you weren't expecting this, you can safely ignore this email.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #f0ebe4;">
                            <p style="margin:0;color:#aaa;font-size:12px;">&copy; SurveyAgent &mdash; getsurveyagent.com</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""
