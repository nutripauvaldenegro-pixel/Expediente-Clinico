const fs = require('fs');
const pdfData = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 51 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Ibuprofeno 400mg Paracetamol Diagnostico) Tj\nET\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
fs.writeFileSync('dummy_real.pdf', Buffer.from(pdfData, 'utf-8'));
