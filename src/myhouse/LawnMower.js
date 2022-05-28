const pddlActionIntention = require('../pddl/actions/pddlActionIntention')
const Observable = require('../utils/Observable')
const Goal = require('../bdi/Goal')
const Intention = require('../bdi/Intention')

/**
 * @class LawnMowerDevice
 * A lawn mower can cut the grass of the garden and move between different areas of the garden. 
 */
class LawnMowerDevice extends Observable {
    constructor(name, room, at) {
        let init = { name: name, room: room, garden: room, at: at }
        super(init)
    }

    cut(area) {
        this.garden.grass_height[area] = 'short'
    }

    move(area) {
        this.at = area
    }
}


class SensingGoal extends Goal {
    constructor(garden, people, weather) {
        super()

        this.garden = garden
        this.people = people
        this.weather = weather
    }
}

/**
 * @class SensingIntention
 * Implementation of the sensors of the lawn mower: detect the position of the lawn mower,
 * the grass height of each grass area, the presence of people in the garden and if it is raining.
 */
class SensingIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.garden = this.goal.garden
        this.people = this.goal.people
        this.weather = this.goal.weather
    }

    static applicable(goal) {
        return goal instanceof SensingGoal
    }

    *exec() {
        for (let pair of this.garden.connected_areas)
            this.agent.beliefs.declare('connected ' + pair)

        this.agent.beliefs.declare(`at ${this.agent.devices.lawn_mower.at}`)
        var promises = []
        let promise = new Promise(async res => {
            while (true) {
                await this.agent.devices.lawn_mower.notifyChange('at')
                for (let literal of this.agent.beliefs.matchingLiterals(`at *`)) {
                    this.agent.beliefs.undeclare(literal)
                }
                this.agent.beliefs.declare(`at ${this.agent.devices.lawn_mower.at}`)
            }
        });
        promises.push(promise)

        for (let [area, height] of Object.entries(this.garden.grass_height)) {
            this.agent.beliefs.declare(`tall-grass ${area}`, height == 'tall')

            let promise = new Promise(async res => {
                while (true) {
                    let height = await this.garden.grass_height.notifyChange(area)
                    this.agent.beliefs.declare(`tall-grass ${area}`, height == 'tall')
                }
            });

            promises.push(promise)
        }

        this.agent.beliefs.declare(`not-people-detected`, this.someone_detected() == false)
        for (let [name, person] of Object.entries(this.people)) {
            let promise = new Promise(async res => {
                while (true) {
                    await person.notifyChange('in_room')
                    this.agent.beliefs.declare(`not-people-detected`, this.someone_detected() == false)
                }
            });

            promises.push(promise)
        }

        this.agent.beliefs.declare(`not-raining`, this.weather.is_raining == false)
        promise = new Promise(async res => {
            while (true) {
                let is_raining = await this.weather.notifyChange('is_raining')
                this.agent.beliefs.declare(`not-raining`, is_raining == false)
            }
        });
        promises.push(promise)

        yield Promise.all(promises)
    }

    /**
     * 
     * @returns true if there is someone in the garden
     */
    someone_detected() {
        for (let [name, person] of Object.entries(this.people)) {
            if (person.in_room == this.garden.name)
                return true
        }
        return false
    }
}



class Cut extends pddlActionIntention {

    *exec({ a } = parameters) {
        if (this.checkPrecondition()) {
            this.agent.devices.lawn_mower.cut(a)
            yield new Promise(res => setTimeout(res, 100))
        }
        else
            throw new Error('pddl precondition not valid'); //Promise is rejected!
    }

    static parameters = ['a']
    static precondition = [['not-raining'], ['not-people-detected'], ['tall-grass', 'a'], ['at', 'a']]
    static effect = [['not tall-grass', 'a']]

}


class Move extends pddlActionIntention {

    *exec({ a1, a2 } = parameters) {
        if (this.checkPrecondition()) {
            this.agent.devices.lawn_mower.move(a2)
            yield new Promise(res => setTimeout(res, 100))
        }
        else
            throw new Error('pddl precondition not valid'); //Promise is rejected!
    }

    static parameters = ['a1', 'a2']
    static precondition = [['at', 'a1'], ['connected', 'a1', 'a2']]
    static effect = [['not at', 'a1'], ['at', 'a2']]

}



module.exports = { LawnMowerDevice, SensingGoal, SensingIntention, Cut, Move }