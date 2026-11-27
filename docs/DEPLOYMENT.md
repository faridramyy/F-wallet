# Deploying F-Wallet

Production runs on AWS and is created by hand in the console once. After
that, GitHub Actions only deploys code.

```
Browser ──> CloudFront ──> S3 bucket            (frontend, static files)
   │
   └──────> Lambda function URL ──> Lambda     (backend, Express API)
                                      │
                                      ├──> Aurora DSQL (same cluster as dev)
                                      └──> Cognito (same user pool as dev)

EventBridge Scheduler ──(every hour)──> Lambda (delete expired idempotency keys)
```

Region: **ca-central-1** (where the Cognito pool and DSQL cluster already are).

## How a deploy works

1. Push to `main` (or run **Deploy** by hand from the Actions tab).
2. The CI checks run: formatting, lint, frontend build, backend load, Lambda
   package.
3. The run **waits for your approval** (Actions → the run → _Review
   deployments_ → _Approve and deploy_).
4. It uploads the backend to Lambda, checks `/health`, builds the frontend
   with the production settings, uploads it to S3 and refreshes CloudFront.

**Roll back:** open an older successful Deploy run and choose _Re-run all
jobs_. It deploys that run's commit again.

---

## Current production setup

Set up on 2026-11-27 with the AWS CLI in **AWS CloudShell** (ca-central-1),
signed in as an admin IAM user, following the one-time setup below. Leftovers
from an earlier attempt were deleted first: the role
`f-wallet-api-role-…`, the log group `/aws/lambda/f-wallet-api`, a
CloudFront origin access control, and the DSQL mapping for the old role
`role/f-wallet-api`. In Cognito, the URL of the deleted CloudFront
distribution was replaced by the new app URL.

