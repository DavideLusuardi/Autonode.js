const Observable = require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')

/**
 * @class IrrigationSystem
 * Give water to plants and garden. Status can be 'on' or 'off'.
 */
class IrrigationSystem extends Observable {
    constructor(name, room) {
        let init = { name: name, room: room, status: 'off' }
        super(init)
    }

    /**
     * Turn on the irrigation system if status is off.
     */
    turnOn() {
        if (this.status == 'off') {
            this.status = 'on'
        }
    }

    /**
     * Turn off the irrigation system if status is on.
     */
    turnOff() {
        if (this.status == 'on') {
            this.status = 'off'
        }
    }
}


/**
 * @class IrrigationSensingGoal
 */
class IrrigationSensingGoal extends Goal {
    constructor(irrigation_system, garden, weather) {
        super()

        this.irrigation_system = irrigation_system
    }
}

/**
 * @class IrrigationSensingIntention
 * Sense the status of the irrigation system.
 * Declare in the agent beliefest `giving_water` when the irrigation system is giving water.
 */
class IrrigationSensingIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.irrigation_system = this.goal.irrigation_system
    }

    static applicable(goal) {
        return goal instanceof IrrigationSensingGoal
    }

    *exec() {
        this.agent.beliefs.declare(`giving_water`, this.irrigation_system.status=='on')

        let promise = new Promise(async res => {
            while (true) {
                await this.irrigation_system.notifyChange('status')
                this.agent.beliefs.declare(`giving_water`, this.irrigation_system.status=='on')
            }
        });

        yield Promise.all([promise])
    }

}


/**
 * @class IrrigationControlGoal
 */
class IrrigationControlGoal extends Goal {
    constructor(irrigation_system, garden, weather) {
        super()

        this.irrigation_system = irrigation_system
        this.garden = garden
        this.weather = weather
    }
}

/**
 * @class IrrigationControlIntention
 * Control the irrigation system: start giving water at 6.00 AM for 30 minutes if
 * has not rained in the last two days, the garden has not received water in the last two days
 * and will not rain in the next 24 hours.
 */
class IrrigationControlIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.irrigation_system = this.goal.irrigation_system
        this.garden = this.goal.garden
        this.weather = this.goal.weather
    }

    static applicable(goal) {
        return goal instanceof IrrigationControlGoal
    }

    *exec() {
        let promise = new Promise(async res => {
            while (true) {
                await Clock.global.notifyChange('mm')
                if (Clock.global.hh >= 6 && Clock.global.mm < 30 && Clock.global.dd - 2 >= this.weather.last_day_has_rained &&
                    Clock.global.dd - 2 >= this.garden.last_day_received_water && this.weather.raining_next24h == false) {
                    if (!this.agent.beliefs.check(`giving_water`)) {
                        this.irrigation_system.turnOn()
                        this.garden.giveWater()
                        this.log("giving water to garden and plants")
                    }
                } else {
                    if (this.irrigation_system.status == 'on') {
                        this.irrigation_system.turnOff()
                        this.log("stop giving water to garden and plants")
                    }
                }
            }
        });

        yield Promise.all([promise])
    }

}

module.exports = { IrrigationSystem, IrrigationSensingGoal, IrrigationSensingIntention, IrrigationControlGoal, IrrigationControlIntention }