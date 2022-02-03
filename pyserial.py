from matplotlib.pyplot import close
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

from sqlalchemy import null

TIMER = int(1)
cap = cv2.VideoCapture(0)
address = "https://192.168.1.95:8080//video"
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
    ser_micro.open()
    servodelimiter = " "
    material = " "
    ser_micro.write(servodelimiter.encode('utf-8') + material.encode('utf-8'))

    status = ""
    material = ""


    while status == "":
        try:
            url = "http://127.0.0.1:8080/predictRecyclableClass"
            files = {'file': open(file, 'rb')}

            response  = requests.post(url, files=files, timeout=1)
                
            if (response.status_code == 200):
                prediction = response.json()
                print("file: ", file, "prediction: ",prediction)
                material = prediction["result"][0]["name"]
                
                retrievecursor = mydb.cursor()
                retrievesql = "SELECT * FROM bins WHERE bin_id = %s"
                retrieveval = (bin_id)
                retrievecursor.execute(retrievesql, (retrieveval,))
                myresult = retrievecursor.fetchall()

                current_plastic = 0
                current_metal = 0
                overall_plastic = 0
                overall_metal = 0
                for x in myresult:
                    current_plastic = x[7]
                    current_metal = x[8]
                    overall_plastic = x[5]
                    overall_metal = x[6]
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
                
                #shutil.move(file, 'C:/Users/ASUS/Desktop/microbot/Recyclables/public/img/' + material + "_microbit_" + str(uuid.uuid4()))
                ser_micro.write(servodelimiter.encode('utf-8') + material.encode('utf-8'))
                
                status = True
                status = "success"
                material = material
                close(file)
            else:
                print("Error")
                close(file)
        except ReadTimeout:
                print("Timeout, try again")
                close(file)

    close(file)
    ser_micro.close()
    return status, material

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
            status = "error"
            material = ""
            try:
                status,material = main(filename,bin_id)
                time.sleep(1)
                shutil.move(filename, 'C:/Users/ASUS/Desktop/microbot/Recyclables/public/img/' + material + "_microbit_" + str(uuid.uuid4())+".jpg")

                frame1 = img
                frame2 = img
                break
            except:
                print("*Dabs with tears*")
                continue
        pass
    
    
    cv2.imshow("feed", frame1)
    frame1 = frame2
    ret, frame2 = cap.read()

    if cv2.waitKey(40) == 27:
        break