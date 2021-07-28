import math 

def scalarProduct(vect1, vect2):
    return (vect1[0] * vect2[0]) + (vect1[1] * vect2[1])

def scalar(vect1, vect2):
    return (vect1[0] * vect2[1]) - (vect1[1] * vect2[0])

def sub(p1, p2):
    return [p1[0] - p2[0], p1[1] - p2[1]]

def div(p1, p2):
    if p2[1] == 0:
        return 0
    
    return (p1[0] / p2[0], p1[1] / p2[1])

def mult(p1, p2):
    return (p1[0] * p2[0], p1[1] * p2[1])

def add(p1, p2):
    return [p1[0] + p2[0], p1[1] + p2[1]]

def radians(deg):
    return deg * (math.pi/180)

def lerp(min, max, val):
    return min + (max - min) * val

def constrain(val, _min, _max):
    if val < _min:
        return _min
    elif val > _max:
        return _max
    else:
        return val

def random_color():
    return '0x{:02x}{:02x}{:02x}'.format( *(random.randint(0,255) for _ in range(3)) )

def random_food():
    return {"x":random.randint(-MAP_SIDE, MAP_SIDE), "y":random.randint(-MAP_SIDE, MAP_SIDE), "color": random_color()}

def does_collide(vertices1, vertices2):

    for i in range( len(vertices1) - 1 ) :
        for ii in range( len(vertices2) - 1 ):
            if cross(
                vertices1[i],
                vertices1[i + 1],
                vertices2[ii],
                vertices2[ii + 1]
            ):
                return True
            
    return False

  
def cross(a1, a2, b1, b2):
    #vectA = a2 - a1
    r = [a2[0] - a1[0], a2[1] - a1[1]]
    s = [b2[0] - b1[0], b2[1] - b1[1]]

    """
    a2 = a1 + r
    a1 + t*r = b1 + u*s ... / scalar s
    (a1 x s) + t*(r x s) = (b1 x s) + u*(s x s) ... # s x s = 0
    (a1 x s) + t*(r x s) = (b1 x s) ... / (a1 x s)
    t*(r x s) = ((b1 - a1) x s) ... / (r x s)
    t = ((b1 - a1) x s) / (r x s)
    """
    t = None
    u = None

    if scalar(r, s) != 0:
        t = scalar( sub(b1, a1)  , s) / scalar(r, s)
    
    if scalar(s, r) != 0:
        u = scalar( sub(a1, b1)  , r) / scalar(s, r)
    
    if t != None and 0 <= t and t <= 1 and u != None and 0 <= u and u <= 1:

        return True
        #point of intersection
        x = a1[0] + r[0]*t
        y = a1[1] + r[1]*t
        return [x, y]
    
    return False
    

def get_vertices(x, y, width, height, rot):
    vectTL = [- width/2, - height/2] # vect from center to Top Left not rotated
    vectTR = [ -vectTL[0], vectTL[1] ]
    vectBR = [ -vectTL[0], -vectTL[1] ]
    vectBL = [ vectTL[0], -vectTL[1] ]
    

    #current COS & SIN
    s = math.sin(rot)
    c = math.cos(rot)

    # rotate point
    newTL = [vectTL[0] * c - vectTL[1] * s, vectTL[0] * s + vectTL[1] * c]
    newTR = [vectTR[0] * c - vectTR[1] * s, vectTR[0] * s + vectTR[1] * c]
    newBR = [vectBR[0] * c - vectBR[1] * s, vectBR[0] * s + vectBR[1] * c]
    newBL = [vectBL[0] * c - vectBL[1] * s, vectBL[0] * s + vectBL[1] * c]
    
    # translate point relevant to car position
    topLeft = add(newTL, [x, y])
    topRight = add(newTR, [x, y])
    bottomLeft = add(newBL, [x, y])
    bottomRight = add(newBR, [x, y])

    return [topLeft, topRight, bottomRight, bottomLeft, topLeft] #making points to be all around 

#\
###\
####| START CAR
###/
#/

BASE_BODY_WIDTH = 100
BASE_BODY_HEIGHT = 200
BASE_BUMPER_WIDTH = 114
BASE_BUMPER_HEIGHT = 21

FOOD_SCORE_ADDITION = 5
BASE_ADD_KILL_SCORE = 50
KILL_ADD_SCORE_PERCENTAGE = 0.2

