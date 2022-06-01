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

    /**
     * Open the garage door.
     */
    open() {
        this.status = 'opened'
    }

    /**
     * Close the garage door.
     */
    close() {
        this.status = 'closed'
    }
}


/**
 * @class GarageDoorSensingGoal
 */
class GarageDoorSensingGoal extends Goal {
    constructor(doors) {
        super()

        this.doors = doors
    }
}

/**
 * @class GarageDoorSensingIntention
 * Implementation of the garage door sensor:
 * declare in the agent beliefset `garage_door_open garage_door_name` when open.
 */
class GarageDoorSensingIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.doors = this.goal.doors
    }

    static applicable(goal) {
        return goal instanceof GarageDoorSensingGoal
    }

    *exec() {
        var promises = []
        for (let [name, door] of Object.entries(this.doors)) {
            this.agent.beliefs.declare(`garage_door_open ${door.name}`, door.status == 'opened')

            let promise = new Promise(async res => {
                while (true) {
                    await door.notifyChange('status')
                    this.agent.beliefs.declare(`garage_door_open ${door.name}`, door.status == 'opened')
                }
            });

            promises.push(promise)
        }

        yield Promise.all(promises)
    }
}


/**
 * @class GarageDoorControlGoal
 */
class GarageDoorControlGoal extends Goal {
    constructor(doors) {
        super()

        this.doors = doors
    }
}

/**
 * @class GarageDoorControlIntention
 * Implementation of the garage door logic.
 * Close the garage door if already open at 9.00 PM.
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
            let promise = new Promise(async res => {
                while (true) {
                    let hh = await Clock.global.notifyChange('hh')

                    if (hh >= 21) { // close the garage door if open at 9.00 PM
                        if (this.agent.beliefs.check(`garage_door_open ${door.name}`)) {
                            door.close()
                            this.log('closing ' + door.name)
                        }
                    }

                }
            });

            promises.push(promise)
        }

        yield Promise.all(promises)
    }
}

module.exports = { GarageDoorDevice, GarageDoorSensingGoal, GarageDoorSensingIntention, GarageDoorControlGoal, GarageDoorControlIntention }