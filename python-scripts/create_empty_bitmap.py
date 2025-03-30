import cv2
import numpy as np

# Create a black image
img = np.zeros((136, 576), dtype=np.uint8)

# Save as bitmap
cv2.imwrite('empty.bmp', img)