MAP_SIDE = 512*5 # Formula: image-side*(scale/2) ##idk why divided by 2 

class BaseCar:
    
    def does_kill(self, victim_car):
        return does_collide(self.get_bumper_vertices(), victim_car.get_body_vertices())
    
    def __init__(self):
        self.body_width = BASE_BODY_WIDTH
        self.body_height = BASE_BODY_WIDTH
        self.body_height_scale = 1

        self.bumper_width = BASE_BUMPER_WIDTH
        self.bumper_height = BASE_BUMPER_HEIGHT
        self.bumper_width_scale = 1


    def scale_car(self, val):# Runs only when score is changed
        # math.Floor(x/y) same as x#y 
        for i in range( math.floor(val/5) ):
        
            # More score = Taller car
            self.body_height_scale = lerp(self.body_height_scale, BotCar.MAX_BODY_SCALE, 0.001)
            self.body_height = BASE_BODY_HEIGHT * self.body_height_scale
            
            # lerp here isn't for animation purposes!!
            # It's for fast growth on start and slowly growing when score is big -- later comment: the comment is actually so usefull
            self.bumper_width_scale = lerp(self.bumper_width_scale, BotCar.MAX_BUMPER_SCALE * 1.5, 0.001)
            self.bumper_width = BASE_BUMPER_WIDTH * self.bumper_width_scale

    def get_body_vertices(self):
        x = self.heartbeat_info['x']
        y = self.heartbeat_info['y']
        width = self.body_width 
        height = self.body_height * self.body_height_scale
        rot = self.heartbeat_info['rot'] 

        return get_vertices(x, y, width, height, rot)

    def get_bumper_vertices(self):
        x = self.heartbeat_info['x'] - math.sin(self.heartbeat_info['rot']) * self.body_height/2
        y = self.heartbeat_info['y'] + math.cos(self.heartbeat_info['rot']) * self.body_height/2
        width = self.bumper_width * self.bumper_width_scale
        height = self.bumper_height
        rot = self.heartbeat_info['rot'] 

        return get_vertices(x, y, width, height, rot)

    
    def add_score_for_killing(self, dead_car):
        self.heartbeat_info["score"] += BASE_ADD_KILL_SCORE
        self.heartbeat_info["score"] += int(dead_car.heartbeat_info["score"] * KILL_ADD_SCORE_PERCENTAGE)

     
    def add_score_for_eating_food(self): # Add score for eating food
        self.heartbeat_info['score'] += FOOD_SCORE_ADDITION
        self.scale_car(FOOD_SCORE_ADDITION)
    


