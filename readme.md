# Nexus - Event-Driven API Gateway

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

A powerful backend system that listens for real-time database events and automatically triggers actions across external systems. Built to showcase advanced backend concepts including event-driven architecture, real-time data processing, and system integration.

## 🎯 What is Nexus?

Nexus is a "headless" (backend-only) tool that bridges the gap between your database and external services. When something happens in your database (like a new user signup), Nexus instantly detects it and triggers configured actions (like sending data to Slack, Discord, or any webhook).

### Key Features

- 🔄 **Real-time Event Detection** - Instantly responds to database changes
- 🎯 **Flexible Listeners** - Configure what to watch and where to send data
- 📊 **Event Logging** - Complete audit trail of all triggered events
- 🔌 **Webhook Integration** - Send data to any HTTP endpoint
- 🏗️ **Modular Architecture** - Separate API and Worker processes
- ✅ **Input Validation** - Robust request validation and error handling

## 🏗️ Architecture

```
┌─────────────────┐
│  Database Event │  (New user inserted)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Nexus Worker   │  (Detects event via Supabase Realtime)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Match Listeners │  (Finds configured listeners for this event)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send Webhook   │  (POST data to configured URL)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Log Result    │  (Save to event_logs table)
└─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js v16 or higher
- A Supabase account (free tier works)
- A webhook URL for testing (use [webhook.site](https://webhook.site))

### Installation

1. **Clone or create the project**
```bash
mkdir nexus
cd nexus
```

2. **Install dependencies**
```bash
npm install express @supabase/supabase-js axios express-validator dotenv
npm install --save-dev nodemon
```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL schema (see Database Setup section)
   - Enable Realtime for the `users` table

4. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
PORT=3000
NODE_ENV=development
```

5. **Run the system**

Terminal 1 - Start the API:
```bash
npm start
```

Terminal 2 - Start the Worker:
```bash
npm run worker
```

## 📁 Project Structure

```
nexus/
├── src/
│   ├── config/
│   │   └── supabase.js           # Supabase client configuration
│   ├── middleware/
│   │   └── validators.js         # Request validation middleware
│   ├── routes/
│   │   ├── listeners.js          # Listener CRUD endpoints
│   │   └── logs.js               # Event logs endpoints
│   ├── services/
│   │   └── webhookService.js     # Webhook sending logic
│   ├── server.js                 # Express API server
│   └── worker.js                 # Event listening worker
├── .env                          # Environment variables (not in git)
├── .env.example                  # Environment template
├── .gitignore
├── package.json
└── README.md
```

## 🗄️ Database Setup

Run this SQL in your Supabase SQL Editor:

```sql
-- Table 1: listeners (configuration table)
CREATE TABLE listeners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_table TEXT NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('INSERT', 'UPDATE', 'DELETE')),
  target_type TEXT NOT NULL DEFAULT 'WEBHOOK',
  target_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: event_logs (audit trail)
CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_id UUID REFERENCES listeners(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
  payload_received JSONB,
  response_from_target TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 3: users (demo table to watch)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE listeners ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for service role
CREATE POLICY "Service role full access on listeners" ON listeners
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on event_logs" ON event_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on users" ON users
  FOR ALL USING (auth.role() = 'service_role');
```

**Important:** Enable Realtime replication for the `users` table in Database → Replication.

## 📡 API Endpoints

### Base URL
```
http://localhost:3000/api/v1
```

### Listeners

#### Create a Listener
```bash
POST /listeners

Body:
{
  "name": "New User to Slack",
  "source_table": "users",
  "event": "INSERT",
  "target_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
}

Response: 201 Created
{
  "success": true,
  "message": "Listener created successfully",
  "data": { ... }
}
```

#### Get All Listeners
```bash
GET /listeners

Response: 200 OK
{
  "success": true,
  "count": 2,
  "data": [ ... ]
}
```

#### Delete a Listener
```bash
DELETE /listeners/:id

Response: 204 No Content
```

### Logs

#### Get Event Logs
```bash
GET /logs

Response: 200 OK
{
  "success": true,
  "count": 10,
  "data": [ ... ]
}
```

### Test Endpoint

#### Create Test User
```bash
POST /test/users

Body:
{
  "email": "test@example.com",
  "name": "Test User"
}

Response: 201 Created
```

## 🧪 Testing the System

