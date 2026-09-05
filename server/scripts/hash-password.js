/*
  Usage: npm run hash-password -- "your password"

  Prints a bcrypt hash to paste into PASSWORD_HASH. The plaintext password
  never leaves your machine and is never stored anywhere.
*/

const bcrypt = require("bcryptjs");

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run hash-password -- "your password"');
  process.exit(1);
}

if (password.length < 10) {
  console.error("Use at least 10 characters. This is the only thing between the internet and your finances.");
  process.exit(1);
}

console.log(bcrypt.hashSync(password, 12));
