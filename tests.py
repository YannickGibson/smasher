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
heartbeat_thread = None

import datetime

#adding manually mime types
import mimetypes
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('text/javascript', '.js')


from car import BotCar, PlayerCar, MAP_SIDE, constrain, random_color, random_food

import string
CHARACTERS = string.ascii_lowercase + string.digits
def random_food_id():
    return ''.join(random.choices(CHARACTERS, k=8))

from operator import itemgetter

HEART_BEAT_INTERVAL = 0.03






food = {random_food_id(): random_food() for _ in range(100)}

VIEW_DISTANCE_X =  950 # * 4
VIEW_DISTANCE_Y =  530 # * 4


cars = {}
bots = {}
def spawn_bot():
    bots[random_food_id()] = BotCar(
                                x = random.randint(-MAP_SIDE/2, MAP_SIDE/2),
                                y = random.randint(-MAP_SIDE/2, MAP_SIDE/2),
                                angle = random.randint(0, 359),
                                color = random_color(),
                                name = "Bot Jerry",
                                score = random.randint(333, 333)
    )

for i in range(1):
    bots[str(i)] = BotCar(x=0, y=0, angle=0, color="0x000000", name="Bot Jerry", score=69)

def heart_beat():
    while True:
        socketio.sleep(HEART_BEAT_INTERVAL)


        # Anti hack shit:
        # (keys, items)
        for _, anti_hack_car in cars.items():# foreach .items() is faster than using cars[key] ... https://www.youtube.com/watch?v=anrOzOapJ2E (didn't actually watch it)
            try:
                float(anti_hack_car.heartbeat_info['x'])
                float(anti_hack_car.heartbeat_info['y'])
            except: # Disable hacker
                anti_hack_car.active = False
                


        # Gathering Best Position and scoreboard
        bestScore = -1;
        bestPlayerPos = None
        scoreboardInfo = []
        scoreboard_top_scores = [ ("Name", -1) ] # "-1" - Sample score so there is a lowest minimum. If there is more than 6 players "-1" will be thrown out of the array 
        cars_and_bots = [cars, bots]
        for i in range(2):
            for c_or_b_id, car_or_bot in cars_and_bots[i].items():
                if car_or_bot.active == True:
                    hb_info = car_or_bot.heartbeat_info # Heartbeat Info
                    scoreboardInfo.append( [c_or_b_id, hb_info['name'], hb_info['score'] ] )

                    if bestScore < hb_info['score']:
                        bestScore = hb_info['score']
                        bestPlayerPos = [hb_info['x'], hb_info['y']]

        # THIS COULD PROBABLY BE MORE EFFICIENT!
        scoreboardInfo = sorted(scoreboardInfo, key=lambda x: x[2], reverse=True) # Get the second value which is SCORE
        scoreboardInfo = scoreboardInfo[:7] # Limit scoreboard to 7 nicks (before converting to dict)
        scoreboardInfo = { li[0]: li[1:] for li in scoreboardInfo } # Converting to dict because that's how it is on client side

        for send_to_car_id, send_to_car in cars.items(): # Send Individual Information To THIS (send_to_car_id) Car

            # Setup
            currCarInfo = send_to_car.heartbeat_info # This literraly takes no memory because it's is linking the adress ID in memory!! ... For readability reasons
            cars_to_display = {}
            personalInfo = {}
            view_x = None
            view_y = None
            if send_to_car.active == True: # If in game
                carScale = constrain(1 - (currCarInfo['score'] / 4000),0 , 1) 
                mapMult = 1 / carScale
                view_x = VIEW_DISTANCE_X * mapMult
                view_y = VIEW_DISTANCE_Y * mapMult
                personalInfo = {"score" : currCarInfo['score'], "scoreboard": scoreboardInfo, "bestPlayerPos": bestPlayerPos}
            else:
                view_x = VIEW_DISTANCE_X*2
                view_y = VIEW_DISTANCE_Y*2


            # Bots
            for display_bot_id, theBot in dict(bots).items(): # making copy so it don fak up when we modify bots list

                theBotInfo = theBot.heartbeat_info
                # Bots Collision   
                for collide_car_id, collide_car in cars.items():
                    if collide_car.active == True:

                        if theBot.does_kill(collide_car):
                            # Kill the player car
                            collide_car.active = False

                            # Add score to killer bot
                            theBot.add_score_for_killing(collide_car)

                            socketio.emit('dead', {"killer": theBotInfo["name"]}, room=collide_car_id)

                        elif collide_car.does_kill(theBot):
                            # Kill the bot
                            del bots[display_bot_id]

                             # Add score to killer player
                            collide_car.add_score_for_killing(theBot)

                            # Confirm the kill to killer player
                            socketio.emit("u killed", {"dead": theBotInfo["name"]}, room=collide_car_id)

                            # Spawn bot
                            spawn_bot()

                if currCarInfo['x'] - view_x < theBotInfo['x'] and currCarInfo['x'] + view_x > theBotInfo['x'] and \
                   currCarInfo['y'] - view_y < theBotInfo['y'] and currCarInfo['y'] + view_y > theBotInfo['y']:
                    cars_to_display[display_bot_id] = theBotInfo
            ###

           
            # Online players
            for display_car_id, display_car in cars.items():
                
                # Don't show inactive cars
                if  display_car.active == False:
                    continue
                
                c = display_car.heartbeat_info


                # Next car if this is 'send_to_car' 
                if send_to_car_id == display_car_id:
                    continue


                # Decide if to display car based on view distance
                if currCarInfo['x'] - view_x < c['x'] and currCarInfo['x'] + view_x > c['x'] and \
                   currCarInfo['y'] - view_y < c['y'] and currCarInfo['y'] + view_y > c['y']:
                   cars_to_display[display_car_id] = c
            ###

            """  shortScoreBoard = None
            for id in personalInfo["scoreBoard"] =  """

            # Food
            food_to_display = {}
            for food_id in food:
                f = food[food_id]
                # Decide if to display food based on view distance
                if currCarInfo['x'] - view_x < f['x'] and currCarInfo['x'] + view_x > f['x'] and \
                   currCarInfo['y'] - view_y < f['y'] and currCarInfo['y'] + view_y > f['y']:
                   food_to_display[food_id] = f
            #

            data ={ "cars": cars_to_display, "food": food_to_display, "info": personalInfo}
            socketio.emit("heartBeat", data, room=send_to_car_id)