### 1. Get a Webhook URL
Go to [webhook.site](https://webhook.site) and copy your unique URL.

### 2. Create a Listener
```bash
curl -X POST http://localhost:3000/api/v1/listeners \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New User Alert",
    "source_table": "users",
    "event": "INSERT",
    "target_url": "https://webhook.site/your-unique-id"
  }'
```

### 3. Trigger an Event
```bash
curl -X POST http://localhost:3000/api/v1/test/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe"
  }'
```

### 4. Check Results
- Check your webhook.site URL - you should see the user data!
- Check the Worker terminal - you should see processing logs
- Query the logs endpoint:
```bash
curl http://localhost:3000/api/v1/logs
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Service role key (not anon key!) | Yes |
| `PORT` | Port for the API server | No (default: 3000) |
| `NODE_ENV` | Environment (development/production) | No (default: development) |

### Supported Events

- `INSERT` - Triggered when a new row is added
- `UPDATE` - Triggered when a row is modified
- `DELETE` - Triggered when a row is deleted

## 📊 How It Works

### The Config API (server.js)
- Express.js REST API running on port 3000
- Manages listener configurations (CRUD operations)
- Provides endpoints for viewing event logs
- Validates all incoming requests

### The Event Worker (worker.js)
- Runs independently as a separate process
- Connects to Supabase Realtime
- Monitors configured tables for database changes
- Matches events to listeners
- Sends webhooks with event data
- Logs all results to the database
- Automatically reloads when listeners change

### Data Flow
1. Developer creates a listener via API
2. Worker loads the listener configuration
3. Worker subscribes to the specified table
4. Database event occurs (INSERT/UPDATE/DELETE)
5. Supabase Realtime pushes event to Worker
6. Worker finds matching listeners
7. Worker sends webhook with event payload
8. Worker logs the result (SUCCESS/FAILED)

## 🛠️ Development

### Run in Development Mode
```bash
# Terminal 1
npm run dev

# Terminal 2
npm run worker:dev
```

This uses nodemon to auto-restart on file changes.

### Project Scripts
```bash
npm start         # Run API server
npm run dev       # Run API with auto-reload
npm run worker    # Run event worker
npm run worker:dev # Run worker with auto-reload
```

## 🚨 Troubleshooting

### Worker not receiving events?
- ✅ Check Realtime is enabled for your table in Supabase
- ✅ Verify you're using the service_role key (not anon key)
- ✅ Ensure the table name in listener matches exactly
- ✅ Check worker console for connection status

### Webhooks not firing?
- ✅ Test your webhook URL independently
- ✅ Check event_logs table for error messages
- ✅ Verify listener event type matches (INSERT/UPDATE/DELETE)
- ✅ Check that listener was loaded (worker console shows it)

### API errors?
- ✅ Verify all environment variables are set
- ✅ Check Supabase credentials are correct
- ✅ Ensure Supabase project is not paused
- ✅ Check console for detailed error messages

### Validation errors?
- ✅ Ensure target_url is a complete URL with http:// or https://
- ✅ Check all required fields are present
- ✅ Verify event is one of: INSERT, UPDATE, DELETE

## 🎓 What This Project Demonstrates

### Backend Engineering Skills
- **System Architecture** - Multi-process application design
- **Event-Driven Architecture** - Real-time event processing
- **REST API Design** - Clean, RESTful endpoints
- **Database Design** - Relational schema with foreign keys
- **Async Programming** - Promises, async/await, event handlers
- **Input Validation** - Request validation and sanitization
- **Error Handling** - Graceful error handling and logging
- **Separation of Concerns** - Modular, maintainable code structure

### Technologies & Patterns
- Node.js runtime
- Express.js framework
- Supabase (PostgreSQL + Realtime)
- Webhook integration
- Environment configuration
- Process management

## 🚀 Future Enhancements

- [ ] Add authentication (API keys or JWT)
- [ ] Implement webhook retry logic with exponential backoff
- [ ] Support multiple action types (Email, SMS, etc.)
- [ ] Add filtering conditions (only trigger if certain fields change)
- [ ] Create a simple web dashboard
- [ ] Add rate limiting
- [ ] Implement webhook signature verification
- [ ] Support batch processing for high-volume events
- [ ] Add metrics and monitoring
- [ ] Docker containerization
- [ ] Deploy to cloud (Railway, Render, fly.io)

## 📝 License

MIT

## 👤 Author

Your Name - [Your Portfolio/GitHub]

## 🙏 Acknowledgments

- Built with [Supabase](https://supabase.com) for database and real-time features
- Inspired by modern event-driven architectures
- Perfect for learning backend development concepts

---

**Note:** This is a portfolio/learning project. For production use, add proper authentication, error handling, monitoring, and security measures.