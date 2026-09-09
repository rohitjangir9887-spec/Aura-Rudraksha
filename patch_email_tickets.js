import fs from 'fs';

let content = fs.readFileSync('server/services/emailService.js', 'utf8');

const newEmails = `
export async function sendSupportTicketCreatedEmail({ to, name, ticket }) {
  const subject = \`Support Ticket Created - Aura Rudraksha (#\${ticket.ticketId})\`;
  const html = \`<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #a54d2b;">Ticket Received</h2><p>Namaste \${name},</p><p>We have received your support request.</p><p><strong>Ticket ID:</strong> \${ticket.ticketId}</p><p><strong>Subject:</strong> \${ticket.subject || 'General Inquiry'}</p><p>Our team will get back to you shortly.</p><p>Blessings,<br/>Aura Rudraksha Team</p></div>\`;
  const text = \`Ticket Received\\nNamaste \${name},\\nWe have received your support request. Ticket ID: \${ticket.ticketId}\\nBlessings, Aura Rudraksha Team\`;

  return sendNotificationIdempotent({
    key: \`TICKET_CREATED_\${ticket.ticketId}\`,
    toEmail: to,
    subject, text, html
  });
}

export async function sendSupportTicketReplyEmail({ to, name, ticket, reply }) {
  const subject = \`Re: Support Ticket #\${ticket.ticketId} - Aura Rudraksha\`;
  const html = \`<div style="font-family: sans-serif; max-width: 600px; margin: auto;"><h2 style="color: #a54d2b;">Ticket Update</h2><p>Namaste \${name},</p><p>Our support team has replied to your ticket #\${ticket.ticketId}.</p><div style="padding: 15px; background: #f9f9f9; border-left: 4px solid #a54d2b; margin: 15px 0;">\${reply}</div><p>Blessings,<br/>Aura Rudraksha Team</p></div>\`;
  const text = \`Ticket Update\\nNamaste \${name},\\nOur support team has replied to your ticket #\${ticket.ticketId}.\\n\\n\${reply}\\n\\nBlessings, Aura Rudraksha Team\`;

  return sendNotificationIdempotent({
    key: \`TICKET_REPLY_\${ticket.ticketId}_\${Date.now()}\`,
    toEmail: to,
    subject, text, html
  });
}
`;

content += newEmails;
fs.writeFileSync('server/services/emailService.js', content);
console.log("Patched emailService.js with tickets");
