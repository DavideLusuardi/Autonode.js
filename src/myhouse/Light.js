const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')
const Observable = require('../utils/Observable')


/**
 * @class LightDevice
 * The light bulb. Status can be 'on' or 'off'.
 */
class LightDevice extends Observable {
    constructor(name, room, consumption, electricity_utility) {
        let init = { name: name, room: room, status: 'off', consumption: consumption }
        super(init)

        this.electricity_utility = electricity_utility
        this.consumption_callback = () => {
            let consumption = this.consumption / (60 / Clock.getIncrement().mm) // calculate consumption every clock increment
            this.electricity_utility.total_consumption += consumption
        }
    }

    /**
     * Turn on the light and update total and current consumption of electricity_utility.
     */
    turnOn() {
        if (this.status == 'off') {
            this.status = 'on'
            this.electricity_utility.current_consumption += this.consumption
            Clock.global.observe('mm', this.consumption_callback) // update consumption every mm increment
        }
    }

    /**
     * Turn off the light and update total and current consumption of electricity_utility.
     */
    turnOff() {
        if (this.status == 'on') {
            this.status = 'off'
            this.electricity_utility.current_consumption -= this.consumption
            Clock.global.unobserve('mm', this.consumption_callback)
        }
    }
}


/**
 * @class LightSensingGoal
 */
class LightSensingGoal extends Goal {
    constructor(lights) {
        super()

        this.lights = lights
    }
}

/**
 * @class LightSensingIntention
 * Detect the status of the lights.
 * Declare in the agent beliefest `light_on light_name` when the light is on.
 */
class LightSensingIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.lights = this.goal.lights
    }

    static applicable(goal) {
        return goal instanceof LightSensingGoal
    }

    *exec() {
        var promises = []
        for (let [name, light] of Object.entries(this.lights)) {
            this.agent.beliefs.declare(`light_on ${light.name}`, light.status == 'on')

            let promise = new Promise(async res => {
                while (true) {
                    await light.notifyChange('status')
                    this.agent.beliefs.declare(`light_on ${light.name}`, light.status == 'on')
                }
            });
            promises.push(promise)
        }

        yield Promise.all(promises)
    }

}


/**
 * @class LightControlGoal
 */
class LightControlGoal extends Goal {
    constructor(lights, people, garden) {
        super()

        this.lights = lights
        this.people = people
        this.garden = garden
    }
}

/**
 * @class LightControlIntention
 * Control the lights of the house: turn on the lights of the room if there is someone, nobody is sleeping
 * and the brightness of the room is low.
 * Control the lights of the garden: turn on the lights from 7.00 PM to 11.00 PM.
 */
class LightControlIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.lights = this.goal.lights
        this.people = this.goal.people
        this.garden = this.goal.garden
    }

    static applicable(goal) {
        return goal instanceof LightControlGoal
    }

    *exec() {
        var promises = []
        for (let [name, light] of Object.entries(this.lights)) {
            let brightness_promise = new Promise(async res => {
                while (true) {
                    await this.agent.beliefs.notifyChange(`brightness_high ${light.room.name}`)
                    this.adaptLights(light.room)
                }
            });
            promises.push(brightness_promise)

            for (let [name, person] of Object.entries(this.people)) {
                let person_promise = new Promise(async res => {
                    while (true) {
                        await this.agent.beliefs.notifyChange(`person_in_room ${person.name} ${light.room.name}`)
                        this.adaptLights(light.room)
                    }
                });
                promises.push(person_promise)
            }

            if (light.room.name == this.garden.name) {
                let garden_promise = new Promise(async res => {
                    while (true) {
                        await Clock.global.notifyChange(`hh`)
                        this.adaptLights(light.room)
                    }
                });
                promises.push(garden_promise)
            }
        }

        for (let [name, person] of Object.entries(this.people)) {
            let promise = new Promise(async res => {
                while (true) {
                    await this.agent.beliefs.notifyChange(`is_sleeping ${person.name}`)
                    this.adaptLights(person.in_room)
                }
            });
            promises.push(promise)
        }

        for (let [name, light] of Object.entries(this.lights)) {
            this.adaptLights(light.room)
        }

        yield Promise.all(promises)
    }

    /**
     * Change lights status in the room based on the presence of people, the brightness in the room 
     * and the presence of people sleeping.
     * Turn on the lights of the room if there is someone, nobody is sleeping
     * and the brightness of the room is low.
     * Turn on the lights of the garden from 7.00 PM to 11.00 PM.
     * 
     * @param {Room} room The room in which there has been a change and lights could be change status
     */
    adaptLights(room) {
        for (let [name, light] of Object.entries(this.lights)) {
            if (light.room.name != room.name)
                continue

            let brightness_high = this.agent.beliefs.check(`brightness_high ${light.room.name}`)

            let someone_in_room = false
            let someone_is_sleeping = false
            for (let [name, person] of Object.entries(this.people)) {
                if (this.agent.beliefs.check(`person_in_room ${person.name} ${light.room.name}`)) {
                    someone_in_room = true
                    if (this.agent.beliefs.check(`is_sleeping ${person.name}`)) {
                        someone_is_sleeping = true
                        break
                    }
                }
            }

            if (someone_in_room && !someone_is_sleeping && !brightness_high) {
                if (light.status == 'off') {
                    light.turnOn()
                    this.log('lights turned on in room ' + light.room.name)
                }
            } else if (room.name == this.garden.name && Clock.global.hh >= 19 && Clock.global.hh <= 22) {
                if (light.status == 'off') {
                    light.turnOn()
                    this.log('lights turned on in room ' + light.room.name)
                }
            } else if (light.status == 'on') {
                light.turnOff()
                this.log('lights turned off in room ' + light.room.name)
            }

        }

    }
}


module.exports = { LightDevice, LightSensingGoal, LightSensingIntention, LightControlGoal, LightControlIntention }