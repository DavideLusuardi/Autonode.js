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
        var shutter_promises = []
        for (let [name, shutter] of Object.entries(this.shutters)) {
            this.agent.beliefs.declare(`shutter_up ${shutter.name}`, shutter.status == 'up') // set initial knowledge
            this.controlShutter(shutter, Clock.global.hh)

            let shutter_promise = new Promise(async res => {
                while (true) {
                    let hh = await Clock.global.notifyChange('hh')
                    this.controlShutter(shutter, hh)
                }
            });

            shutter_promises.push(shutter_promise)
        }

        yield Promise.all(shutter_promises)
    }

    controlShutter(shutter, hh) {
        if (hh <= 6 || hh >= 21) {
            if (shutter.status == 'up') {
                shutter.goDown()
                this.agent.beliefs.undeclare(`shutter_up ${shutter.name}`)
                this.log('shutter ' + shutter.room.name + ' ' + shutter.status)
            }
        } else {
            if (shutter.status == 'down') {
                shutter.goUp()
                this.agent.beliefs.declare(`shutter_up ${shutter.name}`)
                this.log('shutter ' + shutter.room.name + ' ' + shutter.status)
            }
        }
    }
}

module.exports = { ShutterDevice, ShutterControlGoal, ShutterControlIntention }