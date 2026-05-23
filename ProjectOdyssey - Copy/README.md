# Project Odyssey

## Features

- **AI-Driven Travel Recommendations**: Personalized travel suggestions powered by Gemini API.

## Setup Instructions

### 1. Database Setup (Supabase)

To enable the AI recommendations system, you must create the required tables in your Supabase project:

1. Open the [Supabase Dashboard](https://app.supabase.com/).
2. Select your project and open the **SQL Editor**.
3. Create a new query.
4. Copy the contents of `server/src/config/create_recommendation_tables.sql` and paste them into the editor.
5. Click **Run**.

### 2. Environment Variables

Ensure your `server/.env` file contains:

- `GEMINI_API_KEY`: Your Google Gemini API Key.
- `SB_PROJECT_URL`: Your Supabase Project URL.
- `SB_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (required for table operations).

### 3. Weekly Automation

The recommendations refresh automatically every Sunday at 00:00 server time using `node-cron`.
