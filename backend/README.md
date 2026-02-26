# RadiAi Backend

Backend API for the RadiAi MVP - a personalized AI radio news application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure your environment variables:
```bash
cp .env.example .env
```

3. Set up the database:

   a. **Enable pgvector extension in Supabase**:
   - Go to your Supabase project dashboard
   - Navigate to Database → Extensions
   - Search for "vector" and enable it
   - Or run in SQL Editor: `CREATE EXTENSION IF NOT EXISTS vector;`

   b. **Update DATABASE_URL** in `.env` with your Supabase connection string

   c. **Run migrations**:
   ```bash
   npm run prisma:migrate
   ```

   d. **Generate Prisma Client**:
   ```bash
   npm run prisma:generate
   ```

4. Start the development server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Prisma Scripts
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Apply migrations to database
- `npm run prisma:migrate:dev` - Create and apply new migration (development)
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:reset` - Reset database (development only)

## Database Schema

The application uses PostgreSQL with the following tables:

- **users** - User accounts with tier information (free/pro)
- **feeds** - RSS feed URLs per user
- **articles** - Fetched articles with summaries and vector embeddings
- **episodes** - Generated audio episodes
- **episode_articles** - Junction table linking episodes to articles
- **questions** - Q&A interactions for episodes

See `prisma/schema.prisma` for the complete schema definition.

## API Endpoints

### Health Check
- `GET /health` - Returns server health status

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Fastify
- **Database**: PostgreSQL (Supabase) with Prisma ORM
- **Vector Search**: pgvector extension
- **Authentication**: Supabase Auth
- **Environment**: dotenv
- **CORS**: @fastify/cors

## Development Notes

- The Prisma Client is automatically generated when you run `npm install` (via postinstall hook)
- Database migrations are located in `prisma/migrations/`
- The Prisma Client instance is available at `src/lib/prisma.ts`
- For detailed database setup instructions, see `prisma/README.md`