Account-specific values (account ID, URLs, resource IDs) are not written
here. They live in the GitHub `production` environment variables (see
[step 6](#6-github-environment)) and in `backend/.env` / `frontend/.env`.

| What                    | Value                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| App (frontend)          | GitHub variable `APP_URL`                                                            |
| API (backend)           | GitHub variable `VITE_API_BASE_URL`                                                  |
| Lambda function         | `f-wallet-api` (Node.js 24.x, arm64, 512 MB, 15 s)                                   |
| Lambda execution role   | `f-wallet-api-role`: basic logging + inline `dsql-connect`                           |
| DSQL grant              | `AWS IAM GRANT f_wallet_app TO '…:role/f-wallet-api-role'`                           |
| S3 bucket               | `f-wallet-frontend-<ACCOUNT_ID>` (all public access blocked)                         |
| CloudFront distribution | GitHub variable `CLOUDFRONT_DISTRIBUTION_ID`; access control `f-wallet-frontend-oac` |
| Hourly schedule         | `f-wallet-cleanup-idempotency-keys`, role `f-wallet-scheduler-role`                  |
| GitHub OIDC provider    | `token.actions.githubusercontent.com`                                                |
| GitHub deploy role      | `f-wallet-github-deploy`: inline policy `deploy`                                     |
| Cognito app client      | callback and sign-out URLs: `http://localhost:5173/` and the app URL + `/`           |
| GitHub environment      | `production`: you as required reviewer, branch `main`, 10 variables                  |

Differences from the steps below:

- **Roles have fixed names** (`f-wallet-api-role`, `f-wallet-scheduler-role`)
  instead of the console's generated ones.
- **Function URL permissions:** the URL needs two resource-policy statements:
  `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction` (with
  `--invoked-via-function-url`). The console adds both; with the CLI, add
  both yourself.
- **Reserved concurrency is not set.** New accounts often can't reserve any.
- **Cognito sign-out URL has a trailing slash.** The app sends
  `logout_uri=<app URL>/`, so the sign-out URL ends in `/` like the callback.
- **The Deploy workflow had been disabled** in GitHub; it was enabled again.
- **First deploy:** the function was created with placeholder code (it
  answers 503). The first Deploy run (approved through the API) replaced it with the real backend.

Checked after that deploy:

- `/health` and `/health/db` answer `ok`, and the database user is
  `f_wallet_app`.
- CORS allows the app URL.
- Direct links such as `/groceries` load.
- Signing in and loading data work in the live app.

**Cognito update warning:** `update-user-pool-client` resets every setting
you leave out, so read the client first and send all of its settings back
with only the URLs changed.

---

## AWS account

The AWS account holds only F-Wallet resources, the account's own
users, cost alerts, and the free defaults AWS creates in every account.
Everything else was deleted on 2026-11-27.

### What is in the account

| Kind              | Items                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-Wallet          | everything in [Current production setup](#current-production-setup), plus the DSQL cluster (`DB_HOST` in `backend/.env`) and the Cognito user pool        |
| IAM users         | an admin user for the console, and a development user whose keys are in `backend/.env`                                                                    |
| Cost alerts       | budgets `My Zero-Spend Budget` and `Monthly $5 budget`, plus Cost Anomaly Detection (monitor and subscription)                                            |
| Resource Explorer | aggregator index in ca-central-1 (searches every region)                                                                                                  |
| Free AWS defaults | default VPC, subnets and security groups per region; default event buses, parameter groups, X-Ray and Athena settings; AWS-managed keys and service roles |

**To list everything again**, run this in CloudShell. Resource Explorer
covers every region, but not every resource type, so also check WAF,
certificates, Route 53, alarms, SNS and SES directly.

```bash
aws resource-explorer-2 search --region ca-central-1 --query-string '*' \
  --max-results 1000 --query 'Resources[].[ResourceType,Region,Arn]' --output text
```

### Deleted

- **f-stamp** (another project): its DSQL cluster (deletion
  protection turned off first), its Cognito user pool with its users and
  domain, and its IAM user with its access key.
- **Old `f-wallet` CloudFormation stack** from the September MongoDB version,
  with its stored parameters. Its API Gateway and role were already gone, but
  it still listed `f-wallet-api` and `/aws/lambda/f-wallet-api`, the names
  the new function and its log group now use.
  - A plain `delete-stack` would have deleted the live function.
  - Adding `DeletionPolicy: Retain` first failed, because updating the stack
    needed its missing role.
  - What worked: delete the stack through a temporary role,
    `cfn-f-wallet-cleanup`, that may only touch API Gateway and the old IAM
    role. The Lambda and log-group deletions failed with AccessDenied, and
    the next `delete-stack --retain-resources …` calls kept them out of the
    deletion. The temporary role was removed afterwards.

  The live function was unchanged: same `LastModified`, role and URL
  permissions.

### Cost

- **Budgets** email the Gmail address on the zero-spend budget.
  - `My Zero-Spend Budget` ($1): alerts when actual spend goes over $0.01.
    It fires once a month, as soon as anything is spent.
  - `Monthly $5 budget`, added on 2026-11-27: alerts when actual spend
    passes 80% ($4), or when the month's forecast passes $5.
- **November 2026:** $0.10, almost all AWS WAF ($0.089 on Nov 26–27). A web
  ACL most likely came with the deleted CloudFront distribution of the earlier
  attempt. No web ACL exists now; keep WAF off when creating distributions.
- **Expected:** close to $0 a month at personal use. Lambda, CloudFront, S3,
  DSQL and Cognito are all pay-per-use.

---

## One-time setup

Do the steps in order; later steps use values from earlier ones. Write the
values down as you go — the last step copies them into GitHub.

### 1. Lambda function (backend)

**Lambda → Create function → Author from scratch**

| Setting        | Value                                           |
| -------------- | ----------------------------------------------- |
| Name           | `f-wallet-api`                                  |
| Runtime        | Node.js 24.x                                    |
| Architecture   | arm64                                           |
| Execution role | Create a new role with basic Lambda permissions |

After it is created:

- **Code → Runtime settings → Edit → Handler:** `backend/src/lambda.handler`
  (the deploy replaces the sample code; the handler name must already be this).
- **Configuration → General configuration → Edit:** memory **512 MB**, timeout
  **15 seconds**.
- **Configuration → Environment variables:**

  | Key                    | Value                                                                                                             |
  | ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
  | `NODE_ENV`             | `production`                                                                                                      |
  | `CORS_ORIGIN`          | the CloudFront URL from step 3, e.g. `https://d1234abcd.cloudfront.net` (no trailing slash; fill in after step 3) |
  | `DB_HOST`              | same as `backend/.env`                                                                                            |
  | `DB_PORT`              | `5432`                                                                                                            |
  | `DB_USER`              | `f_wallet_app`                                                                                                    |
  | `DB_DATABASE_NAME`     | `postgres`                                                                                                        |
  | `DB_MAX_CONNECTIONS`   | `3`                                                                                                               |
  | `COGNITO_USER_POOL_ID` | same as `backend/.env`                                                                                            |
  | `COGNITO_CLIENT_ID`    | same as `backend/.env`                                                                                            |

  Do **not** add `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. The function
  uses its execution role.

- **Configuration → Function URL → Create:** auth type **NONE**, leave
  _Configure CORS_ **off** (Express already answers CORS). Copy the URL, e.g.
  `https://abc123.lambda-url.ca-central-1.on.aws/`.
- Optional, caps cost if something loops: **Configuration → Concurrency →
  Reserved concurrency:** `10`.

**Let the function sign in to DSQL as `f_wallet_app`:**

1. IAM → Roles → the function's role (`f-wallet-api-role-…`) → _Add
   permissions → Create inline policy_ (JSON):

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": "dsql:DbConnect",
         "Resource": "arn:aws:dsql:ca-central-1:<ACCOUNT_ID>:cluster/<CLUSTER_ID>"
       }
     ]
   }
   ```

   `<CLUSTER_ID>` is the first part of `DB_HOST` (before `.dsql.`).

2. In DSQL, connected as `admin` (the DSQL console's query editor or psql),
   allow that IAM role to use the `f_wallet_app` database role:

   ```sql
   AWS IAM GRANT f_wallet_app TO 'arn:aws:iam::<ACCOUNT_ID>:role/<FUNCTION_ROLE_NAME>';
   ```

### 2. Hourly cleanup schedule

**EventBridge → Scheduler → Schedules → Create schedule**

- Name: `f-wallet-cleanup-idempotency-keys`
- Recurring, rate-based: **1 hour**, flexible time window off
- Target: **AWS Lambda Invoke** → `f-wallet-api`
- Payload:

  ```json
  { "task": "cleanup-idempotency-keys" }
  ```

- Permissions: let it create a new role.

### 3. S3 bucket and CloudFront (frontend)

**S3 → Create bucket**

- Name: e.g. `f-wallet-frontend-<something-unique>`
- Region: ca-central-1
- Keep **Block all public access** on (CloudFront reads it privately).

**CloudFront → Create distribution**

- Origin: the S3 bucket. Origin access: **Origin access control settings
  (recommended)** → create a control setting. After creating, apply the bucket
  policy CloudFront offers (copy it into the bucket's _Permissions → Bucket
  policy_, or let the console update it).
- Viewer protocol policy: **Redirect HTTP to HTTPS**
- Cache policy: **CachingOptimized**
- Default root object: `index.html`
- Web Application Firewall: do not enable (not needed for now)

After it is created:

- **Error pages → Create custom error response**, twice: for **403** and for
  **404**, _Customize response_ → path `/index.html`, response code **200**.
  This makes links like `/settings` work when opened directly.
- Copy the **distribution ID** and the **domain name**
  (`d1234abcd.cloudfront.net`). The app URL is `https://<domain name>`.

