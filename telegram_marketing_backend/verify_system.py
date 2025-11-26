import asyncio
import httpx
import sys
import warnings
import time
from datetime import datetime, timezone

# Force UTF-8 output for Windows consoles
sys.stdout.reconfigure(encoding='utf-8')
# Suppress deprecation warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)

# Configuration
BASE_URL = "http://localhost:8000"

# Colors for output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# Test Statistics
class TestStats:
    total = 0
    passed = 0
    failed = 0
    skipped = 0
    results = []

    @classmethod
    def add_result(cls, name, status, message=""):
        cls.total += 1
        if status == "PASS":
            cls.passed += 1
            print_success(f"{name}")
        elif status == "FAIL":
            cls.failed += 1
            print_fail(f"{name} - {message}")
        elif status == "SKIP":
            cls.skipped += 1
            print_info(f"{name} [SKIPPED] - {message}")
        cls.results.append({"name": name, "status": status, "message": message})

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}" + "="*60)
    print(f" {text}")
    print("="*60 + f"{Colors.ENDC}")

def print_success(text):
    print(f"{Colors.OKGREEN} [OK] {text}{Colors.ENDC}")

def print_fail(text):
    print(f"{Colors.FAIL} [FAIL] {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN} [INFO] {text}{Colors.ENDC}")

async def check_health(client):
    print_header("Checking System Health")
    try:
        response = await client.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            TestStats.add_result("Health Check", "PASS")
            return True
        else:
            TestStats.add_result("Health Check", "FAIL", f"Status {response.status_code}")
            return False
    except Exception as e:
        TestStats.add_result("Health Check", "FAIL", str(e))
        return False

async def verify_accounts(client):
    print_header("Verifying Accounts")
    try:
        response = await client.get(f"{BASE_URL}/accounts/")
        if response.status_code == 200:
            accounts = response.json()
            TestStats.add_result("Fetch Accounts", "PASS")
            print_info(f"Found {len(accounts)} accounts")
            for acc in accounts:
                status_icon = "[ACTIVE]" if acc['is_active'] else "[INACTIVE]"
                warmup_icon = "[WARMUP:ON]" if acc.get('warmup_enabled') else "[WARMUP:OFF]"
                print(f"   {status_icon} {acc['phone_number']} (ID: {acc['id']}) | {warmup_icon}")
            return accounts
        else:
            TestStats.add_result("Fetch Accounts", "FAIL", f"Status {response.status_code}")
            return []
    except Exception as e:
        TestStats.add_result("Fetch Accounts", "FAIL", str(e))
        return []

async def verify_warmup(client, account):
    print_header(f"Verifying Warm-up for Account {account['phone_number']}")
    account_id = account['id']
    # Enable Warmup
    try:
        res = await client.post(f"{BASE_URL}/accounts/{account_id}/warmup", json={"enabled": True})
        if res.status_code == 200 and res.json().get('warmup_enabled') == True:
            TestStats.add_result("Enable Warm-up", "PASS")
        else:
            TestStats.add_result("Enable Warm-up", "FAIL", res.text)
            return False
    except Exception as e:
        TestStats.add_result("Enable Warm-up", "FAIL", str(e))
        return False
    # Fetch Warm-up Logs
    try:
        res = await client.get(f"{BASE_URL}/accounts/{account_id}/warmup-logs")
        if res.status_code == 200:
            logs = res.json()
            TestStats.add_result("Fetch Warm-up Logs", "PASS")
            if logs:
                last_log = logs[0]
                action = last_log.get('action')
                details = last_log.get('details')
                timestamp = last_log.get('timestamp')
                print(f"   Last action: {action} - {details} ({timestamp})")
        else:
            TestStats.add_result("Fetch Warm-up Logs", "FAIL", f"Status {res.status_code}")
            return False
    except Exception as e:
        TestStats.add_result("Fetch Warm-up Logs", "FAIL", str(e))
        return False
    # Disable Warmup
    try:
        res = await client.post(f"{BASE_URL}/accounts/{account_id}/warmup", json={"enabled": False})
        if res.status_code == 200 and res.json().get('warmup_enabled') == False:
            TestStats.add_result("Disable Warm-up", "PASS")
        else:
            TestStats.add_result("Disable Warm-up", "FAIL", res.text)
            return False
    except Exception as e:
        TestStats.add_result("Disable Warm-up", "FAIL", str(e))
        return False
    return True

