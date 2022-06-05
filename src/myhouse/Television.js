const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')
const Observable = require('../utils/Observable')

/**
 * @class TelevisionDevice
 * Status can be 'on' or 'off'.
 * The consumption specifies how much energy use the television.
 */
class TelevisionDevice extends Observable {
    constructor(name, room, consumption, electricity_utility) {
        let init = { name: name, room: room, status: 'off', channel: 1, consumption: consumption }
        super(init)

        this.electricity_utility = electricity_utility
        this.consumption_callback = () => {
            let consumption = this.consumption / (60 / Clock.getIncrement().mm) // calculate consumption every clock increment
            this.electricity_utility.total_consumption += consumption
        }
    }

    turnOn(channel = undefined) {
        if (this.status == 'off') {
            this.status = 'on'
            if (channel)
                this.channel = channel
            this.electricity_utility.current_consumption += this.consumption
            Clock.global.observe('mm', this.consumption_callback)
            return this.channel
        }
    }
    turnOff() {
        if (this.status == 'on') {
            this.status = 'off'
            this.electricity_utility.current_consumption -= this.consumption
            Clock.global.unobserve('mm', this.consumption_callback)
        }
    }
}


/**
 * @class TelevisionSensingGoal
 */
class TelevisionSensingGoal extends Goal {
    constructor(television) {
        super()

        this.television = television
    }
}

/**
 * @class TelevisionSensingIntention
 * Monitor the status of the television.
 * Declare in the agent beliefset `television_on` when the TV is on.
 */
class TelevisionSensingIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.television = this.goal.television
    }

    static applicable(goal) {
        return goal instanceof TelevisionSensingGoal
    }

    *exec() {
        this.agent.beliefs.declare('television_on', this.television.status == 'on')

        var promises = []
        let promise = new Promise(async res => {
            while (true) {
                await this.television.notifyChange(`status`)
                this.agent.beliefs.declare('television_on', this.television.status == 'on')
            }
        });
        promises.push(promise)

        yield Promise.all(promises)
    }
}


/**
 * @class TelevisionControlGoal
 */
class TelevisionControlGoal extends Goal {
    constructor(television, lights_TV) {
        super()

        this.television = television
        this.lights_TV = lights_TV
    }
}

/**
 * @class TelevisionControlIntention
 * Control the television: turn it off when nobody is watching it, show the news in the morning
 * and turn it on in the evening.
 * Control the lights of the television: turn the lights on in the evening to have a relaxing atmosphere.
 */
class TelevisionControlIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.television = this.goal.television
        this.lights_TV = this.goal.lights_TV
    }

    static applicable(goal) {
        return goal instanceof TelevisionControlGoal
    }

    *exec() {
        this.controlTelevision() // set initial status

        var promises = []
        let promise = new Promise(async res => {
            while (true) {
                await this.agent.beliefs.notifyChange(`someone_in_room ${this.television.room.name}`)
                this.controlTelevision()
            }
        });
        promises.push(promise)

        yield Promise.all(promises)
    }

    controlTelevision() {
        let someone_in_livingroom = this.agent.beliefs.check(`someone_in_room ${this.television.room.name}`)
        let television_on = this.agent.beliefs.check('television_on')

        if (television_on) {
            if (!someone_in_livingroom) {
                this.television.turnOff()
                this.lights_TV.turnOff()
                this.log('television off')
                this.log('television lights off')
            }
        } else if (someone_in_livingroom) {
            if (Clock.global.hh >= 6 && Clock.global.hh <= 9) {
                this.television.turnOn('News24')
                this.log('television on, channel News24')

            } else if (Clock.global.hh >= 20) {
                // TODO: turn off the other lights
                this.television.turnOn()
                this.lights_TV.turnOn()
                this.log('television on')
                this.log('television lights on')
            }
        }
    }
}

module.exports = {
    TelevisionDevice,
    TelevisionSensingGoal, TelevisionSensingIntention,
    TelevisionControlGoal, TelevisionControlIntention
}