Now go back to the Lambda and set `CORS_ORIGIN` to the app URL.

### 4. Cognito

**Cognito → User pools → (your pool) → App clients → (the web client) → Login
pages → Edit**

- Allowed callback URLs: add `https://d1234abcd.cloudfront.net/` (with the
  trailing slash)
- Allowed sign-out URLs: add `https://d1234abcd.cloudfront.net/` (with the
  trailing slash; the app sends `logout_uri=<app URL>/`)

Keep the `http://localhost:5173` entries for local development.

### 5. Let GitHub deploy (OIDC, no stored keys)

**IAM → Identity providers → Add provider** (skip if it already exists)

- Type: OpenID Connect
- Provider URL: `https://token.actions.githubusercontent.com`
- Audience: `sts.amazonaws.com`

**IAM → Roles → Create role → Web identity**

- Identity provider: `token.actions.githubusercontent.com`, audience
  `sts.amazonaws.com`
- GitHub organization: `faridramyy`, repository: `F-wallet`
- Don't attach managed policies. Name it `f-wallet-github-deploy`.

Then edit its **Trust relationships** so only the approved `production`
environment of this repository can use it:

This repository uses GitHub's immutable subject claims: the repository is
identified by its owner and repository IDs, not by name, so renaming either
never breaks (or hands over) the role. Check the prefix with:

