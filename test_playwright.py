import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1280, "height": 800})

        # We assume the vite server is running on 5173
        print("Navigating to test...")
        await page.goto("http://localhost:5173/mock-test/teaching-exams/3rd-grade-mock-test-8.html")

        print("Starting test...")
        await page.click("button:has-text('Start Test')")
        await asyncio.sleep(2)

        # Navigate to a question that has latex and bold math.
        # Math is visible in question 101, let's look at 101 for bold/latex rendering.
        # It's in the mathematics section, let's find a question in general.
        print("Clicking Q1 in palette to see markdown...")
        await page.click("button.question-bubble:has-text('1')")
        await asyncio.sleep(1)

        # Check screenshot
        print("Capturing screenshot of the question container...")
        question_container = await page.wait_for_selector(".question-container")
        await question_container.screenshot(path="/home/jules/verification/screenshots/verification_bold.png")
        print("Screenshot saved to /home/jules/verification/screenshots/verification_bold.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
