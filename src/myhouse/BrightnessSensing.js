const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')


class BrightnessSensingGoal extends Goal {
    constructor(rooms) {
        super()

        this.rooms = rooms
    }
}

/**
 * @class BrightnessSensingIntention
 * Implementation of the brightness sensors: detects the brightness variation in each room.
 */
class BrightnessSensingIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.rooms = this.goal.rooms
    }

    static applicable(goal) {
        return goal instanceof BrightnessSensingGoal
    }

    *exec() {
        var promises = []
        for (let [name, room] of Object.entries(this.rooms)) {
            this.agent.beliefs.declare(`brightness_high ${room.name}`, (Clock.global.hh >= 8 && Clock.global.hh <= 18)) // set initial knowledge

            let promise = new Promise(async res => {
                while (true) {
                    let hh = await Clock.global.notifyChange('hh')
                    let brightness = 'low'
                    if (hh >= 8 && hh <= 18) // from 8 to 19, brightness is high
                        brightness = 'high'

                    let changed = this.agent.beliefs.declare(`brightness_high ${room.name}`, brightness == 'high')
                    if (changed)
                        this.log('brightness ' + room.name + ' ' + brightness)
                }
            });

            promises.push(promise)
        }

        yield Promise.all(promises)
    }
}

module.exports = { BrightnessSensingGoal, BrightnessSensingIntention }