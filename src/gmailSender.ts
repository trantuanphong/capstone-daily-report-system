/**
 * Utility for sending standard emails using the real Gmail API Rest endpoint on the client.
 */

/**
 * Sends an email using the Gmail REST API (POST https://www.googleapis.com/gmail/v1/users/me/messages/send)
 *
 * @param accessToken The Google OAuth API Access Token
 * @param to The recipient's email address
 * @param subject The subject line of the email
 * @param body The text body of the email
 */
export async function sendGmailNotification(
  accessToken: string,
  to: string,
  subject: string,
  body: string
): Promise<any> {
  if (!accessToken) {
    throw new Error('Access Token can not be empty. Please connect Gmail.');
  }
  if (!to) {
    throw new Error('Recipient email is required.');
  }

  // Base64 encode the UTF-8 subject line so Gmail correctly handles Unicode accents of Vietnamese languages.
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  // Construct MIME content
  const emailLines = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body
  ];
  
  const emailContent = emailLines.join('\r\n');
  
  // Base64url encode the entire MIME message safely
  const base64Safe = btoa(unescape(encodeURIComponent(emailContent)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      raw: base64Safe,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail API Error: ${errText}`);
  }

  return await response.json();
}
