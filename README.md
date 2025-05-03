# YINSEN Chatbot

This is a Next.js application featuring an AI-powered chatbot (YINSEN) integrated with Binance for asset viewing and trading, styled similarly to Firebase Studio.

## Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file:

### Supabase (Required for Chat History)

1.  **Create a Supabase Project**: Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Get Project URL and Anon Key**: Navigate to your project's **Settings** > **API**. Copy the **Project URL** and the **anon** public key.
3.  **Update `.env`**: Add the copied values to your `.env` file:
    ```
    NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```
4.  **Create `message_history` Table**: Go to the **Table Editor** in your Supabase project dashboard.
    *   Click **New table**.
    *   Name the table `message_history`.
    *   Ensure **RLS (Row Level Security)** is enabled (usually default).
    *   Add the following columns:
        *   `id`: `bigint` (or `int8`), **Is Identity**, **Primary Key**.
        *   `created_at`: `timestamptz` (Timestamp with Time Zone), Default Value: `now()`.
        *   `role`: `text`, **Is Nullable**: `false`. (Constraint: `role IN ('user', 'bot')`)
        *   `content`: `text`, **Is Nullable**: `false`.
    *   Click **Save**.

5.  **Set up RLS Policies**: Go to **Authentication** > **Policies** in your Supabase dashboard.
    *   Find the `message_history` table in the list. If policies exist, you might need to edit them. If not, create new ones.
    *   **Policy 1: Enable Read Access (Public):**
        *   Click **New Policy**.
        *   Choose the **Enable read access for all users** template.
        *   Review the generated SQL (it should have `FOR SELECT USING (true)`).
        *   Click **Review**, then **Save policy**.
    *   **Policy 2: Enable Insert Access (Development vs. Production):**
        *   Click **New Policy** again for the `message_history` table.
        *   **For Development (No Auth):** Choose the **Enable insert for all users** template. This allows anyone to insert data, making development easier without setting up full authentication. The `WITH CHECK` clause should be `(true)`.
            ```sql
            -- Policy name: Allow public insert access (DEV)
            CREATE POLICY "Allow public insert access (DEV)"
            ON "public"."message_history"
            AS PERMISSIVE FOR INSERT
            TO public -- Allows anonymous users
            WITH CHECK (true);
            ```
        *   **For Production (Requires Auth):** If you implement Supabase Authentication, use the **Enable insert for authenticated users only** template. This ensures only logged-in users can save messages.
            ```sql
            -- Policy name: Allow authenticated insert access (PROD)
            CREATE POLICY "Allow authenticated insert access (PROD)"
            ON "public"."message_history"
            AS PERMISSIVE FOR INSERT
            TO authenticated -- Only allows logged-in users
            WITH CHECK (true); -- Or add specific checks like auth.uid() = user_id
            ```
        *   **Choose the appropriate template based on your current setup.** Start with the "public" insert policy for development if you haven't implemented login yet.
        *   Click **Review**, then **Save policy**.

    **Troubleshooting RLS:** If you still get "Permission denied. Check RLS policies." errors:
        *   Double-check in the Supabase dashboard (**Authentication > Policies**) that *both* read and insert policies exist and are enabled for `message_history`.
        *   Ensure the **target role** for the insert policy matches your needs (`public` for development without auth, `authenticated` for production with auth).
        *   Verify the `WITH CHECK` expression is correct (usually `true` for basic access).

### Google AI (Optional for Genkit/AI Features)

If you are using Genkit with Google AI models for the chatbot, you'll need an API key.

1.  **Get API Key**: Obtain an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2.  **Update `.env`**: Add the key to your `.env` file:
    ```
    GOOGLE_GENAI_API_KEY=your_google_api_key
    ```

### Binance (Optional for Asset/Trade Features)

To use the Binance asset summary and trading features:

1.  **Get API Key and Secret**: Generate an API key and secret from your [Binance Account](https://www.binance.com/en/my/settings/api-management).
    *   Ensure the key has permissions for **Reading**, **Spot & Margin Trading**.
    *   **Important**: For security, restrict API key access to trusted IP addresses if possible.
2.  **No `.env` Storage**: These keys are **NOT** stored in the `.env` file. You will enter them directly into the "Binance Account" section of the application interface.

## Getting Started

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Set up Environment Variables:** Create a `.env` file and add your Supabase URL/Key and optionally your Google AI Key as described above.
3.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:9002`.

## Features

*   **TradingView Chart**: Displays the BTC/USDT price chart.
*   **Binance Account Panel**: Allows users to input Binance API keys to view asset summaries (BTC/USDT) and recent trade history (BTC/USDT).
*   **YINSEN Chatbot**: An AI assistant integrated with Binance (using provided keys) to answer questions and potentially execute trades (Buy/Sell Market/Limit orders for BTC/USDT). Chat history is stored in Supabase.
*   **Analysis Panel**: Placeholder panel for future analysis tools.
