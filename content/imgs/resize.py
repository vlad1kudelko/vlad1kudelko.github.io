import os
from PIL import Image

# Укажите путь к папке с изображениями
folder_path = '.'

# Максимальная ширина
max_width = 800

for filename in os.listdir(folder_path):
    if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.webp')):
        file_path = os.path.join(folder_path, filename)
        with Image.open(file_path) as img:
            width, height = img.size
            if width > max_width:
                # Вычисляем новую высоту с сохранением пропорций
                new_height = int((max_width / width) * height)
                resized_img = img.resize((max_width, new_height), Image.LANCZOS)
                # Сохраняем изображение (можно изменить имя файла, если не хотите перезаписывать)
                resized_img.save(file_path)
                print(f'Изображение {filename} изменено: {width}x{height} → {max_width}x{new_height}')
            else:
                print(f'Изображение {filename} не требует изменения размера ({width}x{height})')