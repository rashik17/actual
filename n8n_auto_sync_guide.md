# 🔄 Step-by-Step Guide: Creating a New Auto Bank Sync Workflow in n8n

This guide walks you through creating a **brand new standalone workflow** in n8n from scratch to trigger your Actual Budget bank sync automatically on a schedule.

---

## 📋 Step 1: Create a New Blank Workflow

1. Open your **n8n** dashboard.
2. Click **+ New** (or **Add Workflow**) in the top right corner.
3. Click on the title at the top left (which defaults to *My workflow*) and rename it to:
   ```text
   Actual Budget - Auto Bank Sync
   ```

---

## ⏱️ Step 2: Add and Configure the Schedule Trigger

This node controls how frequently your bank accounts will sync automatically.

1. Click the **+** (Add first node) button on the empty canvas.
2. Search for **Schedule Trigger** (or type `On a schedule`) and select it.
3. In the parameters panel on the right:
   * **Trigger Interval**: Select your preference (e.g., **Hours**).
   * **Hours Between Triggers**: Select **2** (or your preferred duration).
   * *Optional*: If you want custom times (like every morning at 6 AM), change **Trigger Interval** to **Custom** and enter a Cron Expression (e.g., `0 6 * * *`).
4. Click the small **Back to canvas** arrow or click outside the panel to close it.

---

## ⚙️ Step 3: Add and Configure the Config Node

This node stores your environment variables (like the bridge's URL) in one central place, making it easy to change them later.

1. Click the **+** icon on the right side of your **Schedule Trigger** node.
2. Search for **Code** and select it.
3. Configure the **Code** node parameters:
   * **Node Name**: Double-click the name "Code" at the top of the panel and rename it to `Config`.
   * **Language**: Make sure **JavaScript** is selected.
   * **Mode**: Make sure **Run once for all items** is selected.
   * **Code**: Replace all placeholder code in the editor box with:
     ```javascript
     return [{
       json: {
         bridgeUrl: 'http://actual-bridge:3788',
         // Optional: Un-comment the line below and add your account ID if you only want to sync one specific bank account
         // accountId: 'your-bank-account-uuid-here'
       }
     }];
     ```
4. Click the **Run Node** button in the top right of the panel to test it. It should output:
   ```json
   [
     {
       "bridgeUrl": "http://actual-bridge:3788"
     }
   ]
   ```
5. Close the panel.

---

## 🔌 Step 4: Add and Configure the HTTP Request Node

This node sends the actual request to your bridge to run the bank sync.

1. Click the **+** icon on the right side of your **Config** node.
2. Search for **HTTP Request** and select it.
3. Configure the **HTTP Request** node parameters:
   * **Node Name**: Rename it to `Trigger Bank Sync`.
   * **Method**: Click the dropdown and select **POST**.
   * **URL**: Hover over the input field and click the **Expression** tab. Paste the following:
     ```text
     {{ $json.bridgeUrl }}/bank-sync
     ```
     *(This dynamically pulls the URL from the Config node).*
   * **Authentication**: Click the dropdown and select **Generic Credential Type**.
   * **Generic Auth Type**: Select **Header Auth**.
   * **Credential for Header Auth**: 
     * Click the dropdown. If you already have a credential for `Actual Bridge Header` (or `x-bridge-key`), select it.
     * **If creating a new credential**:
       1. Select **Create New Credential**.
       2. Change the credential name to `Actual Bridge Header`.
       3. **Name**: Enter `x-bridge-key` *(this is the header name actual-bridge expects)*.
       4. **Value**: Enter your bridge API key (defined in your `docker-compose.yml` under `BRIDGE_API_KEY`, e.g., your custom key).
       5. Click **Save** to return to the node.
   * **Send Headers**: Toggle this to **ON** (if it isn't already).
   * **Send Body / Parameters**:
     * If you want to sync **all accounts** (default):
       * Keep **Send Body** set to **OFF** (or set it to `None`).
     * If you specified an `accountId` in your Config node and want to sync only that account:
       * Toggle **Send Body** to **ON**.
       * Set **Specify Body** to **JSON**.
       * Under **JSON Body**, click the **Expression** tab and paste:
         ```text
         {{ JSON.stringify({ accountId: $json.accountId }) }}
         ```

---

## 🧪 Step 5: Test Your New Workflow

1. Click the **Listen for test step** / **Test Step** button on the `Trigger Bank Sync` node.
2. Check your `actual-bridge` Docker container logs to verify the request was received and processed:
   ```bash
   docker logs -f actual-bridge
   ```
   You should see:
   ```text
   🔄 Starting bank sync...
   🔄 Syncing local database changes to server...
   ✅ Actual budget ready
   ```
3. In n8n, the node should return a successful response:
   ```json
   [
     {
       "ok": true
     }
   ]
   ```

---

## 🔔 Step 6: Activate the Workflow

1. Click **Save** (or press `Cmd+S` / `Ctrl+S`) in the top-right corner of n8n.
2. Click the **Active** toggle switch in the top-right corner to turn the workflow **ON**.

Your Actual Budget database will now automatically perform a full bank sync every 2 hours!
