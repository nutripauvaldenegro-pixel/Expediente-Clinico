from PIL import Image, ImageDraw, ImageFont
img = Image.new('RGB', (400, 200), color = (255, 255, 255))
d = ImageDraw.Draw(img)
d.text((20,50), "Ibuprofeno 400mg", fill=(0,0,0))
d.text((20,100), "Diagnostico: Fiebre moderada", fill=(0,0,0))
img.save('dummy_test.png')
