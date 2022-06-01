const Observable = require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')

/**
 * @class Shutter
 */
class ShutterDevice extends Observable {
    constructor(name, room) {
        let init = { name: name, room: room, status: 'down' }
        super(init)
    }

    goUp() {
        this.status = 'up'
    }
    goDown() {
        this.status = 'down'
    }
}



class ShutterSensingGoal extends Goal {
    constructor(shutters) {
        super()

        this.shutters = shutters
    }
}

/**
 * @class ShutterSensingIntention
 * Sense the status of the shutters.
 */
class ShutterSensingIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.shutters = this.goal.shutters
    }

    static applicable(goal) {
        return goal instanceof ShutterSensingGoal
    }

    *exec() {
        var promises = []
        for (let [name, shutter] of Object.entries(this.shutters)) {
            this.agent.beliefs.declare(`shutter_up ${shutter.name}`, shutter.status == 'up') // set initial knowledge

            let promise = new Promise(async res => {
                while (true) {
                    await shutter.notifyChange('status')
                    this.agent.beliefs.declare(`shutter_up ${shutter.name}`, shutter.status == 'up')
                }
            });

            promises.push(promise)
        }

        yield Promise.all(promises)
    }
}

class ShutterControlGoal extends Goal {
    constructor(shutters) {
        super()

        this.shutters = shutters
    }
}

/**
 * @class ShutterControlIntention
 * Control the shutters of the house: close the shutters from 9.00 PM to 7.00 AM. 
 */
class ShutterControlIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.shutters = this.goal.shutters
    }

    static applicable(goal) {
        return goal instanceof ShutterControlGoal
    }

    *exec() {
        var promises = []
        for (let [name, shutter] of Object.entries(this.shutters)) {
            let promise = new Promise(async res => {
                while (true) {
                    let hh = await Clock.global.notifyChange('hh')
                    this.controlShutter(shutter, hh)
                }
            });

            promises.push(promise)
        }

        yield Promise.all(promises)
    }

    controlShutter(shutter, hh) {
        if (hh <= 6 || hh >= 21) {
            if (this.agent.beliefs.check(`shutter_up ${shutter.name}`)) {
                shutter.goDown()
                this.log('shutter ' + shutter.room.name + ' ' + shutter.status)
            }
        } else {
            if (!this.agent.beliefs.check(`shutter_up ${shutter.name}`)) {
                shutter.goUp()
                this.log('shutter ' + shutter.room.name + ' ' + shutter.status)
            }
        }
    }
}

module.exports = {
    ShutterDevice,
    ShutterSensingGoal, ShutterSensingIntention,
    ShutterControlGoal, ShutterControlIntention
}