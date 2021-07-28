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


from car import SimpleBotCar, PlayerCar, MAP_SIDE, constrain, random_color, random_food

import string
CHARACTERS = string.ascii_lowercase + string.digits
def random_food_id():
    return ''.join(random.choices(CHARACTERS, k=8))

from operator import itemgetter

HEART_BEAT_INTERVAL = 0.03






food = {random_food_id(): random_food() for _ in range(100)}

VIEW_DISTANCE_X =  950 # * 4
VIEW_DISTANCE_Y =  530 # * 4

COLLISION_DETECTION_DISTANCE = 500 # Tail can get pretty long xd

cars = {}
bots = {}
def spawn_bot():
    bots[random_food_id()] = SimpleBotCar(
                                x = random.randint(-MAP_SIDE/2, MAP_SIDE/2),
                                y = random.randint(-MAP_SIDE/2, MAP_SIDE/2),
                                angle = random.randint(0, 359),
                                color = random_color(),
                                name = "Bot Jerry",
                                score = random.randint(333, 333)
    )

# Spawned number of bots depends on the range argument
for i in range(1):
    spawn_bot()
    #bots[str(i)] = SimpleBotCar(x=0, y=0, angle=math.radians(0), color="0x000000", name="Bot Jerry", score=600)

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
        best_score = -1;
        best_player_pos = None
        scoreboard_info = []
        scoreboard_top_scores = [ ("Name", -1) ] # "-1" - Sample score so there is a lowest minimum. If there is more than 6 players "-1" will be thrown out of the array 
        cars_and_bots = [cars, bots]
        for i in range(2):
            for c_or_b_id, car_or_bot in cars_and_bots[i].items():
                if car_or_bot.active == True:
                    hb_info = car_or_bot.heartbeat_info # Heartbeat Info
                    scoreboard_info.append( [c_or_b_id, hb_info['name'], hb_info['score'] ] )

                    if best_score < hb_info['score']:
                        best_score = hb_info['score']
                        best_player_pos = [hb_info['x'], hb_info['y']]

        # THIS COULD PROBABLY BE MORE EFFICIENT!
        scoreboard_info = sorted(scoreboard_info, key=lambda x: x[2], reverse=True) # Get the second value which is SCORE
        scoreboard_info = scoreboard_info[:7] # Limit scoreboard to 7 nicks (before converting to dict)
        scoreboard_info = { li[0]: li[1:] for li in scoreboard_info } # Converting to dict because that's how it is on client side

        for send_to_car_id, send_to_car in cars.items(): # Send Individual Information To THIS (send_to_car_id) Car

            # Setup
            send_to_car_info = send_to_car.heartbeat_info # This literraly takes no memory because it's is linking the adress ID in memory!! ... For readability reasons
            cars_to_display = {}
            personal_info = {}
            view_x = None
            view_y = None
            if send_to_car.active == True: # If in game
                carScale = constrain(1 - (send_to_car_info['score'] / 4000),0 , 1) 
                mapMult = 1 / carScale
                view_x = VIEW_DISTANCE_X * mapMult
                view_y = VIEW_DISTANCE_Y * mapMult
                personal_info = {"score" : send_to_car_info['score'], "scoreboard": scoreboard_info, "bestPlayerPos": best_player_pos}
            else:
                view_x = VIEW_DISTANCE_X*2
                view_y = VIEW_DISTANCE_Y*2


            # Bots
            for display_bot_id, bot in dict(bots).items(): # making copy so it don fak up when we modify bots list

                bot_info = bot.heartbeat_info
                
                # Player x Bot collision
                if send_to_car_info['x'] - view_x < bot_info['x'] and send_to_car_info['x'] + view_x > bot_info['x'] and \
                   send_to_car_info['y'] - view_y < bot_info['y'] and send_to_car_info['y'] + view_y > bot_info['y']:
                    cars_to_display[display_bot_id] = bot_info
                if abs(send_to_car_info['x'] - bot_info['x']) < COLLISION_DETECTION_DISTANCE and \
                   abs(send_to_car_info['y'] - bot_info['y']) < COLLISION_DETECTION_DISTANCE:

                    send_to_car.heartbeat_info['color'] = random_color()
                    # We gon check collisions only if they be close
                    if send_to_car.active: # Must be active for us to compare collision points

                        bot.add_close_car(send_to_car_id ,send_to_car) # Add to list of close cars

                        # Bots Collision   
                        if bot.does_kill(send_to_car):
                            # Kill the player car
                            send_to_car.active = False

                            # Add score to killer bot
                            bot.add_score_for_killing(send_to_car)

                            socketio.emit('dead', {"killer": bot_info["name"]}, room=send_to_car_id)

                        elif send_to_car.does_kill(bot):
                            # Add score to killer player
                            send_to_car.add_score_for_killing(bot)


                            # Confirm the kill to killer player
                            socketio.emit("u killed", {"dead": bot_info["name"]}, room=send_to_car_id)

                            # Kill the bot
                            del bots[display_bot_id]

                            # Spawn bot
                            spawn_bot()

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
                if send_to_car_info['x'] - view_x < c['x'] and send_to_car_info['x'] + view_x > c['x'] and \
                   send_to_car_info['y'] - view_y < c['y'] and send_to_car_info['y'] + view_y > c['y']:
                   cars_to_display[display_car_id] = c
            ###


            # Food
            food_to_display = {}
            for food_id in food:
                f = food[food_id]
                # Decide if to display food based on view distance
                if send_to_car_info['x'] - view_x < f['x'] and send_to_car_info['x'] + view_x > f['x'] and \
                   send_to_car_info['y'] - view_y < f['y'] and send_to_car_info['y'] + view_y > f['y']:
                   food_to_display[food_id] = f
            #

            data ={ "cars": cars_to_display, "food": food_to_display, "info": personal_info}
            socketio.emit("heartBeat", data, room=send_to_car_id)

        # Bot x Bot collision
        for bot_id, bot in list(bots.items()): # Iterating a copy
            #SETUP
            bot_info = bot.heartbeat_info
            bot_car_scale = constrain(1 - (bot_info['score'] / 4000),0.01 , 1) 
            map_mult = 1 / bot_car_scale
            view_x = VIEW_DISTANCE_X * map_mult
            view_y = VIEW_DISTANCE_Y * map_mult

            for collide_bot_id, collide_bot in list(bots.items()):
                if bot_id == collide_bot_id:
                    continue

                collide_bot_info = collide_bot.heartbeat_info
                
                if collide_bot_info['x'] - view_x < bot_info['x'] and collide_bot_info['x'] + view_x > bot_info['x'] and \
                    collide_bot_info['y'] - view_y < bot_info['y'] and collide_bot_info['y'] + view_y > bot_info['y']:

                    bot.add_close_car(collide_bot_id, collide_bot)

                    # Bots Collision   # need to check if only one sidedly because it is nested bot loop
                    if bot.does_kill(collide_bot):

                        # Add score to killer bot
                        bot.add_score_for_killing(collide_bot)
                        
                        # Kill the dead bot
                        del bots[collide_bot_id]

            bot.think()

                


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

@app.route('/.well-known/pki-validation/4E97029489E808EA179E63B76AD16B89.txt')
def ssl_verification_file():
    print("yeps")
    return send_from_directory(os.path.join(app.root_path, 'static'),
                          '.well-known/pki-validation/4E97029489E808EA179E63B76AD16B89.txt', mimetype='txt')
if __name__ == '__main__':
    socketio.run(app, debug=True)
    