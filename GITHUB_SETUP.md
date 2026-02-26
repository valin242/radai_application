# GitHub Setup Instructions

Your project has been initialized with Git and is ready to push to GitHub.

## Steps to Push to GitHub

### 1. Create a New Repository on GitHub

1. Go to [GitHub](https://github.com)
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Fill in the details:
   - **Repository name**: `radiai` (or your preferred name)
   - **Description**: "AI-powered personalized podcast generation app"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

### 2. Connect Your Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/radiai.git

# Verify the remote was added
git remote -v

# Push your code to GitHub
git branch -M main
git push -u origin main
```

### 3. Alternative: Using SSH (Recommended for frequent pushes)

If you have SSH keys set up:

```bash
git remote add origin git@github.com:YOUR_USERNAME/radiai.git
git branch -M main
git push -u origin main
```

## What's Been Committed

Your initial commit includes:
- ✅ Backend API (Node.js/Fastify)
- ✅ Mobile app (React Native/Expo)
- ✅ Database schema (Prisma)
- ✅ Documentation files
- ✅ Configuration files
- ✅ Test files

## What's Ignored (.gitignore)

The following are NOT committed (as they should be):
- ❌ `.env` files (sensitive credentials)
- ❌ `node_modules/` (dependencies)
- ❌ Build outputs
- ❌ IDE settings
- ❌ `.kiro/` folder

## Important: Environment Variables

Before others can run your project, they'll need to:

1. Copy `.env.example` to `.env` in both `backend/` and `mobile/` folders
2. Fill in their own credentials:
   - Supabase URL and keys
   - OpenAI API key
   - Database URL
   - Redis connection details

## Next Steps After Pushing

1. **Add a README badge** (optional):
   ```markdown
   ![GitHub last commit](https://img.shields.io/github/last-commit/YOUR_USERNAME/radiai)
   ![GitHub issues](https://img.shields.io/github/issues/YOUR_USERNAME/radiai)
   ```

2. **Set up GitHub Actions** (optional) for CI/CD:
   - Automated testing
   - Linting
   - Deployment

3. **Add collaborators** if working with a team:
   - Go to Settings → Collaborators
   - Add team members

4. **Protect your main branch** (recommended):
   - Go to Settings → Branches
   - Add branch protection rules
   - Require pull request reviews before merging

## Useful Git Commands

```bash
# Check status
git status

# Add new changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to GitHub
git push

# Pull latest changes
git pull

# Create a new branch
git checkout -b feature/your-feature-name

# Switch branches
git checkout main
```

## Troubleshooting

### Authentication Issues

If you get authentication errors:

1. **For HTTPS**: GitHub no longer accepts passwords. Use a Personal Access Token:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate new token with `repo` scope
   - Use the token as your password when pushing

2. **For SSH**: Set up SSH keys:
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   # Add the public key to GitHub Settings → SSH keys
   ```

### Large Files

If you get errors about large files:
- The audio files in `backend/audio-files/` might be too large
- Consider adding `*.mp3` to `.gitignore` if needed
- Use Git LFS for large files: `git lfs track "*.mp3"`

## Repository Structure

```
radiai/
├── backend/          # Node.js API server
├── mobile/           # React Native mobile app
├── .gitignore        # Git ignore rules
├── README.md         # Project documentation
└── *.md             # Various documentation files
```

## Security Reminders

⚠️ **NEVER commit**:
- API keys or secrets
- `.env` files
- Database credentials
- Private keys

✅ **Always use**:
- `.env.example` files as templates
- Environment variables for sensitive data
- `.gitignore` to exclude sensitive files
