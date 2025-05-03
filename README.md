# YINSEN Chatbot

This is a Next.js application featuring an AI-powered chatbot (YINSEN) integrated with Binance for asset viewing and trading, styled similarly to Firebase Studio.

## Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file:

### Supabase (Required for Chat History & OHLCV Data)

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

5.  **Create `OHLCV_BTC_USDT_1m` Table**: Go to the **Table Editor** again.
    *   Click **New table**.
    *   Name the table `OHLCV_BTC_USDT_1m`.
    *   Ensure **RLS (Row Level Security)** is enabled.
    *   Add the following columns:
        *   `open_time`: `timestamptz`, **Primary Key**. (Timestamp of the candle open)
        *   `open`: `numeric`.
        *   `high`: `numeric`.
        *   `low`: `numeric`.
        *   `close`: `numeric`.
        *   `volume`: `numeric`. (Base asset volume)
        *   `close_time`: `timestamptz`. (Timestamp of the candle close)
        *   `quote_asset_volume`: `numeric`. (Quote asset volume)
        *   `number_of_trades`: `bigint` (or `int8`).
        *   `taker_buy_base_asset_volume`: `numeric`.
        *   `taker_buy_quote_asset_volume`: `numeric`.
        *   `inserted_at`: `timestamptz`, Default Value: `now()`. (Timestamp when the record was inserted/updated in Supabase)
    *   Click **Save**.
    *   **(Optional but Recommended) Add Index**: Go to **Database** > **Indexes**. Create an index on the `open_time` column for faster lookups.

6.  **Set up RLS Policies**: Go to **Authentication** > **Policies** in your Supabase dashboard.

    *   **For `message_history` table:**
        *   **Policy 1: Enable Read Access (Public):**
            *   Click **New Policy** > Choose the **Enable read access for all users** template.
            *   Review and **Save policy**.
        *   **Policy 2: Enable Insert Access (Public - For Development):**
            *   Click **New Policy** > Choose the **Enable insert access for all users** template (if available).
            *   *If template unavailable*, use the **SQL Editor** (Left Sidebar > SQL Editor > New query):
                ```sql
                -- Policy name: Allow public insert access for messages (DEV)
                CREATE POLICY "Allow public insert access for messages (DEV)"
                ON "public"."message_history"
                AS PERMISSIVE FOR INSERT
                TO public -- Allows anonymous users (via anon key)
                WITH CHECK (true);
                ```
            *   Run the SQL and **Save policy**. (For production with authentication, change `TO public` to `TO authenticated` and add appropriate checks).

    *   **For `OHLCV_BTC_USDT_1m` table:**
        *   **Policy 1: Enable Read Access (Public):**
            *   Click **New Policy** for `OHLCV_BTC_USDT_1m`.
            *   Choose the **Enable read access for all users** template.
            *   Review and **Save policy**.
        *   **Policy 2: Enable Insert/Update Access (Public - for Data Collection):**
            *   Since the `collect-data.ts` action uses `upsert`, we need both INSERT and UPDATE permissions. Use the **SQL Editor**:
                ```sql
                -- Policy name: Allow public upsert access for OHLCV data
                CREATE POLICY "Allow public upsert access for OHLCV data"
                ON "public"."OHLCV_BTC_USDT_1m"
                AS PERMISSIVE FOR ALL -- Grants INSERT, SELECT, UPDATE, DELETE (adjust if needed)
                TO public -- Allows anon key access
                USING (true) -- Condition for SELECT, UPDATE, DELETE
                WITH CHECK (true); -- Condition for INSERT, UPDATE
                ```
            *   Run the SQL and **Save policy**. This broad policy allows the data collection script (using the anon key) to insert or update records.

    **Troubleshooting RLS:** If you encounter "Permission denied. Check RLS policies." errors:
        *   Verify in **Authentication > Policies** that *all necessary policies* (read, insert/update) exist and are enabled for *both* `message_history` and `OHLCV_BTC_USDT_1m`.
        *   Ensure the **target role** for insert/upsert policies is `public` (if not using Supabase Auth).
        *   Ensure `USING (true)` and `WITH CHECK (true)` are set for basic public access.
        *   Refresh your application after changing policies.

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
*   **Binance Account Panel**: Allows users to input Binance API keys to view asset summaries (BTC/USDT) and recent trade history (BTC/USDT). Data refreshes periodically.
*   **Trading Panel**: Allows placing Market and Limit orders for BTC/USDT using the provided Binance API keys.
*   **YINSEN Chatbot**: An AI assistant. Chat history is stored in Supabase. (Trading functionality removed from bot).
*   **Analysis Panel**: Displays real-time BTC/USDT technical indicators and includes a button to collect 1-minute OHLCV data into Supabase.

```