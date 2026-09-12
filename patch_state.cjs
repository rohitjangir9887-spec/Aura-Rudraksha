const fs = require('fs');
let content = fs.readFileSync('server/services/stateMachineService.js', 'utf-8');

content = content.replace(
  /PENDING: "Pending",/,
  `PENDING: "Pending",
  CANCELLED: "Cancelled",`
);

content = content.replace(
  /\[PAYMENT_STATES\.PENDING\]: \[([\s\S]*?)\],/,
  `[PAYMENT_STATES.PENDING]: [$1, PAYMENT_STATES.CANCELLED],`
);

content = content.replace(
  /\[PAYMENT_STATES\.FAILED\]: \[([\s\S]*?)\],/,
  `[PAYMENT_STATES.FAILED]: [$1, PAYMENT_STATES.CANCELLED],
  [PAYMENT_STATES.CANCELLED]: [PAYMENT_STATES.PENDING, PAYMENT_STATES.PAID],`
);

fs.writeFileSync('server/services/stateMachineService.js', content);
