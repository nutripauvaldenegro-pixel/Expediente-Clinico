import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:5173")

        await page.wait_for_selector("text=Gestión de Expedientes")

        # Subir el archivo buscando input file especificamente
        with open("dummy.pdf", "wb") as f:
            f.write(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 51 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Ibuprofeno 400mg Paracetamol Diagnostico) Tj\nET\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF")

        await page.locator('input[type="file"]').set_input_files("dummy.pdf")

        print("Esperando a que el documento se procese...")

        try:
            await page.wait_for_selector('text=Procesando', timeout=5000)
            await page.wait_for_selector('text=Procesando', state='hidden', timeout=30000)
        except:
            pass

        print("Documento procesado. Navegando a cronologia clinica...")

        # Click on Cronología Clínica tab
        await page.click('button:has-text("Cronología Clínica")')
        await page.wait_for_timeout(2000)

        # Wait for month expansion
        try:
            # First element is month, click it
            await page.click('.w-full.text-left.px-4.py-3.rounded-xl')
        except:
            pass

        # Wait for date button and click
        try:
            await page.wait_for_selector('button.w-full.text-left.p-4.rounded-xl.transition-all.duration-300', timeout=5000)
            await page.click('button.w-full.text-left.p-4.rounded-xl.transition-all.duration-300')
            print("Clicked first date")
            await page.wait_for_timeout(2000)
        except Exception as e:
            print("Could not click first date:", e)

        # Esperar a que renderice la info extraída
        try:
            await page.wait_for_selector('text=Información Extraída', timeout=10000)
        except:
            pass

        # Tomar captura de pantalla
        await page.screenshot(path="/home/jules/verification/verification_timeline_colors.png")
        print("Captura tomada en /home/jules/verification/verification_timeline_colors.png")

        await browser.close()

asyncio.run(main())
