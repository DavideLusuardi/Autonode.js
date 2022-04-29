const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')


class BrightnessSensingGoal extends Goal {
    constructor (rooms) {
        super()

        this.rooms = rooms
    }
}

class BrightnessSensingIntention extends Intention {
    constructor (agent, goal) {
        super(agent, goal)

        this.rooms = this.goal.rooms
    }
    
    static applicable (goal) {
        return goal instanceof BrightnessSensingGoal
    }

    *exec () {
        var rooms_promises = []
        for (let [name, room] of Object.entries(this.rooms)){
            this.agent.beliefs.declare(`brightness_high ${room.name}`, (Clock.global.hh >= 8 && Clock.global.hh <= 18)) // set initial knowledge

            let room_promise = new Promise( async res => {
                while (true) {
                    let hh = await Clock.global.notifyChange('hh')
                    let brightness = 'low'
                    if(hh >= 8 && hh <= 18)
                        brightness = 'high'
                        
                    let changed = this.agent.beliefs.declare(`brightness_high ${room.name}`, brightness=='high')
                    if(changed)
                        this.log('sense: brightness ' + room.name + ' ' + brightness)
                }
            });

            rooms_promises.push(room_promise)
        }
        
        yield Promise.all(rooms_promises)
    }
}

module.exports = {BrightnessSensingGoal, BrightnessSensingIntention}