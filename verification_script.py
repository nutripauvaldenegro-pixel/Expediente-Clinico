import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:5173")

        # Esperar a que la página cargue
        await page.wait_for_selector("text=Gestión de Expedientes")

        # Preparar un archivo PDF dummy
        with open("dummy.pdf", "wb") as f:
            f.write(b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 51 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Ibuprofeno 400mg Paracetamol Diagnostico) Tj\nET\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF")

        # Subir el archivo
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files("dummy.pdf")

        print("Esperando a que el documento se procese...")

        # Esperar hasta que termine de procesar (esperando a que se quite el estado "Procesando")
        # Primero asegurar que aparezca "Procesando"
        try:
            await page.wait_for_selector('text=Procesando', timeout=5000)
            # Luego esperar a que NO esté
            await page.wait_for_selector('text=Procesando', state='hidden', timeout=30000)
        except:
            print("No se vio el estado procesando, asumiendo que ya termino")

        print("Documento procesado. Abriendo modal...")

        # El click es en la fila (o un botón) de la tabla
        # Buscar el botón de detalle en la tabla
        await page.wait_for_selector('button.text-indigo-400')
        await page.click('button.text-indigo-400')

        # Esperar a que se abra el modal
        await page.wait_for_selector('text=Información Extraída', timeout=10000)

        # Click en el tab de Información Extraída
        await page.click('button:has-text("Información Extraída")')

        # Esperar un poco para asegurar que se renderiza
        await page.wait_for_timeout(2000)

        # Tomar captura de pantalla
        await page.screenshot(path="/home/jules/verification/verification_colors.png")
        print("Captura tomada en /home/jules/verification/verification_colors.png")

        await browser.close()

asyncio.run(main())