async def verify_lists(client):
    print_header("Verifying Lists")
    list_id = None
    # Create List
    try:
        res = await client.post(f"{BASE_URL}/lists/", json={"name": "AutoTest List", "users": []})
        if res.status_code in [200, 201]:
            data = res.json()
            list_id = data['list_id']
            TestStats.add_result("Create List", "PASS")
        else:
            TestStats.add_result("Create List", "FAIL", res.text)
            return None
    except Exception as e:
        TestStats.add_result("Create List", "FAIL", str(e))
        return None
    # Upload Users (creates a new list)
    uploaded_list_id = None
    try:
        files = {'file': ('users.txt', 'username\n@testuser1\n@testuser2', 'text/plain')}
        res = await client.post(f"{BASE_URL}/lists/upload", files=files)
        if res.status_code in [200, 201]:
            data = res.json()
            uploaded_list_id = data['list_id']
            TestStats.add_result("Upload Users (Create List)", "PASS")
            await cleanup_list(client, uploaded_list_id)
        else:
            TestStats.add_result("Upload Users (Create List)", "FAIL", res.text)
    except Exception as e:
        TestStats.add_result("Upload Users (Create List)", "FAIL", str(e))
    return list_id

async def cleanup_list(client, list_id):
    if not list_id:
        return
    try:
        await client.delete(f"{BASE_URL}/lists/{list_id}")
        TestStats.add_result(f"Cleanup List {list_id}", "PASS")
    except Exception as e:
        TestStats.add_result(f"Cleanup List {list_id}", "FAIL", str(e))

async def verify_templates(client):
    print_header("Verifying Templates")
    template_id = None
    # Create Template
    try:
        res = await client.post(f"{BASE_URL}/messages/", json={"name": "AutoTest Template", "content": "Hello from AutoTest!"})
        if res.status_code in [200, 201]:
            data = res.json()
            template_id = data['id']
            TestStats.add_result("Create Template", "PASS")
        else:
            TestStats.add_result("Create Template", "FAIL", res.text)
            return None
    except Exception as e:
        TestStats.add_result("Create Template", "FAIL", str(e))
        return None
    return template_id

async def cleanup_template(client, template_id):
    if not template_id:
        return
    try:
        await client.delete(f"{BASE_URL}/messages/{template_id}")
        TestStats.add_result(f"Cleanup Template {template_id}", "PASS")
    except Exception as e:
        TestStats.add_result(f"Cleanup Template {template_id}", "FAIL", str(e))

async def verify_campaign_lifecycle(client, list_id, template_id, account_id):
    print_header("Verifying Campaign Lifecycle")
    if not list_id or not template_id or not account_id:
        TestStats.add_result("Campaign Lifecycle", "SKIP", "Missing dependencies")
        return
    campaign_id = None
    # Schedule Campaign
    try:
        tomorrow = datetime.now(timezone.utc).replace(hour=23, minute=59).isoformat()
        payload = {
            "name": "AutoTest Campaign",
            "list_id": list_id,
            "template_id": template_id,
            "account_ids": [account_id],
            "delay": 1,
            "scheduled_for": tomorrow
        }
        res = await client.post(f"{BASE_URL}/campaigns/start", json=payload)
        if res.status_code == 200:
            TestStats.add_result("Schedule Campaign", "PASS")
            # Find campaign ID
            c_res = await client.get(f"{BASE_URL}/campaigns/")
            campaigns = c_res.json()
            my_campaign = next((c for c in campaigns if c['name'] == "AutoTest Campaign"), None)
            if my_campaign:
                campaign_id = my_campaign['id']
                TestStats.add_result("Find Scheduled Campaign", "PASS")
            else:
                TestStats.add_result("Find Scheduled Campaign", "FAIL", "Not found in list")
                return
        else:
            TestStats.add_result("Schedule Campaign", "FAIL", res.text)
            return
    except Exception as e:
        TestStats.add_result("Schedule Campaign", "FAIL", str(e))
        return
    # Stop Campaign
    try:
        res = await client.post(f"{BASE_URL}/campaigns/stop/{campaign_id}")
        if res.status_code == 200:
            TestStats.add_result("Stop Campaign", "PASS")
        else:
            TestStats.add_result("Stop Campaign", "FAIL", res.text)
    except Exception as e:
        TestStats.add_result("Stop Campaign", "FAIL", str(e))
    # Delete Campaign
    try:
        res = await client.delete(f"{BASE_URL}/campaigns/{campaign_id}")
        if res.status_code == 200:
            TestStats.add_result("Delete Campaign", "PASS")
        else:
            TestStats.add_result("Delete Campaign", "FAIL", res.text)
    except Exception as e:
        TestStats.add_result("Delete Campaign", "FAIL", str(e))

