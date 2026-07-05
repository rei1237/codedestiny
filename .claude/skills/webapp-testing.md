---
name: webapp-testing
description: Test local web applications using Playwright browser automation
---

# Web Application Testing

## Overview

Test local web applications with Playwright, a browser automation framework. Follows a decision-tree approach: **static HTML** (read directly) vs **dynamic content** (requires server management).

## Key Principle

**Don't inspect the DOM prematurely.** On dynamic apps, always wait for `page.wait_for_load_state('networkidle')` before examining or interacting with elements.

## Core Workflow: Reconnaissance → Action

### Step 1: Wait for Network Idle

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:3000")
    
    # Critical: Wait for network to settle
    page.wait_for_load_state('networkidle')
```

### Step 2: Capture / Inspect DOM

```python
    # Now safe to inspect
    screenshot = page.screenshot(path="screenshot.png")
    
    # Or examine DOM
    html = page.content()
    print(html)
```

### Step 3: Identify Selectors

From the rendered page, identify elements to interact with:

```python
    # Find by various selectors
    button = page.locator('button:has-text("Submit")')
    input_field = page.locator('input[placeholder="Email"]')
    link = page.locator('a:nth-child(1)')
```

### Step 4: Execute Actions

Interact with discovered elements:

```python
    # Fill input
    input_field.fill("user@example.com")
    
    # Click button
    button.click()
    
    # Wait for response
    page.wait_for_load_state('networkidle')
    
    # Verify result
    success_message = page.locator('text=Success')
    assert success_message.is_visible()
```

## Server Management Helper

For dynamic applications, use the `with_server.py` helper to manage server lifecycle:

```bash
python with_server.py --help
```

**Features:**
- Manages multiple simultaneous servers
- Handles startup/shutdown automatically
- Provides server endpoints to test scripts
- Handles cleanup on failure

### Example with Server

```python
from with_server import with_server

def test_app(server_url):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        page.goto(f"{server_url}/")
        page.wait_for_load_state('networkidle')
        
        # Your test here
        assert page.title() == "Expected Title"

# Helper manages server startup/shutdown
with_server(test_app, server_cmd="npm run dev", port=3000)
```

## Static vs Dynamic: Decision Tree

### ❓ Is your app static HTML?

**YES** → Read HTML directly:
```python
with open("index.html") as f:
    html = f.read()
# Inspect and verify
```

**NO** → Use Playwright + server management

## Common Patterns

### Form Submission Test

```python
from playwright.sync_api import sync_playwright

def test_login_form():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        # Navigate
        page.goto("http://localhost:3000/login")
        page.wait_for_load_state('networkidle')
        
        # Fill form
        page.locator('input[name="username"]').fill("testuser")
        page.locator('input[name="password"]').fill("password123")
        
        # Submit
        page.locator('button:has-text("Login")').click()
        
        # Wait for redirect/response
        page.wait_for_load_state('networkidle')
        
        # Verify success
        assert page.url.endswith("/dashboard")
        browser.close()
```

### Multi-page Navigation

```python
def test_navigation_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        # Start page
        page.goto("http://localhost:3000")
        page.wait_for_load_state('networkidle')
        
        # Navigate to feature
        page.locator('a:has-text("Features")').click()
        page.wait_for_load_state('networkidle')
        assert page.url.endswith("/features")
        
        # Navigate to pricing
        page.locator('a:has-text("Pricing")').click()
        page.wait_for_load_state('networkidle')
        assert page.url.endswith("/pricing")
        
        browser.close()
```

### Interactive Element Testing

```python
def test_interactive_elements():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        page.goto("http://localhost:3000")
        page.wait_for_load_state('networkidle')
        
        # Toggle a switch
        switch = page.locator('role=switch')
        is_checked = switch.is_checked()
        switch.click()
        page.wait_for_load_state('networkidle')
        assert switch.is_checked() != is_checked
        
        browser.close()
```

### Data Table Verification

```python
def test_data_table():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        page.goto("http://localhost:3000/data")
        page.wait_for_load_state('networkidle')
        
        # Get all rows
        rows = page.locator('tbody tr')
        row_count = rows.count()
        print(f"Table has {row_count} rows")
        
        # Verify specific cell
        cell = rows.locator('nth=0 >> td:nth-child(2)')
        assert cell.text_content() == "Expected Value"
        
        browser.close()
```

### Modal/Dialog Testing

```python
def test_modal_interaction():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        page.goto("http://localhost:3000")
        page.wait_for_load_state('networkidle')
        
        # Open modal
        page.locator('button:has-text("Open Dialog")').click()
        
        # Wait for modal to appear
        modal = page.locator('role=dialog')
        assert modal.is_visible()
        
        # Close modal
        page.locator('button:has-text("Close")').click()
        assert not modal.is_visible()
        
        browser.close()
```

## Best Practices

1. **Always `wait_for_load_state()`** before interacting with dynamic content
2. **Use semantic locators** when possible (`role=button`, `text=...`)
3. **Handle asynchronous operations** — wait for network/animations
4. **Test realistic user flows** — don't just test happy paths
5. **Use helper utilities** — `with_server.py` handles boilerplate
6. **Screenshot on failure** — helps debug issues
7. **Clean up resources** — always `browser.close()`

## Locator Strategies

```python
# CSS selector
page.locator('.button-primary')

# XPath
page.locator('//button[@class="primary"]')

# Role-based (accessible)
page.locator('role=button')
page.locator('role=textbox')

# Text content
page.locator('text=Submit')
page.locator(':has-text("Sign In")')

# Combination
page.locator('button:has-text("Save"):nth-child(2)')
```

## Application to Code Destiny

**Test scenarios:**

1. **Fortune Generation** — User inputs date/time → AI generates reading
2. **Payment Flow** — Select feature → Add to cart → Checkout
3. **Theme Toggle** — Switch between light/dark (연이/네오)
4. **Mobile Responsive** — Verify layout at 390px viewport
5. **Data Persistence** — Save reading → Refresh → Data still present
6. **Multi-language** — Switch locale → UI updates
7. **Form Validation** — Invalid input → Error message shows
8. **API Integration** — External API call → Result displays

**Example: Test Fortune Generation**

```python
def test_saju_generation():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        
        page.goto("http://localhost:3000/saju")
        page.wait_for_load_state('networkidle')
        
        # Fill birth info
        page.locator('input[name="year"]').fill("1990")
        page.locator('input[name="month"]').fill("01")
        page.locator('input[name="day"]').fill("15")
        page.locator('input[name="hour"]').fill("14")
        
        # Generate
        page.locator('button:has-text("Generate")').click()
        
        # Wait for result
        page.wait_for_load_state('networkidle')
        
        # Verify fortune displayed
        fortune = page.locator('text=당신의 운세')
        assert fortune.is_visible()
        
        browser.close()
```

## Debugging

### Enable Debug Logging

```bash
PWDEBUG=1 python test_script.py
```

Opens Playwright Inspector — step through code, inspect elements.

### Take Screenshots

```python
page.screenshot(path=f"debug-{step}.png")
```

### Print Page State

```python
print(page.content())  # Full HTML
print(page.url)       # Current URL
```

## Resources

- **Playwright Docs**: https://playwright.dev/python
- **Locator API**: https://playwright.dev/python/docs/locators
- **Best Practices**: https://playwright.dev/python/docs/best-practices

---

**Use this skill when testing dynamic web applications for Code Destiny features.**
