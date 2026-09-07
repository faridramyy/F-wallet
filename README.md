# F-Wallet

A personal finance app for one person. React on GitHub Pages, Express on AWS Lambda, MongoDB Atlas for storage.

This is a rebuild of the original vanilla JavaScript version. Every feature carried over: accounts with credit card handling, budget categories, transactions with an hourly pay calculator, transfers, and grocery price comparison. What changed is where the data lives. Instead of localStorage and a JSON file synced through the GitHub API, there is now a real database behind an authenticated API, which is what makes the endpoints possible.

```
client/     React app, deployed to GitHub Pages
server/     Express app, deployed to AWS Lambda behind an HTTP API
```

## How the pieces fit

The browser loads static files from GitHub Pages. Those files are public, so the API is where security actually happens. Signing in exchanges a password for a JWT that the client sends on every request. Automation uses a separate API key that can only create transactions, so a key sitting in a phone shortcut cannot read your balances or delete anything.

All the financial maths runs in the browser. The Lambda is thin CRUD. That keeps cold starts short and means adding a new calculation does not require a redeploy of the backend.

## Setup

### 1. MongoDB Atlas

Create a free M0 cluster. Add a database user with a long random password.

Under Network Access, allow `0.0.0.0/0`. This looks alarming and deserves an explanation: Lambda gets a different outbound IP on every cold start, and pinning it to a static one needs a VPC with a NAT Gateway, which costs around 32 USD a month. Allowing all IPs with a strong password over TLS is the standard trade for a project at this scale. The password is the thing protecting you, so make it long.

Copy the connection string and append a database name, for example `.../fwallet?retryWrites=true&w=majority`.

### 2. Generate your secrets

```bash
cd server
npm install

npm run hash-password -- "the password you will type to sign in"

node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # API_KEY
```

Keep these somewhere safe. The plaintext password is never stored anywhere, only the bcrypt hash.

### 3. Deploy the backend

Install the AWS CLI and the SAM CLI, then run `aws configure` once.

```bash
cd server
sam build
sam deploy --guided
```

When prompted, paste the Mongo URI, JWT secret, password hash and API key. For allowed origins use `https://YOUR_USERNAME.github.io,http://localhost:5173`.

Pick a region close to you. `ca-central-1` is Montreal.

When it finishes it prints `ApiUrl`. Save it.

Check it works:

```bash
curl https://YOUR_API_URL/health
```

The first call takes a couple of seconds. That is the cold start.

### 4. Import your old data

Export `data.json` from the old app, then:

```bash
cd server
cp .env.example .env      # fill in MONGODB_URI
node scripts/import-data.js /path/to/data.json
```

Records are matched on id, so running it twice will not duplicate anything.

### 5. Deploy the frontend

Push this repository to GitHub. Then:

- Settings, Secrets and variables, Actions: add a secret named `VITE_API_URL` set to the `ApiUrl` from step 3.
- Settings, Pages: set Source to GitHub Actions.

Push to `main` and the workflow builds and deploys. Your app appears at `https://YOUR_USERNAME.github.io/REPO_NAME/`.

If your repository name is not what the API expects for CORS, remember the origin is just `https://YOUR_USERNAME.github.io` with no path.

### 6. Local development

```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd client
cp .env.example .env      # set VITE_API_URL=http://localhost:4000
npm install && npm run dev
```

## The API

Everything except login lives under `/api` and needs `Authorization: Bearer <token>`.

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/auth/login` | Body `{ "password": "..." }`, returns a token |
| GET | `/api/state` | Everything, in one request |
| GET | `/api/export` | Backup in the old `data.json` shape |
| GET | `/api/transactions` | Filters: `type`, `accountId`, `categoryId`, `month`, `from`, `to`, `limit` |
| POST | `/api/transactions` | Also accepts an API key |
| PUT, DELETE | `/api/transactions/:id` | |
| POST, PUT, DELETE | `/api/accounts/:id` | |
| POST, PUT, DELETE | `/api/categories/:id` | |
| POST, PUT, DELETE | `/api/groceries/:id` | |
| PUT | `/api/settings` | |

### Adding a transaction from automation

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

`account` and `category` accept either an internal id or the exact name you gave them, matched case insensitively. Names are matched exactly rather than fuzzily, because silently filing a purchase under the wrong account is worse than an error message. `date` defaults to today.

For income you can send hours instead of an amount and the server works out the total:

```json
{
  "type": "income",
  "account": "Chequing",
  "category": "Salary",
  "pay": { "hours": 32, "rate": 17.2, "overtimeHours": 4 }
}
```

Transfers take `fromAccount` and `toAccount`.

## Cost

Lambda and DynamoDB style always free allowances cover this comfortably. Atlas M0 is free permanently. GitHub Pages is free for public repositories. The realistic monthly bill is zero, but set an AWS Budgets alert at a few dollars on day one anyway, because an alert costs nothing and a surprise costs more.

Note that CloudWatch log retention is set to 14 days in `template.yaml`. Logs default to never expiring, which is a slow and boring way to eventually owe money.

## Things worth knowing

**Credit cards store debt as a positive number.** Expenses increase the balance, payments decrease it. The sign flip lives in `accountBalance` in `client/src/lib/calc.js`.

**Editing a credit card's current balance does not delete history.** It shifts the starting debt by the difference so the computed balance matches your statement. Same behaviour as the original.

**Paying a credit card is a transfer**, not an expense. Chequing to card. Logging it as an expense would double count it.

**Mutations refetch the whole state.** With a few thousand transactions this is fine and it removes any chance of the screen and the database disagreeing. If the dataset ever gets large, that is the first thing to change.
