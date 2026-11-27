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
- Allowed sign-out URLs: add `https://d1234abcd.cloudfront.net` (no slash)

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
          "token.actions.githubusercontent.com:sub": "repo:faridramyy@68161438/F-wallet@1460880005:environment:production"
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
