const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')
const Clock = require('../utils/Clock')
const Observable = require('../utils/Observable')


/**
 * @class LightDevice
 * The light bulb.
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
            Clock.global.observe('mm', this.consumption_callback)
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


class LightControlGoal extends Goal {
    constructor(lights, rooms, people, garden) {
        super()

        this.lights = lights
        this.people = people
        this.rooms = rooms
        this.garden = garden
    }
}

/**
 * @class LightControlIntention
 * Control the lights of the house: turn on the lights of the room if there is someone that is not sleeping
 * and the brightness of the room is low.
 * Control the lights of the garden: turn on the lights from 7.00 PM to 11.00 PM.
 */
class LightControlIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.lights = this.goal.lights
        this.people = this.goal.people
        this.rooms = this.goal.rooms
        this.garden = this.goal.garden
    }

    static applicable(goal) {
        return goal instanceof LightControlGoal
    }

    *exec() {
        var promises = []
        for (let [name, light] of Object.entries(this.lights)) {
            this.agent.beliefs.declare(`light_on ${light.name}`, light.status == 'on')

            let brightness_promise = new Promise(async res => {
                while (true) {
                    let brightness_high = await this.agent.beliefs.notifyChange(`brightness_high ${light.room.name}`)
                    this.adaptLights(light.room)
                }
            });
            promises.push(brightness_promise)

            for (let [name, person] of Object.entries(this.people)) {
                let person_promise = new Promise(async res => {
                    while (true) {
                        let person_in_room = await this.agent.beliefs.notifyChange(`person_in_room ${person.name} ${light.room.name}`)
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
            this.agent.beliefs.declare(`is_sleeping ${person.name}`, person.is_sleeping)
            let promise = new Promise(async res => {
                while (true) {
                    await person.notifyChange('is_sleeping')
                    this.agent.beliefs.declare(`is_sleeping ${person.name}`, person.is_sleeping)
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
                    this.agent.beliefs.declare(`light_on ${light.name}`)
                    this.log('lights turned on in room ' + light.room.name)
                }
            } else if (room.name == this.garden.name && Clock.global.hh >= 19 && Clock.global.hh <= 22) {
                if (light.status == 'off') {
                    light.turnOn()
                    this.agent.beliefs.declare(`light_on ${light.name}`)
                    this.log('lights turned on in room ' + light.room.name)
                }
            } else if (light.status == 'on') {
                light.turnOff()
                this.agent.beliefs.undeclare(`light_on ${light.name}`)
                this.log('lights turned off in room ' + light.room.name)
            }

        }

    }
}


module.exports = { LightDevice, LightControlGoal, LightControlIntention }