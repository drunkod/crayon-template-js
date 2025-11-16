from playwright.sync_api import sync_playwright
import time

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    try:
        page.goto("http://localhost:4000")
        time.sleep(10) # Add a 10-second delay

        page.screenshot(path="verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run_verification(playwright)
