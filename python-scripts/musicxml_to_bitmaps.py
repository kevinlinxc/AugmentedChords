from pathlib import Path
from music21 import chord, stream
import music21
import cv2
from tqdm import tqdm
import shutil
import logging
import os

logger = logging.getLogger(__file__)

xml_path = "furelise.mxl"
num_bars = 2

score = music21.converter.parse(xml_path)
total_measures = len(score.parts[0].getElementsByClass(stream.Measure))
print(f"{xml_path} has {total_measures} measures")

png_folder = Path(xml_path).parent / Path(xml_path).stem / "png-dilate4"
bitmap_folder = Path(xml_path).parent / Path(xml_path).stem / "bitmap-dilate4"
final_folder = Path(xml_path).parent / Path(xml_path).stem / "final-dilate4"
final_folder.mkdir(parents=True, exist_ok=True)
png_folder.mkdir(parents=True, exist_ok=True)
bitmap_folder.mkdir(parents=True, exist_ok=True)


output_index = 0


for i in tqdm(range(1, total_measures, num_bars)):
    # xml to png
    measures_stream: music21.stream.Score = score.measures(i, i+num_bars-1)

    my_stream = stream.Stream()
    for i in range(len(measures_stream)):
        stream_: music21.stream.base.PartStaff = measures_stream[i]
        my_stream.append(stream_)

    output_path = my_stream.write("musicxml.png", Path("temp.png"))
    #monkey patch: 
    # if file size < 1mb, its a page break, skip it
    if Path(output_path).stat().st_size < 1024:
        logger.debug(f"Skipping page break {i}")
        continue

    png_path = png_folder / f"{i}.png"
    shutil.move(output_path, png_path)

    # crop png and convert to bitmap
    img = cv2.imread(str(png_path), cv2.IMREAD_UNCHANGED)
    # fix transparency -> white background
    # https://stackoverflow.com/questions/31656366/cv2-imread-and-cv2-imshow-return-all-zeros-and-black-image
    if img.shape[2] == 4:     # we have an alpha channel
        a1 = ~img[:,:,3]        # extract and invert that alpha
        img = cv2.add(cv2.merge([a1,a1,a1,a1]), img)   # add up values (with clipping)
        img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    top_row_index = 0
    while top_row_index < len(gray) and not any(pixel < 10 for pixel in gray[top_row_index]):
        top_row_index += 1
    
    bottom_row_index = len(gray) - 1
    while bottom_row_index > top_row_index and not any(pixel < 10 for pixel in gray[bottom_row_index]):
        bottom_row_index -= 1
    
    cropped_img = img[top_row_index:bottom_row_index+1]


    # dilate everything so the liens can be seen
    invert = cv2.bitwise_not(cropped_img)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1))
    dilated = cv2.dilate(invert, kernel, iterations=2)

    text = f"Meas. {output_index}"
    cropped_img = cv2.putText(dilated, text, (cropped_img.shape[1] // 2, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 2, cv2.LINE_AA)
    
    ret, img = cv2.threshold(cropped_img, 127, 255, cv2.THRESH_BINARY)

    # downscale to max size
    img = cv2.resize(img, (576, 120)) # 136 is max but sometimes its cut off

    # invert it

    # img = cv2.bitwise_not(img)
    cv2.imwrite(str(bitmap_folder / f"{output_index}.bmp"), img)

    # use imagemagick to decrease file size

    # template command is convert 0.bmp -monochrome -type bilevel final/0.bmp
    convert_str = f"magick {bitmap_folder / f'{output_index}.bmp'} -monochrome -type bilevel {final_folder / f'{output_index}.bmp'}"
    print("Running command: ", convert_str)
    os.system(convert_str)
    output_index += 1
