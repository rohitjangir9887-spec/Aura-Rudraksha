import fs from 'fs';

let content = fs.readFileSync('server/controllers/settingController.js', 'utf8');

const importStr = `import { sendSupportTicketCreatedEmail, sendSupportTicketReplyEmail } from "../services/emailService.js";`;

// replace "import { isDbConnected } from "../config/db.js";"
content = content.replace(
  'import { isDbConnected } from "../config/db.js";',
  `import { isDbConnected } from "../config/db.js";\n${importStr}`
);

// inside createTicket
content = content.replace(
  `const ticket = await Ticket.create(ticketData);`,
  `const ticket = await Ticket.create(ticketData);
    
    // Notify customer
    if (ticket.email) {
       sendSupportTicketCreatedEmail({ to: ticket.email, name: ticket.name, ticket }).catch(err => console.error("Ticket email err", err));
    }`
);

// inside updateTicket
content = content.replace(
  `const updatedTicket = await Ticket.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();`,
  `const updatedTicket = await Ticket.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
    
    if (updatedTicket && data.adminReply && data.adminReply.trim() !== '') {
       if (updatedTicket.email) {
          sendSupportTicketReplyEmail({ to: updatedTicket.email, name: updatedTicket.name, ticket: updatedTicket, reply: data.adminReply }).catch(err => console.error("Ticket reply err", err));
       }
    }`
);

fs.writeFileSync('server/controllers/settingController.js', content);
console.log("Patched settingController.js");
