from flask import Flask, request, render_template, send_from_directory
from flask_socketio import SocketIO, emit
import os
import threading
from concurrent.futures import ThreadPoolExecutor
import random
import math
app = Flask(__name__)
app.config['SECRET_KEY'] = "57dwad86a465d79"
socketio = SocketIO(app, cors_allowed_origins="*")

thread_lock = threading.Lock()
heart_beat_thread = None

cars = {}
import datetime

#adding manually mime types
import mimetypes
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/javascript', '.js')

import string
CHARACTERS = string.ascii_lowercase + string.digits
def random_food_id():
    return ''.join(random.choices(CHARACTERS, k=8))

HEART_BEAT_INTERVAL = 0.03
MAP_SIDE = 512*5
def random_color():
    return '0x{:02x}{:02x}{:02x}'.format( *(random.randint(0,255) for _ in range(3)) )

def random_food():
    return {"x":random.randint(-MAP_SIDE, MAP_SIDE), "y":random.randint(-MAP_SIDE, MAP_SIDE), "color": random_color()}


food = {random_food_id(): random_food() for _ in range(100)}

VIEW_DISTANCE_X =  950 * 4
VIEW_DISTANCE_Y =  530 * 4

BASE_ADD_KILL_SCORE = 50
KILL_ADD_SCORE_PERCENTAGE = 0.2

def heart_beat():
    while True:
        socketio.sleep(HEART_BEAT_INTERVAL)

        # Anti hack shit:
        for anti_hack_id in cars:
            c = cars[anti_hack_id]
            try:
                float(c['x'])
                float(c['y'])
            except: # Disable hacker
                c['active'] = False
                

        for send_car_id in cars:
            

            currCar = cars[send_car_id]
            cars_to_display = {}

            view_x = None
            view_y = None
            personalInfo = {}
            bestScore = -1;
            if currCar['active'] == True:
                view_x = VIEW_DISTANCE_X
                view_y = VIEW_DISTANCE_Y
                personalInfo = {"score" : currCar['score'], "scoreBoard": {}, "bestPlayerPos": []}
            else:
                view_x = VIEW_DISTANCE_X*2
                view_y = VIEW_DISTANCE_Y*2

            for display_car_id in cars:

                c = cars[display_car_id]
                
                # Don't show inactive cars
                if  c['active'] == False:
                    continue

                # BEST CAR ... If playing show scoreboard info
                if currCar['active'] == True:
                    personalInfo['scoreBoard'][display_car_id] = [c['name'], c['score'] ]
                    if bestScore < c['score']:
                        bestScore = c['score']
                        personalInfo['bestPlayerPos'] = [c['x'], c['y']]

                # Next car if this is 'send car' 
                if send_car_id == display_car_id:
                    continue

                

                # Decide if to display car based on view distance
                if currCar['x'] - view_x < c['x'] and currCar['x'] + view_x > c['x'] and \
                   currCar['y'] - view_y < c['y'] and currCar['y'] + view_y > c['y']:
                   cars_to_display[display_car_id] = c


            food_to_display = {}
            for food_id in food:
                f = food[food_id]
                # Decide if to display food based on view distance
                if currCar['x'] - view_x < f['x'] and currCar['x'] + view_x > f['x'] and \
                   currCar['y'] - view_y < f['y'] and currCar['y'] + view_y > f['y']:
                   food_to_display[food_id] = f

            data ={ "cars": cars_to_display, "food": food_to_display, "info": personalInfo}

            socketio.emit("heartBeat", data, room=send_car_id)



@socketio.on('myCar', namespace="/")
def update_my_car(car):
    if request.sid in cars:
        cars[request.sid]['x'] = car['x']
        cars[request.sid]['y'] = car['y']
        cars[request.sid]['rot'] = car['rot']
        cars[request.sid]['boost'] = car['boost']
        cars[request.sid]['acc'] = car['acc']


@socketio.on("kill", namespace="/")
def kill(id):
    if id in cars:
        if request.sid in cars and cars[id]['active'] == True and id in cars and cars[request.sid]['active'] == True:#check if killer isnt dead :D

            dead_car = cars[id]
            killer_car = cars[request.sid]

            # Kill the car
            dead_car['active'] = False

            # Add score to killer
            killer_car['score'] += BASE_ADD_KILL_SCORE
            killer_car['score'] += int(dead_car['score'] * KILL_ADD_SCORE_PERCENTAGE)

            # Send killer name to dead car
            emit('dead', {"killer": killer_car['name']}, room=id)

            # Confirm the kill to killer
            emit("u killed", {"dead": dead_car['name']}, room=request.sid)

@socketio.on("i died", namespace="/")
def kill(id):
    if id in cars:
        if request.sid in cars and cars[id]['active'] == True and id in cars and cars[request.sid]['active'] == True:#check if killer isnt dead :D

            dead_car = cars[request.sid]
            killer_car = cars[id]

            # Kill the car
            dead_car['active'] = False

            # Add score 50 hase + percentage from dead car
            killer_car['score'] += BASE_ADD_KILL_SCORE
            killer_car['score'] += int(dead_car['score'] * KILL_ADD_SCORE_PERCENTAGE)

            # Send killer name to dead car | (room is socket id)
            emit('dead', {"killer": killer_car['name']}, room=request.sid)

            # Confirm the kill to killer
            emit("u killed", {"dead": dead_car['name']}, room=id)



@socketio.on('connect', namespace="/")
def connected():
    cars[request.sid] = {}
    car = cars[request.sid]
    car['active'] = False
    car['x'] = 0 # so they can see what's happenin' 
    car['y'] = 0
    print("\Gamer connected")
    

@socketio.on('join', namespace="/")
def on_join(data):
    car = cars[request.sid]
    car['active'] = True
    car['x'] = (-MAP_SIDE + (MAP_SIDE*2) * random.random())/2
    car['y'] = (-MAP_SIDE + (MAP_SIDE*2) * random.random())/2

    if data['name'] == "":
        car['name'] = "Glidester"
    else:
        car['name'] = data['name']

    car['color'] = random_color()
    car['score'] = 0

    emit("join", car)


@socketio.on('eat', namespace="/")
def on_eat(food_id):
    if food_id in food:
        del food[food_id]
        food[random_food_id()] = random_food()
        cars[request.sid]['score'] += 5

@socketio.on('disconnect', namespace="/")
def disconnected():
    if request.sid in cars:
        del cars[request.sid]
        print('\Gamer disconnected, Players online: ' + str(len(cars)))


@app.route('/')
def index():
    
    #get the heartBeat goin'
    global heart_beat_thread# have to get my var (BRUH method)
    if heart_beat_thread is None:
        with thread_lock:
            heart_beat_thread = socketio.start_background_task(heart_beat)

    return  render_template('index.html')
    
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                          'favicon.ico',mimetype='image/vnd.microsoft.icon')

if __name__ == '__main__':
    socketio.run(app, debug=True)
    