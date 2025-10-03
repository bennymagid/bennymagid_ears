# GitHub Actions Deployment Setup

## Required GitHub Secrets

Go to your repository Settings → Secrets and variables → Actions, and add these secrets:

1. **SSH_HOST**: Your server hostname or IP address
   - Example: `vps91130.inmotionhosting.com` or `23.235.206.236`

2. **SSH_USERNAME**: Your SSH username
   - Value: `bennymagid`

3. **SSH_PASSWORD**: Your SSH password
   - Your InMotion server password

4. **SSH_PORT**: SSH port (usually 22)
   - Value: `22`

## How It Works

The workflow automatically deploys when you push to the `main` branch:

1. Copies files to `/home/bennymagid/public_html/ears/`
2. Sets correct permissions on `main.cgi` and `.htaccess`
3. Optionally restarts Apache (commented out by default)

## Manual Deployment

You can also trigger deployment manually:
1. Go to Actions tab in GitHub
2. Select "Deploy to InMotion" workflow
3. Click "Run workflow"

## Notes

- `.env` file is NOT deployed (it's in .gitignore)
- Make sure `.env` exists on the server with your API keys
- `__pycache__/` and other build artifacts are excluded