```bash
gh api repos/faridramyy/F-wallet/actions/oidc/customization/sub
```

The `sub` is that `sub_claim_prefix` followed by `:environment:production`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "<sub_claim_prefix>:environment:production"
        }
      }
    }
  ]
}
```

Add an **inline policy** with only what the deploy does:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "UpdateApiCode",
      "Effect": "Allow",
      "Action": ["lambda:UpdateFunctionCode", "lambda:GetFunction"],
      "Resource": "arn:aws:lambda:ca-central-1:<ACCOUNT_ID>:function:f-wallet-api"
    },
    {
      "Sid": "ListFrontendBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::<BUCKET_NAME>"
    },
    {
      "Sid": "UploadFrontend",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::<BUCKET_NAME>/*"
    },
    {
      "Sid": "RefreshCdn",
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::<ACCOUNT_ID>:distribution/<DISTRIBUTION_ID>"
    }
  ]
}
```

Copy the role's **ARN**.

### 6. GitHub environment

**GitHub → the repository → Settings → Environments → New environment:**
`production`

- **Required reviewers:** add yourself. This is the approval step.
- **Deployment branches and tags:** _Selected branches_ → `main`.
- **Environment variables** (not secrets — none of these are secret; the
  `VITE_` values end up in the public JavaScript anyway):

  | Name                         | Value                                                                                                        |
  | ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
  | `AWS_REGION`                 | `ca-central-1`                                                                                               |
  | `AWS_ROLE_ARN`               | the `f-wallet-github-deploy` role ARN                                                                        |
  | `LAMBDA_FUNCTION_NAME`       | `f-wallet-api`                                                                                               |
  | `S3_BUCKET`                  | the bucket name                                                                                              |
  | `CLOUDFRONT_DISTRIBUTION_ID` | the distribution ID                                                                                          |
  | `APP_URL`                    | `https://d1234abcd.cloudfront.net`                                                                           |
  | `VITE_API_BASE_URL`          | the function URL + `api/v1`, e.g. `https://abc123.lambda-url.ca-central-1.on.aws/api/v1` (no trailing slash) |
  | `VITE_COGNITO_USER_POOL_ID`  | same as `frontend/.env`                                                                                      |
  | `VITE_COGNITO_CLIENT_ID`     | same as `frontend/.env`                                                                                      |
  | `VITE_COGNITO_DOMAIN`        | same as `frontend/.env`                                                                                      |

### 7. First deploy

Push to `main` (or Actions → Deploy → _Run workflow_), approve it, then open
the app URL and sign in. If something fails:

- **Deploy step fails with AccessDenied** → the role's trust policy (step 5)
  or inline policy doesn't match the names.
- **API health check fails** → Lambda → Monitor → _View CloudWatch logs_.
  Usually a missing environment variable or the DSQL grant (step 1).
- **Sign-in says redirect_mismatch** → the Cognito URLs (step 4).
- **Requests blocked by CORS** → `CORS_ORIGIN` on the Lambda must exactly
  match the app URL.