@socketio.on('myCar', namespace="/")
def update_my_car(car_data):
    if request.sid in cars:

        # check if data fits type
        if 'x' in car_data and 'y' in car_data and 'rot' in car_data and 'boost' in car_data and 'acc' in car_data and 'turn' in car_data and \
        isinstance(car_data['x'], int) and isinstance(car_data['y'], int) and \
        (isinstance(car_data['rot'], float) or isinstance(car_data['rot'], int)) and \
        isinstance(car_data['boost'], bool) and \
        (isinstance(car_data['acc'], float) or isinstance(car_data['acc'], int)) and \
        isinstance(car_data['turn'], int):
            heartbeat_info = cars[request.sid].heartbeat_info

            heartbeat_info['x'] = car_data['x']
            heartbeat_info['y'] = car_data['y']
            heartbeat_info['rot'] = car_data['rot']
            heartbeat_info['boost'] = car_data['boost']
            heartbeat_info['acc'] = car_data['acc']   
            heartbeat_info['turn'] = car_data['turn']


@socketio.on("kill", namespace="/")
def kill_it(victim_id):
    if request.sid in cars: 
        killer_car = cars[request.sid]
        
        if killer_car.active == True: # Check killer call in first case because it is common with both ifs
            
            if victim_id in cars:
                dead_car = cars[victim_id]

                if dead_car.active == True: # Check if killer isn't dead :D

                    # Kill the CAR
                    dead_car.active = False
                    
                    # Add score to killer
                    killer_car.add_score_for_killing(dead_car)

                    # Send killer name to dead car
                    emit('dead', {"killer": killer_car.heartbeat_info["name"]}, room=victim_id)

                    # Confirm the kill to killer
                    emit("u killed", {"dead": dead_car.heartbeat_info["name"]}, room=request.sid)

            elif victim_id in bots: # No need to check if it's active?
                dead_bot = bots[victim_id]

                # Kill the BOT
                #dead_bot.active = False
                del bots[victim_id] # finish this

                # Add score to killer
                killer_car.add_score_for_killing(dead_bot)

                # Confirm the kill to killer
                emit("u killed", {"dead": dead_bot.heartbeat_info["name"]}, room=request.sid)

                # Spawn new bot
                spawn_bot()


@socketio.on("i died", namespace="/")
def kill_me(killer_id):
    if request.sid in cars : # Check if killer isn't dead! :D

        dead_car = cars[request.sid]
        if dead_car.active:
            if killer_id in cars:
                killer_car = cars[killer_id]

                if killer_car.active == True:
                    # Kill the car
                    dead_car.active = False

                    # Add score to killer
                    killer_car.add_score_for_killing(dead_car)

                    # Send killer name to dead car | (room is socket killer_id)
                    emit('dead', {"killer": killer_car.heartbeat_info["name"]}, room=request.sid)

                    # Confirm the kill to killer
                    emit("u killed", {"dead": dead_car.heartbeat_info["name"]}, room=killer_id)

            if killer_id in bots: # No need to check if it's active
                killer_bot = bots[killer_id]

                # Kill the car
                dead_car.active = False

                # Add score 50 hase + percentage from dead car
                killer_bot.add_score_for_killing(dead_car)

                # Send killer_bot name to dead car | (room is socket killer_id)
                emit('dead', {"killer": killer_bot.heartbeat_info["name"]}, room=request.sid)



@socketio.on('connect', namespace="/")
def connected():

    cars[request.sid] = PlayerCar()

    print("\Gamer connected")
    

@socketio.on('join', namespace="/") # Click The "Start" Button
def on_join(data):
    car = cars[request.sid]

    car.spawn( data["name"] )

    emit("join", car.heartbeat_info)

@socketio.on('eat', namespace="/")
def on_eat(food_id):
    if request.sid in cars and food_id in food:
        # Delete eaten food
        del food[food_id]
        # Spawn new food
        food[random_food_id()] = random_food()
        # Add score to car
        cars[request.sid].add_score_for_eating_food() 

@socketio.on('focusout', namespace="/")
def on_blur():
    if request.sid in cars:
        cars[request.sid].heartbeat_info['boost'] = False;
        cars[request.sid].heartbeat_info['acc'] = 0;



@socketio.on('disconnect', namespace="/")
def disconnected():
    if request.sid in cars:
        del cars[request.sid]
        print('\Gamer disconnected, Players online: ' + str(len(cars)))


@app.route('/')
def index():
    # Get the heartbeat goin'
    global heartbeat_thread # Have to get my var (BRUH method)
    if heartbeat_thread is None:
        with thread_lock:
            heartbeat_thread = socketio.start_background_task(heart_beat)

    return  render_template('index.html')
    
@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                          'favicon.ico', mimetype='image/vnd.microsoft.icon')

if __name__ == '__main__':
    socketio.run(app, debug=True)
    