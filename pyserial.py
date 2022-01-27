import serial
import serial.tools.list_ports as list_ports
import requests
from requests.exceptions import ReadTimeout
from requests.models import ReadTimeoutError
import time
import cv2
import numpy as np
from PIL import Image 
import sys

TIMER = int(1)
cap = cv2.VideoCapture(0)
address = "https://172.27.188.254:8080//video"
cap.open(address)
frame_width = int( cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height =int( cap.get( cv2.CAP_PROP_FRAME_HEIGHT))
PID_MICROBIT = 516
VID_MICROBIT = 3368
TIMEOUT = 1000
count = 1
secoonds = 10000000
trial = 0
ret, frame1 = cap.read()
ret, frame2 = cap.read()
#print(frame1.shape)

# Create the functions below
def find_comport(pid, vid, baud):
    ''' return a serial port '''
    ser_port = serial.Serial(timeout=TIMEOUT)
    ser_port.baudrate = baud
    ports = list(list_ports.comports())
    print('scanning ports: ', ports)
    for p in ports:
        print('port: {}'.format(p))
        try:
            print('pid: {} vid: {}'.format(p.pid, p.vid))
        except AttributeError:
            continue
        if (p.pid == pid) and (p.vid == vid):
            print('found target device pid: {} vid: {} port: {}'.format(
                p.pid, p.vid, p.device))
            ser_port.port = str(p.device)
            return ser_port
    return None


def main(file):   
    print("start")
    ser_micro.open()
    servodelimiter = " "
    material = " "
    ser_micro.write(servodelimiter.encode('utf-8') + material.encode('utf-8'))
    try:
        url = "http://127.0.0.1:8080/predictRecyclableClass"
        files = {'file': open(file, 'rb')}

        response  = requests.post(url, files=files, timeout=1)
            
        print(response.status_code)
        if (response.status_code == 200):
            prediction = response.json()
            print("file: ", file, "prediction: ",prediction)
            material = prediction["result"][0]["name"]
            ser_micro.write(servodelimiter.encode('utf-8') + material.encode('utf-8'))
            ser_micro.close()
            return "success"
        else:
            print("Error")
            ser_micro.close()
            return "error"
    except ReadTimeout:
            print("Timeout, try again")
            ser_micro.close()
            return "error"

def takeSS(cap, TIMER, trial):     
    # Read and display each frame
    
    prev = time.time()

    while TIMER >= 0:
        ret, img = cap.read()
        # Display countdown on each frame
        # specify the font and draw the
        
        cur = time.time()

        # Update and keep track of Countdown
        # if time elapsed is one second
        # than decrease the counter
        if cur-prev >= 1:
            prev = cur
            TIMER = TIMER-1

    else:
        ret, img = cap.read()

        trial += 1
        filename = './microbit/'+str(trial) + '.jpg'
        cv2.imwrite(filename, img)
        return filename, img

# Initialise the microbit
print('looking for microbit')
ser_micro = find_comport(PID_MICROBIT, VID_MICROBIT, 115200)
if not ser_micro:
    print('microbit not found')
print('opening and monitoring microbit port')


while cap.isOpened():
    diff = cv2.absdiff(frame1, frame2)
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5,5), 0)
    _, thresh = cv2.threshold(blur, 20, 255, cv2.THRESH_BINARY)
    dilated = cv2.dilate(thresh, None, iterations=3)
    contours, _ = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    for contour in contours:
        if cv2.contourArea(contour) < 3:
            print("error "+str(trial))
            trial+=1
            image = cv2.resize(frame1, (1280,720))
            filename, img = takeSS(cap, TIMER, trial)
            status = main(filename)
            frame1 = img
            frame2 = img
            if status == "error":
                status = main(filename)
            else:
                break
        pass
    
    
    cv2.imshow("feed", frame1)
    frame1 = frame2
    ret, frame2 = cap.read()

    if cv2.waitKey(40) == 27:
        break