async def verify_account_actions(client, account_id):
    print_header(f"Verifying Account Actions for ID {account_id}")
    # Check Proxy
    try:
        res = await client.post(f"{BASE_URL}/accounts/{account_id}/check-proxy")
        if res.status_code == 200:
            TestStats.add_result("Check Proxy", "PASS")
        else:
            TestStats.add_result("Check Proxy", "FAIL", res.text)
    except Exception as e:
        TestStats.add_result("Check Proxy", "FAIL", str(e))
    # Check Health
    try:
        res = await client.post(f"{BASE_URL}/accounts/{account_id}/check-health")
        if res.status_code == 200:
            TestStats.add_result("Check Health", "PASS")
        else:
            TestStats.add_result("Check Health", "FAIL", res.text)
    except Exception as e:
        TestStats.add_result("Check Health", "FAIL", str(e))

async def verify_analytics(client):
    print_header("Verifying Analytics")
    try:
        res = await client.get(f"{BASE_URL}/analytics/daily")
        if res.status_code == 200:
            TestStats.add_result("Fetch Daily Analytics", "PASS")
        else:
            TestStats.add_result("Fetch Daily Analytics", "FAIL", f"Status {res.status_code}")
        res = await client.get(f"{BASE_URL}/analytics/status-distribution")
        if res.status_code == 200:
            TestStats.add_result("Fetch Status Distribution", "PASS")
        else:
            TestStats.add_result("Fetch Status Distribution", "FAIL", f"Status {res.status_code}")
    except Exception as e:
        TestStats.add_result("Analytics Verification", "FAIL", str(e))

async def verify_ab_tests(client, template_id):
    print_header("Verifying A/B Tests")
    if not template_id:
        TestStats.add_result("A/B Test Verification", "SKIP", "No template available")
        return
    try:
        payload = {
            "name": "AutoTest AB",
            "variants": [
                {"template_id": template_id, "weight": 50},
                {"template_id": template_id, "weight": 50}
            ]
        }
        # Create A/B test
        res = await client.post(f"{BASE_URL}/ab_test/create", json=payload)
        if res.status_code in [200, 201]:
            data = res.json()
            ab_test_id = data.get("id")
            TestStats.add_result("Create A/B Test", "PASS")
        else:
            TestStats.add_result("Create A/B Test", "FAIL", res.text)
            ab_test_id = None
        # List A/B tests
        res = await client.get(f"{BASE_URL}/ab_test/list")
        if res.status_code == 200:
            TestStats.add_result("List A/B Tests", "PASS")
        else:
            TestStats.add_result("List A/B Tests", "FAIL", f"Status {res.status_code}")
        # Cleanup created test
        if ab_test_id:
            del_res = await client.delete(f"{BASE_URL}/ab_test/{ab_test_id}")
            if del_res.status_code == 200:
                TestStats.add_result("Delete A/B Test", "PASS")
            else:
                TestStats.add_result("Delete A/B Test", "FAIL", del_res.text)
    except Exception as e:
        TestStats.add_result("A/B Test Verification", "FAIL", str(e))

