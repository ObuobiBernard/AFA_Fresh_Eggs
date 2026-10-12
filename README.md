# AFA Fresh Eggs Manager: setup

## 1. Supabase (database)
1. Create a free project at supabase.com.
2. SQL Editor > New query > paste `schema.sql` > Run. This creates the tables and locks them so only signed-in users can read or write.
3. Authentication > Sign In / Providers > turn OFF "Allow new users to sign up".
4. Authentication > Users > Add user > Create new user (email + password, tick auto-confirm). Make one for each person who needs access.
5. Project Settings > API: copy the Project URL and the `anon` public key.
6. Open `index.html` and replace `PASTE_PROJECT_URL` and `PASTE_ANON_KEY` near the top of the script. Never use the `service_role` key.

## 2. GitHub Pages (hosting)
1. Create a new GitHub repository and upload `index.html` (and these other files if you like).
2. Settings > Pages > Source: "Deploy from a branch", branch `main`, folder `/ (root)` > Save.
3. After a minute the app is live at `https://YOUR-USERNAME.github.io/REPO-NAME/`. Open it on the phone and choose "Add to Home screen".

## Managing the data
Supabase > Table Editor is the database manager: view, edit, filter and export any table to CSV. The app also has a "Download backup" button on the Home tab.

Note: free Supabase projects pause after about a week with no activity. Opening the app weekly keeps it awake, and a paused project can be restored from the dashboard.
