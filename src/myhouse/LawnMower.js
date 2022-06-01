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

    /**
     * 
     * @param {String} area The garden area to cut 
     */
    cut(area) {
        this.garden.grass_height[area] = 'short'
    }

    /**
     * 
     * @param {String} area The garden area to which move
     */
    move(area) {
        this.at = area
    }
}


/**
 * @class LawnMowerSensingGoal
 */
class LawnMowerSensingGoal extends Goal {
    constructor(garden, weather) {
        super()

        this.garden = garden
        this.weather = weather
    }
}

/**
 * @class LawnMowerSensingIntention
 * Implementation of the sensors of the lawn mower: detect the position of the lawn mower,
 * the grass height of each grass area and if it is raining.
 * Declare in the agent beliefest `connected area1 area2` to specify the connection beween garden areas,
 * `at area` to specify the position of the lawn mower,
 * `tall-grass area` when the grass in that area is high,
 * `not-raining` if the weather says that it is not raining in this moment.
 */
class LawnMowerSensingIntention extends Intention {
    constructor(agent, goal) {
        super(agent, goal)

        this.garden = this.goal.garden
        this.weather = this.goal.weather
    }

    static applicable(goal) {
        return goal instanceof LawnMowerSensingGoal
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
                    this.agent.beliefs.undeclare(literal) // undeclare the previous position of the lawn mower
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

}



class Cut extends pddlActionIntention {

    *exec({ a, garden_name } = parameters) {
        if (this.checkPrecondition()) {
            this.agent.devices.lawn_mower.cut(a)
            yield new Promise(res => setTimeout(res, 100))
        }
        else
            throw new Error('pddl precondition not valid'); //Promise is rejected!
    }

    static parameters = ['a', 'garden']
    static precondition = [['not-raining'], ['free_room', 'garden'], ['tall-grass', 'a'], ['at', 'a']]
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



module.exports = { LawnMowerDevice, LawnMowerSensingGoal, LawnMowerSensingIntention, Cut, Move }