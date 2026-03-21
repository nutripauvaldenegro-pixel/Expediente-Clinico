import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))
        await page.goto("http://localhost:5173")

        await page.wait_for_selector("text=Gestión de Expedientes")

        await page.locator('input[type="file"]').set_input_files("dummy_real.pdf")

        print("Esperando a que el documento se procese (Gemini API)...")

        try:
            await page.wait_for_selector('text=Procesando', timeout=5000)
            await page.wait_for_selector('text=Procesando', state='hidden', timeout=30000)
        except:
            pass

        print("Documento procesado. Navegando al detalle...")

        await page.wait_for_timeout(3000)

        details_btn = await page.query_selector('button.text-indigo-400')
        if details_btn:
            await details_btn.click()
            await page.wait_for_selector('text=Información Extraída', timeout=10000)
            await page.click('button:has-text("Información Extraída")')
            await page.wait_for_timeout(3000)
            await page.screenshot(path="/home/jules/verification/verification_gemini_entities.png")
            print("Captura tomada en /home/jules/verification/verification_gemini_entities.png")
        else:
            print("Error: Detail button not found. Maybe OCR failed.")
            await page.screenshot(path="/home/jules/verification/verification_gemini_entities_err.png")

        await browser.close()

asyncio.run(main())
