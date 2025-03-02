# prototyping musicxml to png
from pathlib import Path
from music21 import chord, stream
import music21
import streamlit as st


xml_path = "megalovania.mxl"

score = music21.converter.parse(xml_path)
total_measures = len(score.parts[0].getElementsByClass(stream.Measure))
print(f"Total measures: {total_measures}")

# num_bars = st.number_input("Number of bars per line", min_value=1, max_value=4, value=4)
index = st.number_input("Index", min_value=0, max_value=total_measures, value=0)
image_area = st.empty()


measures_stream = score.measures(index, index)
my_stream = stream.Stream()
for measure in measures_stream:
    my_stream.append(measure)

file_path = Path("temp.png")

saved_path = my_stream.write("musicxml.png", file_path) # use the lilypond format for pngs
print(saved_path)
image_area.image(saved_path, use_container_width=True)


