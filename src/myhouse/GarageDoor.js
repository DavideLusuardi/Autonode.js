const Observable = require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')


/**
 * @class GarageDoorDevice
 * Implementation of the garage door.
 * The status can be 'opened' or 'closed'
 */
class GarageDoorDevice extends Observable {
    constructor(name, room) {
        let init = { name: name, room: room, status: 'opened' }
        super(init)
    }

    open() {
        this.status = 'opened'
    }
    close() {
        this.status = 'closed'
    }
}


class GarageDoorControlGoal extends Goal {
    constructor(doors) {
        super()

        this.doors = doors
    }
}

/**
 * @class GarageDoorControlIntention
 * Implementation of the garage door sensor and logic.
 * Close the garage door if open at 9.00 PM. 
 */
class GarageDoorControlIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.doors = this.goal.doors
    }

    static applicable(goal) {
        return goal instanceof GarageDoorControlGoal
    }

    *exec() {
        var promises = []
        for (let [name, door] of Object.entries(this.doors)) {
            this.agent.beliefs.declare(`garage_door_open ${door.name}`, door.status == 'opened') // set initial knowledge // TODO: check if knowledge present

            let promise = new Promise(async res => {
                while (true) {
                    let hh = await Clock.global.notifyChange('hh')

                    if (hh >= 21) { // close the garage door if open at 9.00 PM
                        if (door.status == 'opened') {
                            door.close()
                            this.log('closing ' + door.name)
                            this.agent.beliefs.undeclare(`garage_door_open ${door.name}`)
                        }
                    }

                }
            });

            promises.push(promise)
        }

        yield Promise.all(promises)
    }
}

module.exports = { GarageDoorDevice, GarageDoorControlGoal, GarageDoorControlIntention }