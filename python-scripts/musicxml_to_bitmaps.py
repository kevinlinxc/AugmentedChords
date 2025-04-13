from pathlib import Path
from music21 import chord, stream
import music21
import cv2
from tqdm import tqdm
import shutil
import logging
import os

logger = logging.getLogger(__file__)

xml_path = "clairedelune.mxl"
num_bars = 2

score = music21.converter.parse(xml_path)
total_measures = len(score.parts[0].getElementsByClass(stream.Measure))
print(f"{xml_path} has {total_measures} measures")

png_folder = Path(xml_path).parent / Path(xml_path).stem / "temp" / "png"
# delete everything in it
if png_folder.exists():
    shutil.rmtree(png_folder)
bitmap_folder = Path(xml_path).parent / Path(xml_path).stem / "temp" /"bitmap"
# delete everything in bitmap folder
if bitmap_folder.exists():
    shutil.rmtree(bitmap_folder)
final_folder = Path(xml_path).parent / Path(xml_path).stem 
# delete everything in final folder
if final_folder.exists():
    shutil.rmtree(final_folder)
final_folder.mkdir(parents=True, exist_ok=True)
png_folder.mkdir(parents=True, exist_ok=True)
bitmap_folder.mkdir(parents=True, exist_ok=True)


output_index = 0


for i in tqdm(range(1, total_measures, num_bars)):
    # 1. use Musescore to convert some measures from the musicxml to png
    measures_stream: music21.stream.Score = score.measures(i, i+num_bars-1)

    my_stream = stream.Stream()
    for j in range(len(measures_stream)):
        stream_: music21.stream.base.PartStaff = measures_stream[j]
        my_stream.append(stream_)

    output_path = my_stream.write("musicxml.png", Path("temp.png"))
    #monkey patch: 
    # if file size < 1mb, its a page break, skip it
    if Path(output_path).stat().st_size < 1024:
        logger.debug(f"Skipping page break {i}")
        continue

    png_path = png_folder / f"{i}.png"
    shutil.move(output_path, png_path)

    # 2. fix png transparency and turn it into white
    img = cv2.imread(str(png_path), cv2.IMREAD_UNCHANGED)
    # fix transparency, turn into white background
    # https://stackoverflow.com/questions/31656366/cv2-imread-and-cv2-imshow-return-all-zeros-and-black-image
    if img.shape[2] == 4:     # we have an alpha channel
        a1 = ~img[:,:,3]        # extract and invert that alpha
        img = cv2.add(cv2.merge([a1,a1,a1,a1]), img)   # add up values (with clipping)
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 3. crop by cutting out white lines from top and bottom
    top_row_index = 0
    while top_row_index < len(gray) and not any(pixel < 10 for pixel in gray[top_row_index]):
        top_row_index += 1
    
    bottom_row_index = len(gray) - 1
    while bottom_row_index > top_row_index and not any(pixel < 10 for pixel in gray[bottom_row_index]):
        bottom_row_index -= 1
    
    img = img[top_row_index:bottom_row_index+1]

    # # if its still tall, it means music21 put it on two lines, lets split in half and hconcat
    # if img.shape[0] > 700:
    #     mid_height = img.shape[0] // 2
    #     top_half = img[:mid_height, :]
    #     bottom_half = img[mid_height:, :]
        
    #     # Ensure both halves have the same height
    #     if top_half.shape[0] > bottom_half.shape[0]:
    #         top_half = top_half[:bottom_half.shape[0], :]
    #     elif bottom_half.shape[0] > top_half.shape[0]:
    #         bottom_half = bottom_half[:top_half.shape[0], :]
    #     img = cv2.hconcat([top_half, bottom_half])


    # 4. dilate with a horizontal kernel so that note stems are more visible
    invert = cv2.bitwise_not(img)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    dilated = cv2.dilate(invert, kernel, iterations=2)

    text = f"Meas. {output_index}"
    cropped_img = cv2.putText(dilated, text, (img.shape[1] // 2, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2, cv2.LINE_AA)
    
    ret, img = cv2.threshold(cropped_img, 127, 255, cv2.THRESH_BINARY)

    # 5. downscale to max size
    img = cv2.resize(img, (576, 136)) # 576, 136 is max but sometimes its cut off, also faster if smaller

    # 6. save as bitmap
    cv2.imwrite(str(bitmap_folder / f"{output_index}.bmp"), img)

    # 7. use imagemagick to decrease bitmap file size

    # template command is convert 0.bmp -monochrome -type bilevel final/0.bmp
    convert_str = f"magick {bitmap_folder / f'{output_index}.bmp'} -monochrome -type bilevel {final_folder / f'{output_index}.bmp'}"
    print("Running command: ", convert_str)
    os.system(convert_str)
    output_index += 1
