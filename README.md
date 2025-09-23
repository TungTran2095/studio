# WorkLog App with Next.js and Supabase

This is a Next.js application for logging work entries, integrated with Supabase for authentication, database, and storage. It also uses Google's Gemini AI for automatic categorization of work logs.

## Getting Started

Follow these steps to set up and run the project locally.

### 1. Install Dependencies

First, install the project dependencies using npm:

```bash
npm install
```

### 2. Set Up Your Supabase Project

If you don't have a Supabase project, create one first.

1.  Go to [supabase.com](https://supabase.com) and create a new project.
2.  Wait for the project to be initialized.

### 3. Set Up the Database

You need to create a table to store the work logs.

1.  In your Supabase project, navigate to the **SQL Editor**.
2.  Click **New query** and run the following SQL script to create the `worklogs` table:

    ```sql
    CREATE TABLE worklogs (
        id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        user_id UUID NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT,
        start_time TIME,
        end_time TIME,
        file_name TEXT,
        file_url TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
    ```

    **Important**: This schema intentionally omits the foreign key constraint to `auth.users(id)` to prevent a common Supabase issue ("Database error saving new user") that can occur if there are conflicting triggers on user creation. The application logic ensures `user_id` is correctly populated.

### 4. Set Up Supabase Storage

You need to create a storage bucket for file attachments.

1.  In your Supabase project, navigate to **Storage**.
2.  Click **Create a new bucket**.
3.  Set the bucket name to `attachments`.
4.  Make the bucket **public**. This is necessary for the file URLs to be accessible.
5.  After creating the bucket, go to its settings by clicking the three dots and selecting **Policies**.
6.  Create a new policy that allows `INSERT` operations for `anon` and `authenticated` roles. This allows the server-side code to upload files.
    *   **Policy Name:** `Allow server uploads`
    *   **Allowed operations:** Check `INSERT`.
    *   **Target roles:** Select `anon` and `authenticated`.
    *   **WITH CHECK expression:** `true`

### 5. Configure Environment Variables

Create a file named `.env` in the root of your project and add the following variables.

1.  Go to **Project Settings** > **API** in your Supabase dashboard.
2.  Find your **Project URL** and **API Keys**.
3.  Go to [Google AI Studio](https://makersuite.google.com/) to get your **Gemini API Key**.

Now, populate the `.env` file:

```env
# Supabase variables (from Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=YOUR_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_SECRET_KEY

# Google Gemini API Key (for AI features)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

**Security Note:** `SUPABASE_SERVICE_KEY` is a secret and should never be exposed on the client side. This template uses it safely within Next.js Server Actions.

### 6. Run the Development Server

Now you can run the development server:

```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) (or the specified port) with your browser to see the result.

### 7. Important Supabase Auth Setting

By default, Supabase requires users to confirm their email address after signing up.

- **To test the app quickly**, you can disable this feature. Go to **Authentication** > **Providers** in your Supabase dashboard and turn off **Confirm email**.
- **For production**, it's highly recommended to keep email confirmation enabled. Make sure your users know they need to check their email to activate their account before logging in.