async def verify_filters(client):
    print_header("Verifying Filters")
    try:
        res = await client.get(f"{BASE_URL}/filters/")
        if res.status_code == 200:
            TestStats.add_result("Get Filters", "PASS")
        else:
            TestStats.add_result("Get Filters", "FAIL", f"Status {res.status_code}")
        res = await client.post(f"{BASE_URL}/filters/", json={"skip_no_photo": True, "skip_bots": False})
        if res.status_code == 200:
            TestStats.add_result("Update Filters", "PASS")
        else:
            TestStats.add_result("Update Filters", "FAIL", res.text)
    except Exception as e:
        TestStats.add_result("Filters Verification", "FAIL", str(e))

async def verify_delay(client):
    print_header("Verifying Delay Settings")
    try:
        res = await client.get(f"{BASE_URL}/delay/")
        if res.status_code == 200:
            TestStats.add_result("Get Delay Settings", "PASS")
        else:
            TestStats.add_result("Get Delay Settings", "FAIL", f"Status {res.status_code}")
        res = await client.post(f"{BASE_URL}/delay/", json={"type": "random", "min_delay": 2.0, "max_delay": 10.0})
        if res.status_code == 200:
            TestStats.add_result("Update Delay Settings", "PASS")
        else:
            TestStats.add_result("Update Delay Settings", "FAIL", res.text)
    except Exception as e:
        TestStats.add_result("Delay Verification", "FAIL", str(e))

async def main():
    print(f"{Colors.BOLD}Starting Maximum System Verification...{Colors.ENDC}")
    start_time = time.time()
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Health Check
        if not await check_health(client):
            print_fail("System is unhealthy. Aborting.")
            return
        # 2. Account Verification
        accounts = await verify_accounts(client)
        active_account = next((a for a in accounts if a['is_active']), None)
        if active_account:
            # 3. Account Actions
            await verify_account_actions(client, active_account['id'])
            # 4. Warm-up Verification
            await verify_warmup(client, active_account)
        else:
            TestStats.add_result("Account Actions", "SKIP", "No active accounts")
            TestStats.add_result("Warm-up Verification", "SKIP", "No active accounts")
        # 5. Lists Verification
        list_id = await verify_lists(client)
        # 6. Templates Verification
        template_id = await verify_templates(client)
        # 7. Campaign Lifecycle Verification
        if active_account and list_id and template_id:
            await verify_campaign_lifecycle(client, list_id, template_id, active_account['id'])
        else:
            TestStats.add_result("Campaign Lifecycle", "SKIP", "Missing dependencies")
        # 8. Analytics Verification
        await verify_analytics(client)
        # 9. A/B Test Verification
        await verify_ab_tests(client, template_id)
        # 10. Filters Verification
        await verify_filters(client)
        # 11. Delay Verification
        await verify_delay(client)
        # Cleanup
        print_header("Cleanup")
        await cleanup_template(client, template_id)
        await cleanup_list(client, list_id)
    duration = time.time() - start_time
    # Summary Report
    print_header("Verification Summary")
    print(f"Total Tests: {TestStats.total}")
    print(f"{Colors.OKGREEN}Passed:      {TestStats.passed}{Colors.ENDC}")
    print(f"{Colors.FAIL}Failed:      {TestStats.failed}{Colors.ENDC}")
    print(f"{Colors.OKCYAN}Skipped:     {TestStats.skipped}{Colors.ENDC}")
    print(f"Duration:    {duration:.2f}s")
    if TestStats.failed == 0:
        print(f"\n{Colors.OKGREEN}{Colors.BOLD}✨ SYSTEM VERIFIED SUCCESSFULLY ✨{Colors.ENDC}")
    else:
        print(f"\n{Colors.FAIL}{Colors.BOLD}⚠️ SYSTEM VERIFICATION FAILED ⚠️{Colors.ENDC}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nVerification stopped by user.")
    except Exception as e:
        print(f"\nUnexpected error: {e}")
