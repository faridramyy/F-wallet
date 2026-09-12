# F-Wallet

A personal finance app built for one person. Track accounts, budgets, income and spending, see where your money actually goes, and add transactions from your phone with a single API call.

Live at [faridramyy.github.io/F-wallet](https://faridramyy.github.io/F-wallet/)

---

## What it does

### Dashboard

The overview. Net worth, income and expenses for the month, a six month cash flow chart, spending broken down by category, budget progress, credit card health, and your most recent transactions. Pick any month to look back at.

### Accounts

Chequing, savings, cash and credit cards. Each shows its live balance, calculated from your starting balance plus every transaction since.

Credit cards work in reverse: spending increases the balance and payments reduce it, so a positive number means debt. Cards also track their limit, how much you have used, and how much credit is left.

Three figures sit at the top: available credit, card debt, and net money, which is what you actually have once every card is paid off.

Any non-credit account can be excluded from that total with a toggle. Useful for savings or investments you would rather not count as spendable.

Accounts can be moved into any order, and that order applies everywhere they appear.

### Categories

Where money goes and where it comes from.

Expense categories hold a monthly budget and show how much of it you have used.

Income categories can be set to **fixed amount** for bonuses, gifts and refunds, or **hourly** with a rate per hour and a rate per overtime hour. That choice decides how the transaction form opens when you pick the category.

Categories reorder the same way accounts do.

### Transactions

Every income, expense and transfer, with search and filters by type, account, category and date range.

Income can be entered two ways. Type an amount directly, or switch to hourly and enter hours worked, your rate, and any overtime. The total is worked out for you and the hours are kept with the record.

Transfers move money between accounts. Paying a credit card is a transfer, not an expense, which keeps it from being counted twice.

### Groceries

A price log. Record what an item cost and where you bought it, and the app tells you which shop was cheapest and how much you save by going there.

### Settings

Currency, theme, a full data backup, API instructions, and read only share links.

The theme can follow your device, so it turns dark with everything else at sunset.

### Read only access

Someone else can see your finances without being able to change anything. Either give them a separate view only password, or generate a share link from Settings that expires after a set number of days.

They see the whole app including every button. Anything that would change data is refused by the server with a clear message.

### On your phone

Add it to your home screen and it runs full screen like a normal app, with its own icon and no browser chrome.

---

## Built with

**Frontend**
React with Vite, plain CSS with Tailwind utilities, React Router. Deployed to GitHub Pages, rebuilt automatically by GitHub Actions on every push.

**Backend**
Express running on AWS Lambda behind an HTTP API, packaged with AWS SAM. Authentication uses bcrypt for passwords and JWT for sessions.

**Database**
MongoDB Atlas with Mongoose.

**Why this shape**

The frontend is a set of static files, so it cannot hold data or expose endpoints on its own. The database lives in the cloud, the Lambda is the only thing allowed to touch it, and the browser talks to the Lambda. Because the site is public, all security lives on the server rather than in the interface.

All financial calculations run in the browser, which keeps the Lambda small and fast to start.

Everything fits inside free tiers. The running cost is zero.

---

## Setup

### 1. Database

Create a free M0 cluster on MongoDB Atlas. Add a database user with a long random password.

Under Network Access, allow `0.0.0.0/0`. Lambda gets a different outbound IP every time it starts, so there is no fixed address to permit. Pinning one requires a NAT Gateway at around 32 USD a month, which is why an open list plus a strong password over TLS is the normal trade at this scale. Make the password long.

Copy the connection string and add the database name, ending in `/fwallet?retryWrites=true&w=majority`.

### 2. Secrets

```bash
cd server
npm install

npm run hash-password -- "your sign in password"
npm run hash-password -- "a read only password"     # optional

node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # JwtSecret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # ApiKey
```

Write all of these down before deploying. The prompts come one after another and there is no good way to pause.

Your plain password is never stored. Only the bcrypt hash is.

### 3. Backend

Install the AWS CLI and SAM CLI, then sign in with `aws login`.

```bash
cd server
sam build
sam deploy --guided
```

Stack name `f-wallet`, pick a region near you, and paste the values from step 2. For allowed origins use `https://YOUR_USERNAME.github.io,http://localhost:5173`.

It prints `ApiUrl` at the end. Save it.

```bash
curl https://YOUR_API_URL/health
```

The first call takes a couple of seconds while the function starts.

Back up `samconfig.toml` somewhere outside the repo. It holds every secret, it is gitignored, and losing it means entering them all again.

### 4. Frontend

Add a repository secret named `VITE_API_URL` set to your API URL, under Settings, Secrets and variables, Actions.

Set Pages to build from GitHub Actions, under Settings, Pages.

Push to `main`. The workflow builds and publishes automatically.

### 5. Local development

```bash
cd client
cp .env.example .env        # set VITE_API_URL
npm install
npm run dev
```

### 6. Importing old data

```bash
cd server
cp .env.example .env        # set MONGODB_URI
node scripts/import-data.js /path/to/data.json
```

Records are matched on id, so running it twice will not duplicate anything.

---

## Adding transactions from your phone

```bash
curl -X POST https://YOUR_API_URL/api/transactions \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "type": "expense",
    "amount": 24.50,
    "account": "Visa",
    "category": "Groceries",
    "notes": "No Frills"
  }'
```

Accounts and categories can be given by name instead of id. Names must match exactly, ignoring capitals, because filing a purchase under the wrong account silently is worse than an error. The date defaults to today.

For hourly income, send the hours instead of an amount:

```json
{
  "type": "income",
  "account": "Chequing",
  "category": "Salary",
  "pay": { "hours": 32, "rate": 17.2, "overtimeHours": 4 }
}
```

The API key can only create transactions. It cannot read balances, edit anything or delete anything.

---

## Deploying changes

```bash
# backend
cd server && sam build && sam deploy

# frontend
git add client && git commit -m "your message" && git push
```

Changes to `template.yaml` need `sam deploy --guided` so any new parameter can be supplied.

---

## Worth knowing

**Never delete AWS resources from the console.** CloudFormation manages them, and removing one by hand leaves the stack broken in a way that takes special commands to repair. Use `sam delete`.

**Credit card balances are debt.** Positive means you owe. The logic lives in `accountBalance` in `client/src/lib/calc.js`.

**Editing a card balance keeps your history.** It adjusts the starting figure so the total matches your statement, rather than deleting transactions.

**Every change reloads the whole dataset.** At this size it costs nothing and removes any chance of the screen disagreeing with the database. Worth revisiting past a few thousand transactions.

**Share links cannot be revoked individually.** The only way to kill one early is rotating `JWT_SECRET`, which signs everyone out. Prefer short expiry times.

---

## Project layout

```
client/
  src/
    lib/          calculations, formatting, API calls
    components/   layout, shared UI
    pages/        the six screens
    modals/       add and edit forms
server/
  src/
    routes/       API endpoints
    models.js     database schema
    auth.js       passwords, tokens, permissions
  template.yaml   AWS infrastructure as code
```
