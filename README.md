# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file:

### Supabase

Create a new project on [Supabase](https://supabase.com/). Go to your project settings and copy the Project URL and the `anon` public key.

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Important:** You also need to create a table named `message_history` in your Supabase project with the following columns:

*   `id` (int8, is identity, primary key)
*   `created_at` (timestamptz, default value: `now()`)
*   `role` (text, not null - should store 'user' or 'bot')
*   `content` (text, not null)

Enable Row Level Security (RLS) on the `message_history` table and create policies that allow users to read and insert their own messages. For this demo, you might start with allowing public read/write access, but secure this properly for production.

### Google AI (Optional for Genkit)

If you are using Genkit with Google AI models, you'll need an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

```
GOOGLE_GENAI_API_KEY=your_google_api_key
```
