import fs from 'fs';

let content = fs.readFileSync('server/routes/customers.js', 'utf8');

if (!content.includes('sendAdminEmail')) {
    content = content.replace(
        'updateCustomerMe\n}',
        'updateCustomerMe,\n  sendAdminEmail\n}'
    );
    
    content = content.replace(
        'export default router;',
        'router.post("/send-email", requireAdmin, sendAdminEmail);\n\nexport default router;'
    );
    
    fs.writeFileSync('server/routes/customers.js', content);
    console.log("Patched customers.js route");
}