class BotCar(BaseCar):

    MAX_BUMPER_SCALE = 6
    NORMAL_SPEED = 0.8
    BOOST_SPEED = 2.8
    TURN_SPEED = 0.1
    MAX_BODY_SCALE = 4

  
    def __init__(self, x, y, angle, color, name, score):
        super().__init__()

        self.active = True

        self.heartbeat_info = {}
        self.heartbeat_info["x"] = x
        self.heartbeat_info["y"] = y
        self.heartbeat_info['name'] = name
        self.heartbeat_info['color'] = color
        self.heartbeat_info["score"] = score
        self.heartbeat_info["rot"] = angle
        self.heartbeat_info['acc'] = 1
        self.heartbeat_info["turn"] = 0
        self.heartbeat_info['boost'] = False

        self.speed = 0
        self.driftAngle = 0
        self.xVel = 0
        self.yVel = 0
        self.accSpeed = BotCar.NORMAL_SPEED

        # Matters only if the score isn't 0, but not worth putting if over it coz there is for in the func which wont run 
        self.scale_car(score)
        
        self.close_cars_and_bots = {}

    def add_close_car(self, the_id, car_or_bot):
        self.close_cars_and_bots[the_id] = car_or_bot
    
    
    def move(self, delta):
    
        # Force movement forwards when boosting
        if self.heartbeat_info['boost']:
            self.heartbeat_info['acc'] = 1
        
        self.rotate_by(self.heartbeat_info["turn"] * BotCar.TURN_SPEED * delta)
        
        self.xVel += math.cos(self.heartbeat_info['rot'] + radians(90)) * self.accSpeed * -self.heartbeat_info['acc']
        self.yVel += math.sin(self.heartbeat_info['rot'] + radians(90)) * self.accSpeed * -self.heartbeat_info['acc'] #acc => dopredu|dozadu
        self.heartbeat_info['rot'] += self.driftAngle * self.heartbeat_info['acc']

        self.heartbeat_info['x'] = constrain(self.heartbeat_info['x'] + self.xVel, -MAP_SIDE, MAP_SIDE)
        self.heartbeat_info['y'] = constrain(self.heartbeat_info['y'] + self.yVel, -MAP_SIDE, MAP_SIDE)

        self.driftAngle *= 0.85
        self.xVel *= 0.93
        self.yVel *= 0.93
        self.speed *= 0.93
    
        
    
    def rotate_by(self, angl):
        if angl == 0: return
        if abs(self.driftAngle) < 5 - angl/5:
            self.driftAngle += angl/5
        
        elif angl > 0:
            self.driftAngle = 5
        
        else:
            self.driftAngle = -5
    
    
    def boost_on(self):
        self.heartbeat_info['boost'] = True
        self.accSpeed = BotCar.BOOST_SPEED

    def boost_off(self):
        self.heartbeat_info['boost'] = False
        self.accSpeed = BotCar.NORMAL_SPEED

    def does_eat(self, food): # Is food center isnide body/bumper?
        
        F = [food.x, food.y]

        body_bumper_vertices = [self.get_body_vertices(), self.get_bumper_vertices()]

        for body_or_bumper_vertices in len(body_bumper_vertices):
            A = body_or_bumper_vertices[0]
            B = body_or_bumper_vertices[1]
            C = body_or_bumper_vertices[2]
            #D = myVertices[3]# Dont need 'D'
            scalABAF = scalarProduct(sub(A, B), sub(A, F))
            scalABAB = scalarProduct(sub(A, B), sub(A, B))
            scalBCBF = scalarProduct(sub(B, C), sub(B, F))
            scalBCBC = scalarProduct(sub(B, C), sub(B, C))

            if 0 <= scalABAF and scalABAF <= scalABAB and \
                0 <= scalBCBF and scalBCBF <= scalBCBC:
                return True
            
        return False
    

class SimpleBotCar(BotCar):
    def __init__(self, x, y, angle, color, name, score):
        super().__init__(x, y, angle, color, name, score)

    def think(self):
        closest_car_id__distance = [None , 9999]
        for bot_or_car_id, bot_or_car in self.close_cars_and_bots.items():

            x_len = bot_or_car.heartbeat_info['x'] - self.heartbeat_info['x']
            y_len = self.heartbeat_info['y'] - bot_or_car.heartbeat_info['y']
            currDistance = math.sqrt( x_len * x_len + y_len * y_len )
            if currDistance > closest_car_id__distance[1]:
                closest_car_id__distance = [bot_or_car_id, currDistance]
                pass
        if len(self.close_cars_and_bots) > 0:
            self.heartbeat_info['turn'] = 1
            self.boost_on();
            #self.heartbeat_info['boost'] = True
        else:
            self.heartbeat_info['turn'] = 0
            self.boost_off();
            #self.heartbeat_info['boost'] = False

        self.move(delta=0.95) # maybe 1 would be too quick idk

        self.close_cars_and_bots = {}


import random

class PlayerCar(BaseCar):
    def __init__(self): 
        super().__init__()
        self.active = False # Player isn't yet playing
        self.heartbeat_info = {}
        self.heartbeat_info["x"] = 0 # Will be in middle - will see realtime action before he hops in
        self.heartbeat_info["y"] = 0

    def spawn(self, name):
        self.active = True # "name" & "active" need to be run only once not always on spawn, well... 
        self.heartbeat_info["name"] = name if name != "" else "Smasher.ml" # If name is not defined
        self.heartbeat_info['x'] = random.randint(-MAP_SIDE/2, MAP_SIDE/2)
        self.heartbeat_info['y'] = random.randint(-MAP_SIDE/2, MAP_SIDE/2)
        self.heartbeat_info["score"] = 0
        self.heartbeat_info["rot"] = random.random() * (math.pi * 2)
        self.heartbeat_info["acc"] = 0
        self.heartbeat_info["turn"] = 0
        self.heartbeat_info["color"] = random_color()
        self.heartbeat_info["boost"] = False
        self.body_width = BASE_BODY_WIDTH
        self.body_height = BASE_BODY_WIDTH

   
    

if __name__ == "__main__":
    p = PlayerCar()

