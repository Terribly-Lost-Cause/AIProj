from matplotlib.pyplot import close
from nbformat import convert
import serial
import serial.tools.list_ports as list_ports
import requests
from requests.exceptions import ReadTimeout
from requests.models import ReadTimeoutError
import time
import cv2
import numpy as np
#from PIL import Image 
import sys
import mysql.connector
#from sqlalchemy import over  
import shutil
import uuid
import os

from sqlalchemy import null
#delay in taking screenshot upon detecting motion
TIMER = int(1)
#open camera in ip webcam and initialize variable
cap = cv2.VideoCapture(0)
address = "https://172.27.188.254:8080//video"
cap.open(address)
frame_width = int( cap.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height =int( cap.get( cv2.CAP_PROP_FRAME_HEIGHT))
#initialize microbit port and variables
PID_MICROBIT = 516
VID_MICROBIT = 3368
TIMEOUT = 1000
count = 1
secoonds = 10000000
trial = 0
ret, frame1 = cap.read()
ret, frame2 = cap.read()
#select a bin for live updating of current_plastic/current_metal level (for demo only)
bin_id = "e67dac91-60c2-4bf5-90de-2e6c61be8c5a"
#print(frame1.shape)

#Initialise mysql db
mydb = mysql.connector.connect(
  host="localhost",
  user="root",
  password="Lost&C0nfused",
  database="recyclables"
)

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


def main(file, bin_id):   
    print("start")
    #open microbit port and initialize variables
    ser_micro.open()
    servodelimiter = " "
    material = " "
    ser_micro.write(servodelimiter.encode('utf-8') + material.encode('utf-8'))

    status = ""
    material = ""
    score = ""


    while status == "":
        try:
            #call AI in docker
            url = "http://127.0.0.1:8080/predictRecyclableClass"
            files = {'file': open(file, 'rb')}

            response  = requests.post(url, files=files, timeout=1)
                
            if (response.status_code == 200):
                prediction = response.json()
                result = prediction.items()
                for key, value in result:
                    score = value[0].items()
                #get the predicted material type and confidence score for item in screenshot
                material = prediction["result"][0]["name"]
                score = prediction["result"][0]["score"]
                #get the current record of bin for bin_id (line 38)
                retrievecursor = mydb.cursor()
                retrievesql = "SELECT * FROM bins WHERE bin_id = %s"
                retrieveval = (bin_id)
                retrievecursor.execute(retrievesql, (retrieveval,))
                myresult = retrievecursor.fetchall()
                #initalize/get variables
                current_plastic = 0
                current_metal = 0
                overall_plastic = 0
                overall_metal = 0
                for x in myresult:
                    current_plastic = x[7]
                    current_metal = x[8]
                    overall_plastic = x[5]
                    overall_metal = x[6]
                    #increments the number in overall and current metal/plastic in database based on prediction
                if (material == "plastic"):
                    current_plastic = current_plastic + 1
                    overall_plastic = overall_plastic+1
                    updatecursor = mydb.cursor()
                    updatesql = "UPDATE bins SET current_plastic = %s, overall_plastic = %s WHERE bin_id = %s"
                    updateval = (current_plastic, overall_plastic , bin_id)
                    updatecursor.execute(updatesql, updateval)
                    mydb.commit()
                elif (material == "metal"):
                    current_metal = current_metal + 1
                    overall_metal = overall_metal+1
                    updatecursor = mydb.cursor()
                    updatesql = "UPDATE bins SET current_metal = %s, overall_metal = %s WHERE bin_id = %s"
                    updateval = (current_metal, overall_metal ,bin_id)
                    updatecursor.execute(updatesql, updateval)
                    mydb.commit()
                #send the instructions on where to turn to microbit 
                ser_micro.write(servodelimiter.encode('utf-8') + material.encode('utf-8'))
                
                status = True
                status = "success"
                material = material
                score = score
                close(file)
                close(file)
            else:
                print("Error")
                close(file)
                close(file)
        except ReadTimeout:
                print("Timeout, try again")
                close(file)
                close(file)

    close(file)
    ser_micro.close()
    return status, material, score

#function to take screenshot
def takeSS(cap, TIMER, trial):
    #count number of frames to keep track of time

    # previous time
    prev = time.time()
    while TIMER >= 0:
        ret, img = cap.read()
        
        # current time
        cur = time.time()
        
        # Update and keep track of Countdown
        # if time elapsed is greater than or equals to one second
        # than decrease the counter
        if cur-prev >= 1:
            prev = cur
            TIMER = TIMER-1
        #otherwise take the screenshot
    else:
        ret, img = cap.read()
        #takes screenshot and name it with format
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

#constantly checking for movement by comparing difference in contours between frames
while cap.isOpened():
    diff = cv2.absdiff(frame1, frame2)
    gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
    blur = cv2.GaussianBlur(gray, (5,5), 0)
    _, thresh = cv2.threshold(blur, 20, 255, cv2.THRESH_BINARY)
    dilated = cv2.dilate(thresh, None, iterations=3)
    contours, _ = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    #if difference between contours of area exceeds a threhold, call the screenshot function 
    for contour in contours:
        if cv2.contourArea(contour) < 3:
            trial+=1
            image = cv2.resize(frame1, (1280,720))
            filename, img = takeSS(cap, TIMER, trial)
            #initialises status and material type
            status = "error"
            material = ""
            try:
                # Call prediction function and get material and score result
                status,material,score = main(filename,bin_id)
                time.sleep(1)

                print(material + ": "+str(score))
                # when it is metal/plastic and score not confident we store them in the local project where website can access and display
                if (material == "metal" and float(score) > 0.3):
                    material = "Metal"
                    shutil.move(filename, './Recyclables/public/img/' + material + "_microbit_" + str(uuid.uuid4())+".jpg")
                elif (material == "plastic"  and float(score) < 0.7):
                    material = "Plastic"
                    shutil.move(filename, './Recyclables/public/img/' + material + "_microbit_" + str(uuid.uuid4())+".jpg")
                #If good confidence then delete the images    
                else:
                    os.remove(filename)

                frame1 = img
                frame2 = img
                break
            except Exception as e:
                print(e)
                continue
        pass
    
    
    cv2.imshow("feed", frame1)
    frame1 = frame2
    ret, frame2 = cap.read()

    if cv2.waitKey(40) == 27:
        break