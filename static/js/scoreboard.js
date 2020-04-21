const scoreboardTextStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 25,
    fill: ['#000000']
});
const playerTextStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 25,
    fill: ['#0000FF']
});
TEXT_SPACING = 35;
SCORE_END_X = 237;
NAME_START_X = 15;
SCORE_TOP_PADDING = 10;
class ScoreBoard
{
    constructor(container)
    {
        this.container = container;
        this.sprite = PIXI.Sprite.from('static/images/gui/scoreboard.png');
        this.sprite.x = 0
        this.sprite.y = 0;
        this.sprite.alpha = 0.7;
        container.addChild(this.sprite);

        this.names = {};
        this.scores = {};
        this.nameFields = {}
        this.scoreFields = {}
    }
    updateBoard(id_nameAndScore, myCar, myId)
    {
        // Add my car
        this.names[myId] = myCar.name;
        this.scores[myId] = myCar.score;

        //Add missingzs players
        for(const id in id_nameAndScore)
        {
            this.names[id] = id_nameAndScore[id][0];
            this.scores[id] = id_nameAndScore[id][1];
        }
        // Remove redundant players
        for (const id in this.names)
        {
            if ( !id_nameAndScore.hasOwnProperty(id) )
            {
                delete this.scores[id];
                delete this.names[id];
                this.container.removeChild(this.nameFields[id]);
                delete this.nameFields[id];
                this.container.removeChild(this.scoreFields[id]);
                delete this.scoreFields[id];
            }
        }
        
        // Sorting scores
        var sortedScore = [];
        for (const id in this.scores) {
            sortedScore.push([id, this.scores[id]]);
        }
        sortedScore.sort(function(a, b) {
            return b[1] - a[1];
        });

        // Limit to 5
        sortedScore = sortedScore.splice(0, 5);

        for (const placement in sortedScore)
        {
            const id = sortedScore[placement][0];
            if ( !this.nameFields.hasOwnProperty(id) )
            {// Instantiate PIXI.Text objects

                const nameField = new PIXI.Text(this.names[id], scoreboardTextStyle);
                nameField.x = NAME_START_X;
                this.container.addChild(nameField);
                this.nameFields[id] = nameField;

                const scoreField = new PIXI.Text(this.scores[id], scoreboardTextStyle);
                // Set anchor from left instead of right ( '0, 0'  )
                scoreField.anchor.set(1, 0)
                scoreField.x = SCORE_END_X;
                this.container.addChild(scoreField);
                this.scoreFields[id] = scoreField;

                // Custom font-style
                if (id == myId)
                {
                    nameField.style = playerTextStyle;
                    scoreField.style = playerTextStyle;
                }
            }
            else{
                this.nameFields[id].text =   (1 + parseInt(placement)) + ". " + this.names[id];
                this.scoreFields[id].text =  this.scores[id];
            }
            const destPos = SCORE_TOP_PADDING + placement * TEXT_SPACING;
            const oldPos = this.nameFields[id].y;
            const newPos = lerp(oldPos, destPos, 0.2);
            this.nameFields[id].y = newPos
            this.scoreFields[id].y = newPos;
            //console.log("Name: " + this.names[id], "Score: " + this.scores[id]);
        }

    }
}